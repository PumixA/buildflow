# Modèle de données

Schéma PostgreSQL vérifié au 1er août 2026. Neuf tables, dont une technique.

## Tables

| Table | Colonnes | Rôle |
|---|---|---|
| `projects` | 5 | Chantiers |
| `users` | 7 | Comptes et rôles |
| `ncr` | 14 | Non-conformités |
| `ncr_photos` | 7 | Photos de constat scellées |
| `incidents` | 9 | Incidents HSE |
| `hse_actions` | 6 | Actions correctives HSE |
| `sync_queue` | 11 | File de synchronisation mobile |
| `audit_logs` | 7 | Journal chaîné |
| `schema_migrations` | 2 | Migrations appliquées |

## Relations

```
projects ──┬─< ncr ──< ncr_photos
           └─< incidents ──< hse_actions
users ─────┬─< ncr.creator_id
           ├─< incidents.creator_id
           └─< hse_actions.responsible_id
```

Toutes les clés étrangères sont réelles et contraintes. `ncr_photos` est en
`ON DELETE CASCADE` : supprimer une NCR supprime ses références de photos — mais **pas
les objets MinIO**, immuables par construction.

## Table `ncr`

```sql
id           uuid          PRIMARY KEY
project_id   uuid          NOT NULL  → projects(id)
creator_id   uuid          NOT NULL  → users(id)
title        varchar(180)  NOT NULL
description  text
status       varchar(32)   NOT NULL DEFAULT 'OPEN'
priority     varchar(16)   NOT NULL DEFAULT 'MEDIUM'
latitude     numeric(10,7) NOT NULL
longitude    numeric(10,7) NOT NULL
sync_status  boolean       NOT NULL DEFAULT false
local_id     varchar(255)  UNIQUE
version      integer       NOT NULL DEFAULT 1
created_at   timestamp     NOT NULL DEFAULT now()
updated_at   timestamp     NOT NULL DEFAULT now()
```

**`local_id` porte l'idempotence.** L'index unique `idx_ncr_local_id` permet à la
synchronisation de rejouer un envoi sans dupliquer : l'upsert met à jour la NCR
existante. C'est ce qui satisfait le scénario 4 des critères d'acceptation.

**Statuts :** `OPEN` → `IN_ANALYSIS` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
**Priorités :** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

Le mobile raisonne en gravité (`MINOR`, `MAJOR`, `CRITICAL`) : la synchronisation
traduit vers la priorité, faute de quoi la colonne rejetterait les deux premières.

## Table `ncr_photos`

```sql
id             uuid          PRIMARY KEY
ncr_id         uuid          NOT NULL  → ncr(id) ON DELETE CASCADE
s3_url         varchar(512)  NOT NULL
geotag_lat     numeric(10,7)
geotag_long    numeric(10,7)
timestamp      timestamp     NOT NULL DEFAULT now()
is_worm_locked boolean       NOT NULL DEFAULT false
```

La géolocalisation du cliché est distincte de celle de la NCR : une même
non-conformité peut être photographiée depuis plusieurs points de l'ouvrage.

`is_worm_locked` reflète l'état réel du scellement, pas une intention. Sans bucket
configuré, il vaut `false` et l'URL passe en `memory://`.

## Table `sync_queue`

```sql
id            uuid          PRIMARY KEY
local_id      varchar(255)  UNIQUE
entity_type   varchar(50)   DEFAULT 'ncr'
version       integer       NOT NULL DEFAULT 1
payload       jsonb         NOT NULL
content_hash  varchar(64)   NOT NULL
status        varchar(20)   DEFAULT 'PENDING'
server_id     uuid
error_message text
```

`content_hash` est un SHA-256 canonique du contenu : il permet de détecter un renvoi
identique sans comparer champ à champ.

`server_id` porte l'identifiant de la NCR créée. Il est renseigné depuis le 1er août
2026 ; auparavant la colonne existait sans jamais être remplie, la synchronisation ne
créant aucune NCR.

## Table `audit_logs`

```sql
id            uuid          PRIMARY KEY
event_type    varchar(128)  NOT NULL
actor_id      varchar(128)  NOT NULL
payload       jsonb         NOT NULL
timestamp     timestamp     NOT NULL
previous_hash varchar(128)  NOT NULL
hash          varchar(128)  NOT NULL
```

Chaque entrée intègre l'empreinte de la précédente : une modification rétroactive
rompt la chaîne, ce que `verifyChain()` détecte.

**Limite de conception :** le chaînage utilise un SHA-256 **sans clé**. Un attaquant
capable d'écrire dans le journal peut recalculer toutes les empreintes suivantes, et
`verifyChain()` répondra `valid: true`. La chaîne détecte l'accident, pas la
falsification. Voir [securite.md](securite.md).

## Migrations

| Fichier | Apport |
|---|---|
| `001_init_buildflow.sql` | Schéma initial |
| `002_sync_queue_et_alignement_ncr.sql` | `sync_queue`, colonne `priority`, `local_id` en varchar, unicité de `projects.name` |
| `003_comptes_de_demonstration.sql` | Comptes en base avec empreintes argon2id |

Elles sont appliquées **au démarrage** par `MigrationService`, qui consigne chaque
migration jouée dans `schema_migrations`. Un échec interrompt le démarrage,
volontairement.

```
[MigrationService] Schéma à jour (3 migration(s)).
```

Ce mécanisme remplace l'injection par `/docker-entrypoint-initdb.d/`, que PostgreSQL
n'exécute que sur un répertoire de données vide : toute évolution de schéma exigeait
auparavant un `docker compose down -v`, avec perte des données.

## Ce que le schéma ne porte pas

Trois notions vivent en mémoire du process et **disparaissent au redémarrage** :

- **Tâches correctives** (`assigneeId`, description, statut) — aucune table
- **Preuves de clôture** — aucune table
- **Historique des changements de statut** — aucune table

C'est l'écart de persistance le plus important. Il bloque notamment le volet
« assignation » du formulaire NCR : le champ existerait, mais son contenu s'évaporerait.
