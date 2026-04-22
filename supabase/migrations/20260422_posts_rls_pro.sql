-- ─────────────────────────────────────────────────────────────────────────────
-- RLS posts : accès Pro/Compagnie + fonction get_my_role()
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Fonction utilitaire (idempotente)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 2. Policy INSERT pro/compagnie
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts : insert pro'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "posts : insert pro" ON posts
        FOR INSERT
        WITH CHECK (public.get_my_role() IN ('pro', 'compagnie'))
    $p$;
  END IF;
END $$;

-- 3. Policy UPDATE pro/compagnie (ses propres posts uniquement via auteur_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts : update pro'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "posts : update pro" ON posts
        FOR UPDATE
        USING (
          public.get_my_role() IN ('pro', 'compagnie')
          AND auteur_id = auth.uid()
        )
        WITH CHECK (
          public.get_my_role() IN ('pro', 'compagnie')
          AND auteur_id = auth.uid()
        )
    $p$;
  END IF;
END $$;

-- 4. Policy DELETE pro/compagnie (ses propres posts uniquement)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts : delete pro'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "posts : delete pro" ON posts
        FOR DELETE
        USING (
          public.get_my_role() IN ('pro', 'compagnie')
          AND auteur_id = auth.uid()
        )
    $p$;
  END IF;
END $$;
