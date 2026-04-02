import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function AgendaPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Chercher les 60 prochains jours + événements en cours
  const futurDate = new Date()
  futurDate.setDate(futurDate.getDate() + 60)
  const future = futurDate.toISOString().split('T')[0]

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      organisateur:etablissements!posts_organisateur_id_fkey(id, nom, photo_url),
      lieu:etablissements!posts_lieu_id_fkey(id, nom),
      categorie:categories!posts_categorie_code_fkey(code, nom)
    `)
    .eq('publie', true)
    .eq('dans_agenda', true)
    .lte('date_debut', future)
    .or(`date_fin.gte.${today},date_fin.is.null,date_debut.gte.${today}`)
    .order('date_debut', { ascending: true })
    .order('ordre_dans_journee', { ascending: true, nullsFirst: false })

  // À l'affiche (carousel)
  const { data: aLaffiche } = await supabase
    .from('posts')
    .select(`
      *,
      organisateur:etablissements!posts_organisateur_id_fkey(id, nom, photo_url),
      categorie:categories!posts_categorie_code_fkey(code, nom)
    `)
    .eq('publie', true)
    .eq('a_laffiche', true)
    .gte('date_fin', today)
    .order('date_debut', { ascending: true })

  if (error) {
    console.error('Erreur agenda:', error)
  }

  return (
    <AgendaClient
      posts={(posts ?? []) as PostWithRelations[]}
      aLaffiche={(aLaffiche ?? []) as PostWithRelations[]}
      today={today}
    />
  )
}
