-- ─────────────────────────────────────────────────────────────────────────────
-- RLS posts : Pro/Compagnie — accès partagé entre comptes d'un même établissement
--
-- Avant : seul l'auteur (auteur_id = auth.uid()) pouvait modifier/supprimer.
-- Après : tout compte lié à l'établissement organisateur OU lieu du post le peut.
--
-- Les admins conservent leur accès complet via les policies "posts : update|delete admin".
-- À exécuter dans Supabase > SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remplacer la policy UPDATE pro
DROP POLICY IF EXISTS "posts : update pro" ON posts;

CREATE POLICY "posts : update pro" ON posts
  FOR UPDATE
  USING (
    public.get_my_role() IN ('pro', 'compagnie')
    AND (
      organisateur_id IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
      OR lieu_id       IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    public.get_my_role() IN ('pro', 'compagnie')
    AND (
      organisateur_id IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
      OR lieu_id       IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
    )
  );

-- 2. Remplacer la policy DELETE pro
DROP POLICY IF EXISTS "posts : delete pro" ON posts;

CREATE POLICY "posts : delete pro" ON posts
  FOR DELETE
  USING (
    public.get_my_role() IN ('pro', 'compagnie')
    AND (
      organisateur_id IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
      OR lieu_id       IN (SELECT etablissement_id FROM compte_etablissements WHERE user_id = auth.uid())
    )
  );

-- Note : auteur_id reste rempli à l'insert (pour audit/traçabilité), mais
-- ne gate plus l'accès en modification.
