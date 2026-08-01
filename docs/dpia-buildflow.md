# DPIA — Analyse d'Impact relative à la Protection des Données

**Projet :** BuildFlow | **Date :** Juillet 2026 | **Version :** 1.0

## 1. Contexte du traitement

BuildFlow est une plateforme BTP qui collecte et traite des données liées à la qualité
(Non-Conformités) et à la sécurité (incidents HSE) sur les chantiers de construction.
Les données sont saisies via une application mobile utilisée par le personnel de terrain
et consultées via un back-office web par la direction et les responsables QSE.

## 2. Catégories de données personnelles

| Catégorie | Données | Source |
|---|---|---|
| Identification | Email professionnel | Compte utilisateur |
| Géolocalisation | Coordonnées GPS (latitude, longitude) | Mobile du chef de chantier |
| Images | Photos de chantier (peuvent inclure des personnes) | Appareil photo mobile |
| Métier | Signalements NCR, incidents HSE | Saisie utilisateur |

## 3. Finalités du traitement

- Gestion de la qualité des ouvrages (Non-Conformités)
- Gestion de la sécurité au travail (incidents HSE, plans d'action)
- Traçabilité légale des interventions sur chantier
- Reporting et pilotage pour la direction des travaux

## 4. Base légale

- **Intérêt légitime** de l'entreprise pour la gestion de la qualité et de la sécurité
- **Obligation légale** de conservation des documents de chantier (responsabilité décennale)
- **Exécution de contrat** entre l'entreprise et ses clients

## 5. Durée de conservation

- Données chantier actif : durée du chantier + 5 ans (garantie décennale)
- Logs d'audit (WORM) : 1 an minimum (conformité ISO 27001)
- Photos de preuves : durée du chantier + 5 ans

## 6. Mesures de sécurité

| Mesure | Implémentation |
|---|---|
| Chiffrement en transit | TLS via reverse proxy Nginx |
| Authentification | OIDC + MFA (code à usage unique) |
| Contrôle d'accès | RBAC avec rôles (Chef/Chantier, QSE, Dir., Admin) |
| Intégrité des preuves | Stockage WORM (S3 Object Lock COMPLIANCE, 365 jours) |
| Journalisation inaltérable | Chaîne de hachage SHA-256 (audit trail append-only) |
| Hachage des mots de passe | Argon2id (sel aléatoire par utilisateur) |
| Isolation réseau | Réseau Docker interne, ports exposés minimaux |

## 7. Droits des personnes

- **Droit d'accès :** export des données via l'API `/audit/logs`
- **Droit de rectification :** mise à jour des informations utilisateur
- **Droit à la portabilité :** export JSON des données personnelles
- **Droit d'opposition :** possible hors obligations légales de conservation

## 8. Analyse des risques

| Risque | Gravité | Probabilité | Mesures |
|---|---|---|---|
| Accès non autorisé aux photos | Élevée | Faible | RBAC + Auth + TLS |
| Perte de données sync | Moyenne | Faible | File d'attente PostgreSQL + retry |
| Falsification de preuve | Élevée | Très faible | WORM Object Lock + audit hashé |
| Fuite de géolocalisation | Moyenne | Faible | Chiffrement TLS + RBAC |

## 9. Conclusion

Les risques résiduels sont **faibles** et les mesures de sécurité sont **proportionnées**
à la sensibilité des données traitées. Le traitement est conforme aux principes du RGPD :
minimisation, limitation des finalités, sécurité dès la conception (privacy by design).
