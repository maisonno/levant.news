-- Préparation au changement Supabase (effectif 30/10/2026) :
-- les tables public ne seront plus exposées à l'API par défaut.
-- On rend explicites les grants actuellement implicites.

-- Accès au schéma
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Toutes les tables existantes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Séquences (nécessaires pour les INSERT avec colonnes serial/bigserial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Fonctions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Garantit les mêmes droits sur toutes les futures tables/séquences/fonctions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
