'use client'

import { useRef, useState, useEffect } from 'react'
import { useEventSheet } from '@/contexts/EventSheetContext'

// ─── Couleurs catégories ──────────────────────────────────────────────────────

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

// ─── Formatage des dates ──────────────────────────────────────────────────────

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

// ─── Rendu Markdown simple ────────────────────────────────────────────────────

type InlineNode = string | { type: 'bold' | 'italic' | 'link'; text: string; href?: string }

function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|(https?:\/\/[^\s]+))/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index))
    if (m[2] !== undefined)      nodes.push({ type: 'bold',   text: m[2] })
    else if (m[3] !== undefined) nodes.push({ type: 'italic', text: m[3] })
    else if (m[4] !== undefined) nodes.push({ type: 'link',   text: m[4], href: m[4] })
    last = m.index + m[0].length
  }
  if (last < line.length) nodes.push(line.slice(last))
  return nodes
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <span>
      {lines.map((line, i) => {
        const nodes = parseInline(line)
        return (
          <span key={i}>
            {i > 0 && <br />}
            {nodes.map((n, j) => {
              if (typeof n === 'string') return <span key={j}>{n}</span>
              if (n.type === 'bold')   return <strong key={j}>{n.text}</strong>
              if (n.type === 'italic') return <em key={j}>{n.text}</em>
              if (n.type === 'link')   return (
                <a
                  key={j}
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-all"
                  onClick={e => e.stopPropagation()}
                >
                  {n.text}
                </a>
              )
              return null
            })}
          </span>
        )
      })}
    </span>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EventSheet() {
  const { post, isOpen, close } = useEventSheet()

  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

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
    if (translateY > 120) close()
    else setTranslateY(0)
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
          transform: isOpen ? `translateY(${translateY}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.32,0.72,0,1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 pb-safe">

            {/* Image carrée pleine largeur + poignée + bouton ✕ */}
            <div className="relative w-full aspect-square bg-gray-100 flex-shrink-0">

              {/* Poignée de drag — overlaid sur l'image */}
              <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                <div className="w-10 h-1 bg-white/70 backdrop-blur-sm rounded-full shadow-sm" />
              </div>
              {post.affiche_url ? (
                <img
                  src={post.affiche_url}
                  alt={post.titre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full ${colors?.bg ?? 'bg-gray-100'}`} />
              )}

              {/* Dégradé bas (optionnel, pour lisibilité) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 40%)' }}
              />

              {/* Bouton ✕ */}
              <button
                onClick={close}
                className="absolute top-10 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold active:bg-black/60"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

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
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-base mt-0.5">📅</span>
                  <span className="font-medium capitalize">
                    {formatDateRange(post.date_debut, post.date_fin)}
                  </span>
                </div>
                {post.heure && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">🕐</span>
                    <span className="font-medium">{post.heure}</span>
                  </div>
                )}
                {lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">📍</span>
                    <span className="font-medium">{lieu}</span>
                  </div>
                )}
                {organisateur && organisateur !== lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="text-base">🏪</span>
                    <span>{organisateur}</span>
                  </div>
                )}
              </div>

              {/* Description avec Markdown */}
              {post.complement && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  <MarkdownText text={post.complement} />
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

              {/* Espace en bas pour que le dernier élément ne soit pas collé au bas de l'écran */}
              <div className="h-4" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
