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
  const [photos,      setPhotos]      = useState<string[]>([])
  const [uploading,   setUploading]   = useState(false)
  const [uploadErr,   setUploadErr]   = useState('')
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

  async function handlePhotoFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadErr('Format non supporté'); return }
    setUploading(true); setUploadErr('')
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `objets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('perdu-images').upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('perdu-images').getPublicUrl(path)
      setPhotos(prev => [...prev, data.publicUrl])
    } catch {
      setUploadErr("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

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
      photos:         photos.length > 0 ? photos : null,
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

          {/* Photos */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Photos <span className="font-normal text-gray-400 normal-case tracking-normal">(optionnel, max 4)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {photos.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className={`w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                  uploading ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}>
                  <input
                    type="file" accept="image/*" className="hidden"
                    disabled={uploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f); e.target.value = '' }}
                  />
                  {uploading
                    ? <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <><span className="text-xl">📷</span><span className="text-[10px] font-semibold text-gray-400">Ajouter</span></>
                  }
                </label>
              )}
            </div>
            {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
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
