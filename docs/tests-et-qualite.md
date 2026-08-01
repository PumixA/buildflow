# Tests et qualité

Mesures du 1er août 2026, reproductibles par `npm run test:cov`.

## Synthèse

| Indicateur | Valeur |
|---|---|
| Tests automatisés | **82** |
| Suites | 14 |
| Couverture globale (instructions) | **46,04 %** |
| Branches | 34,69 % |
| Fonctions | 40,57 % |
| Lint, compilation | sans erreur |
| Vulnérabilités critiques | 0 |

## Le périmètre mesuré a été corrigé

La couverture affichait auparavant **77 %**. Ce chiffre portait sur `src/**`
uniquement — les services métier testables — et **excluait
`services/api-gateway/src/**`, c'est-à-dire l'application déployée**.

Le périmètre a été élargi à la gateway et aux bibliothèques partagées. La couverture
réelle est de **46,04 %**. Les deux chiffres ne sont pas comparables : le périmètre a
triplé.

Les seuils de `jest.config.js` sont calés sur cette mesure réelle. Ils jouent le rôle
de cliquet — la couverture ne peut plus régresser — et rendent visible à chaque
exécution l'écart avec l'objectif de 70 %, **qui n'est pas atteint**.

Exclusions assumées : `main.ts` (amorçage), `*.module.ts` (câblage déclaratif), DTO
(déclarations de validation sans logique).

## Répartition

| Module | Couverture | Lecture |
|---|---|---|
| `src/` (domaine NCR) | **100 %** | Cœur métier |
| `src/sync` | 94,82 % | Moteur de synchronisation, logique pure |
| `src/hse` | 93,33 % | |
| `src/auth` | 96,66 % | Résolution du secret, vérification des jetons |
| `src/ncr` | 80,55 % | |
| `reporting` (gateway) | 70,00 % | KPI calculés |
| `projects` (gateway) | 66,66 % | |
| `sync` (gateway) | **36,25 %** | Voir écart ci-dessous |
| `ncr` (gateway) | 31,38 % | |
| `hse` (gateway) | 30,30 % | |
| `storage`, `database`, `messaging`, `audit` | 8 à 21 % | Adaptateurs d'infrastructure |

## Écart avec les critères d'acceptation

Le Livrable 3 impose, dans son *Definition of Done* :

> « Le code écrit pour le moteur de synchronisation et la base locale doit être
> couvert par des tests unitaires/intégration à hauteur de **70 % minimum**. »

**Cet objectif n'est pas atteint pour la partie déployée.**

| Composant | Couverture | Seuil |
|---|---|---|
| `src/sync/sync.service.ts` — logique de synchronisation | 94,82 % | ✅ |
| `services/api-gateway/.../sync.service.ts` — service exécuté | **13,55 %** | ❌ |

La logique métier est bien couverte ; la couche qui l'expose, persiste et publie les
événements ne l'est pas. C'est elle qui tourne en production.

## Ce que les tests couvrent réellement

Au-delà du chiffre, plusieurs tests portent sur des **non-régressions de failles
constatées**, ce qui a plus de valeur qu'un pourcentage :

- Un jeton forgé avec le secret publié dans le dépôt est rejeté
- Une route sans `@Roles` refuse une requête anonyme
- Un compte technique en `hash-placeholder` ne peut pas ouvrir de session
- Un envoi de photo sur une NCR inexistante ne dépose aucun objet orphelin
- Le filtrage des actions en retard est fait en SQL, pas en mémoire
- Un délai de clôture non mesurable vaut `null` et non zéro

## Chaîne d'intégration

`.github/workflows/ci.yml` — déclenché sur les branches de travail et les PR vers
`dev` et `main`.

| Job | Contenu | Bloquant |
|---|---|---|
| `api` | lint, tests + seuils de couverture, build, `npm audit --audit-level=critical` | ✅ |
| `web` | build Next.js | ✅ |
| `mobile` | `flutter analyze`, `flutter test` | ✅ |
| `smoke-docker` | **démarre la stack** et vérifie qu'elle répond | ✅ |
| `docker-build` | build et push vers GHCR | `main` / `dev` uniquement |

### Le job qui manquait

`docker-build` construisait l'image et la poussait **sans jamais l'exécuter**. C'est ce
qui a laissé passer une panne pendant trois semaines : un `require()` avait été ajouté
sans son paquet, l'image se construisait sans erreur, et l'API sortait en
`MODULE_NOT_FOUND` au démarrage.

`smoke-docker` démarre désormais la stack, attend l'état sain, puis vérifie que
`/health` répond 200, qu'une route protégée répond 401, et que les migrations se sont
appliquées. Contrairement à `docker-build`, il s'exécute **sur les pull requests** —
là où la régression doit être vue.

## Commandes

```bash
npm run lint            # ESLint, sans avertissement toléré
npm run build           # tsc, compilation stricte
npm test                # 82 tests
npm run test:cov        # avec couverture et seuils

cd apps/mobile-flutter
flutter analyze && flutter test
```
