import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

/** Même algo que la page d'accueil : priority = −ln(U) / weight, weight = 1/(jours+1) */
function weightedShuffle(posts: PostWithRelations[], todayStr: string): PostWithRelations[] {
  const todayMs = new Date(todayStr + 'T12:00:00').getTime()
  const scored = posts.map(post => {
    const daysUntil = Math.max(0, (new Date(post.date_debut + 'T12:00:00').getTime() - todayMs) / 86400000)
    const weight   = 1 / (daysUntil + 1)
    const priority = -Math.log(Math.max(Math.random(), 1e-9)) / weight
    return { post, priority }
  })
  scored.sort((a, b) => a.priority - b.priority)
  return scored.map(s => s.post)
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]
  const params   = await searchParams
  const initialTab = (['agenda', 'expositions', 'affiche'] as const).includes(
    params?.tab as any
  )
    ? (params.tab as 'agenda' | 'expositions' | 'affiche')
    : 'agenda'

  let posts:            PostWithRelations[] = []
  let afficheTab:       PostWithRelations[] = []
  let afficheCarousel:  PostWithRelations[] = []
  let expos:            PostWithRelations[] = []

  try {
    const [postsRes, afficheRes, ongoingExpoRes] = await Promise.allSettled([

      // Liste complète de l'agenda (hors EXPO, on filtrera côté JS)
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('dans_agenda', true)
        .gte('date_debut', today)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      // Onglet À l'affiche : tous les posts a_laffiche OU phare, à venir
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .or('a_laffiche.eq.true,phare.eq.true')
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

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
    const allRaw   = [...rawPosts, ...rawAffiche, ...rawOngoingExpo]
    const etabIds  = [...new Set(allRaw.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)))]

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

    // Agenda (hors EXPO)
    const allPosts = rawPosts.map(enrich)
    posts = allPosts.filter((p: PostWithRelations) => p.categorie?.code !== 'EXPO')

    // Onglet À l'affiche : a_laffiche + phare, dédoublonnés, triés par date
    // Limite : max 3 prochains événements non-phare par organisateur
    // Les événements phares ne comptent pas dans cette limite
    // Les événements sans organisateur ne sont pas publiés à l'affiche
    const afficheEnriched = rawAffiche.map(enrich)
    const afficheDeduped  = Array.from(
      new Map(afficheEnriched.map(p => [p.id, p])).values()
    ).sort((a, b) => a.date_debut.localeCompare(b.date_debut))

    const orgCount = new Map<string, number>()
    afficheTab = afficheDeduped.filter(p => {
      if (!p.organisateur_id) return false  // sans organisateur : exclu
      if (p.phare)            return true   // phare : toujours affiché, ne compte pas
      const n = orgCount.get(p.organisateur_id) ?? 0
      if (n >= 3)             return false
      orgCount.set(p.organisateur_id, n + 1)
      return true
    })

    // Carousel (identique page d'accueil) : a_laffiche seulement, 1 par org, weighted shuffle, max 5
    const byOrg = new Map<string, PostWithRelations>()
    for (const p of afficheEnriched.filter((p: PostWithRelations) => p.a_laffiche)) {
      const key = p.organisateur_id ?? `__solo_${p.id}`
      if (!byOrg.has(key)) byOrg.set(key, p)
    }
    afficheCarousel = weightedShuffle(Array.from(byOrg.values()), today).slice(0, 5)

    // Onglet Expositions : en cours + à venir, dédoublonnés
    const upcomingExpos = allPosts.filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')
    const ongoingExpos  = rawOngoingExpo.map(enrich).filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')
    const expoMap = new Map<string, PostWithRelations>()
    for (const p of [...ongoingExpos, ...upcomingExpos]) expoMap.set(p.id, p)
    expos = Array.from(expoMap.values()).sort((a, b) => a.date_debut.localeCompare(b.date_debut))

  } catch (err) {
    console.error('Erreur agenda:', err)
  }

  return (
    <AgendaClient
      posts={posts}
      afficheCarousel={afficheCarousel}
      afficheTab={afficheTab}
      expos={expos}
      today={today}
      initialTab={initialTab}
    />
  )
}
