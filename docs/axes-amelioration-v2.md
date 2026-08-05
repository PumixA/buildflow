# Axes d'Amélioration — BuildFlow V2

Top 5 des améliorations priorisées pour la prochaine version, classées
par ratio effort/impact.

| # | Axe | Effort | Impact | Description |
|---|---|---|---|---|
| 1 | **Découpage microservices** | Élevé | Élevé | Extraire chaque module NestJS en conteneur indépendant (NCR, HSE, Auth, Sync). Déploiement Kubernetes, scalabilité horizontale par domaine. |
| 2 | **Résolution intelligente des conflits offline** | Élevé | Élevé | Remplacer le Last-Writer-Wins par un CRDT (Conflict-free Replicated Data Type) permettant le merge champ par champ. Interface de résolution visuelle côté mobile. |
| 3 | **Signature électronique eIDAS** | Moyen | Élevé | Intégrer un prestataire de signature qualifiée pour les clôtures de NCR. Conformité réglementaire pour les marchés publics. |
| 4 | **Viewer BIM / intégration IFC** | Élevé | Moyen | Visualisation 3D des maquettes BIM sur mobile, annotation des NCR directement sur le modèle IFC. Lien entre défaut constaté et élément de maquette. |
| 5 | **CDN photos chantier** | Moyen | Moyen | Distribution des photos de chantier via CDN avec cache edge. Réduction de la latence pour le back-office, redimensionnement automatique pour le mobile. |

## Améliorations secondaires

- **Notifications push** : alertes temps réel pour les incidents critiques (Firebase Cloud Messaging)
- **Export PDF** : génération de rapports NCR et HSE signés
- **Mode clair** : thème alternatif pour utilisation en extérieur
- **Multi-langue** : support FR/EN pour les chantiers internationaux (Espagne/Italie)
- **Rate limiting** : protection anti-bruteforce sur l'authentification (déjà partiellement en place via `@nestjs/throttler`)
