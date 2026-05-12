import { unstable_cache } from 'next/cache'
import { staticClient } from '@/lib/supabase/static'
import AnnuaireClient from './AnnuaireClient'
import { Etablissement, TypeEtablissement } from '@/types/database'

export const revalidate = 600

const getAnnuaireData = unstable_cache(
  async () => {
    const supabase = staticClient()
    const [etabsRes, typesRes] = await Promise.allSettled([
      supabase
        .from('etablissements')
        .select('id, nom, type_code, photo_url, statut, adresse, telephone, email, site_url, horaires, description')
        .eq('liste', true)
        .order('nom', { ascending: true }),
      supabase
        .from('type_etablissement')
        .select('code, nom, ordre')
        .order('ordre', { ascending: true }),
    ])
    return {
      etabs: (etabsRes.status === 'fulfilled' ? etabsRes.value.data : null) as Etablissement[] | null,
      types: (typesRes.status === 'fulfilled' ? typesRes.value.data : null) as TypeEtablissement[] | null,
    }
  },
  ['annuaire'],
  { revalidate: 600 },
)

export default async function AnnuairePage() {
  const { etabs, types } = await getAnnuaireData()
  return <AnnuaireClient etabs={etabs ?? []} types={types ?? []} />
}
