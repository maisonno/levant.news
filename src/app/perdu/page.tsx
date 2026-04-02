import { createClient } from '@/lib/supabase/server'
import PerduClient from './PerduClient'

export const dynamic = 'force-dynamic'

export default async function PerduPage() {
  const supabase = await createClient()

  // On récupère : actives non expirées (J-10) + toutes les fermées
  // Le filtrage J+10 se fait côté client pour éviter un calcul SQL complexe ;
  // on limite aux 200 derniers créés pour ne pas surcharger.
  const { data: annonces } = await supabase
    .from('objets_perdus')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return <PerduClient annonces={annonces ?? []} />
}
