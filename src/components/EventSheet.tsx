'use client'

import { useRef, useState, useEffect } from 'react'
import { useEventSheet } from '@/contexts/EventSheetContext'

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  CONCERT:           { bg: 'bg-purple-100', text: 'text-purple-700' },
  SOIREE:            { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SPORT:             { bg: 'bg-green-100',  text: 'text-green-700'  },
  EXPO:              { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  MARCHE:            { bg: 'bg-orange-100', text: 'text-orange-700' },
  SPECTACLE:         { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  INFO:              { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  INFOCRITIQUE:      { bg: 'bg-red-100',    text: 'text-red-700'    },
  BAL:               { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700'},
  BRUNCH:            { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ACTIVITE:          { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  CHANT:             { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  SERVICE_RELIGIEUX: { bg: 'bg-stone-100',  text: 'text-stone-700'  },
  BANQUET:           { bg: 'bg-lime-100',   text: 'text-lime-700'   },
  JEU:               { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  CUISINE:           { bg: 'bg-emerald-100',text: 'text-emerald-700'},
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatDateRange(debut: string, fin: string | null | undefined): string {
  const d = formatDate(debut)
  if (!fin || fin === debut) return d
  return `Du ${d} au ${formatDate(fin)}`
}

export default function EventSheet() {
  const { post, isOpen, close } = useEventSheet()

  // Swipe-to-close
  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Réinitialiser translateY à l'ouverture
  useEffect(() => {
    if (isOpen) setTranslateY(0)
  }, [isOpen, post])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setTranslateY(delta)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (translateY > 120) {
      close()
    } else {
      setTranslateY(0)
    }
  }

  if (!post) return null

  const cat    = post.categorie
  const colors = cat ? (CAT_COLORS[cat.code] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null
  const lieu   = post.lieu?.nom ?? null
  const organisateur = post.organisateur?.nom ?? null

  return (
    <>
      {/* Fond semi-transparent */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDragging ? 'none' : 'opacity 300ms ease',
        }}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]"
        style={{
          transform: isOpen
            ? `translateY(${translateY}px)`
            : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.32,0.72,0,1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white rounded-t-3xl overflow-hidden shadow-2xl max-h-[88vh] flex flex-col">

          {/* Poignée de drag */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 pb-safe">

            {/* Affiche */}
            {post.affiche_url ? (
              <div className="relative w-full aspect-video bg-gray-100">
                <img
                  src={post.affiche_url}
                  alt={post.titre}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }}
                />
              </div>
            ) : (
              <div
                className={`w-full h-24 flex items-center justify-center ${colors?.bg ?? 'bg-gray-100'}`}
              />
            )}

            {/* Corps */}
            <div className="px-5 py-4 space-y-4">

              {/* Catégorie */}
              {cat && colors && (
                <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                  {cat.nom}
                </span>
              )}

              {/* Titre */}
              <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
                {post.titre}
              </h2>

              {/* Infos clés */}
              <div className="space-y-2">
                {/* Date */}
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-base mt-0.5">📅</span>
                  <span className="font-medium capitalize">
                    {formatDateRange(post.date_debut, post.date_fin)}
                  </span>
                </div>

                {/* Heure */}
                {post.heure && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">🕐</span>
                    <span className="font-medium">{post.heure}</span>
                  </div>
                )}

                {/* Lieu */}
                {lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">📍</span>
                    <span className="font-medium">{lieu}</span>
                  </div>
                )}

                {/* Organisateur (si différent du lieu) */}
                {organisateur && organisateur !== lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="text-base">🏪</span>
                    <span>{organisateur}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {post.complement && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {post.complement}
                </p>
              )}

              {/* Inscription */}
              {post.inscription && (
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <p className="text-sm font-semibold text-green-800">
                    📋 Inscription requise
                  </p>
                  {post.nb_inscriptions_max && (
                    <p className="text-xs text-green-600 mt-1">
                      Places limitées à {post.nb_inscriptions_max}
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Bouton fermer */}
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={close}
              className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm active:bg-gray-200"
            >
              Fermer
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
