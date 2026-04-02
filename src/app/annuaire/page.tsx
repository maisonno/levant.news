import { createClient } from '@/lib/supabase/server'
import AnnuaireClient from './AnnuaireClient'
import { Etablissement, TypeEtablissement } from '@/types/database'

export const revalidate = 300

export default async function AnnuairePage() {
  const supabase = await createClient()

  let etabs: Etablissement[] = []
  let types: TypeEtablissement[] = []

  try {
    const [etabsRes, typesRes] = await Promise.allSettled([
      supabase
        .from('etablissements')
        .select('*')
        .eq('liste', true)
        .order('nom', { ascending: true }),

      supabase
        .from('type_etablissement')
        .select('*')
        .order('ordre', { ascending: true }),
    ])

    etabs = etabsRes.status === 'fulfilled' ? (etabsRes.value.data ?? []) : []
    types = typesRes.status === 'fulfilled' ? (typesRes.value.data ?? []) : []
  } catch (err) {
    console.error('Erreur annuaire:', err)
  }

  return <AnnuaireClient etabs={etabs} types={types} />
}
