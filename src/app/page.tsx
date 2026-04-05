import { Suspense } from 'react'
import Hero from '@/components/home/Hero'
import InfoBateauBanner from '@/components/home/InfoBateauBanner'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MagCarouselSkeleton() {
  return (
    <div className="mx-4 mt-4 flex gap-3 overflow-hidden">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-44 rounded-2xl bg-gray-100 animate-pulse" style={{ height: 200 }} />
      ))}
    </div>
  )
}

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

// ─── Helpers communs ──────────────────────────────────────────────────────────

async function buildEtabMap(supabase: any, posts: any[]) {
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

// ─── Section : Mis en avant ───────────────────────────────────────────────────

async function MisEnAvantSection() {
  const today = new Date().toISOString().split('T')[0]
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('posts')
    .select('*, categorie:categories(code, nom)')
    .eq('publie', true)
    .eq('mis_en_avant', true)
    .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
    .order('date_debut', { ascending: true })
    .order('ordre_dans_journee', { ascending: true, nullsFirst: false })

  if (!raw?.length) return null

  const etabMap = await buildEtabMap(supabase, raw)
  const posts   = raw.map((p: any) => enrich(p, etabMap))

  return <MisEnAvant posts={posts} />
}

// ─── Section : Levant Mag ─────────────────────────────────────────────────────

async function MagCarouselSection() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles_mag')
    .select('*')
    .eq('publie', true)
    .order('date_publication', { ascending: false })
    .limit(6)

  if (!articles?.length) return null
  return <MagCarousel articles={articles} />
}

// ─── Section : Agenda ─────────────────────────────────────────────────────────

/**
 * Shuffle pondéré : plus la date est proche, plus la probabilité de passer
 * en tête est élevée. Algorithme : priority = -ln(U) / weight, sort asc.
 */
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

async function AgendaSection() {
  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const maxDate  = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [agendaRes, ongoingRes, afficheRes, futureExpoRes] = await Promise.allSettled([

    // Agenda : aujourd'hui + 15 jours
    supabase
      .from('posts')
      .select('*, categorie:categories(code, nom)')
      .eq('publie', true)
      .eq('dans_agenda', true)
      .gte('date_debut', today)
      .lte('date_debut', maxDate)
      .order('date_debut', { ascending: true })
      .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

    // En ce moment : événements multi-jours déjà commencés
    supabase
      .from('posts')
      .select('*, categorie:categories(code, nom)')
      .eq('publie', true)
      .eq('dans_agenda', true)
      .lt('date_debut', today)
      .gte('date_fin', today)
      .order('date_debut', { ascending: true }),

    // À l'affiche : trié par date_debut ASC pour avoir le prochain event par org
    supabase
      .from('posts')
      .select('*, categorie:categories(code, nom)')
      .eq('publie', true)
      .eq('a_laffiche', true)
      .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
      .order('date_debut', { ascending: true }),

    // Expos futures (sans limite de date)
    supabase
      .from('posts')
      .select('*, categorie:categories(code, nom)')
      .eq('publie', true)
      .eq('dans_agenda', true)
      .gte('date_debut', today)
      .order('date_debut', { ascending: true }),
  ])

  const rawAgenda     = agendaRes.status     === 'fulfilled' ? (agendaRes.value.data     ?? []) : []
  const rawOngoing    = ongoingRes.status    === 'fulfilled' ? (ongoingRes.value.data    ?? []) : []
  const rawAffiche    = afficheRes.status    === 'fulfilled' ? (afficheRes.value.data    ?? []) : []
  const rawFutureExpo = futureExpoRes.status === 'fulfilled' ? (futureExpoRes.value.data ?? []) : []

  // Un seul fetch établissements pour toutes les sections
  const allRaw = [...rawAgenda, ...rawOngoing, ...rawAffiche, ...rawFutureExpo]
  const etabMap = await buildEtabMap(supabase, allRaw)

  const agendaEnriched  = rawAgenda.map((p: any)     => enrich(p, etabMap))
  const ongoingEnriched = rawOngoing.map((p: any)    => enrich(p, etabMap))
  const afficheEnriched = rawAffiche.map((p: any)    => enrich(p, etabMap))
  const futureEnriched  = rawFutureExpo.map((p: any) => enrich(p, etabMap))

  // À l'affiche : 1 post le plus tôt à venir par organisateur (date_debut ASC déjà trié),
  // shuffle pondéré par proximité de date, max 5
  const byOrg = new Map<string, PostWithRelations>()
  for (const post of afficheEnriched) {
    const key = post.organisateur_id ?? `__solo_${post.id}`
    if (!byOrg.has(key)) byOrg.set(key, post)
  }
  const aLaffiche = weightedShuffle(Array.from(byOrg.values()), today).slice(0, 5)

  // Séparer EXPO du reste
  const agendaNonExpo  = agendaEnriched.filter( (p: PostWithRelations) => p.categorie?.code !== 'EXPO')
  const ongoingNonExpo = ongoingEnriched.filter((p: PostWithRelations) => p.categorie?.code !== 'EXPO')
  const ongoingExpos   = ongoingEnriched.filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')

  const todayPosts  = agendaNonExpo.filter(p => p.date_debut === today)
  const demainPosts = agendaNonExpo.filter(p => p.date_debut === tomorrow)
  const autresPosts = agendaNonExpo.filter(p => p.date_debut > tomorrow)
  const enCeMoment  = ongoingNonExpo

  // Autres jours : limiter à (10 - N) événements supplémentaires
  const N = todayPosts.length + demainPosts.length
  const autresLimites = autresPosts.slice(0, Math.max(0, 10 - N))

  // Expos : en cours + futures, dédupliquées
  const futureExpos = futureEnriched.filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')
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
// Rendu synchrone : Hero et QuickTiles s'affichent immédiatement.
// Les sections lentes (MisEnAvant, MagCarousel, Agenda) streament en parallèle.

export default function HomePage() {
  return (
    <main className="pb-safe">

      {/* Instant — statique */}
      <Hero />

      {/* Instant — données chargées côté client */}
      <InfoBateauBanner />

      {/* Streaming — skeleton de cartes pendant le chargement */}
      <Suspense fallback={<MisEnAvantSkeleton />}>
        <MisEnAvantSection />
      </Suspense>

      {/* Streaming — skeleton horizontal pendant le chargement */}
      <Suspense fallback={<MagCarouselSkeleton />}>
        <MagCarouselSection />
      </Suspense>

      {/* Instant — chaque tuile charge ses données côté client */}
      <QuickTiles />

      {/* Streaming — skeleton de cartes pendant le chargement */}
      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaSection />
      </Suspense>

    </main>
  )
}
