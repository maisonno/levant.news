import { createClient } from '@/lib/supabase/server'
import Hero from '@/components/home/Hero'
import MisEnAvant from '@/components/home/MisEnAvant'
import MagCarousel from '@/components/home/MagCarousel'
import QuickTiles from '@/components/home/QuickTiles'
import AgendaHome from '@/components/home/AgendaHome'
import { PostWithRelations } from '@/types/database'

export const revalidate = 60 // ISR — revalide toutes les 60s

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Mis en avant actif
  const { data: misEnAvant } = await supabase
    .from('posts')
    .select('*')
    .eq('publie', true)
    .eq('mis_en_avant', true)
    .or(`date_fin.gte.${today},date_fin.is.null`)
    .order('date_debut', { ascending: false })
    .limit(1)

  // Articles Levant Mag
  const { data: articles } = await supabase
    .from('articles_mag')
    .select('*')
    .eq('publie', true)
    .order('date_publication', { ascending: false })
    .limit(6)

  // Événements du jour (avec relations)
  const { data: todayPosts } = await supabase
    .from('posts')
    .select(`
      *,
      organisateur:etablissements!posts_organisateur_id_fkey(id, nom, photo_url),
      lieu:etablissements!posts_lieu_id_fkey(id, nom),
      categorie:categories!posts_categorie_code_fkey(code, nom)
    `)
    .eq('publie', true)
    .eq('dans_agenda', true)
    .lte('date_debut', today)
    .or(`date_fin.gte.${today},date_fin.is.null`)
    .order('ordre_dans_journee', { ascending: true, nullsFirst: false })

  return (
    <main className="pb-safe">
      <Hero />
      {misEnAvant?.[0] && <MisEnAvant post={misEnAvant[0]} />}
      <MagCarousel articles={articles ?? []} />
      <QuickTiles />
      <AgendaHome
        posts={(todayPosts ?? []) as PostWithRelations[]}
        today={today}
      />
    </main>
  )
}
