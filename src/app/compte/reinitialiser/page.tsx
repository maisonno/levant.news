'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'ready' | 'invalid' | 'saving' | 'success'

function Content() {
  const supabase = createClient()
  const router   = useRouter()
  const params   = useSearchParams()
  const code     = params.get('code')

  const [status,    setStatus]    = useState<Status>('loading')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Cas PKCE : on a un code dans l'URL à échanger
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled && !error) { setStatus('ready'); return }
      }

      // Sinon, on vérifie la session (cookies déjà posés par /auth/callback,
      // ou hash fragment auto-détecté par le client Supabase)
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) { setStatus('ready'); return }

      // Dernière chance : le client peut être en train de traiter un hash
      // fragment (#access_token=…). On écoute les changements d'état auth
      // pendant un court délai avant de conclure "lien invalide".
      const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
        if (!cancelled && s) setStatus('ready')
      })
      setTimeout(() => {
        if (cancelled) return
        setStatus(prev => prev === 'loading' ? 'invalid' : prev)
        sub.subscription.unsubscribe()
      }, 1500)
    }
    init()

    return () => { cancelled = true }
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Mot de passe trop court (6 caractères minimum).')
      return
    }
    setStatus('saving')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Erreur : ' + error.message)
      setStatus('ready')
      return
    }
    setStatus('success')
    setTimeout(() => {
      router.push('/compte/profil')
      router.refresh()
    }, 1500)
  }

  if (status === 'loading') {
    return <p className="text-center text-sm text-gray-400">Vérification du lien…</p>
  }

  if (status === 'invalid') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-4 rounded-2xl">
          <p className="font-semibold mb-1">Lien invalide ou expiré</p>
          <p>Le lien de réinitialisation n&apos;est plus valide. Demande un nouveau lien.</p>
        </div>
        <Link href="/compte/mot-de-passe-oublie"
          className="block w-full text-center py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-4 rounded-2xl">
        <p className="font-semibold mb-1">✓ Mot de passe mis à jour</p>
        <p>Redirection vers ton compte…</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-gray-600">Choisis un nouveau mot de passe pour ton compte.</p>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
          {error}
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nouveau mot de passe</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" minLength={6}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirmer</label>
          <input type="password" required value={password2} onChange={e => setPassword2(e.target.value)}
            placeholder="••••••••" minLength={6}
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <button type="submit" disabled={status === 'saving'}
          className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform">
          {status === 'saving' ? 'Enregistrement…' : 'Mettre à jour'}
        </button>
      </form>
    </>
  )
}

export default function ReinitialiserPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 pt-14 pb-6 text-center"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}>
        <Link href="/" className="text-white/60 text-sm mb-4 inline-block">← Accueil</Link>
        <div className="text-[26px] font-extrabold text-white tracking-tight">
          Levant<span className="opacity-50">.news</span>
        </div>
        <p className="text-white/70 text-sm mt-1">Nouveau mot de passe</p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-4 max-w-sm mx-auto w-full">
        <Suspense fallback={<p className="text-center text-sm text-gray-400">Chargement…</p>}>
          <Content />
        </Suspense>
      </div>
    </div>
  )
}
