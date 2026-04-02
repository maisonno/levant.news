import Hero from '@/components/home/Hero'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60

export default async function HomePage() {
  const today = new Date().toISOString().split('T')[0]

  let misEnAvant = null
  let articles = []
  let todayPosts: PostWithRelations[] = []

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [mea, mag, posts] = await Promise.allSettled([
      supabase
        .from('posts')
        .select('*')
        .eq('publie', true)
        .eq('mis_en_avant', true)
        .or(`date_fin.gte.${today},date_fin.is.null`)
        .order('date_debut', { ascending: false })
        .limit(1),

      supabase
        .from('articles_mag')
        .select('*')
        .eq('publie', true)
        .order('date_publication', { ascending: false })
        .limit(6),

      supabase
        .from('posts')
        .select(`
          *,
          organisateur:etablissements!organisateur_id(id, nom, photo_url),
          lieu:etablissements!lieu_id(id, nom),
          categorie:categories!categorie_code(code, nom)
        `)
        .eq('publie', true)
        .eq('dans_agenda', true)
        .lte('date_debut', today)
        .or(`date_fin.gte.${today},date_fin.is.null`)
        .order('ordre_dans_journee', { ascending: true, nullsFirst: false }),
    ])

    if (mea.status === 'fulfilled') misEnAvant = mea.value.data?.[0] ?? null
    if (mag.status === 'fulfilled') articles = mag.value.data ?? []
    if (posts.status === 'fulfilled') todayPosts = (posts.value.data ?? []) as PostWithRelations[]

  } catch (err) {
    console.error('Erreur chargement homepage:', err)
  }

  return (
    <main className="pb-safe">
      <Hero />
      {misEnAvant && <MisEnAvant post={misEnAvant} />}
      <MagCarousel articles={articles} />
      <QuickTiles />
      <AgendaHome posts={todayPosts} today={today} />
    </main>
  )
}
