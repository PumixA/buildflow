# Database Layer

## Source unique du schéma

`migrations/` fait autorité. Il n'y a plus de `schema.sql` : ce fichier doublonnait
les migrations et les deux avaient divergé (`sync_queue` n'existait que dans l'un,
d'où sa disparition sur tout volume recréé).

## Application des migrations

`MigrationService` (module `database` de l'API) applique au démarrage les fichiers
`.sql` du répertoire, par ordre alphabétique, et consigne ceux déjà joués dans la
table `schema_migrations`.

Concrètement : **un simple `docker compose up` suffit désormais à mettre le schéma
à jour.** Auparavant le schéma n'était injecté que par
`/docker-entrypoint-initdb.d/`, que PostgreSQL n'exécute que sur un répertoire de
données vide — toute évolution exigeait un `docker compose down -v`, et une table
ajoutée après la création du volume restait absente sans avertissement.

Une migration qui échoue interrompt le démarrage de l'API, volontairement : mieux
vaut un conteneur qui ne monte pas qu'une API qui sert des requêtes sur un schéma
incohérent.

## Ajouter une migration

Créer `NNN_description.sql` en incrémentant le numéro. Contraintes :

- **ne jamais modifier une migration déjà appliquée** — en écrire une nouvelle ;
- écrire des instructions idempotentes (`IF NOT EXISTS`) quand c'est possible ;
- encadrer par `BEGIN;` / `COMMIT;`.

Le répertoire est surchargeable par la variable `MIGRATIONS_DIR`.
