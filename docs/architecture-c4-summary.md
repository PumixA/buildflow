# Architecture C4 (Résumé)

## Niveau conteneur

- Clients :
  - Web Back-office (Next.js)
  - Mobile terrain (Flutter, offline-first)
- Point d'entrée :
  - API Gateway NestJS
- Services métier :
  - NCR
  - HSE
  - Auth (OIDC/MFA)
  - Reporting
  - Sync
  - Audit
- Données et intégrations :
  - PostgreSQL
  - stockage preuves S3 WORM
  - bus d'événements RabbitMQ/Kafka (contrat préparé)

## Flux clés

1. Création NCR mobile avec photo + GPS.
2. Stockage local puis synchronisation cloud.
3. Analyse/assignation côté QSE.
4. Clôture avec preuve photo et audit trail.
5. Dashboard HSE pour incidents critiques.
