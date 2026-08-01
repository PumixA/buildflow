# BuildFlow

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

**Prérequis — une seule fois par poste.** L’API refuse de démarrer sans secret de
signature des jetons, et `docker-compose.yml` n’en fournit volontairement aucun par
défaut : une valeur écrite dans un fichier versionné serait publique, donc équivalente
à pas de secret. Générer le sien dans `.env` (non versionné) :

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
```

Sans cette variable, `docker compose up` s’arrête immédiatement avec le message
indiquant la commande ci-dessus.

Un seul lancement démarre ensuite l’API, le back-office web, PostgreSQL, RabbitMQ et MinIO :

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
- `docs/` : documentation technique — architecture, modèle de données, sécurité,
  tests, exploitation, et traçabilité des livrables.

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

- Comptes **en base**, mots de passe hachés en **argon2id**. `POST /auth/session` délivre
  un JWT HS256 après mot de passe **et** code MFA.
- `JWT_SECRET` obligatoire hors développement : l'API refuse de démarrer sans lui, et
  rejette la valeur de développement publiée dans le dépôt.
- Limitation de débit sur `/auth/session` : 10 tentatives par minute et par IP.
- RBAC **fail-closed** : toute route exige une authentification, sauf celles marquées
  `@Public()` — `/health` et `/auth/*`. Un test fige cette liste.
- L'en-tête `x-role` est un raccourci de développement : il n'est accepté que si
  `NODE_ENV=development`. Les conteneurs tournant en `production`, une requête ne
  portant que cet en-tête reçoit `401`.
- Photos de constat scellées en **Object Lock COMPLIANCE**, rétention 365 jours.
- Journal d'audit append-only, chaîné par hachage SHA-256.

Limites connues, documentées pour ne pas les laisser croire résolues :

- Le code MFA est **constant** : il ne dépend ni du temps, ni d'un secret par
  utilisateur. Le passage à un TOTP réel reste à faire.
- La chaîne d'audit n'est **pas scellée par clé** : elle détecte une corruption
  accidentelle, pas une falsification volontaire. Le fichier n'est par ailleurs monté
  sur aucun volume, donc détruit à chaque reconstruction d'image.
- La base locale du mobile (SQLite) **n'est pas chiffrée**.
- Aucun fournisseur OIDC n'est déployé : les jetons sont émis localement.

Le détail, chiffré et séquencé, figure dans `docs/securite.md` et
`docs/conformite-livrables.md`.

## CI/CD

Workflows:

- `.github/workflows/ci.yml`:
  - contrôles backend (`lint`, tests avec seuils de couverture, `build`, `npm audit`),
  - build web,
  - analyse et tests Flutter,
  - `smoke-docker` : **démarre réellement la stack** et vérifie qu'elle répond.
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

- Voir `docs/exploitation.md` pour :
  - démarrage complet API / Web / Mobile,
  - usage de l'émulateur Android et des appareils réels,
  - tests qualité,
  - flux Git recommandé et résolution des branches empilées.
- Voir `docs/conformite-livrables.md` pour la traçabilité entre les engagements du
  cadrage, les critères d'acceptation et l'état réellement livré.

## Variables d'environnement clés

- `JWT_SECRET` — **obligatoire** hors `NODE_ENV=development|test`. Signature des jetons
  de session. Le démarrage échoue si la variable est absente, reprend la valeur de
  développement publiée dans le dépôt, ou fait moins de 32 caractères.
  Générer : `openssl rand -hex 32`
- `DATABASE_URL`
- `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_REQUIRE_MFA`
- `S3_REGION`, `S3_WORM_BUCKET`
- `AMQP_URL`, `AMQP_EXCHANGE`
- `AUDIT_LOG_FILE`
- `API_BASE_URL` (front web)
