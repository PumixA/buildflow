# Phase 12 - Tests étendus et jeux de données cas limites

## Tests ajoutés

- `src/ncr/ncr.service.spec.ts`
- `src/ncr/ncr.controller.spec.ts`
- `src/hse/hse.service.spec.ts`
- `src/sync/sync.service.spec.ts`

## Cas couverts

- photo obligatoire,
- flag `sync_status=false` par défaut,
- `projectId` obligatoire,
- coordonnées GPS obligatoires,
- dashboard HSE,
- conflit de synchronisation `409`,
- résolution de conflit `LWW`.

## Fixtures

- `ncr_test_data.json` enrichi (GPS invalides, images corrompues),
- `test/fixtures/ncr_edge_cases.json`.
