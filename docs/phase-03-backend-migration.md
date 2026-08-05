# Phase 3 - Base backend NestJS modulaire

## Réalisations

- Bootstrap NestJS créé (`services/api-gateway/src/main.ts`).
- Module racine avec imports des domaines : Health, NCR, HSE, Auth, Reporting, Sync.
- Contrôleurs et services initiaux exposés derrière le gateway.

## Endpoints initiaux

- `GET /health`
- `GET /ncr`, `POST /ncr`
- `GET /hse/dashboard`, `POST /hse/incidents`
- `GET /auth/config`
- `GET /reporting/kpi`
- `GET /sync/status`, `POST /sync/push`

Cette base est volontairement incrémentale et sera enrichie dans les phases 4 à 10.
