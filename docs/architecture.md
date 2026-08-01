# Architecture

État vérifié au 1er août 2026.

## Vue d'ensemble

```
┌──────────────┐   HTTPS    ┌──────────────────────────────┐
│  Web Next.js │───────────▶│                              │
│  (back-office)│            │       API Gateway            │
└──────────────┘            │       NestJS — monolithe     │
                            │       modulaire              │
┌──────────────┐   HTTP     │                              │
│ Mobile Flutter│──────────▶│  auth · ncr · hse · sync     │
│ (offline-first)│           │  reporting · audit · storage │
└──────────────┘            └───┬──────────┬──────────┬────┘
                                │          │          │
                    ┌───────────▼──┐  ┌────▼─────┐  ┌─▼──────────┐
                    │  PostgreSQL  │  │ RabbitMQ │  │   MinIO    │
                    │  (partagée)  │  │ (events) │  │ Object Lock│
                    └──────────────┘  └──────────┘  └────────────┘
```

## Le choix structurant : monolithe modulaire

Le cadrage (Livrable 1, §8) retenait une architecture hybride microservices et
orientée événements, avec **une base par service**.

**Ce n'est pas ce qui est livré, et c'est assumé.**

L'application est un **monolithe modulaire NestJS** : un processus, un `package.json`,
un déploiement, une base PostgreSQL partagée. Les répertoires
`services/{hse,identity,ncr,reporting}-service/` ne contiennent qu'un `README.md`.

```bash
ls services/*/          # vérification en quinze secondes
```

### Pourquoi ce choix se défend

Le découpage interne en modules est réel et propre : `ncr`, `hse`, `auth`, `sync`,
`audit`, `reporting`, `projects`, `storage`. Chacun a son contrôleur, son service et
ses DTO. L'extraction ultérieure d'un service — `reporting` étant le plus autonome —
reste possible sans refonte.

À l'échelle du projet, séparer les processus aurait ajouté de la latence réseau, de la
cohérence distribuée et de l'exploitation, sans bénéfice fonctionnel.

### La limite à connaître

Les frontières de modules **ne sont pas étanches** : la gateway importe le domaine par
des chemins relatifs (`../../../../../src/...`). Les workspaces npm sont déclarés mais
non utilisés pour les imports, et aucun alias TypeScript n'est configuré. Rien
n'empêche donc techniquement un couplage arbitraire entre modules.

C'est le principal frein à une extraction future.

## Composants

| Composant | Technologie | Rôle |
|---|---|---|
| API Gateway | NestJS 10, TypeScript | Point d'entrée unique, contrôle d'accès, métier |
| Base | PostgreSQL 16 | Données métier, migrations versionnées |
| Bus d'événements | RabbitMQ | `sync.completed`, `ncr.created`, `hse.*` |
| Stockage de preuves | MinIO, Object Lock | Photos scellées en mode COMPLIANCE |
| Back-office | Next.js 14 (App Router) | Écrans QSE et direction |
| Mobile | Flutter 3 | Saisie terrain offline-first |
| Observabilité | OpenTelemetry → collector | Traces HTTP |
| Terminaison TLS | nginx | Reverse proxy |

## Flux principal : du constat à la preuve

1. **Saisie terrain** — le chef de chantier remplit le formulaire hors ligne. La NCR
   et le chemin de la photo sont écrits dans SQLite, statut `PENDING`.
2. **Retour du réseau** — `connectivity_plus` déclenche `syncAll()`. Chaque rapport
   part vers `POST /sync/push`.
3. **Création serveur** — la synchronisation insère dans `sync_queue` **et crée la
   NCR** via un upsert idempotent sur `local_id`. L'identifiant serveur est renvoyé.
4. **Photo** — le mobile envoie les octets à `POST /ncr/:id/photo`. L'API scelle
   l'objet dans MinIO avec Object Lock COMPLIANCE, rétention 365 jours, puis
   enregistre la référence dans `ncr_photos`.
5. **Affichage** — le back-office interroge l'API toutes les 5 secondes. La NCR
   apparaît sans rechargement, la photo est servie par l'API.

### Détail : pourquoi la photo transite par l'API

Une URL `s3://` n'est pas récupérable par un navigateur. Distribuer des URL signées
MinIO contournerait le contrôle de rôles. Le contenu passe donc par
`GET /ncr/:ncrId/photos/:photoId/contenu`, qui reste soumis au guard.

Conséquence : une balise `<img src>` ne sachant pas porter d'en-tête d'autorisation,
le composant web récupère l'image par `fetch` avec le jeton, puis crée une URL objet
qu'il révoque au démontage.

## Événements publiés

| Topic | Émis par | Consommé par |
|---|---|---|
| `sync.completed`, `sync.conflict` | `SyncService.push` | Service d'audit |
| `ncr.created`, `ncr.updated`, `ncr.status.updated` | `NcrService` | Service d'audit |
| `hse.incident.created`, `hse.action.created` | `HseService` | Service d'audit |

**Écart avec les critères d'acceptation :** le Livrable 3 (scénario 2) exige la
publication d'un événement **`NCR_CREATED`** au retour du réseau. La synchronisation
publie `sync.completed`. Le nom diffère, et aucun consommateur ne transforme l'un en
l'autre.

Le service d'audit est aujourd'hui le seul consommateur réel — il journalise sans
produire d'effet métier.

## Persistance : ce qui vit en base, ce qui vit en mémoire

| Donnée | Persistée | Conséquence |
|---|---|---|
| NCR, chantiers, incidents | ✅ | Survit au redémarrage |
| Photos de constat | ✅ `ncr_photos` + MinIO | Scellées |
| File de synchronisation | ✅ `sync_queue` | Reprise possible |
| Journal d'audit | ✅ `audit_logs` + fichier | Voir limite ci-dessous |
| **Tâches correctives** | ❌ mémoire du process | **Perdues au redémarrage** |
| **Preuves de clôture** | ❌ mémoire du process | **Perdues au redémarrage** |
| **Historique des changements** | ❌ mémoire du process | **Perdu au redémarrage** |

Les trois dernières lignes sont un écart connu : aucune table ne les porte. Assigner
une action corrective produit un objet qui disparaît au prochain déploiement.

## Décisions notables

**Fail-closed sur l'authentification.** Toute route exige un jeton, sauf celles
marquées `@Public()` — `/health` et `/auth/*`. Le comportement inverse laissait une
route sans décorateur accessible à tous.

**Fail-fast sur la configuration.** L'API refuse de démarrer sans `JWT_SECRET` hors
développement, et sort en code 1. Mieux vaut un service qui ne démarre pas qu'un
service qui signe des jetons avec un secret publié.

**La base fait autorité.** Les lectures NCR et le tableau de bord HSE interrogent
PostgreSQL, avec repli sur la mémoire uniquement en cas d'indisponibilité. L'inverse
provoquait des affichages incohérents après redémarrage.
