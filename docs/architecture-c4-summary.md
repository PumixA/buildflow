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

## Choix d'implémentation

Le projet a délibérément opté pour une **architecture modulaire au sein d'un seul conteneur NestJS**
plutôt qu'un déploiement multi-conteneurs. Chaque domaine métier (NCR, HSE, Auth, Sync, Audit,
Reporting) est isolé dans son propre module NestJS avec injection de dépendances — les modules
sont découplés et pourraient être extraits en conteneurs indépendants dans une V2.

**Pourquoi ce choix :**
- MVP avec une équipe de 2 personnes : priorité à la vélocité et à la simplicité de déploiement
- `docker-compose.yml` unique, 1 commande pour tout lancer (`docker compose up --build`)
- Les contrats d'interface entre modules sont déjà définis (DTOs, events RabbitMQ)
- Le passage à des conteneurs séparés est documenté comme axe d'amélioration V2

**Ce qui est déjà en place pour le découpage futur :**
- Bus d'événements RabbitMQ avec topics par domaine (`ncr.created`, `hse.incident.created`, etc.)
- Chaque module a son propre schéma PostgreSQL (tables `ncr`, `incidents`, `hse_actions`, etc.)
- Les services `services/*` contiennent les README de spécification pour les futurs conteneurs

## Flux clés

1. Création NCR mobile avec photo + GPS.
2. Stockage local puis synchronisation cloud.
3. Analyse/assignation côté QSE.
4. Clôture avec preuve photo et audit trail.
5. Dashboard HSE pour incidents critiques.
