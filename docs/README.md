# Documentation BuildFlow

Documentation reconstruite le 1er août 2026 à partir du **Livrable 3** et de l'état
vérifié du code. Elle remplace les fiches de phase précédentes, qui décrivaient une
cible et non le livré.

Principe retenu : **chaque affirmation est vérifiable**. Quand une propriété n'est pas
tenue, elle est énoncée comme telle plutôt qu'omise — c'est ce qui distingue une
documentation d'une plaquette.

## Sommaire

| Document | Contenu |
|---|---|
| [architecture.md](architecture.md) | Architecture réellement livrée, écarts assumés avec le cadrage |
| [modele-de-donnees.md](modele-de-donnees.md) | Schéma PostgreSQL, migrations, contraintes |
| [securite.md](securite.md) | Authentification, contrôle d'accès, preuves WORM, limites |
| [tests-et-qualite.md](tests-et-qualite.md) | Couverture réelle, chaîne d'intégration |
| [exploitation.md](exploitation.md) | Démarrage, vérification, flux Git |
| [conformite-livrables.md](conformite-livrables.md) | **Traçabilité L1 → L3 → livré**, écart par écart |

## Livrables du Palier 3

Le sous-dossier [livrables/](livrables/) contient les documents à déposer :

- `SIEM-regles-alertes.docx` — trois règles de détection
- `DPIA-conformite-RGPD.docx` — extrait d'analyse d'impact
- `Matrice-Effort-Impact-V2.docx` — Top 5 des améliorations
- `Trame-soutenance.docx` — structure de la présentation

## Comment lire cette documentation

Les chiffres cités proviennent d'exécutions réelles, non d'estimations. Chaque section
sensible indique la commande qui permet de la reproduire.

Le document [conformite-livrables.md](conformite-livrables.md) est le plus utile en
soutenance : il aligne chaque engagement du cadrage sur son état constaté.
