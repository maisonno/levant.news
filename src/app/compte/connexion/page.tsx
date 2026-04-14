'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Contenu (isolé pour useSearchParams) ────────────────────────────────────

function ConnexionContent() {
  const supabase   = createClient()
  const router     = useRouter()
  const params     = useSearchParams()
  const redirectTo = params.get('redirect') ?? '/'
  const authError  = params.get('error')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(
    authError ? 'Une erreur est survenue. Réessaie.' : null
  )

  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${redirectTo}`

  async function signInWithProvider(provider: 'google' | 'apple' | 'facebook') {
    setLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading('email')
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(null)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="flex-1 px-5 py-6 space-y-4 max-w-sm mx-auto w-full">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}

      {/* Formulaire email/mdp */}
      <form onSubmit={signInWithEmail} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="ton@email.fr"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mot de passe</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <button type="submit" disabled={!!loading}
          className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform">
          {loading === 'email' ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link href="/compte/inscription" className="text-blue-600 font-semibold">Créer un compte</Link>
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnexionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 pt-14 pb-6 text-center"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}>
        <Link href="/" className="text-white/60 text-sm mb-4 inline-block">← Accueil</Link>
        <div className="text-[26px] font-extrabold text-white tracking-tight">
          Levant<span className="opacity-50">.news</span>
        </div>
        <p className="text-white/70 text-sm mt-1">Connecte-toi à ton compte</p>
      </div>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-gray-400 text-sm">Chargement…</p></div>}>
        <ConnexionContent />
      </Suspense>
    </div>
  )
}

// ─── Composants UI ────────────────────────────────────────────────────────────

function SocialButton({ icon, label, loading, onClick }: {
  icon: React.ReactNode; label: string; loading: boolean; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm font-semibold text-gray-700 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-sm">
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-center">{loading ? 'Redirection…' : label}</span>
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.39-1.32 2.76-2.53 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}
