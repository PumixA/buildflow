# Phase 11 - CI/CD renforcé

## Workflow unifié

- fichier principal: `.github/workflows/ci.yml`
- suppression du doublon: `.github/workflows/main.yml`

## Étapes pipeline

- install (`npm ci`)
- lint
- tests + couverture
- audit sécurité (`npm audit --audit-level=high`)
- build Docker
- déploiement staging conditionné à la branche `main`

## Déploiement staging

- script versionné: `.github/scripts/deploy-staging.sh`
- dépend de la variable `STAGING_URL`.
