# BuildFlow - Flux Git Fiabilité (Complet)

## Objectif

Ce document décrit le flux Git opérationnel complet à suivre sur BuildFlow, aligné avec adminDelorme, sans logique de déploiement serveur.

## Modèle de branches

- `main`: branche stable
- `dev`: branche d'intégration
- branches de travail:
  - `feat/*`
  - `fix/*`
  - `chore/*`
  - `refactor/*`
  - `hotfix/*`
- branches de release:
  - `release/vX.Y.Z`

## Règles de merge

- PR vers `dev`:
  - source autorisée: `feat/*`, `fix/*`, `chore/*`, `refactor/*`, `hotfix/*`
- PR vers `main`:
  - source autorisée: `release/vX.Y.Z`

Contrôle automatique:
- workflow: `.github/workflows/pr-policy.yml`
- check attendu: `branch-policy`

## Checks de fiabilité requis

Workflow principal:
- `.github/workflows/ci.yml`

Checks attendus:
- `api`
- `web`
- `mobile`

Les branches `dev` et `main` imposent:
- PR obligatoire,
- checks obligatoires (`branch-policy`, `api`, `web`, `mobile`),
- branche à jour avec la base (`strict`),
- push forcé interdit.

## Cycle complet (pas à pas)

### 1. Travail vers dev

```bash
git fetch origin
git checkout dev
git pull --rebase origin dev
git checkout -b chore/exemple-fiabilite

# ... modifications ...

git add <fichiers>
git commit -m "chore(ci): exemple fiabilite"
git push -u origin chore/exemple-fiabilite
```

Créer la PR:
- `chore/exemple-fiabilite -> dev`

Vérifier:
- `branch-policy` = pass
- `api` = pass
- `web` = pass
- `mobile` = pass

Merge PR vers `dev`.

### 2. Release vers main

```bash
git fetch origin
git checkout dev
git pull --rebase origin dev
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
```

Créer la PR:
- `release/vX.Y.Z -> main`

Vérifier:
- `branch-policy` = pass
- `api` = pass
- `web` = pass
- `mobile` = pass

Merge PR vers `main`.

### 3. Tag release

```bash
git fetch origin
git checkout main
git pull --rebase origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Vérifications rapides

```bash
gh workflow list -R PumixA/buildflow
gh api repos/PumixA/buildflow/branches/dev/protection
gh api repos/PumixA/buildflow/branches/main/protection
gh run list -R PumixA/buildflow --limit 10
```

## Notes pratiques

- Repo maintenu en solo:
  - `required_approving_review_count` peut rester à `0` sur `main` pour éviter le blocage d'approbation de sa propre PR.
- Les branches `release/*` sont conservées pour l'historique.
