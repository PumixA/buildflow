-- Migration 004 : contraintes CHECK sur les colonnes de statut et priorité
--
-- Les colonnes `status`/`priority`/`severity` étaient en VARCHAR libre :
-- aucune contrainte n'empêchait d'écrire une valeur invalide en base.
--
-- Cette migration ajoute des garde-fous côté base, doublant la validation
-- déjà assurée par les DTOs class-validator.

BEGIN;

ALTER TABLE ncr
  ADD CONSTRAINT chk_ncr_status CHECK (status IN ('OPEN','IN_ANALYSIS','IN_PROGRESS','RESOLVED','CLOSED')),
  ADD CONSTRAINT chk_ncr_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL'));

ALTER TABLE incidents
  ADD CONSTRAINT chk_incidents_severity CHECK (severity IN ('MINOR','MAJOR','CRITICAL')),
  ADD CONSTRAINT chk_incidents_status CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED'));

ALTER TABLE hse_actions
  ADD CONSTRAINT chk_hse_actions_status CHECK (status IN ('OPEN','IN_PROGRESS','DONE'));

ALTER TABLE sync_queue
  ADD CONSTRAINT chk_sync_queue_status CHECK (status IN ('PENDING','SYNCED','CONFLICT'));

COMMIT;
