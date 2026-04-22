'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MotDePasseOubliePage() {
  const supabase = createClient()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/compte/reinitialiser`,
    })
    setLoading(false)
    if (error) {
      setError('Erreur : ' + error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 pt-14 pb-6 text-center"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}>
        <Link href="/compte/connexion" className="text-white/60 text-sm mb-4 inline-block">← Connexion</Link>
        <div className="text-[26px] font-extrabold text-white tracking-tight">
          Levant<span className="opacity-50">.news</span>
        </div>
        <p className="text-white/70 text-sm mt-1">Mot de passe oublié</p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-4 max-w-sm mx-auto w-full">
        {sent ? (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-4 rounded-2xl">
            <p className="font-semibold mb-1">✓ Email envoyé</p>
            <p>Un lien pour réinitialiser ton mot de passe vient d&apos;être envoyé à <b>{email}</b>. Pense à vérifier tes spams.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Entre ton email pour recevoir un lien de réinitialisation de ton mot de passe.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="ton@email.fr"
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform">
                {loading ? 'Envoi…' : 'Recevoir le lien'}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link href="/compte/connexion" className="text-blue-600 font-semibold">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  )
}
