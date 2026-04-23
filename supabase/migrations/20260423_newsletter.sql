-- ─────────────────────────────────────────────────────────────────────────────
-- Newsletter Levant.news : colonne d'abonnement sur profiles
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS newsletter BOOLEAN NOT NULL DEFAULT false;
