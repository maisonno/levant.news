import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PostWithRelations } from '@/types/database'
import EventDetail from './EventDetail'

export const revalidate = 60

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      organisateur:etablissements!organisateur_id(id, nom, photo_url, email, telephone, site_url, adresse),
      lieu:etablissements!lieu_id(id, nom, adresse, geocodage),
      categorie:categories!categorie_code(code, nom)
    `)
    .eq('id', id)
    .eq('publie', true)
    .single()

  if (!post) notFound()

  // Nombre d'inscriptions si applicable
  let nbInscriptions = 0
  if (post.inscription) {
    const { count } = await supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', id)
    nbInscriptions = count ?? 0
  }

  return (
    <EventDetail
      post={post as PostWithRelations}
      nbInscriptions={nbInscriptions}
    />
  )
}
