-- Suppression : un utilisateur ne peut annuler que ses propres inscriptions
CREATE POLICY "inscriptions_delete_own" ON inscriptions
  FOR DELETE TO authenticated
  USING (compte_id = auth.uid());
