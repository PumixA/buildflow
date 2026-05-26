# Phase 2 - Structure cible mise en place

## Arborescence principale

- `apps/web` : front back-office React/Next.js.
- `apps/mobile-flutter` : application terrain Flutter.
- `services/api-gateway` : point d'entrée backend NestJS.
- `services/ncr-service` : domaine Qualité.
- `services/hse-service` : domaine Sécurité.
- `services/identity-service` : identité et accès.
- `services/reporting-service` : reporting KPI.
- `libs/domain` : contrats partagés.
- `infra/database` : schéma/migrations PostgreSQL.
- `infra/messaging` : contrats de bus d'événements.

Cette structure sert de base aux implémentations des phases 3 à 13.
