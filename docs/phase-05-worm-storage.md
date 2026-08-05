# Phase 5 - Adapter de stockage preuves WORM

## Implémentation

- `services/api-gateway/src/modules/storage/worm-storage.adapter.ts`
- `services/api-gateway/src/modules/storage/storage.module.ts`

## Comportement

- Calcul hash SHA-256 de la preuve.
- Génération d'URL de stockage type S3.
- Verrouillage WORM logique (`wormLocked=true`).
- Stockage in-memory pour exécution locale/tests.

Le point d'extension vers un bucket S3 avec Object Lock est prêt via cet adapter.
