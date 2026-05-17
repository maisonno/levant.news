import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import Hero from '@/components/home/Hero'
import InfoBateauBanner from '@/components/home/InfoBateauBanner'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { staticClient } from '@/lib/supabase/static'
import { PostWithRelations } from '@/types/database'

export const revalidate = 300

const POST_COLS = 'id, titre, complement, date_debut, heure, ordre_dans_journee, date_fin, organisateur_id, lieu_id, mis_en_avant, a_laffiche, dans_agenda, affiche_url, inscription, nb_inscriptions_max, phare, categorie:categories(code, nom)'

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MisEnAvantSkeleton() {
  return (
    <div className="px-4 mt-4 space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex bg-white rounded-2xl overflow-hidden border border-gray-100 h-28">
          <div className="w-28 flex-shrink-0 bg-gray-100 animate-pulse" />
          <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-2">
            <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AgendaSkeleton() {
  return (
    <div className="mt-6 px-4 space-y-3">
      <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchEtabMap(supabase: ReturnType<typeof staticClient>, posts: any[]) {
  const ids = [...new Set(posts.flatMap((p: any) => [p.organisateur_id, p.lieu_id].filter(Boolean)))]
  if (ids.length === 0) return {}
  const { data } = await supabase.from('etablissements').select('id, nom, photo_url').in('id', ids)
  return data ? Object.fromEntries(data.map((e: any) => [e.id, e])) : {}
}

function enrich(p: any, etabMap: Record<string, any>): PostWithRelations {
  return {
    ...p,
    organisateur: p.organisateur_id ? etabMap[p.organisateur_id] ?? null : null,
    lieu:         p.lieu_id         ? etabMap[p.lieu_id]         ?? null : null,
  }
}

// ─── Cached queries ───────────────────────────────────────────────────────────

const getMisEnAvantData = unstable_cache(
  async (today: string) => {
    const supabase = staticClient()
    const { data: raw } = await supabase
      .from('posts')
      .select(POST_COLS)
      .eq('publie', true)
      .eq('mis_en_avant', true)
      .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
      .order('date_debut', { ascending: true })
      .order('ordre_dans_journee', { ascending: true, nullsFirst: false })
    if (!raw?.length) return []
    const etabMap = await fetchEtabMap(supabase, raw)
    return raw.map((p: any) => enrich(p, etabMap))
  },
  ['home-mis-en-avant'],
  { revalidate: 300 },
)

const getMagData = unstable_cache(
  async () => {
    const { data } = await staticClient()
      .from('articles_mag')
      .select('id, titre, photo_principale_url, tags, auteur_nom')
      .eq('publie', true)
      .order('date_publication', { ascending: false })
      .limit(6)
    return data ?? []
  },
  ['home-mag'],
  { revalidate: 300 },
)

const getAgendaData = unstable_cache(
  async (today: string, tomorrow: string, datePlus21: string) => {
    const supabase = staticClient()
    const [agendaRes, agendaFutureRes, ongoingRes, afficheRes, phareRes, futureExpoRes] = await Promise.allSettled([
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .gte('date_debut', today).lte('date_debut', tomorrow)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .gt('date_debut', tomorrow)
        .order('date_debut', { ascending: true })
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false })
        .limit(10),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .lt('date_debut', today).gte('date_fin', today)
        .order('date_debut', { ascending: true }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('a_laffiche', true).eq('phare', false)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .lte('date_debut', datePlus21)
        .order('date_debut', { ascending: true }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('phare', true)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .lte('date_debut', datePlus21)
        .order('date_debut', { ascending: true }),
      supabase
        .from('posts').select(POST_COLS)
        .eq('publie', true).eq('dans_agenda', true)
        .gte('date_debut', today)
        .order('date_debut', { ascending: true }),
    ])

    const rawAgenda      = agendaRes.status      === 'fulfilled' ? (agendaRes.value.data      ?? []) : []
    const rawAgendaFuture = agendaFutureRes.status === 'fulfilled' ? (agendaFutureRes.value.data ?? []) : []
    const rawOngoing     = ongoingRes.status     === 'fulfilled' ? (ongoingRes.value.data     ?? []) : []
    const rawAffiche     = afficheRes.status     === 'fulfilled' ? (afficheRes.value.data     ?? []) : []
    const rawPhare       = phareRes.status       === 'fulfilled' ? (phareRes.value.data       ?? []) : []
    const rawFutureExpo  = futureExpoRes.status  === 'fulfilled' ? (futureExpoRes.value.data  ?? []) : []

    const allRaw = [...rawAgenda, ...rawAgendaFuture, ...rawOngoing, ...rawAffiche, ...rawPhare, ...rawFutureExpo]
    const etabMap = await fetchEtabMap(supabase, allRaw)

    return {
      rawAgendaTD:     rawAgenda.map((p: any) => enrich(p, etabMap)),
      rawAgendaFuture: rawAgendaFuture.map((p: any) => enrich(p, etabMap)),
      rawOngoing:      rawOngoing.map((p: any) => enrich(p, etabMap)),
      rawAffiche:      rawAffiche.map((p: any) => enrich(p, etabMap)),
      rawPhare:        rawPhare.map((p: any) => enrich(p, etabMap)),
      rawFutureExpo:   rawFutureExpo.map((p: any) => enrich(p, etabMap)),
    }
  },
  ['home-agenda'],
  { revalidate: 300 },
)

// ─── Shuffle pondéré ──────────────────────────────────────────────────────────

function weightedShuffle(posts: PostWithRelations[], todayStr: string): PostWithRelations[] {
  const todayMs = new Date(todayStr + 'T12:00:00').getTime()
  const scored = posts.map(post => {
    const daysUntil = Math.max(0, (new Date(post.date_debut + 'T12:00:00').getTime() - todayMs) / 86400000)
    const weight    = 1 / (daysUntil + 1)
    const priority  = -Math.log(Math.max(Math.random(), 1e-9)) / weight
    return { post, priority }
  })
  scored.sort((a, b) => a.priority - b.priority)
  return scored.map(s => s.post)
}

// ─── Section : Mis en avant ───────────────────────────────────────────────────

async function MisEnAvantSection() {
  const today = new Date().toISOString().split('T')[0]
  const posts = await getMisEnAvantData(today)
  if (!posts.length) return null
  return <MisEnAvant posts={posts} />
}

// ─── Section : Levant Mag ─────────────────────────────────────────────────────

async function MagCarouselSection() {
  const articles = await getMagData()
  if (!articles.length) return null
  return <MagCarousel articles={articles} />
}

// ─── Section : Agenda ─────────────────────────────────────────────────────────

async function AgendaSection() {
  const today      = new Date().toISOString().split('T')[0]
  const tomorrow   = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const datePlus21 = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0]

  const { rawAgendaTD, rawAgendaFuture, rawOngoing, rawAffiche, rawPhare, rawFutureExpo } =
    await getAgendaData(today, tomorrow, datePlus21)

  const rawAgenda = [...rawAgendaTD, ...rawAgendaFuture]

  // À l'affiche : source 1 = a_laffiche (phare=false), 1/org, sans-org exclus
  const byOrg = new Map<string, PostWithRelations>()
  for (const post of rawAffiche) {
    if (!post.organisateur_id) continue
    if (!byOrg.has(post.organisateur_id)) byOrg.set(post.organisateur_id, post)
  }
  const affichePooled = Array.from(
    new Map([...Array.from(byOrg.values()), ...rawPhare].map(p => [p.id, p])).values()
  )
  const aLaffiche = weightedShuffle(affichePooled, today).slice(0, 5)

  // Séparer EXPO du reste
  const agendaNonExpo  = rawAgenda.filter( p => p.categorie?.code !== 'EXPO')
  const ongoingNonExpo = rawOngoing.filter(p => p.categorie?.code !== 'EXPO')
  const ongoingExpos   = rawOngoing.filter(p => p.categorie?.code === 'EXPO')

  const todayPosts  = agendaNonExpo.filter(p => p.date_debut === today)
  const demainPosts = agendaNonExpo.filter(p => p.date_debut === tomorrow)
  const autresPosts = agendaNonExpo.filter(p => p.date_debut > tomorrow)
  const enCeMoment  = ongoingNonExpo

  const N = todayPosts.length + demainPosts.length
  const autresLimites = autresPosts.slice(0, Math.max(0, 10 - N))

  // Expos : en cours + futures, dédupliquées
  const futureExpos = rawFutureExpo.filter(p => p.categorie?.code === 'EXPO')
  const expoMap = new Map<string, PostWithRelations>()
  for (const p of [...ongoingExpos, ...futureExpos]) expoMap.set(p.id, p)
  const expos = Array.from(expoMap.values()).sort((a, b) => a.date_debut.localeCompare(b.date_debut))

  return (
    <AgendaHome
      todayPosts={todayPosts}
      enCeMoment={enCeMoment}
      aLaffiche={aLaffiche}
      demainPosts={demainPosts}
      autresPosts={autresLimites}
      expos={expos}
      today={today}
      tomorrow={tomorrow}
    />
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="pb-safe">

      {/* Instant — statique */}
      <Hero />

      {/* Instant — chaque tuile charge ses données côté client */}
      <QuickTiles />

      {/* Instant — données chargées côté client */}
      <InfoBateauBanner />

      {/* Streaming — skeleton de cartes pendant le chargement */}
      <Suspense fallback={<MisEnAvantSkeleton />}>
        <MisEnAvantSection />
      </Suspense>

      {/* Streaming — pas de skeleton (s'insère discrètement quand prêt) */}
      <Suspense>
        <MagCarouselSection />
      </Suspense>

      {/* Streaming — skeleton de cartes pendant le chargement */}
      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaSection />
      </Suspense>

    </main>
  )
}
