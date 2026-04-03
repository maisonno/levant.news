-- ─────────────────────────────────────────────────────────────────────────────
-- Espace compte unifié — migration SQL
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ajouter le rôle 'compagnie' dans la contrainte profiles
--    (Supabase n'a pas toujours de check constraint explicite, adapter si besoin)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'pro', 'compagnie', 'admin'));


-- 2. Table de liaison comptes ↔ établissements (many-to-many)
CREATE TABLE IF NOT EXISTS compte_etablissements (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, etablissement_id)
);

ALTER TABLE compte_etablissements ENABLE ROW LEVEL SECURITY;

-- Lecture : chaque compte voit ses propres liens, l'admin voit tout
CREATE POLICY "Lecture : propre compte ou admin" ON compte_etablissements
  FOR SELECT USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Écriture : admin uniquement (la gestion des liens se fait via Mon compte > Utilisateurs)
CREATE POLICY "Écriture : admin uniquement" ON compte_etablissements
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );


-- 3. RLS sur profiles : l'admin peut lire et modifier tous les profils
--    (vérifier que la politique existante "Users can view own profile" n'entre pas en conflit)

-- Lecture admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Admin peut lire tous les profils'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin peut lire tous les profils" ON profiles
        FOR SELECT USING (
          id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        );
    $policy$;
  END IF;
END $$;

-- Modification admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Admin peut modifier tous les profils'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin peut modifier tous les profils" ON profiles
        FOR UPDATE USING (
          id = auth.uid()
          OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        );
    $policy$;
  END IF;
END $$;
