-- Migration 003 : comptes de démonstration en base, mots de passe hachés
--
-- `AuthService` conservait quatre comptes dans un tableau en mémoire et
-- comparait les mots de passe en clair. La colonne `users.hashed_password`
-- existait depuis la migration 001 mais n'était jamais lue : elle contient
-- `hash-placeholder` sur toutes les lignes.
--
-- Cette migration met les comptes de démonstration en base avec un hachage
-- argon2id, seule source d'autorité pour l'authentification à partir de
-- maintenant.
--
-- Le mot de passe haché est `password` pour les quatre comptes. Ce n'est pas
-- une fuite : cette valeur est déjà publiée dans le README et le guide
-- d'exploitation comme identifiant de démonstration. Les quatre empreintes
-- sont néanmoins distinctes — argon2 tire un sel aléatoire par hachage —
-- pour ne pas exposer le fait qu'elles partagent le même secret.
--
-- Ce que cette migration NE fait PAS :
--   * aucune suppression de ligne, dans aucune table ;
--   * aucune modification des NCR, chantiers, photos ou journaux d'audit ;
--   * les comptes techniques créés par la synchronisation mobile
--     (`*.local`, `user-1@buildflow.io`) sont laissés intacts. Ils sont
--     référencés par `ncr.creator_id` et `hse_actions.responsible_id` :
--     les supprimer violerait des clés étrangères. Ils conservent leur
--     `hash-placeholder`, qui n'est pas un hachage argon2 valide — ils ne
--     peuvent donc pas servir à ouvrir une session.

BEGIN;

-- 1. Les trois comptes absents de la base

INSERT INTO users (id, name, email, role, hashed_password, mfa_enabled, created_at)
VALUES
  (
    gen_random_uuid(), 'Chef de chantier', 'chef@buildflow.io', 'CHEF_CHANTIER',
    '$argon2id$v=19$m=19456,t=2,p=1$jGIcd3D24ragz7gjQtJXew$NOQon9enUFW+8mfB5W47DwgA4ncy/B34qn5qO9s2yFI',
    TRUE, NOW()
  ),
  (
    gen_random_uuid(), 'Responsable QSE', 'qse@buildflow.io', 'RESPONSABLE_QSE',
    '$argon2id$v=19$m=19456,t=2,p=1$X1tvgej62WXQdvIigZDxCg$l6U8mM+sX1FEpfEUryqIeOHEcJ0tRK3EIkzwRWpFYe4',
    TRUE, NOW()
  ),
  (
    gen_random_uuid(), 'Direction des travaux', 'direction@buildflow.io', 'DIRECTION_TRAVAUX',
    '$argon2id$v=19$m=19456,t=2,p=1$5A8prvmYTHny3NmuOVb1uw$D0Z9TmikPpfmaQ7atPMmCECY2rhT1QKvRaLBqgQGaDU',
    TRUE, NOW()
  )
ON CONFLICT (email) DO NOTHING;

-- 2. `admin@buildflow.io` existe déjà, mais avec le rôle CHEF_CHANTIER —
--    créé par `ensureUser()` lors d'une synchronisation, qui attribue un rôle
--    arbitraire. L'authentification le traite comme ADMIN : les deux
--    référentiels avaient divergé.

UPDATE users
SET role = 'ADMIN',
    name = 'Administrateur',
    hashed_password = '$argon2id$v=19$m=19456,t=2,p=1$w6L3MdFttyyY860znLkujA$f1+RNxRRo60Thl4Wmc9EK0DjWTSr+xIX38XOJkjrOL0',
    mfa_enabled = TRUE
WHERE email = 'admin@buildflow.io';

-- 3. Garde-fou : l'authentification lit `hashed_password` et rejette toute
--    valeur qui n'est pas une empreinte argon2. Un index partiel documente
--    et accélère la recherche par email des comptes réellement utilisables.

CREATE INDEX IF NOT EXISTS idx_users_email_authentifiable
  ON users (email)
  WHERE hashed_password LIKE '$argon2id$%';

COMMIT;
