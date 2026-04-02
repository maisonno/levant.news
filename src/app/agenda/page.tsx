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

  const passDate = new Date()
  passDate.setDate(passDate.getDate() - 30)
  const past = passDate.toISOString().split('T')[0]

  let posts: PostWithRelations[] = []
  let aLaffiche: PostWithRelations[] = []

  try {
    // Étape 1 : fetch les posts sans FK ambiguës
    const [postsRes, afficheRes] = await Promise.allSettled([
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('dans_agenda', true)
        .gte('date_debut', past)
        .lte('date_debut', future)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('a_laffiche', true)
        .gte('date_fin', today)
        .order('date_debut', { ascending: true }),
    ])

    const rawPosts = postsRes.status === 'fulfilled' ? (postsRes.value.data ?? []) : []
    const rawAffiche = afficheRes.status === 'fulfilled' ? (afficheRes.value.data ?? []) : []

    if (postsRes.status === 'fulfilled' && postsRes.value.error) {
      console.error('Erreur posts:', postsRes.value.error)
    }

    // Étape 2 : fetch les établissements concernés en une seule requête
    const etablissementIds = [
      ...new Set([
        ...rawPosts.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)),
        ...rawAffiche.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)),
      ])
    ]

    let etablissementsMap: Record<string, any> = {}
    if (etablissementIds.length > 0) {
      const { data: etabs } = await supabase
        .from('etablissements')
        .select('id, nom, photo_url')
        .in('id', etablissementIds)
      if (etabs) {
        etablissementsMap = Object.fromEntries(etabs.map(e => [e.id, e]))
      }
    }

    // Étape 3 : fusionner
    const enrich = (p: any): PostWithRelations => ({
      ...p,
      organisateur: p.organisateur_id ? etablissementsMap[p.organisateur_id] ?? null : null,
      lieu: p.lieu_id ? etablissementsMap[p.lieu_id] ?? null : null,
    })

    posts = rawPosts.map(enrich)
    aLaffiche = rawAffiche.map(enrich)

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
