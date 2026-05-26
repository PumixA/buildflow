# Phase 4 - Modèle de données complet

## Livrables créés

- `infra/database/schema.sql`
- `infra/database/migrations/001_init_buildflow.sql`
- `libs/domain/src/models.ts`
- `libs/domain/src/events.ts`

## Couverture fonctionnelle

- Schéma SQL aligné avec les entités du livrable 2 :
  - `users`
  - `projects`
  - `ncr`
  - `ncr_photos`
  - `incidents`
  - `hse_actions`
- Index de performance de base ajoutés sur les FK.
- Contrats TypeScript partagés pour uniformiser backend/web/mobile.
