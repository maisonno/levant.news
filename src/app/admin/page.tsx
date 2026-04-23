import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/compte/connexion?redirect=/admin')

  const { data: profile } = await supabase
    .from('profiles').select('role, moderateur').eq('id', user.id).single()

  if (profile?.role === 'admin') redirect('/admin/posts')
  if (profile?.moderateur) redirect('/admin/moderation')
  redirect('/')
}
