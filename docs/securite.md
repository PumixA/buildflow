# Sécurité

État vérifié au 1er août 2026. Chaque affirmation est reproductible par la commande
indiquée.

## Authentification

Les comptes vivent **en base**, mots de passe hachés en **argon2id** (migration 003).
`POST /auth/session` vérifie l'empreinte, puis le code MFA, avant d'émettre un JWT
HS256 valable 24 heures.

```bash
curl -X POST http://localhost:3000/auth/session \
  -H 'Content-Type: application/json' \
  -d '{"email":"qse@buildflow.io","password":"password","mfaCode":"123456"}'
```

### Durcissements en place

| Mesure | Détail |
|---|---|
| Hachage argon2id | La comparaison en clair a été supprimée |
| Empreinte non-argon2 refusée | Écarte les comptes techniques en `hash-placeholder` |
| Message d'erreur unique | Distinguer « compte inconnu » de « mot de passe erroné » permettrait d'énumérer les comptes |
| Temps de réponse égalisé | Une vérification leurre est consommée quand le compte n'existe pas |
| Limitation de débit | 10 tentatives par minute et par IP sur `/auth/session` |
| Fail-closed si base indisponible | Refus explicite plutôt que repli sur une liste en dur |

Vérification du limiteur :

```bash
for i in $(seq 1 13); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:3000/auth/session \
    -H 'Content-Type: application/json' \
    -d '{"email":"qse@buildflow.io","password":"faux","mfaCode":"000000"}'
done
# 401 ×10 puis 429
```

### Le secret de signature

`JWT_SECRET` est **obligatoire** hors `NODE_ENV=development|test` — variable absente
comprise. L'API refuse de démarrer et sort en code 1 :

```
[Bootstrap] Démarrage interrompu : JWT_SECRET est absent.
```

Sont également refusés : la valeur de développement publiée dans le dépôt, et tout
secret de moins de 32 caractères.

`docker-compose.yml` n'en fournit **aucun par défaut** : un secret écrit dans un
fichier versionné serait public, donc équivalent à pas de secret.

## Contrôle d'accès

`RolesGuard` est **fail-closed** : toute route exige une authentification, sauf celles
marquées `@Public()`. Sans `@Roles`, un jeton valide suffit — mais est exigé.

| Route | Accès |
|---|---|
| `/health` | Public — sonde d'infrastructure |
| `/auth/config`, `/auth/session`, `/auth/validate` | Public — délivre les jetons |
| Tout le reste | Authentification requise |

Un test fige la liste des contrôleurs autorisés à être publics : en marquer un nouveau
fait échouer la suite tant qu'il n'y est pas inscrit délibérément.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/reporting/kpi   # 401
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/health          # 200
```

L'en-tête `x-role` est un **raccourci de développement** : `RolesGuard` ne l'accepte
que si `NODE_ENV=development`. Les conteneurs tournant en `production`, une requête ne
portant que cet en-tête reçoit 401.

## Preuves WORM

Les photos de constat sont scellées dans MinIO avec **Object Lock en mode COMPLIANCE**,
rétention 365 jours. Ni modification ni suppression ne sont possibles, y compris par
un administrateur.

```bash
aws --endpoint-url http://localhost:9000 s3api get-object-retention \
  --bucket buildflow-worm-evidences --key <cle>

{ "Retention": { "Mode": "COMPLIANCE", "RetainUntilDate": "2027-…" } }
```

C'est MinIO qui répond, pas l'application : la propriété est démontrable, non affirmée.

**Ordre des opérations.** L'existence de la NCR est vérifiée **avant** tout envoi.
L'implémentation antérieure téléversait d'abord et échouait ensuite au rattachement,
déposant un objet orphelin indestructible pendant un an.

**Clés aléatoires.** Chaque objet reçoit un UUID. Un compteur séquentiel repartait à 1
à chaque redémarrage et reformait des clés déjà écrites — sur un bucket immuable, la
réécriture est refusée.

**Pas d'affirmation sans scellement.** `wormLocked` reflète l'état réel. Sans bucket
configuré, il vaut `false` et l'URL passe en `memory://`.

## Journal d'audit

Chaque événement métier est consigné avec l'empreinte SHA-256 de l'entrée précédente.
`GET /audit/verify` recalcule la chaîne.

### Deux limites, énoncées plutôt que tues

**Le chaînage n'est pas scellé par clé.** Un `createHash('sha256')` sans secret : qui
peut écrire dans le journal peut recalculer toutes les empreintes suivantes, et
`verifyChain()` répondra `valid: true`. La chaîne détecte la corruption accidentelle,
pas la falsification volontaire.

*Remédiation :* HMAC à clé serveur, la clé n'étant pas dans le fichier ; ou ancrage
périodique de l'empreinte de tête dans le bucket WORM. Chiffré à 2 jours.

**Le fichier n'est monté sur aucun volume.** `data/audit-log.jsonl` vit dans le
système de fichiers du conteneur : il est détruit à chaque reconstruction d'image.
Vérifié — la chaîne repart de `GENESIS`.

## Ce qui n'est pas tenu

| Engagement | Réalité |
|---|---|
| « Authentification 100 % OIDC » | Aucun fournisseur OIDC dans la stack. `OIDC_ISSUER` pointe vers un `localhost:8080` qui n'existe pas. Le vérificateur OIDC existe en repli mais n'est jamais sollicité |
| MFA | Code constant `123456`. Il ne dépend ni du temps, ni d'un secret par utilisateur, ni d'un appareil |
| « BDD locale mobile sécurisée » | SQLite non chiffré. `sqflite` standard, pas de `sqflite_sqlcipher`. Le jeton, lui, est au Keystore |
| « Journaux WORM inaltérables » | Vrai pour les objets MinIO. Faux pour le journal d'audit (voir ci-dessus) |

Ces quatre points sont chiffrés et séquencés dans
`livrables/Matrice-Effort-Impact-V2.docx`. Les trois premiers totalisent neuf jours.

## Vulnérabilités de dépendances

`npm audit` relève 22 vulnérabilités, dont 16 de niveau *high*, toutes transitives —
NestJS, Next.js, chaîne `@typescript-eslint`. Les corriger impose des montées de
version majeures.

La CI bloque sur le niveau **critique** (aucune aujourd'hui) et rapporte le niveau
*high* sans bloquer. `npm audit fix` a été essayé : il fait passer le total de 22 à 37.
