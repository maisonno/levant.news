-- Policies RLS pour le bucket perdu-images
-- Reproduit le même schéma que etab-images / article-images / post-images

-- Lecture publique
CREATE POLICY "perdu-images: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'perdu-images');

-- Upload pour les utilisateurs connectés
CREATE POLICY "perdu-images: authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'perdu-images');

-- Mise à jour pour les utilisateurs connectés
CREATE POLICY "perdu-images: authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'perdu-images');

-- Suppression pour les utilisateurs connectés
CREATE POLICY "perdu-images: authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'perdu-images');
