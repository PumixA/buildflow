# Conformité des livrables — traçabilité L1 → L3 → livré

Ce document aligne chaque engagement du **Livrable 1** (note de cadrage) et du
**Livrable 3** (critères d'acceptation, plan de test) sur son état constaté au
1er août 2026.

Il est le plus utile en soutenance : il permet d'énoncer soi-même les écarts, chiffres
à l'appui, plutôt que de se les faire trouver.

---

## 1. Objectifs SMART du cadrage

| Objectif (L1 §2) | Cible | Constat | État |
|---|---|---|---|
| Temps de réponse API p95 | ≤ 300 ms | **Jamais mesuré** — aucune sonde de performance | ❌ |
| Disponibilité | ≥ 99,9 % | **Jamais mesurée** — affichée « — » à l'écran | ❌ |
| Crash-free mobile | ≥ 99,5 % | **Jamais mesuré** — aucun rapport de plantage collecté | ❌ |
| Succès de synchronisation | ≥ 99,3 % | **100 %** mesuré, mais sur 10 éléments seulement | ⚠️ |
| Authentification 100 % OIDC + MFA | — | Voir §4 | ⚠️ |
| Journaux WORM inaltérables | — | Voir §5 | ⚠️ |
| Délai de clôture NCR | −20 % | **Non mesurable** — aucune NCR clôturée en base | ❌ |

Les trois premiers indicateurs supposent une collecte d'exploitation qui n'existe pas.
OpenTelemetry est branché mais n'alimente aucun stockage interrogeable.

**Décision assumée :** ces valeurs sont désormais renvoyées à `null` par
`/reporting/kpi` et affichées par un tiret accompagné de sa raison, au lieu des
99,7 % / 99,95 % / 4,2 jours qui étaient écrits en dur dans l'interface. Un indicateur
inventé sur un tableau de pilotage est pire qu'une case vide.

---

## 2. Indicateurs techniques (L1 §7)

| Indicateur | Baseline | Cible M12 | Constat | État |
|---|---|---|---|---|
| Disponibilité | 99,88 % | ≥ 99,9 % | non mesurée | ❌ |
| API p95 | 450 ms | ≤ 300 ms | non mesuré | ❌ |
| Web Vitals LCP p75 | 2,7 s | ≤ 2,5 s | non mesuré | ❌ |
| Crash-free mobile | 99,2 % | ≥ 99,5 % | non mesuré | ❌ |
| Succès sync offline | 98,9 % | ≥ 99,3 % | 100 % sur 10 éléments | ⚠️ |
| **Couverture de tests** | < 30 % | **≥ 70 %** | **46,04 %** | ❌ |

Sur la couverture, la trajectoire est réelle mais insuffisante : la cible M6 de 50 %
n'est pas non plus atteinte. Le chiffre a par ailleurs **baissé volontairement**, de
77 % à 46 %, après correction du périmètre mesuré — l'ancien excluait
`services/api-gateway`, c'est-à-dire l'application déployée.

---

## 3. Architecture (L1 §8 et §10)

| Engagement | Constat | État |
|---|---|---|
| Architecture hybride microservices + événementielle | **Monolithe modulaire** NestJS | ❌ assumé |
| Quatre services : Identity, NCR, HSE, Reporting | Répertoires présents, contenant **un seul `README.md`** | ❌ |
| **Une base PostgreSQL par service** | **Une base partagée** | ❌ |
| API Gateway en point d'entrée unique | ✅ conforme | ✅ |
| Bus d'événements RabbitMQ | ✅ en place | ✅ |
| Stockage S3 avec verrouillage WORM | ✅ MinIO, Object Lock COMPLIANCE vérifié | ✅ |

**Position à tenir en soutenance :** le monolithe modulaire est un choix défendable à
ce stade de maturité — un processus, un déploiement, pas de cohérence distribuée à
gérer. Le découpage interne en modules est réel et permet une extraction ultérieure.

Ce qui ne se défend pas, c'est de laisser le schéma C4 décrire une topologie absente.
La documentation d'architecture a été corrigée en conséquence.

---

## 4. Authentification et sécurité

| Engagement | Constat | État |
|---|---|---|
| « Authentification **100 % OIDC** » | **Aucun fournisseur OIDC** dans la stack. `OIDC_ISSUER` pointe vers un `localhost:8080` inexistant. Les jetons sont émis localement en HS256 | ❌ |
| MFA | Parcours complet, mais **code constant `123456`** — ne dépend ni du temps, ni d'un secret par utilisateur | ⚠️ |
| Mots de passe | **argon2id en base** depuis la migration 003 ; comparaison en clair supprimée | ✅ |
| Protection contre le bruteforce | **10 tentatives/min par IP**, vérifié | ✅ |
| Contrôle d'accès par rôle | `RolesGuard` **fail-closed** ; liste des routes publiques figée par test | ✅ |
| Secret de signature | **Obligatoire**, fail-fast au démarrage, valeur publiée refusée | ✅ |

Trois vulnérabilités critiques identifiées par l'audit ont été fermées, chacune avec un
test de non-régression.

---

## 5. Traçabilité et preuves

| Engagement | Constat | État |
|---|---|---|
| Photos scellées en WORM | ✅ Object Lock **COMPLIANCE**, rétention 365 j, vérifié par `get-object-retention` | ✅ |
| Photo remontée du terrain | ✅ Les octets transitent depuis le mobile ; auparavant seul un chemin local | ✅ |
| « Journaux d'audit **inaltérables** » | Chaîne SHA-256 **sans clé** : réécrivable intégralement par qui peut écrire dans le fichier | ❌ |
| Persistance du journal | Fichier **sur aucun volume** — détruit à chaque reconstruction, chaîne repartant de `GENESIS` | ❌ |

C'est l'écart le plus sensible du projet, parce qu'il porte sur une propriété
**probatoire**. La remédiation est chiffrée à 2 jours — le meilleur rapport de tout le
lot restant.

---

## 6. Critères d'acceptation du Livrable 3 — synchronisation offline

### Scénario 1 : création hors ligne

| Exigence | Constat | État |
|---|---|---|
| L'application ne plante pas | ✅ | ✅ |
| NCR et photo sauvegardées localement | ✅ SQLite + chemin du fichier | ✅ |
| … **de manière sécurisée** | ❌ **SQLite non chiffré** | ❌ |
| Message « en attente de synchronisation » | ✅ affiché après enregistrement | ✅ |

### Scénario 2 : synchronisation automatique

| Exigence | Constat | État |
|---|---|---|
| Envoi automatique au retour du réseau | ✅ déclenché par `connectivity_plus` | ✅ |
| Données reçues côté serveur | ✅ **et la NCR est désormais créée** — auparavant elles restaient dans une file que rien ne consommait | ✅ |
| Publication d'un événement **`NCR_CREATED`** | ❌ La synchronisation publie **`sync.completed`**. Le nom exigé n'est jamais émis | ❌ |

### Scénario 3 : confirmation visuelle

| Exigence | Constat | État |
|---|---|---|
| Toast « Sync OK » | ✅ | ✅ |
| NCR visible en direct sur le dashboard web | ✅ rafraîchissement toutes les 5 s, sans rechargement | ✅ |

### Scénario 4 : idempotence

| Exigence | Constat | État |
|---|---|---|
| Reprise sans duplication | ✅ **vérifié** : un rejeu en version 2 met à jour la NCR, ne la duplique pas | ✅ |

### Definition of Done

| Métrique | Cible | Constat | État |
|---|---|---|---|
| Taux de succès de synchronisation | ≥ 99,3 % | 100 % sur 10 éléments — pas de test de charge | ⚠️ |
| p95 de traitement de la file | ≤ 300 ms | non mesuré | ❌ |
| **Couverture du moteur de sync** | **≥ 70 %** | `src/sync` : 94,8 % ✅ — **gateway `sync.service.ts` : 13,55 %** ❌ | ❌ |

La logique métier de synchronisation est bien couverte. La couche qui l'expose, la
persiste et publie les événements — celle qui tourne en production — ne l'est pas.

---

## 7. Plan de test « Parcours Chef de Chantier »

Les cinq étapes passent, vérifiées au navigateur et sur appareil réel : connexion avec
MFA, ouverture d'un chantier, saisie mobile hors ligne avec photo et GPS,
synchronisation au retour du réseau, apparition en direct sur le dashboard.

La preuve WORM est démontrable en séance par une commande MinIO qui répond
`Mode: COMPLIANCE`.

---

## 8. Organisation (L1 §4 et §5)

| Engagement | Constat |
|---|---|
| Dayana Keo — Product Owner & Scrum Master | ✅ |
| Melvin Delorme — Tech Lead & Architecte | ✅ |
| Sprints de 2 semaines, journal de suivi | ✅ Journal de bord tenu |
| **Board Kanban sur Jira** | ❌ Le suivi est tenu sur **Notion** |
| Versionnage et revue de code sur GitHub | ✅ 39 pull requests, politique de branches appliquée par CI |

L'écart sur Jira est mineur mais réel : il suffit de corriger la note de cadrage ou de
l'assumer à l'oral.

---

## 9. Synthèse

| Catégorie | Conforme | Partiel | Non conforme |
|---|---|---|---|
| Objectifs SMART | 0 | 3 | 4 |
| Architecture | 3 | 0 | 3 |
| Sécurité | 4 | 1 | 1 |
| Traçabilité | 2 | 0 | 2 |
| Critères L3 | 7 | 2 | 4 |

**Ce qui est solidement tenu :** le stockage WORM et sa démonstrabilité,
l'authentification par mots de passe hachés, le contrôle d'accès fail-closed,
l'idempotence de la synchronisation, le parcours terrain de bout en bout.

**Ce qui ne l'est pas, et doit être énoncé :** les indicateurs de performance jamais
mesurés, la couverture de tests à 46 % pour une cible de 70 %, le scellement de la
chaîne d'audit, le MFA à code constant, la base mobile non chiffrée, et l'événement
`NCR_CREATED` jamais émis.

**Neuf jours** de travail lèvent les trois réserves de sécurité les plus lourdes. Le
séquencement figure dans `livrables/Matrice-Effort-Impact-V2.docx`.
