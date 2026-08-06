import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

export type Project = {
  id: string;
  name: string;
  locationGps: string | null;
  status: string;
  createdAt: string;
  /** NCR encore à traiter — c'est l'indicateur que le chef de chantier regarde en premier. */
  openNcrCount: number;
  totalNcrCount: number;
};

/**
 * Les compteurs sont calculés par la base plutôt que côté application : sans
 * cela il faudrait charger toutes les NCR de tous les chantiers pour afficher
 * l'écran de sélection.
 *
 * `FILTER` restreint le décompte aux NCR non soldées ; `LEFT JOIN` conserve les
 * chantiers sans aucune NCR, qui sont précisément ceux qu'on vient de créer.
 */
const PROJECT_SELECT = `
  SELECT p.id, p.name, p.location_gps, p.status, p.created_at,
         COUNT(n.id) FILTER (WHERE n.status NOT IN ('RESOLVED', 'CLOSED')) AS open_ncr_count,
         COUNT(n.id) AS total_ncr_count
  FROM projects p
  LEFT JOIN ncr n ON n.project_id = p.id
`;

const PROJECT_GROUP_BY = ' GROUP BY p.id, p.name, p.location_gps, p.status, p.created_at';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService
  ) {}

  async list(): Promise<Project[]> {
    if (!this.databaseService.enabled) {
      // Sans base il n'existe aucun chantier : renvoyer une liste vide est
      // exact, et l'interface sait afficher l'état « aucun chantier ».
      this.logger.warn('DATABASE_URL non configuré — aucun chantier à lister');
      return [];
    }

    const result = await this.databaseService.query(
      `${PROJECT_SELECT}${PROJECT_GROUP_BY} ORDER BY p.name ASC`
    );
    return (result.rows as Array<Record<string, unknown>>).map((row) => this.toProject(row));
  }

  async detail(projectId: string): Promise<Project> {
    if (!this.databaseService.enabled) {
      throw new NotFoundException(`Chantier introuvable : ${projectId}`);
    }

    // On accepte l'UUID comme le nom : la liste des NCR expose le code chantier
    // (`projects.name`), pas l'identifiant technique.
    const result = await this.databaseService.query(
      `${PROJECT_SELECT} WHERE p.id::text = $1 OR p.name = $1${PROJECT_GROUP_BY} LIMIT 1`,
      [projectId]
    );
    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException(`Chantier introuvable : ${projectId}`);
    }
    return this.toProject(row as Record<string, unknown>);
  }

  async create(input: CreateProjectDto, actorId: string): Promise<Project> {
    if (!this.databaseService.enabled) {
      throw new ConflictException("Création impossible : aucune base de données n'est configurée");
    }

    const name = input.name.trim();

    // `idx_projects_name` (migration 002) rend le doublon impossible en base.
    // On le convertit en 409 plutôt que de laisser remonter une erreur SQL en 500.
    const existing = await this.databaseService.query(
      'SELECT 1 FROM projects WHERE name = $1 LIMIT 1',
      [name]
    );
    if (existing.rowCount) {
      throw new ConflictException(`Un chantier nommé « ${name} » existe déjà`);
    }

    const id = randomUUID();
    await this.databaseService.query(
      `INSERT INTO projects (id, name, location_gps, status, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, name, input.locationGps ?? null, input.status ?? 'ACTIVE']
    );

    this.auditService.append('project.created', actorId, { projectId: id, name });
    return this.detail(id);
  }

  async update(projectId: string, input: UpdateProjectDto, actorId: string): Promise<Project> {
    if (!this.databaseService.enabled) {
      throw new ConflictException("Modification impossible : aucune base de données n'est configurée");
    }

    // Vérifie l'existence (lève NotFoundException si absent)
    await this.detail(projectId);

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      const name = input.name.trim();
      // Vérifie l'unicité (sans bloquer si le nom n'a pas changé)
      const existing = await this.databaseService.query(
        'SELECT 1 FROM projects WHERE name = $1 AND id::text <> $2 LIMIT 1',
        [name, projectId]
      );
      if (existing.rowCount) {
        throw new ConflictException(`Un chantier nommé « ${name} » existe déjà`);
      }
      sets.push(`name = $${idx++}`);
      values.push(name);
    }

    if (input.locationGps !== undefined) {
      sets.push(`location_gps = $${idx++}`);
      values.push(input.locationGps);
    }

    if (input.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(input.status);
    }

    if (sets.length === 0) return this.detail(projectId);

    values.push(projectId);
    await this.databaseService.query(
      `UPDATE projects SET ${sets.join(', ')} WHERE id::text = $${idx}`,
      values
    );

    this.auditService.append('project.updated', actorId, { projectId, changes: input });
    return this.detail(projectId);
  }

  private toProject(row: Record<string, unknown>): Project {
    return {
      id: String(row['id']),
      name: String(row['name'] ?? ''),
      locationGps: row['location_gps'] === null ? null : String(row['location_gps']),
      status: String(row['status'] ?? 'ACTIVE'),
      createdAt: new Date(String(row['created_at'])).toISOString(),
      // pg renvoie les COUNT en `bigint`, donc sous forme de chaîne.
      openNcrCount: Number(row['open_ncr_count'] ?? 0),
      totalNcrCount: Number(row['total_ncr_count'] ?? 0)
    };
  }
}
