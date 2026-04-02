import Hero from '@/components/home/Hero'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function HomePage() {
  const today = new Date().toISOString().split('T')[0]

  let misEnAvant: PostWithRelations[] = []
  let articles: any[] = []
  let todayPosts: PostWithRelations[] = []

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [meaRes, magRes, postsRes] = await Promise.allSettled([

      // Tous les posts "mis en avant" actifs
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

      // Événements d'aujourd'hui uniquement
      // = commence aujourd'hui, OU en cours (début avant aujourd'hui, fin >= aujourd'hui)
      supabase
        .from('posts')
        .select('*, categorie:categories(code, nom)')
        .eq('publie', true)
        .eq('dans_agenda', true)
        .or(`date_debut.eq.${today},and(date_debut.lt.${today},date_fin.gte.${today})`)
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false })
        .limit(10),
    ])

    // Enrichir avec les établissements
    const rawMea   = meaRes.status   === 'fulfilled' ? (meaRes.value.data   ?? []) : []
    const rawPosts = postsRes.status === 'fulfilled' ? (postsRes.value.data ?? []) : []
    if (magRes.status === 'fulfilled') articles = magRes.value.data ?? []

    const allRaw = [...rawMea, ...rawPosts]
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
    todayPosts = rawPosts.map(enrich)

  } catch (err) {
    console.error('Erreur homepage:', err)
  }

  return (
    <main className="pb-safe">
      <Hero />
      <MisEnAvant posts={misEnAvant} />
      <MagCarousel articles={articles} />
      <QuickTiles />
      <AgendaHome posts={todayPosts} today={today} />
    </main>
  )
}
