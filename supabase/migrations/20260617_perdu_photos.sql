-- Ajoute un tableau de photos aux objets perdus/trouvés
-- Rétro-compatibilité : photo_url reste, photos[] pour les nouvelles annonces

ALTER TABLE objets_perdus
  ADD COLUMN IF NOT EXISTS photos text[];

-- Backfill : migre photo_url existante dans le tableau
UPDATE objets_perdus
  SET photos = ARRAY[photo_url]
  WHERE photo_url IS NOT NULL AND photos IS NULL;

-- Bucket perdu-images : créer manuellement dans Supabase Dashboard > Storage
-- (Public bucket, avec policy "Public read" sur tous les objets)
-- Sinon les uploads du formulaire échoueront.
