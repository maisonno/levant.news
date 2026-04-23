'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ObjetType } from '@/types/database'
import { notifyModerators } from '@/lib/notifyModerators'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function NouvelleAnnoncePage() {
  const supabase = createClient()
  const router   = useRouter()
  const { user, profile, loading } = useAuth()

  const [type,        setType]        = useState<ObjetType>('PERDU')
  const [objet,       setObjet]       = useState('')
  const [date,        setDate]        = useState(today())
  const [description, setDescription] = useState('')
  const [lieu,        setLieu]        = useState('')
  const [nom,         setNom]         = useState('')
  const [telephone,   setTelephone]   = useState('')
  const [contact,     setContact]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Pré-remplir nom/téléphone depuis le profil
  useEffect(() => {
    if (profile) {
      setNom(`${profile.prenom} ${profile.nom}`.trim())
      setTelephone(profile.telephone ?? '')
    }
  }, [profile])

  // Redirection si non connecté (double sécurité, proxy fait déjà ça)
  useEffect(() => {
    if (!loading && !user) router.push('/compte/connexion?redirect=/perdu/nouveau')
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('objets_perdus').insert({
      type,
      objet:          objet.trim(),
      date_evenement: date,
      description:    description.trim() || null,
      lieu:           lieu.trim() || null,
      nom_declarant:  nom.trim(),
      telephone:      telephone.trim() || null,
      contact:        contact.trim() || null,
      retrouve:       false,
      compte_id:      user?.id ?? null,
    })

    if (error) {
      setError('Erreur lors de la publication. Réessaie.')
      setSaving(false)
    } else {
      void notifyModerators('annonce', {
        type, objet, date_evenement: date, description, lieu,
        nom_declarant: nom, telephone, contact,
      })
      router.push('/perdu')
      router.refresh()
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <div
        className="px-4 pt-14 pb-5 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <Link href="/perdu" className="text-white/60 text-sm mb-3 inline-block">← Retour</Link>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Nouvelle annonce</h1>
        <p className="text-white/60 text-xs mt-1">Publiée immédiatement, visible 10 jours.</p>
      </div>

      {/* Formulaire */}
      <div className="flex-1 px-4 py-5 max-w-sm mx-auto w-full">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-2xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type : Perdu / Trouvé */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Type d'annonce
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['PERDU', 'TROUVE'] as ObjetType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-3 rounded-2xl text-sm font-bold border-2 transition-colors ${
                    type === t
                      ? t === 'PERDU'
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-green-400 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-400'
                  }`}
                >
                  {t === 'PERDU' ? '🔍 Perdu' : '📦 Trouvé'}
                </button>
              ))}
            </div>
          </div>

          {/* Objet */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Objet <span className="text-red-400">*</span>
            </label>
            <input
              type="text" required maxLength={50}
              value={objet} onChange={e => setObjet(e.target.value)}
              placeholder="ex : Lunettes de soleil, Clé USB…"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date" required
              value={date} onChange={e => setDate(e.target.value)}
              max={today()}
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Lieu
            </label>
            <input
              type="text"
              value={lieu} onChange={e => setLieu(e.target.value)}
              placeholder="ex : Plage Héliodrome, sentier des crêtes…"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Décris l'objet, sa couleur, ses caractéristiques…"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* Séparateur contact */}
          <div className="pt-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Contact (visible publiquement)</p>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Votre nom <span className="text-red-400">*</span>
            </label>
            <input
              type="text" required
              value={nom} onChange={e => setNom(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Téléphone
            </label>
            <input
              type="tel"
              value={telephone} onChange={e => setTelephone(e.target.value)}
              placeholder="+33 6 00 00 00 00"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Autre contact */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Autre moyen de contact
            </label>
            <input
              type="text"
              value={contact} onChange={e => setContact(e.target.value)}
              placeholder="Email, WhatsApp, numéro de chambre…"
              className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? 'Publication…' : '📢 Publier l\'annonce'}
          </button>

          <p className="text-center text-xs text-gray-400">
            L'annonce sera visible immédiatement et disparaîtra automatiquement après 10 jours.
          </p>
        </form>
      </div>
    </div>
  )
}
