import { createClient } from '@/lib/supabase/server'
import PostsAdmin from './PostsAdmin'

export default async function AdminPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()

  const isAdmin = profile?.role === 'admin'

  let etablissementIds: string[] | undefined
  if (!isAdmin) {
    const { data } = await supabase
      .from('compte_etablissements')
      .select('etablissement_id')
      .eq('user_id', user!.id)
    etablissementIds = (data ?? []).map(r => r.etablissement_id)
  }

  return <PostsAdmin isAdmin={isAdmin} etablissementIds={etablissementIds} />
}
