'use client'

import { PostWithRelations } from '@/types/database'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  post: PostWithRelations
  nbInscriptions: number
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

const CAT_COLORS: Record<string, string> = {
  CONCERT:      'bg-purple-100 text-purple-700',
  SOIREE:       'bg-indigo-100 text-indigo-700',
  SPORT:        'bg-green-100 text-green-700',
  EXPO:         'bg-amber-100 text-amber-700',
  MARCHE:       'bg-orange-100 text-orange-700',
  SPECTACLE:    'bg-pink-100 text-pink-700',
  INFO:         'bg-blue-100 text-blue-700',
  INFOCRITIQUE: 'bg-red-100 text-red-700',
  BAL:          'bg-fuchsia-100 text-fuchsia-700',
  BRUNCH:       'bg-yellow-100 text-yellow-700',
  ACTIVITE:     'bg-teal-100 text-teal-700',
}

export default function EventDetail({ post, nbInscriptions }: Props) {
  const router = useRouter()
  const [showInscription, setShowInscription] = useState(false)

  const placesRestantes = post.nb_inscriptions_max
    ? post.nb_inscriptions_max - nbInscriptions
    : null

  const isComplet = placesRestantes !== null && placesRestantes <= 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Affiche / Header */}
      <div className="relative">
        {post.affiche_url ? (
          <div className="relative h-64">
            <img
              src={post.affiche_url}
              alt={post.titre}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }}
            />
            {/* Bouton retour sur l'image */}
            <button
              onClick={() => router.back()}
              className="absolute top-12 left-4 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
            >
              ←
            </button>
            {/* Badge phare */}
            {post.phare && (
              <div className="absolute top-12 right-4 bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-full">
                ⭐ Phare
              </div>
            )}
          </div>
        ) : (
          <div
            className="h-32 flex items-end px-4 pb-4 pt-12"
            style={{ background: 'linear-gradient(160deg,#0a1f4e,#1A56DB)' }}
          >
            <button
              onClick={() => router.back()}
              className="absolute top-12 left-4 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white"
            >
              ←
            </button>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          {/* Catégorie + badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {post.categorie && (
              <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${
                CAT_COLORS[post.categorie.code] ?? 'bg-gray-100 text-gray-600'
              }`}>
                {post.categorie.nom}
              </span>
            )}
            {post.phare && (
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                ⭐ Phare
              </span>
            )}
            {post.a_laffiche && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                À l'affiche
              </span>
            )}
          </div>

          {/* Titre */}
          <h1 className="text-xl font-extrabold text-gray-900 leading-tight mb-4">
            {post.titre}
          </h1>

          {/* Infos pratiques */}
          <div className="space-y-3 mb-4">
            {/* Dates */}
            <div className="flex items-start gap-3">
              <span className="text-lg w-7 flex-shrink-0">📅</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm capitalize">
                  {formatDate(post.date_debut)}
                </p>
                {post.date_fin && post.date_fin !== post.date_debut && (
                  <p className="text-sm text-gray-500">
                    au {formatDate(post.date_fin)}
                  </p>
                )}
                {post.heure && (
                  <p className="text-sm text-blue-600 font-medium mt-0.5">
                    🕐 {post.heure}
                  </p>
                )}
              </div>
            </div>

            {/* Lieu */}
            {post.lieu && (
              <div className="flex items-start gap-3">
                <span className="text-lg w-7 flex-shrink-0">📍</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{post.lieu.nom}</p>
                  {(post.lieu as any).adresse && (
                    <p className="text-sm text-gray-500">{(post.lieu as any).adresse}</p>
                  )}
                </div>
              </div>
            )}

            {/* Organisateur */}
            {post.organisateur && (
              <div className="flex items-start gap-3">
                <span className="text-lg w-7 flex-shrink-0">🏪</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{post.organisateur.nom}</p>
                  {(post.organisateur as any).telephone && (
                    <a
                      href={`tel:${(post.organisateur as any).telephone}`}
                      className="text-sm text-blue-600"
                    >
                      {(post.organisateur as any).telephone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Séparateur */}
          {post.complement && <div className="h-px bg-gray-100 mb-4" />}

          {/* Description */}
          {post.complement && (
            <div className="prose prose-sm text-gray-700 leading-relaxed">
              <p className="whitespace-pre-wrap">{post.complement}</p>
            </div>
          )}
        </div>

        {/* Bloc inscription */}
        {post.inscription && (
          <div className="mt-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 text-base mb-1">Inscription</h2>

            {post.nb_inscriptions_max && (
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{nbInscriptions} inscrits</span>
                  <span>{post.nb_inscriptions_max} places</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isComplet ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (nbInscriptions / post.nb_inscriptions_max) * 100)}%`
                    }}
                  />
                </div>
                {placesRestantes !== null && (
                  <p className={`text-xs font-semibold mt-1 ${isComplet ? 'text-red-600' : 'text-green-600'}`}>
                    {isComplet ? 'Complet' : `${placesRestantes} place${placesRestantes > 1 ? 's' : ''} restante${placesRestantes > 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            )}

            {!isComplet && (
              <button
                onClick={() => setShowInscription(true)}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}
              >
                S'inscrire
              </button>
            )}

            {isComplet && (
              <div className="w-full py-3.5 rounded-2xl bg-gray-100 text-center text-gray-500 font-semibold text-sm">
                Complet
              </div>
            )}
          </div>
        )}

        {/* Formulaire d'inscription (modal inline) */}
        {showInscription && (
          <div className="mt-4">
            <InscriptionForm postId={post.id} onClose={() => setShowInscription(false)} />
          </div>
        )}

        <div className="pb-safe py-6">
          <Link
            href="/agenda"
            className="block text-center text-sm font-semibold text-gray-400"
          >
            ← Retour à l'agenda
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Formulaire d'inscription ────────────────────────────────────────────────

function InscriptionForm({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.telephone) return
    setStatus('loading')

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('inscriptions')
        .insert({ post_id: postId, ...form })

      if (error) throw error
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-3xl p-6 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <p className="font-bold text-green-800">Inscription confirmée !</p>
        <p className="text-sm text-green-600 mt-1">
          {form.prenom}, on vous attend !
        </p>
        <button onClick={onClose} className="mt-3 text-sm text-green-700 font-semibold">
          Fermer
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Votre inscription</h3>
        <button onClick={onClose} className="text-gray-400 text-xl font-light">×</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Prénom *"
          value={form.prenom}
          onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          required
        />
        <input
          type="text"
          placeholder="Nom *"
          value={form.nom}
          onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          required
        />
        <input
          type="tel"
          placeholder="Téléphone *"
          value={form.telephone}
          onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          required
        />

        {status === 'error' && (
          <p className="text-sm text-red-600">Erreur lors de l'inscription. Réessayez.</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}
        >
          {status === 'loading' ? 'Envoi…' : 'Confirmer l\'inscription'}
        </button>
      </form>
    </div>
  )
}
