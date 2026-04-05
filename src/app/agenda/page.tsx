import { createClient } from '@/lib/supabase/server'
import AgendaClient from './AgendaClient'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

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

  let posts:      PostWithRelations[] = []
  let afficheTab: PostWithRelations[] = []
  let expos:      PostWithRelations[] = []

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

    // Onglet À l'affiche : a_laffiche + phare, dédoublonnés par id
    const afficheMap = new Map<string, PostWithRelations>()
    for (const p of rawAffiche.map(enrich)) afficheMap.set(p.id, p)
    afficheTab = Array.from(afficheMap.values()).sort((a, b) =>
      a.date_debut.localeCompare(b.date_debut)
    )

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
      afficheTab={afficheTab}
      expos={expos}
      today={today}
      initialTab={initialTab}
    />
  )
}
