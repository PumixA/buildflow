# BuildFlow - Livrables Alignés (Phases 1 à 13)

Plateforme BuildFlow orientée Qualité (NCR), Sécurité (HSE), offline-first et traçabilité.

## Démarrage rapide (API Gateway)

1. `npm install`
2. `cp .env.example .env` (adapter les valeurs)
3. `npm run test`
4. `npm run start`
5. Vérifier `GET /health`

## Structure

- `services/api-gateway` : backend NestJS modulaire (NCR/HSE/Auth/Sync/Reporting/Audit).
- `src` : services métier testables (NCR, HSE, Sync, Auth, Audit).
- `infra/database` : schéma PostgreSQL et migrations.
- `apps/web` : écrans back-office Next.js (liste NCR, détail, dashboard HSE).
- `apps/mobile-flutter` : écrans Flutter (création NCR + synchronisation).
- `docs/phase-*.md` : livrables détaillés par phase.

## Endpoints principaux

- `GET /health`
- `GET /ncr`, `GET /ncr/:ncrId`, `POST /ncr`
- `PATCH /ncr/:ncrId/status`
- `POST /ncr/:ncrId/tasks`
- `POST /ncr/:ncrId/closure-proof`
- `POST /ncr/:ncrId/close`
- `GET /hse/dashboard`
- `POST /hse/incidents`
- `POST /hse/actions`
- `POST /hse/incidents/:incidentId/secure`
- `POST /hse/incidents/:incidentId/resolve`
- `GET /sync/status`, `GET /sync/queue`, `POST /sync/push`, `POST /sync/resolve`
- `GET /auth/config`, `POST /auth/session`
- `GET /audit/logs`

## Sécurité

- OIDC/MFA simulé via module auth.
- RBAC via décorateur `@Roles` et guard global (`x-role` requis).
- journal d'audit append-only hashé.

## CI/CD

Workflows:

- `.github/workflows/ci.yml`:
  - checks de fiabilité backend (`lint`, `tests`, `build`),
  - build web,
  - analyse et tests Flutter.
- `.github/workflows/pr-policy.yml`:
  - PR vers `dev` autorisées uniquement depuis `feat/*`, `fix/*`, `chore/*`, `refactor/*`, `hotfix/*`,
  - PR vers `main` autorisées uniquement depuis `release/vX.Y.Z`.

## Frontends

- Web:
  - `npm --workspace apps/web run build`
  - `npm --workspace apps/web run dev`
- Mobile Flutter:
  - `cd apps/mobile-flutter`
  - `flutter pub get`
  - `flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000`

## Guide d'exploitation et Git

- Voir `docs/exploitation-et-flux-git.md` pour:
  - démarrage complet API/Web/Mobile,
  - création/usage de l'émulateur Android,
  - tests qualité,
  - flux Git recommandé et commandes de vérification.

## Variables d'environnement clés

- `DATABASE_URL`
- `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_REQUIRE_MFA`
- `S3_REGION`, `S3_WORM_BUCKET`
- `AMQP_URL`, `AMQP_EXCHANGE`
- `AUDIT_LOG_FILE`
- `API_BASE_URL` (front web)
