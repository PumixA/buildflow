> **📆 Snapshot historique** — 31 mars 2026. Les corrections décrites (guard fail-closed,
> auth DB/argon2) ont été appliquées depuis. État « avant/après » documentaire.

# Exécution des Sprints de Correction (31 mars 2026)

## Sprint 1 — Conformité UI/UX

### Web (Next.js)

- Refactor des pages:
  - `apps/web/app/hse/page.tsx`
  - `apps/web/app/ncr/page.tsx`
  - `apps/web/app/ncr/[id]/page.tsx`
- Nouveau shell dashboard et badges:
  - `apps/web/components/dashboard-shell.tsx`
  - `apps/web/components/badges.tsx`
  - `apps/web/components/sync-chart.tsx`
- Thème visuel aligné maquettes:
  - `apps/web/app/styles.css`

### Mobile (Flutter)

- Refonte écran création NCR:
  - `apps/mobile-flutter/lib/screens/ncr_create_screen.dart`
- Refonte écran synchronisation:
  - `apps/mobile-flutter/lib/screens/sync_screen.dart`
- Thémage global:
  - `apps/mobile-flutter/lib/main.dart`

## Sprint 2 — Intégration fonctionnelle

- Web branché API backend avec fallback:
  - `apps/web/lib/api.ts`
  - `apps/web/lib/mock-data.ts`
- Persistance locale mobile SQLite:
  - `apps/mobile-flutter/lib/services/local_store.dart`
- Sync mobile vers backend:
  - `apps/mobile-flutter/lib/services/sync_api.dart`
- Modèle mobile local:
  - `apps/mobile-flutter/lib/models/local_report.dart`
- Persistance backend PostgreSQL ready (optionnelle via `DATABASE_URL`):
  - `services/api-gateway/src/modules/database/database.service.ts`
  - write-through NCR/HSE vers PostgreSQL.

## Sprint 3 — Sécurité, infra, ops

- Vérification OIDC JWT + MFA:
  - `services/api-gateway/src/modules/auth/oidc-verifier.service.ts`
  - `services/api-gateway/src/modules/auth/roles.guard.ts`
- Stockage preuves S3 WORM (avec fallback local):
  - `services/api-gateway/src/modules/storage/worm-storage.adapter.ts`
- Bus d'événements RabbitMQ (avec fallback no-op):
  - `services/api-gateway/src/modules/messaging/messaging.service.ts`
- Audit durable:
  - append-only fichier (`AUDIT_LOG_FILE`) + insertion DB `audit_logs`
  - `src/audit/audit.service.ts`
  - `services/api-gateway/src/modules/audit/audit.service.ts`
- Docker prod multi-stage:
  - `Dockerfile`
  - `tsconfig.build.json`
  - scripts `build` et `start:prod`.
- CI/CD staging réellement scripté:
  - `.github/workflows/ci.yml`
  - `.github/scripts/deploy-staging.sh`

## Recette finale

Voir `docs/recette-finale-2026-03-31.md`.
