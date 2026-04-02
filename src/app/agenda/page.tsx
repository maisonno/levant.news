import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function AgendaPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  let posts:     PostWithRelations[] = []
  let aLaffiche: PostWithRelations[] = []
  let expos:     PostWithRelations[] = []

  try {
    const [postsRes, afficheRes, ongoingExpoRes] = await Promise.allSettled([

      // Liste complète de l'agenda (toutes catégories, on filtrera côté JS)
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('dans_agenda', true)
        .gte('date_debut', today)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      // À l'affiche
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('a_laffiche', true)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .order('date_debut', { ascending: true }),

      // Expos en cours (démarrées avant aujourd'hui, pas encore terminées)
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('dans_agenda', true)
        .lt('date_debut', today)
        .gte('date_fin', today)
        .order('date_debut', { ascending: true }),
    ])

    const rawPosts       = postsRes.status       === 'fulfilled' ? (postsRes.value.data       ?? []) : []
    const rawAffiche     = afficheRes.status     === 'fulfilled' ? (afficheRes.value.data     ?? []) : []
    const rawOngoingExpo = ongoingExpoRes.status === 'fulfilled' ? (ongoingExpoRes.value.data ?? []) : []

    // Fetch tous les établissements en une seule requête
    const allRaw = [...rawPosts, ...rawAffiche, ...rawOngoingExpo]
    const etabIds = [...new Set(allRaw.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)))]

    let etabMap: Record<string, any> = {}
    if (etabIds.length > 0) {
      const { data: etabs } = await supabase
        .from('etablissements')
        .select('id, nom, photo_url')
        .in('id', etabIds)
      if (etabs) etabMap = Object.fromEntries(etabs.map(e => [e.id, e]))
    }

    const enrich = (p: any): PostWithRelations => ({
      ...p,
      organisateur: p.organisateur_id ? etabMap[p.organisateur_id] ?? null : null,
      lieu:         p.lieu_id         ? etabMap[p.lieu_id]         ?? null : null,
    })

    // Séparer EXPO du fil principal
    const allPosts = rawPosts.map(enrich)
    posts = allPosts.filter((p: PostWithRelations) => p.categorie?.code !== 'EXPO')

    // Expos : en cours + à venir (dédoublonnées par id)
    const upcomingExpos = allPosts.filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')
    const ongoingExpos  = rawOngoingExpo.map(enrich).filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')
    const expoMap = new Map<string, PostWithRelations>()
    for (const p of [...ongoingExpos, ...upcomingExpos]) expoMap.set(p.id, p)
    expos = Array.from(expoMap.values()).sort((a, b) => a.date_debut.localeCompare(b.date_debut))

    // À l'affiche : 1 par organisateur, shuffle, max 10
    const afficheEnriched = rawAffiche.map(enrich)
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
      expos={expos}
      today={today}
    />
  )
}
