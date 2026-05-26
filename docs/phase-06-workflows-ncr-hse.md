# Phase 6 - Workflows NCR/HSE implémentés

## NCR

- validations métier:
  - photo obligatoire,
  - projectId obligatoire,
  - coordonnées GPS obligatoires et bornées.
- cycle de statut:
  - `OPEN`
  - `IN_ANALYSIS`
  - `IN_PROGRESS`
  - `RESOLVED`
  - `CLOSED`
- assignation de tâches correctives.
- ajout de preuve de clôture.
- clôture finale bloquée sans preuve photo.

## HSE

- déclaration d'incident avec gravité (`MINOR`, `MAJOR`, `CRITICAL`).
- création d'actions conservatoires.
- mise en sécurité du site.
- résolution d'incident.
- vue dashboard synthétique.

## API Gateway

- routes NCR enrichies (`status`, `tasks`, `closure-proof`, `close`).
- routes HSE enrichies (`actions`, `secure`, `resolve`, `dashboard`).
