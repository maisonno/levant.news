import { unstable_cache } from 'next/cache'
import { staticClient } from '@/lib/supabase/static'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 300

const POST_COLS = 'id, titre, complement, date_debut, heure, ordre_dans_journee, date_fin, organisateur_id, lieu_id, mis_en_avant, a_laffiche, dans_agenda, affiche_url, inscription, nb_inscriptions_max, phare, categorie:categories(code, nom)'

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

function enrich(p: any, etabMap: Record<string, any>): PostWithRelations {
  return {
    ...p,
    organisateur: p.organisateur_id ? etabMap[p.organisateur_id] ?? null : null,
    lieu:         p.lieu_id         ? etabMap[p.lieu_id]         ?? null : null,
  }
}

const getAgendaPageData = unstable_cache(
  async (today: string, datePlus21: string) => {
    const supabase = staticClient()

    const [postsRes, afficheTabAfficheRes, afficheTabPhareRes, ongoingExpoRes] = await Promise.allSettled([
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .gte('date_debut', today)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('a_laffiche', true).eq('phare', false)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .lte('date_debut', datePlus21)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('phare', true)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .lt('date_debut', today).gte('date_fin', today)
        .order('date_debut', { ascending: true }),
    ])

    const rawPosts            = postsRes.status              === 'fulfilled' ? (postsRes.value.data              ?? []) : []
    const rawAfficheTabAffiche = afficheTabAfficheRes.status === 'fulfilled' ? (afficheTabAfficheRes.value.data  ?? []) : []
    const rawAfficheTabPhare   = afficheTabPhareRes.status   === 'fulfilled' ? (afficheTabPhareRes.value.data    ?? []) : []
    const rawOngoingExpo      = ongoingExpoRes.status        === 'fulfilled' ? (ongoingExpoRes.value.data        ?? []) : []

    const allRaw  = [...rawPosts, ...rawAfficheTabAffiche, ...rawAfficheTabPhare, ...rawOngoingExpo]
    const etabIds = [...new Set(allRaw.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)))]

    let etabMap: Record<string, any> = {}
    if (etabIds.length > 0) {
      const { data: etabs } = await supabase
        .from('etablissements').select('id, nom, photo_url').in('id', etabIds)
      if (etabs) etabMap = Object.fromEntries(etabs.map((e: any) => [e.id, e]))
    }

    return {
      rawPosts:             rawPosts.map((p: any) => enrich(p, etabMap)),
      rawAfficheTabAffiche: rawAfficheTabAffiche.map((p: any) => enrich(p, etabMap)),
      rawAfficheTabPhare:   rawAfficheTabPhare.map((p: any) => enrich(p, etabMap)),
      rawOngoingExpo:       rawOngoingExpo.map((p: any) => enrich(p, etabMap)),
    }
  },
  ['agenda-page'],
  { revalidate: 300 },
)

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const today      = new Date().toISOString().split('T')[0]
  const datePlus21 = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]
  const params     = await searchParams
  const initialTab = (['agenda', 'expositions', 'affiche'] as const).includes(params?.tab as any)
    ? (params.tab as 'agenda' | 'expositions' | 'affiche')
    : 'agenda'

  let posts:           PostWithRelations[] = []
  let afficheTab:      PostWithRelations[] = []
  let afficheCarousel: PostWithRelations[] = []
  let expos:           PostWithRelations[] = []

  try {
    const { rawPosts, rawAfficheTabAffiche, rawAfficheTabPhare, rawOngoingExpo } =
      await getAgendaPageData(today, datePlus21)

    // Agenda (hors EXPO)
    posts = rawPosts.filter(p => p.categorie?.code !== 'EXPO')

    // Onglet À l'affiche : dédoublonné, max 3/org pour non-phare
    const rawAffiche   = [...rawAfficheTabAffiche, ...rawAfficheTabPhare]
    const afficheDedup = Array.from(new Map(rawAffiche.map(p => [p.id, p])).values())
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    const orgCount = new Map<string, number>()
    afficheTab = afficheDedup.filter(p => {
      if (!p.organisateur_id) return false
      if (p.phare === true)   return true
      const n = orgCount.get(p.organisateur_id) ?? 0
      if (n >= 3) return false
      orgCount.set(p.organisateur_id, n + 1)
      return true
    })

    // Carousel : source 1 = a_laffiche (phare=false), 1/org ; source 2 = phare ≤21j
    const byOrg = new Map<string, PostWithRelations>()
    for (const p of rawAfficheTabAffiche) {
      if (!p.organisateur_id) continue
      if (!byOrg.has(p.organisateur_id)) byOrg.set(p.organisateur_id, p)
    }
    const carouselPhare    = rawAfficheTabPhare.filter(p => p.date_debut <= datePlus21)
    const carouselCombined = Array.from(
      new Map([...Array.from(byOrg.values()), ...carouselPhare].map(p => [p.id, p])).values()
    )
    afficheCarousel = weightedShuffle(carouselCombined, today).slice(0, 5)

    // Expositions : en cours + à venir, dédoublonnées
    const upcomingExpos = rawPosts.filter(p => p.categorie?.code === 'EXPO')
    const ongoingExpos  = rawOngoingExpo.filter(p => p.categorie?.code === 'EXPO')
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
