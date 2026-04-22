-- ─────────────────────────────────────────────────────────────────────────────
-- Modérateurs : colonne + policies RLS
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne moderateur sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderateur BOOLEAN NOT NULL DEFAULT false;

-- 2. SELECT posts pour les modérateurs (voir les posts non publiés)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts : select moderateur'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "posts : select moderateur" ON posts
        FOR SELECT
        USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
    $p$;
  END IF;
END $$;

-- 3. UPDATE posts pour les modérateurs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts : update moderateur'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "posts : update moderateur" ON posts
        FOR UPDATE
        USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
    $p$;
  END IF;
END $$;

-- 4. SELECT objets_perdus pour les modérateurs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objets_perdus' AND policyname = 'objets_perdus : select moderateur'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "objets_perdus : select moderateur" ON objets_perdus
        FOR SELECT
        USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
    $p$;
  END IF;
END $$;

-- 5. UPDATE objets_perdus pour les modérateurs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objets_perdus' AND policyname = 'objets_perdus : update moderateur'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "objets_perdus : update moderateur" ON objets_perdus
        FOR UPDATE
        USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
    $p$;
  END IF;
END $$;

-- 6. SELECT + INSERT + UPDATE info_bateau pour les modérateurs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'info_bateau' AND policyname = 'info_bateau : moderateur'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "info_bateau : moderateur" ON info_bateau
        FOR ALL
        USING (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND moderateur = true)
        )
    $p$;
  END IF;
END $$;
