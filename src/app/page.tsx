import Hero from '@/components/home/Hero'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function HomePage() {
  const today    = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const maxDate  = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]

  let misEnAvant:  PostWithRelations[] = []
  let articles:    any[]               = []
  let todayPosts:  PostWithRelations[] = []
  let enCeMoment:  PostWithRelations[] = []
  let aLaffiche:   PostWithRelations[] = []
  let demainPosts: PostWithRelations[] = []
  let autresPosts: PostWithRelations[] = []
  let expos:       PostWithRelations[] = []

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [meaRes, magRes, agendaRes, ongoingRes, afficheRes] = await Promise.allSettled([

      // Posts mis en avant (bloc MisEnAvant)
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('mis_en_avant', true)
        .or(`date_fin.gte.${today},date_debut.eq.${today}`)
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),

      // Levant Mag
      supabase
        .from('articles_mag')
        .select('*')
        .eq('publie', true)
        .order('date_publication', { ascending: false })
        .limit(6),

      // Agenda : aujourd'hui + 7 prochains jours (inclut les EXPO, on filtrera après)
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

      // À l'affiche
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('a_laffiche', true)
        .or(`date_fin.gte.${today},and(date_fin.is.null,date_debut.gte.${today})`)
        .order('date_debut', { ascending: true }),
    ])

    const rawMea     = meaRes.status     === 'fulfilled' ? (meaRes.value.data     ?? []) : []
    const rawAgenda  = agendaRes.status  === 'fulfilled' ? (agendaRes.value.data  ?? []) : []
    const rawOngoing = ongoingRes.status === 'fulfilled' ? (ongoingRes.value.data ?? []) : []
    const rawAffiche = afficheRes.status === 'fulfilled' ? (afficheRes.value.data ?? []) : []
    if (magRes.status === 'fulfilled') articles = magRes.value.data ?? []

    // Fetch tous les établissements en une seule requête
    const allRaw = [...rawMea, ...rawAgenda, ...rawOngoing, ...rawAffiche]
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

    misEnAvant = rawMea.map(enrich)

    // À l'affiche : 1 seul événement par organisateur (le plus proche),
    // ordre aléatoire, max 10
    const afficheEnriched = rawAffiche.map(enrich) // déjà trié date_debut asc
    const byOrg = new Map<string, PostWithRelations>()
    for (const post of afficheEnriched) {
      // Comme le résultat est trié date_debut asc, le 1er par org = le plus proche
      const key = post.organisateur_id ?? `__solo_${post.id}`
      if (!byOrg.has(key)) byOrg.set(key, post)
    }
    const deduped = Array.from(byOrg.values())
    // Fisher-Yates shuffle
    for (let i = deduped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduped[i], deduped[j]] = [deduped[j], deduped[i]]
    }
    aLaffiche = deduped.slice(0, 10)

    // Séparer EXPO du reste pour l'agenda
    const agendaEnriched  = rawAgenda.map(enrich)
    const ongoingEnriched = rawOngoing.map(enrich)

    const agendaNonExpo  = agendaEnriched.filter( (p: PostWithRelations) => p.categorie?.code !== 'EXPO')
    const agendaExpos    = agendaEnriched.filter( (p: PostWithRelations) => p.categorie?.code === 'EXPO')
    const ongoingNonExpo = ongoingEnriched.filter((p: PostWithRelations) => p.categorie?.code !== 'EXPO')
    const ongoingExpos   = ongoingEnriched.filter((p: PostWithRelations) => p.categorie?.code === 'EXPO')

    todayPosts  = agendaNonExpo.filter(p => p.date_debut === today)
    demainPosts = agendaNonExpo.filter(p => p.date_debut === tomorrow)
    autresPosts = agendaNonExpo.filter(p => p.date_debut > tomorrow)
    enCeMoment  = ongoingNonExpo
    // Dédup par id + tri par date (identique à agenda/page.tsx)
    const expoMap = new Map<string, PostWithRelations>()
    for (const p of [...ongoingExpos, ...agendaExpos]) expoMap.set(p.id, p)
    expos = Array.from(expoMap.values()).sort((a, b) => a.date_debut.localeCompare(b.date_debut))

  } catch (err) {
    console.error('Erreur homepage:', err)
  }

  return (
    <main className="pb-safe">
      <Hero />
      <MisEnAvant posts={misEnAvant} />
      <MagCarousel articles={articles} />
      <QuickTiles />
      <AgendaHome
        todayPosts={todayPosts}
        enCeMoment={enCeMoment}
        aLaffiche={aLaffiche}
        demainPosts={demainPosts}
        autresPosts={autresPosts}
        expos={expos}
        today={today}
        tomorrow={tomorrow}
      />
    </main>
  )
}
