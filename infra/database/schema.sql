-- BuildFlow - PostgreSQL target schema

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(64) NOT NULL,
  hashed_password VARCHAR(255) NOT NULL,
  mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  location_gps VARCHAR(120),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ncr (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(180) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  sync_status BOOLEAN NOT NULL DEFAULT FALSE,
  local_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ncr_photos (
  id UUID PRIMARY KEY,
  ncr_id UUID NOT NULL REFERENCES ncr(id) ON DELETE CASCADE,
  s3_url VARCHAR(512) NOT NULL,
  geotag_lat DECIMAL(10, 7),
  geotag_long DECIMAL(10, 7),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  is_worm_locked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  description TEXT NOT NULL,
  sync_status BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hse_actions (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible_id UUID NOT NULL REFERENCES users(id),
  deadline DATE,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  event_type VARCHAR(128) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  previous_hash VARCHAR(128) NOT NULL,
  hash VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ncr_project_id ON ncr(project_id);
CREATE INDEX IF NOT EXISTS idx_incidents_project_id ON incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_ncr_photos_ncr_id ON ncr_photos(ncr_id);
CREATE INDEX IF NOT EXISTS idx_hse_actions_incident_id ON hse_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Sync queue (offline-first persistence)
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

-- Idempotence: unique constraint on local_id + content_hash
ALTER TABLE ncr ADD COLUMN IF NOT EXISTS local_id UUID;
ALTER TABLE ncr ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ncr_local_id ON ncr(local_id);
