import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export const metadata = { title: 'Admin — Levant.news' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/compte/connexion?redirect=/admin/posts')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, prenom, nom')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav displayName={`${profile.prenom} ${profile.nom}`} />
      <div className="pt-0">
        {children}
      </div>
    </div>
  )
}
