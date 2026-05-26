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
- contrôle du rôle via en-tête `x-role`.

## Audit trail

- journal append-only hashé:
  - `src/audit/audit.service.ts`
  - `services/api-gateway/src/modules/audit/*`
- endpoint:
  - `GET /audit/logs`
- événements audités sur flux NCR/HSE (création, statut, actions, clôture).
