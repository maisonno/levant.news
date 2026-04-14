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
