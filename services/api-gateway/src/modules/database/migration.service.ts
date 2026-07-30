import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { DatabaseService } from './database.service';

/**
 * Applique au démarrage les migrations SQL non encore jouées.
 *
 * Auparavant le schéma n'était injecté que par `/docker-entrypoint-initdb.d/`,
 * que PostgreSQL n'exécute que sur un répertoire de données vide : toute
 * évolution du schéma exigeait un `docker compose down -v`, et une table
 * ajoutée après la création du volume restait absente sans le moindre
 * avertissement.
 *
 * Une migration qui échoue interrompt le démarrage : mieux vaut un conteneur
 * qui ne monte pas qu'une API qui sert des requêtes sur un schéma incohérent.
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);
  private readonly directory =
    process.env.MIGRATIONS_DIR ?? resolve(process.cwd(), 'infra/database/migrations');

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    if (!this.db.enabled) {
      this.logger.warn('DATABASE_URL non configuré : migrations ignorées.');
      return;
    }

    if (!existsSync(this.directory)) {
      this.logger.error(`Répertoire de migrations introuvable : ${this.directory}`);
      throw new Error(`Répertoire de migrations introuvable : ${this.directory}`);
    }

    await this.db.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version    VARCHAR(255) PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    const alreadyApplied = new Set(
      (await this.db.query('SELECT version FROM schema_migrations')).rows.map((row) =>
        String(row['version'])
      )
    );

    const files = readdirSync(this.directory)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    const pending = files.filter((name) => !alreadyApplied.has(name));

    if (pending.length === 0) {
      this.logger.log(`Schéma à jour (${files.length} migration(s)).`);
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(this.directory, file), 'utf-8');
      this.logger.log(`Application de ${file}…`);
      // Requête simple multi-instructions : PostgreSQL l'exécute dans une
      // transaction implicite, donc un échec en milieu de fichier ne laisse
      // pas le schéma à moitié migré.
      await this.db.query(sql);
      await this.db.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    }

    this.logger.log(`${pending.length} migration(s) appliquée(s).`);
  }
}
