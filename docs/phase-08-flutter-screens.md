# Phase 8 - Écrans Flutter ajoutés

## Fichiers

- `apps/mobile-flutter/lib/main.dart`
- `apps/mobile-flutter/lib/screens/ncr_create_screen.dart`
- `apps/mobile-flutter/lib/screens/sync_screen.dart`
- `apps/mobile-flutter/pubspec.yaml`

## Flux couverts

- création NCR/incident avec champs métier (titre, description, gravité, GPS, photo),
- enregistrement local (offline-first),
- écran de synchronisation avec statuts visuels :
  - `PENDING`,
  - `SYNCING`,
  - `SYNCED`.
