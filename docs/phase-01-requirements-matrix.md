> **📆 Document historique** — statuts figés à la phase 1. La plupart des `Planned` sont désormais réalisés.

# Phase 1 - Matrice d'exigences BuildFlow

## Sources analysées

- Livrable de cadrage et conception (objectifs, architecture cible, benchmark technologique).
- Livrable 2 (BPMN NCR/HSE, synchronisation offline, schéma BDD, infrastructure, wireframes, maquettes, CI/CD).

## Légende

- `Done` : déjà implémenté.
- `In Progress` : partiellement implémenté.
- `Planned` : non implémenté mais prévu dans les phases suivantes.

## Matrice

| ID | Exigence | Preuve attendue | Statut initial | Cible de preuve |
| --- | --- | --- | --- | --- |
| REQ-001 | Endpoint de santé `GET /health` | Réponse HTTP 200 avec statut service | Done | Test API + doc run |
| REQ-002 | Stack backend NestJS modulaire | Modules séparés NCR/HSE/Auth/Reporting | Planned | Arborescence + tests unitaires |
| REQ-003 | API Gateway unique | Point d'entrée central pour clients web/mobile | Planned | Contrôleur gateway + routes |
| REQ-004 | Workflow NCR complet | Création, analyse, assignation, clôture | In Progress | Service NCR + tests métier |
| REQ-005 | Photo obligatoire sur NCR | Validation métier bloquante | Done | Tests unitaires |
| REQ-006 | Géolocalisation obligatoire | Latitude/longitude requises | Planned | DTO validation + tests |
| REQ-007 | ProjectId obligatoire | Rattachement au chantier | Planned | DTO validation + tests |
| REQ-008 | Flag offline-first | `sync_status=false` à la création | Done | Test unitaire |
| REQ-009 | Processus HSE | Déclaration incident + criticité + actions | Planned | Service HSE + tests |
| REQ-010 | Synchronisation offline | Pending -> synced avec ACK | Planned | Service Sync + tests |
| REQ-011 | Gestion conflit 409 | Résolution LWW/manuelle | Planned | Tests sync conflit |
| REQ-012 | Schéma BDD complet | Tables users/projects/ncr/ncr_photos/incidents/hse_actions | Planned | SQL migration + mapping TS |
| REQ-013 | PostgreSQL | Persistance cloud | Planned | Config + migrations |
| REQ-014 | SQLite local mobile | Stockage offline terrain | Planned | Code Flutter + doc sync |
| REQ-015 | Stockage S3 WORM | Preuves photos inaltérables | Planned | Adapter WORM + tests |
| REQ-016 | Event bus RabbitMQ/Kafka | Publication événements NCR/HSE | Planned | Publisher + contrat événement |
| REQ-017 | Interface mobile Flutter | Écrans création NCR + synchronisation | Planned | Code Flutter + captures |
| REQ-018 | Interface web React/Next | Liste NCR, détail NCR, dashboard HSE | Planned | Code front + composants |
| REQ-019 | OIDC + MFA | Authentification forte | Planned | Module auth + config |
| REQ-020 | Rôles métier | Chef de chantier / QSE / Direction | Planned | Guard RBAC + tests |
| REQ-021 | Audit trail traçable | Journal des actions | Planned | Service audit + tests |
| REQ-022 | CI qualité | Lint + tests + couverture | In Progress | Workflow unifié |
| REQ-023 | CI sécurité | `npm audit --audit-level=high` | In Progress | Job quality gate |
| REQ-024 | CI build docker | Image `buildflow-ncr-service` | In Progress | Job build |
| REQ-025 | Déploiement staging | Pipeline vers staging | In Progress | Job deploy concret |
| REQ-026 | Jeu de données cas limites | GPS invalides, images corrompues | Planned | Fixtures JSON + tests |
| REQ-027 | KPI observabilité | p95, uptime, crash-free, sync success | Planned | Doc KPI + endpoints métriques |

## Critères d'acceptation globaux

1. Tous les éléments marqués `Planned` doivent disposer d'une preuve technique dans le repo.
2. Tous les éléments backend doivent être couverts par des tests automatiques.
3. La documentation d'exécution doit permettre la reproduction locale et CI.
