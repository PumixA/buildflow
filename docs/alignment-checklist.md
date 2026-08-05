# Checklist d'alignement livrables

- [x] Endpoint santé.
- [x] Base backend NestJS modulaire.
- [x] Domaine NCR enrichi (validations + workflow).
- [x] Domaine HSE enrichi (incident + actions + dashboard).
- [x] Synchronisation offline-first avec conflit 409.
- [x] Schéma PostgreSQL + migration.
- [x] Adapter stockage preuve WORM.
- [x] Sécurité OIDC/MFA simulée.
- [x] RBAC par rôles métier.
- [x] Audit trail hashé.
- [x] Pipeline CI/CD unifié.
- [x] Jeux de données cas limites.
- [x] Écrans Web (Next.js) et Mobile (Flutter) en structure projet.

## Points de raccordement futurs (infra réelle)

- Intégration vraie d'un fournisseur OIDC.
- Connexion réelle PostgreSQL/RabbitMQ/S3.
- Déploiement staging sur infrastructure cloud cible.
