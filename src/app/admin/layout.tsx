import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNav from './AdminNav'

export const metadata = { title: 'Admin — Levant.news' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/compte/connexion?redirect=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, prenom, nom, moderateur')
    .eq('id', user.id)
    .single()

  const isAdmin     = profile?.role === 'admin'
  const isPro       = profile?.role === 'pro'
  const isCompagnie = profile?.role === 'compagnie'
  const isModerator = profile?.moderateur === true

  if (!isAdmin && !isPro && !isCompagnie && !isModerator) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav
        displayName={`${profile!.prenom} ${profile!.nom}`}
        isAdmin={isAdmin}
        isPro={isPro}
        isCompagnie={isCompagnie}
        isModerator={isModerator}
      />
      {children}
    </div>
  )
}
