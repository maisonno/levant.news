'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'

interface AuthContextType {
  user:    User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, session: null, loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string, authUser?: User | null) {
    console.log('[Auth] fetchProfile → userId:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    console.log('[Auth] fetchProfile ← data:', data, '| error:', error)

    // Synchro newsletter depuis user_metadata (inscription) — une seule fois
    const wantsNewsletter = authUser?.user_metadata?.newsletter
    if (data && wantsNewsletter === true && data.newsletter === false) {
      const { error: syncErr } = await supabase
        .from('profiles')
        .update({ newsletter: true })
        .eq('id', userId)
      if (!syncErr) {
        data.newsletter = true
        await supabase.auth.updateUser({ data: { newsletter: null } })
      }
    }

    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession → user:', session?.user?.email ?? 'null')
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange →', event, '| user:', session?.user?.email ?? 'null')
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id, session.user)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
