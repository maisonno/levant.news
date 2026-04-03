-- ─────────────────────────────────────────────────────────────────────────────
-- Buckets Supabase Storage : étab-images et article-images
-- À exécuter dans Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Bucket étab-images ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'etab-images', 'etab-images', true,
  5242880,  -- 5 Mo
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "etab-images : lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'etab-images');

CREATE POLICY "etab-images : upload authentifié" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'etab-images' AND auth.role() = 'authenticated');

CREATE POLICY "etab-images : modification authentifié" ON storage.objects
  FOR UPDATE USING (bucket_id = 'etab-images' AND auth.role() = 'authenticated');

CREATE POLICY "etab-images : suppression authentifié" ON storage.objects
  FOR DELETE USING (bucket_id = 'etab-images' AND auth.role() = 'authenticated');


-- ── Bucket article-images ─────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images', 'article-images', true,
  5242880,  -- 5 Mo
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "article-images : lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'article-images');

CREATE POLICY "article-images : upload authentifié" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'article-images' AND auth.role() = 'authenticated');

CREATE POLICY "article-images : modification authentifié" ON storage.objects
  FOR UPDATE USING (bucket_id = 'article-images' AND auth.role() = 'authenticated');

CREATE POLICY "article-images : suppression authentifié" ON storage.objects
  FOR DELETE USING (bucket_id = 'article-images' AND auth.role() = 'authenticated');
