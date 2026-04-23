'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function InscriptionPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [prenom,     setPrenom]     = useState('')
  const [nom,        setNom]        = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [newsletter, setNewsletter] = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [done,       setDone]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { prenom, nom, newsletter },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/compte/profil`,
      },
    })

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Un compte existe déjà avec cet email.'
        : error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div
          className="px-4 pt-14 pb-6 text-center"
          style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
        >
          <div className="text-[26px] font-extrabold text-white tracking-tight">
            Levant<span className="opacity-50">.news</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h2 className="text-xl font-extrabold text-gray-900">Vérifie ta messagerie</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            Un email de confirmation a été envoyé à <strong>{email}</strong>.
            Clique sur le lien pour activer ton compte.
          </p>
          <Link href="/" className="text-blue-600 font-semibold text-sm">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div
        className="px-4 pt-14 pb-6 text-center"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <Link href="/compte/connexion" className="text-white/60 text-sm mb-4 inline-block">← Connexion</Link>
        <div className="text-[26px] font-extrabold text-white tracking-tight">
          Levant<span className="opacity-50">.news</span>
        </div>
        <p className="text-white/70 text-sm mt-1">Crée ton compte</p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-4 max-w-sm mx-auto w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Prénom</label>
              <input
                type="text" required value={prenom} onChange={e => setPrenom(e.target.value)}
                placeholder="Marie"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nom</label>
              <input
                type="text" required value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Dupont"
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="marie@email.fr"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mot de passe</label>
            <input
              type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setNewsletter(v => !v)}
            className={`w-full flex items-start gap-3 p-4 rounded-2xl border text-left transition-colors ${
              newsletter ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white active:bg-gray-50'
            }`}
          >
            <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              newsletter ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
            }`}>
              {newsletter && (
                <svg width="12" height="10" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${newsletter ? 'text-blue-700' : 'text-gray-900'}`}>
                📬 Recevoir la Newsletter Levant.news
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Restez au courant de l'actualité du Levant. Jamais plus d'un email par mois, promis !
              </p>
            </div>
          </button>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 leading-relaxed">
          En créant un compte, tu acceptes les conditions d'utilisation de Levant.news.
        </p>

        <p className="text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link href="/compte/connexion" className="text-blue-600 font-semibold">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
