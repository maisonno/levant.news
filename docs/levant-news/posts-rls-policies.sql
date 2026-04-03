-- ─────────────────────────────────────────────────────────────────────────────
-- RLS : policies d'écriture pour la table posts
-- À exécuter dans Supabase > SQL Editor
--
-- Prérequis : la fonction get_my_role() doit exister (cf. compte-etablissements.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Admin : accès complet ─────────────────────────────────────────────────────

CREATE POLICY "posts : update admin" ON posts
  FOR UPDATE
  USING      (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "posts : insert admin" ON posts
  FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "posts : delete admin" ON posts
  FOR DELETE
  USING (public.get_my_role() = 'admin');


-- ── Pro / Compagnie : créer et modifier leurs propres posts ───────────────────

CREATE POLICY "posts : insert pro" ON posts
  FOR INSERT
  WITH CHECK (public.get_my_role() IN ('pro', 'compagnie'));

-- Un pro peut modifier un post dont il est l'auteur
-- (auteur_id est automatiquement rempli par le trigger handle_new_post si présent,
--  sinon à gérer côté client lors du INSERT)
CREATE POLICY "posts : update pro" ON posts
  FOR UPDATE
  USING (
    public.get_my_role() IN ('pro', 'compagnie')
    AND auteur_id = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() IN ('pro', 'compagnie')
    AND auteur_id = auth.uid()
  );
