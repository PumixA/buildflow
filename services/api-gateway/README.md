# BuildFlow API Gateway (NestJS)

Point d'entrée unique des clients web/mobile.

Expose les routes santé et agrège les modules :

- NCR,
- HSE,
- Auth (OIDC/MFA),
- Sync,
- Reporting,
- Projects (chantiers),
- Audit (journaux WORM chaînés).

**Sécurité :** Guard fail-closed (`@Public()` explicite requis), rate limiting global (30 req/min),
RBAC par `@Roles(...)`, JWT signé localement (HS256), MFA simulé (code `123456`).

**Démarrage :** `npm run start:dev` (nécessite `JWT_SECRET` dans `.env`).
