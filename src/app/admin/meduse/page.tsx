import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MeduseAdmin from './MeduseAdmin'

export default async function AdminMedusePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/compte/connexion')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/admin')

  return <MeduseAdmin />
}
