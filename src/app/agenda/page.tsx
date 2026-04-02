import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function AgendaPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const futurDate = new Date()
  futurDate.setDate(futurDate.getDate() + 60)
  const future = futurDate.toISOString().split('T')[0]

  let posts: PostWithRelations[] = []
  let aLaffiche: PostWithRelations[] = []

  try {
    const [postsRes, afficheRes] = await Promise.allSettled([
      supabase
        .from('posts')
        .select(`
          *,
          organisateur:etablissements!organisateur_id(id, nom, photo_url),
          lieu:etablissements!lieu_id(id, nom),
          categorie:categories!categorie_code(code, nom)
        `)
        .eq('publie', true)
        .eq('dans_agenda', true)
        .lte('date_debut', future)
        .or(`date_fin.gte.${today},date_fin.is.null,date_debut.gte.${today}`)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      supabase
        .from('posts')
        .select(`
          *,
          organisateur:etablissements!organisateur_id(id, nom, photo_url),
          categorie:categories!categorie_code(code, nom)
        `)
        .eq('publie', true)
        .eq('a_laffiche', true)
        .gte('date_fin', today)
        .order('date_debut', { ascending: true }),
    ])

    if (postsRes.status === 'fulfilled') {
      if (postsRes.value.error) console.error('Erreur posts agenda:', postsRes.value.error)
      posts = (postsRes.value.data ?? []) as PostWithRelations[]
    }
    if (afficheRes.status === 'fulfilled') {
      aLaffiche = (afficheRes.value.data ?? []) as PostWithRelations[]
    }
  } catch (err) {
    console.error('Erreur agenda:', err)
  }

  return (
    <AgendaClient
      posts={posts}
      aLaffiche={aLaffiche}
      today={today}
    />
  )
}
