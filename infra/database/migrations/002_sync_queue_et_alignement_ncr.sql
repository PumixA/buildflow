-- Migration 002 : file de synchronisation et alignement du schéma NCR
--
-- Regroupe deux corrections :
--
--   1. `sync_queue` n'existait que dans `schema.sql`, jamais dans les migrations.
--      Comme PostgreSQL n'exécute `/docker-entrypoint-initdb.d/` que sur un
--      répertoire de données vide, la table disparaissait de tout volume
--      recréé et `GET /sync/status` répondait 500.
--
--   2. Trois désalignements entre le code et le schéma rendaient la
--      persistance des NCR totalement inopérante (colonne `priority`
--      inexistante, `local_id` typé UUID, `projects.name` sans unicité).

BEGIN;

-- 1. File de synchronisation (offline-first)

CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL DEFAULT 'ncr',
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  server_id UUID,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_local_id ON sync_queue(local_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_content_hash ON sync_queue(content_hash);

-- 2. Colonne `priority`
--
-- NcrService l'écrit à l'INSERT et la lit au SELECT, mais elle n'a jamais
-- existé en base : chaque persistance échouait sur
-- `column "priority" of relation "ncr" does not exist`.

ALTER TABLE ncr ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM';

-- 3. Type de `local_id`
--
-- Le domaine génère des identifiants applicatifs de la forme "ncr-1", que
-- PostgreSQL rejetait sur une colonne UUID
-- (`invalid input syntax for type uuid`).
-- L'ADD couvre le cas d'une base neuve, l'ALTER celui d'une base existante.

ALTER TABLE ncr ADD COLUMN IF NOT EXISTS local_id VARCHAR(255);
ALTER TABLE ncr ALTER COLUMN local_id TYPE VARCHAR(255) USING local_id::text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ncr_local_id ON ncr(local_id);

-- 4. Unicité de `projects.name`
--
-- Sans contrainte, deux créations simultanées du même chantier produisent des
-- doublons silencieux (5 lignes observées pour un seul PROJ-1). On repointe
-- d'abord les références vers la ligne la plus ancienne, puis on supprime les
-- doublons, avant de poser l'index.

WITH ranked AS (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY name ORDER BY created_at, id) AS canonical_id,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM projects
)
UPDATE ncr SET project_id = ranked.canonical_id
FROM ranked
WHERE ncr.project_id = ranked.id AND ranked.rn > 1;

WITH ranked AS (
  SELECT id,
         FIRST_VALUE(id) OVER (PARTITION BY name ORDER BY created_at, id) AS canonical_id,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM projects
)
UPDATE incidents SET project_id = ranked.canonical_id
FROM ranked
WHERE incidents.project_id = ranked.id AND ranked.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM projects
)
DELETE FROM projects
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- Note : `schema.sql` se terminait par
--   ALTER TABLE ncr ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'PENDING';
-- qui contredisait le BOOLEAN déclaré 70 lignes plus haut. La colonne existant
-- déjà, l'ALTER était un no-op silencieux. Le type BOOLEAN est celui qu'attend
-- le domaine : cette DDL morte n'est pas reprise ici.

COMMIT;
