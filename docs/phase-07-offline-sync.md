# Phase 7 - Synchronisation offline-first & conflits 409

## Implémentation

- service de synchronisation métier: `src/sync/sync.service.ts`
- endpoints gateway:
  - `GET /sync/status`
  - `GET /sync/queue`
  - `POST /sync/push`
  - `POST /sync/resolve`

## Règles gérées

- statut local `PENDING` / `SYNCED` / `CONFLICT`.
- création cloud :
  - code `201` si enregistrement inédit.
- mise à jour cloud :
  - code `200` si version locale >= version cloud.
- conflit version :
  - code `409` si version locale < cloud.
- résolution:
  - automatique `LWW`,
  - manuelle `MANUAL`.
