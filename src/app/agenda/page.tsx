import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function AgendaPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Pas de limite de date — liste complète jusqu'au dernier post disponible

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
        .gte('date_debut', today)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('a_laffiche', true)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
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

    // À l'affiche : 1 par organisateur (le plus proche), shuffle, max 10
    const afficheEnriched = rawAffiche.map(enrich) // trié date_debut asc
    const byOrg = new Map<string, PostWithRelations>()
    for (const post of afficheEnriched) {
      const key = post.organisateur_id ?? `__solo_${post.id}`
      if (!byOrg.has(key)) byOrg.set(key, post)
    }
    const deduped = Array.from(byOrg.values())
    for (let i = deduped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduped[i], deduped[j]] = [deduped[j], deduped[i]]
    }
    aLaffiche = deduped.slice(0, 10)

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
