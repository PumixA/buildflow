# Phase 10 - Sécurité OIDC/MFA, rôles et audit

## Sécurité

- service d'authentification métier:
  - `src/auth/auth.service.ts`
  - config OIDC,
  - création de session avec MFA.
- endpoints:
  - `GET /auth/config`
  - `POST /auth/session`

## RBAC

- décorateur `@Roles(...)`.
- guard global `RolesGuard` via `APP_GUARD`.
- authentification par en-tête `Authorization: Bearer <token>`, le jeton étant délivré
  par `POST /auth/session` après mot de passe et code MFA. Le rôle est lu dans la claim
  `roles` du jeton, et la validation MFA dans la claim `amr`.
- l'en-tête `x-role` est un raccourci réservé au développement : `RolesGuard` ne
  l'accepte que si `NODE_ENV=development`. En `production`, une requête ne portant que
  cet en-tête reçoit `401`.

**Corrigé (2026-07) :** le guard est désormais **fail-closed** — toute route sans
`@Roles()` ou `@Public()` est refusée (401). `GET /reporting/kpi` est protégé par
`@Roles`. Voir `services/api-gateway/src/modules/auth/roles.guard.ts` et
le correctif dans le commit `8fb24d1`.

## Audit trail

- journal append-only hashé:
  - `src/audit/audit.service.ts`
  - `services/api-gateway/src/modules/audit/*`
- endpoint:
  - `GET /audit/logs`
- événements audités sur flux NCR/HSE (création, statut, actions, clôture).
