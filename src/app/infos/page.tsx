import { createClient } from '@/lib/supabase/server'
import InfosClient from './InfosClient'
import { Article } from '@/types/database'

export const revalidate = 300

export default async function InfosPage() {
  const supabase = await createClient()

  let articles: Article[] = []

  try {
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('publie', true)
      .order('ordre', { ascending: true })

    articles = data ?? []
  } catch (err) {
    console.error('Erreur infos:', err)
  }

  return <InfosClient articles={articles} />
}
