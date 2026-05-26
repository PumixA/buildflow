# Recette Finale BuildFlow — 31 mars 2026

## Objectif

Valider l'exécution complète des 3 sprints de correction et vérifier la conformité technique finale (backend, web, mobile, CI/infra).

## Environnement de recette

- Date: 2026-03-31
- OS: Nobara Linux 43
- Node/NPM: environnement projet local
- Flutter: 3.41.6 (stable)

## Vérifications exécutées

### Backend (API Gateway)

- `npm run lint` -> OK
- `npm run build` -> OK
- `npm run test:cov` -> OK
  - 5 suites / 20 tests: PASS
  - Couverture globale: `91.5%` statements, `77.61%` branches, `97.36%` fonctions, `91.94%` lines

### Web (Next.js)

- `npm --workspace apps/web run build` -> OK
- Build de production généré sans erreur bloquante.
- Avertissement non bloquant: plugin ESLint Next.js non détecté dans la configuration ESLint.

### Mobile (Flutter)

- `flutter pub get` -> OK
- `flutter analyze` -> OK (No issues found)
- `flutter test` -> OK (3 tests passés)

## Smoke tests API (runtime)

API démarrée avec `npm run start`, puis tests HTTP:

- `GET /health` -> `200`, statut `UP`
- `POST /sync/push` -> `201`, statut `SYNCED`
- `POST /ncr` (rôle `CHEF_CHANTIER`, payload complet) -> `201`
- `GET /ncr` (rôle `RESPONSABLE_QSE`) -> `200`
- `POST /hse/incidents` (payload conforme) -> `201`
- `GET /hse/dashboard` -> `200` avec incident remonté

## Correctifs complémentaires exécutés

1. Tests Flutter ajoutés:
   - `test/models/local_report_test.dart`
   - `test/services/local_store_test.dart`
   - `test/widget_test.dart`
2. Validation payload API activée via DTO:
   - `ncr`, `hse`, `sync`, `auth`
   - payloads invalides désormais en `400 Bad Request` (confirmé en smoke test).
3. Android SDK local installé et configuré:
   - `flutter config --android-sdk /home/pumix/Android/Sdk`
   - `flutter doctor --android-licenses` exécuté
   - `flutter doctor -v` -> Android toolchain OK (SDK 36.1.0).

## Écarts non bloquants restants

1. Web: warning ESLint Next.js plugin non détecté (build OK).
2. Linux toolchain: warning `eglinfo` absent (`mesa-utils`) non bloquant pour la recette.

## Verdict final

Les 3 sprints demandés sont implémentés et la recette finale est **passante**.
Les 3 points restants identifiés ont été exécutés et validés (tests Flutter, validation API DTO/400, Android SDK opérationnel).

## Actions immédiates recommandées

1. Optionnel: intégrer le plugin ESLint Next.js pour supprimer le warning de build web.
2. Optionnel: installer `mesa-utils` pour lever l'avertissement Linux `eglinfo`.
