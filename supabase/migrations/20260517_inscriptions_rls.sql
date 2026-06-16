-- Activer RLS si pas déjà fait
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut voir les inscriptions (pour compter les places)
CREATE POLICY "inscriptions_select_public" ON inscriptions
  FOR SELECT USING (true);

-- Insertion : uniquement les utilisateurs connectés, et seulement leur propre inscription
CREATE POLICY "inscriptions_insert_auth" ON inscriptions
  FOR INSERT TO authenticated
  WITH CHECK (compte_id = auth.uid());
