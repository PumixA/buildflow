# BuildFlow - Livrables Alignés (Phases 1 à 13)

Plateforme BuildFlow orientée Qualité (NCR), Sécurité (HSE), offline-first et traçabilité.

## Démarrage Docker local avec rechargement

Mode local calqué sur le fonctionnement avec bind mounts : les changements faits dans le code sont montés directement dans les conteneurs.

```bash
docker compose -f docker-compose.yml -f docker-compose.local-dev.yml up --build --watch
```

Après le premier build, relance simple sans rebuild :

```bash
docker compose -f docker-compose.yml -f docker-compose.local-dev.yml up --watch
```

- API en watch : http://localhost:3000/health
- Web Next dev : http://localhost:3001

## Démarrage Docker complet

Un seul lancement démarre l’API, le back-office web, PostgreSQL, RabbitMQ et MinIO :

```bash
docker compose up --build
```

Accès locaux :

- Web : http://localhost:3001
- API : http://localhost:3000/health
- RabbitMQ Management : http://localhost:15672 (`guest` / `guest`)
- MinIO Console : http://localhost:9001 (`buildflow` / `buildflow-secret`)

Arrêt :

```bash
docker compose down
```

Réinitialisation des volumes PostgreSQL/MinIO :

```bash
docker compose down -v
```

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

- OIDC/MFA simulé via le module `auth`. `POST /auth/session` délivre un JWT signé (HS256)
  après mot de passe **et** code MFA.
- RBAC via le décorateur `@Roles` et le guard global `RolesGuard`.
  L'authentification se fait par en-tête `Authorization: Bearer <token>`.
- L'en-tête `x-role` est un **raccourci de développement uniquement** : il n'est accepté
  que si `NODE_ENV=development`. Les conteneurs tournant en `production`, une requête
  portant seulement `x-role` y reçoit `401`.
- Journal d'audit append-only, chaîné par hachage SHA-256.

Limites connues, documentées pour ne pas les laisser croire résolues :

- Le guard est **fail-open** : une route sans `@Roles` est publique. C'est aujourd'hui le
  cas de `GET /reporting/kpi`, accessible sans aucun en-tête.
- Les comptes de démonstration sont codés en dur, mots de passe en clair et code MFA fixe.
  La colonne `users.hashed_password` existe mais n'est pas encore utilisée par
  l'authentification.
- La chaîne d'audit n'est pas scellée par clé : elle détecte une corruption accidentelle,
  pas une falsification volontaire.

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
