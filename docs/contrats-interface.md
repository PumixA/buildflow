# Contrats d'interface

API Gateway BuildFlow. Toutes les réponses ci-dessous sont **capturées sur la stack en
exécution** le 1er août 2026, non rédigées à la main.

Base : `http://localhost:3000` en développement.

## Conventions

**Authentification.** Toute route exige un en-tête `Authorization: Bearer <token>`,
sauf `/health` et `/auth/*`. Le jeton est un JWT HS256 valable 24 heures.

**Format d'erreur.** Uniforme, produit par NestJS :

```json
{ "message": "…", "error": "…", "statusCode": 401 }
```

Le champ `message` devient un **tableau** quand le `ValidationPipe` rejette un corps de
requête.

**Codes retournés**

| Code | Signification |
|---|---|
| `200` / `201` | Succès |
| `400` | Corps invalide — `message` est un tableau de violations |
| `401` | Jeton absent, invalide, ou identifiants refusés |
| `403` | Jeton valide mais rôle insuffisant, ou MFA non validée |
| `404` | Ressource inexistante |
| `409` | Conflit de version en synchronisation |
| `429` | Limitation de débit atteinte sur `/auth/session` |

---

## Authentification

### `POST /auth/session` — ouvrir une session

Public. Limité à **10 tentatives par minute et par IP**.

**Requête**

```json
{
  "email": "qse@buildflow.io",
  "password": "password",
  "mfaCode": "123456"
}
```

**Réponse `201`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJ…",
  "role": "RESPONSABLE_QSE",
  "mfaValidated": true
}
```

**Erreurs**

```json
{ "message": "Identifiants invalides", "error": "Unauthorized", "statusCode": 401 }
{ "message": "MFA_REQUIRED: Code MFA invalide", "error": "Unauthorized", "statusCode": 401 }
```

Le message est **volontairement identique** pour un compte inconnu et un mot de passe
erroné : les distinguer permettrait d'énumérer les comptes existants.

### `GET /auth/config` — configuration publique

**Réponse `200`**

```json
{
  "provider": "http://localhost:8080",
  "mfaEnabled": true,
  "mode": "OIDC+MFA",
  "issuer": "http://localhost:8080/realms/buildflow",
  "audience": "buildflow-api",
  "jwksUri": "http://localhost:8080/realms/buildflow/protocol/openid-connect/certs"
}
```

> ⚠️ Ces URL décrivent un fournisseur OIDC qui **n'est pas déployé**. Les jetons sont
> émis localement en HS256. Voir `conformite-livrables.md` §4.

---

## Santé

### `GET /health`

Public — interrogé par le healthcheck Docker et par la CI.

```json
{
  "status": "UP",
  "service": "BuildFlow-API-Gateway",
  "timestamp": "2026-08-01T06:11:53.392Z"
}
```

---

## Non-conformités

### `GET /ncr` — lister

Rôles : `RESPONSABLE_QSE`, `DIRECTION_TRAVAUX`, `ADMIN`.

**Paramètres** — `projectId` (nom du chantier), `status`, `page` (défaut 1),
`limit` (défaut 20, plafonné à 100).

**Réponse `200`**

```json
{
  "items": [
    {
      "id": "f186295e-5881-40a7-8622-eb41b38a1a29",
      "projectId": "PROJ-1",
      "creatorId": "f7eed4ab-e2a0-446c-abe0-db3c3527f10c",
      "title": "Verification finale",
      "description": "parcours complet",
      "status": "OPEN",
      "priority": "CRITICAL",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "photos": [],
      "sync_status": true,
      "localId": "final-1785531892",
      "version": 1,
      "createdAt": "Fri Jul 31 2026 21:04:52 GMT+0000 (Coordinated Universal Time)",
      "updatedAt": "Fri Jul 31 2026 21:04:52 GMT+0000 (Coordinated Universal Time)",
      "closureProofs": [],
      "correctiveTasks": [],
      "history": []
    }
  ],
  "total": 27,
  "page": 1,
  "limit": 1,
  "totalPages": 27
}
```

> ⚠️ **Incohérence de format à corriger.** `createdAt` et `updatedAt` sont sérialisés
> par `Date.toString()` — `"Fri Jul 31 2026 21:04:52 GMT+0000…"` — alors que `/health`,
> `/projects` et `/hse/dashboard` renvoient de l'ISO 8601. Un client qui parse l'ISO
> échouera ici. Correction : sérialiser en `toISOString()` dans `toManagedNcr`.

**Note.** `projectId` contient le **nom** du chantier, résolu par jointure, et non son
UUID. La colonne portait un identifiant technique que l'interface affichait tel quel.

`closureProofs`, `correctiveTasks` et `history` sont **toujours vides** en lecture
base : aucune table ne les porte. Voir `modele-de-donnees.md`.

### `GET /ncr/:ncrId` — fiche détaillée

Accepte l'UUID **ou** le `localId`. Ajoute les photos :

```json
{
  "id": "f186295e-…",
  "title": "Verification finale",
  "photos": ["s3://buildflow-worm-evidences/aaf3f982-…-garde-corps.png"],
  "photoDetails": [
    {
      "id": "1e061552-3bc8-473b-bfad-1e6bdad98886",
      "url": "s3://buildflow-worm-evidences/aaf3f982-…-garde-corps.png",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "wormLocked": true,
      "hashSha256": null,
      "createdAt": "2026-07-31T18:08:40.229Z"
    }
  ]
}
```

`hashSha256` n'est renseigné qu'à l'écriture : la base ne conserve pas l'empreinte.

**Erreur `404`**

```json
{ "message": "NCR introuvable : inexistant", "error": "Not Found", "statusCode": 404 }
```

### `POST /ncr` — créer

Rôles : `CHEF_CHANTIER`, `RESPONSABLE_QSE`, `ADMIN`.

```json
{
  "projectId": "PROJ-1",
  "creatorId": "USR-CHEF",
  "title": "Ferraillage non conforme au plan",
  "description": "Espacement des cadres supérieur au plan d'exécution",
  "priority": "HIGH",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "photos": ["constat.jpg"]
}
```

`projectId` est le **code du chantier**, pas son UUID : l'API le résout, et le crée
s'il n'existe pas.

**Erreur `400`** — le `message` devient un tableau :

```json
{
  "message": [
    "title should not be empty",
    "description should not be empty",
    "projectId should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### `POST /ncr/:ncrId/photo` — attacher une preuve scellée

Rôles : `CHEF_CHANTIER`, `RESPONSABLE_QSE`, `ADMIN`.

```json
{
  "actorId": "USR-CHEF",
  "fileName": "garde-corps.png",
  "contentType": "image/png",
  "payloadBase64": "iVBORw0KGgoAAAANSUhEUg…",
  "latitude": 48.8566,
  "longitude": 2.3522
}
```

**Réponse `201`**

```json
{
  "id": "1e061552-3bc8-473b-bfad-1e6bdad98886",
  "url": "s3://buildflow-worm-evidences/aaf3f982-…-garde-corps.png",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "wormLocked": true,
  "hashSha256": "c1b083f71e737deb02f471d92d9a7cf35c8a3df0c34cf2ddba401ca53f2f4aa5",
  "createdAt": "2026-07-31T18:08:40.229Z"
}
```

L'existence de la NCR est vérifiée **avant** tout envoi vers le stockage : un `404`
ne dépose aucun objet. `wormLocked` reflète l'état réel — `false` si aucun bucket n'est
configuré, l'URL passant alors en `memory://`.

### `GET /ncr/:ncrId/photos/:photoId/contenu` — servir l'image

Renvoie les **octets** avec le `Content-Type` d'origine, et `Cache-Control: private`.

Le contenu transite par l'API : une URL `s3://` n'est pas récupérable par un
navigateur, et distribuer des URL signées contournerait le contrôle de rôles.

### Autres routes NCR

| Route | Rôles | Effet |
|---|---|---|
| `PATCH /ncr/:id` | QSE, ADMIN | Titre, description, priorité |
| `PATCH /ncr/:id/status` | QSE, DIRECTION, ADMIN | Changement de statut |
| `POST /ncr/:id/tasks` | QSE, ADMIN | Action corrective — **non persistée** |
| `POST /ncr/:id/closure-proof` | CHEF, QSE, ADMIN | Preuve de clôture — **non persistée** |
| `POST /ncr/:id/close` | QSE, DIRECTION, ADMIN | Clôture |

---

## Chantiers

### `GET /projects`

```json
{
  "items": [
    {
      "id": "63c38dfa-317f-4548-8140-f0ba59474397",
      "name": "Lyon - Part-Dieu Tour To-Lyon",
      "locationGps": "45.7600, 4.8600",
      "status": "ACTIVE",
      "createdAt": "2026-07-29T19:24:03.000Z",
      "openNcrCount": 2,
      "totalNcrCount": 2
    }
  ],
  "total": 2
}
```

### `POST /projects`

```json
{ "name": "Lyon - Part-Dieu", "locationGps": "45.76, 4.86", "actorId": "USR-QSE" }
```

---

## Sécurité et hygiène (HSE)

### `GET /hse/dashboard`

Rôles : `RESPONSABLE_QSE`, `DIRECTION_TRAVAUX`, `ADMIN`.

```json
{
  "totalOpen": 27,
  "criticalOpen": 6,
  "immediateAlerts": 1,
  "latestIncidents": [
    {
      "id": "75172cfb-0195-4836-9bb6-7396828f7681",
      "projectId": "PROJ-1",
      "creatorId": "aa11c3bd-…",
      "type": "CHUTE_HAUTEUR",
      "severity": "CRITICAL",
      "description": "Garde-corps manquant niveau R+3",
      "sync_status": false,
      "status": "OPEN",
      "createdAt": "2026-07-30T16:40:30.000Z"
    }
  ],
  "overdueActions": [
    {
      "id": "1a52148c-ae19-4084-9dae-085dca3d6450",
      "incidentId": "75172cfb-…",
      "description": "Poser le garde-corps definitif",
      "responsible": "USR-CHEF",
      "deadline": "2026-07-01",
      "daysLate": 31,
      "status": "OPEN"
    }
  ],
  "overdueActionsCount": 1
}
```

Les compteurs ne portent pas sur la même entité : `totalOpen` et `criticalOpen`
comptent la table `ncr`, `immediateAlerts` compte les incidents HSE de gravité
`CRITICAL` non résolus.

### Autres routes HSE

`GET /hse/incidents`, `GET /hse/incidents/:id`, `POST /hse/incidents`,
`POST /hse/actions`, `POST /hse/incidents/:id/secure`, `POST /hse/incidents/:id/resolve`.

---

## Synchronisation offline

### `POST /sync/push` — remonter un constat terrain

Rôles : `CHEF_CHANTIER`, `RESPONSABLE_QSE`, `ADMIN`.

```json
{
  "localId": "f70f0424-a60a-454d-8be6-e114dbeab196",
  "version": 1,
  "payload": {
    "title": "Garde-corps manquant R+3",
    "description": "Constat terrain",
    "severity": "CRITICAL",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "projectId": "PROJ-1",
    "creatorId": "USR-CHEF"
  }
}
```

**Réponse `201`**

```json
{
  "sync_status": true,
  "httpCode": 201,
  "serverId": "0bbab420-137f-4839-839d-343d5d2762cc",
  "item": {
    "localId": "f70f0424-…",
    "version": 1,
    "status": "SYNCED",
    "message": "Synchronisation terminée",
    "contentHash": "8e70c95556870a5d…"
  }
}
```

`serverId` est l'identifiant de la NCR créée : le mobile s'en sert pour y rattacher sa
photo. L'écriture est **idempotente** sur `localId` — rejouer une synchronisation met à
jour la NCR au lieu d'en créer une seconde.

`severity` utilise le vocabulaire mobile (`MINOR`, `MAJOR`, `CRITICAL`) et est traduit
en priorité NCR (`LOW`, `HIGH`, `CRITICAL`).

**Conflit `409`** — la version poussée est obsolète, aucune écriture n'a lieu :

```json
{ "sync_status": false, "httpCode": 409, "serverId": null,
  "item": { "status": "CONFLICT", "message": "Version obsolète" } }
```

### `GET /sync/status`

```json
{ "mode": "offline-first", "pending": 0, "synced": 10, "conflicts": 0 }
```

### Autres routes

`GET /sync/queue` (paginée), `POST /sync/resolve`.

---

## Indicateurs

### `GET /reporting/kpi`

Rôles : `RESPONSABLE_QSE`, `DIRECTION_TRAVAUX`, `ADMIN`.

```json
{
  "cibles": { "uptime": 99.9, "crashFree": 99.5, "syncSuccess": 99.3, "apiP95Ms": 300 },
  "mesures": {
    "ncrTotal": 27,
    "ncrOuvertes": 27,
    "delaiClotureJours": null,
    "tauxSynchronisation": 100,
    "syncTotal": 10,
    "uptime": null,
    "crashFreeMobile": null
  }
}
```

La distinction **cibles / mesures** est structurante : les premières sont
contractuelles, les secondes calculées en base.

`null` signifie « non mesurable », jamais zéro. Aucune NCR clôturée donne
`delaiClotureJours: null` et non `0` ; une file vide donnerait
`tauxSynchronisation: null` et non `100`.

`uptime` et `crashFreeMobile` sont nuls par construction : ils supposent une collecte
d'exploitation qui n'existe pas.

---

## Journal d'audit

### `GET /audit/logs` · `GET /audit/verify`

Rôles : `RESPONSABLE_QSE`, `DIRECTION_TRAVAUX`, `ADMIN` — au niveau du contrôleur.

```json
{
  "id": "audit-1",
  "eventType": "ncr.photo.added",
  "actorId": "USR-QSE",
  "payload": { "ncrId": "…", "photoId": "…", "wormLocked": true },
  "timestamp": "2026-07-31T18:08:40.274Z",
  "previousHash": "GENESIS",
  "hash": "e22792bbc436c202bf281cbb6daa5ea7d21bae2a6655eb3ac85fd599ade8302c"
}
```

`verify` recalcule la chaîne et renvoie `{ "valid": true, "entries": N }`.

> ⚠️ La chaîne est un SHA-256 **sans clé** : qui peut écrire dans le journal peut la
> recalculer entièrement. Voir `securite.md`.

---

## Écarts de contrat connus

| Écart | Impact |
|---|---|
| `createdAt` / `updatedAt` de `/ncr` en `Date.toString()` au lieu d'ISO 8601 | Un client parsant l'ISO échoue |
| `/auth/config` annonce un fournisseur OIDC non déployé | Un client tentant le flux OIDC échouera |
| `closureProofs`, `correctiveTasks`, `history` toujours vides | Les routes correspondantes écrivent en mémoire du process |
| L'événement publié à la synchronisation est `sync.completed`, non `NCR_CREATED` | Écart avec les critères d'acceptation du Livrable 3 |
