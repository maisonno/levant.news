'use client'

import { useRef, useState, useEffect } from 'react'
import { useEtabSheet } from '@/contexts/EtabSheetContext'

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
                <a key={j} href={n.href} target="_blank" rel="noopener noreferrer"
                   className="text-blue-600 underline break-all"
                   onClick={e => e.stopPropagation()}>{n.text}</a>
              )
              return null
            })}
          </span>
        )
      })}
    </span>
  )
}

// ─── Ligne d'info ─────────────────────────────────────────────────────────────

function InfoRow({ icon, children, href }: { icon: string; children: React.ReactNode; href?: string }) {
  const inner = (
    <div className="flex items-start gap-3 text-sm text-gray-700">
      <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 break-words">{children}</span>
    </div>
  )
  if (href) {
    return (
      <a href={href} onClick={e => e.stopPropagation()}
         className="block active:opacity-70">
        {inner}
      </a>
    )
  }
  return inner
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EtabSheet() {
  const { etab, isOpen, close } = useEtabSheet()

  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) setTranslateY(0)
  }, [isOpen, etab])

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

  if (!etab) return null

  const hasPhoto = !!etab.photo_url

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

          {/* Poignée de drag */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 bg-white absolute top-0 left-0 right-0 z-10 pointer-events-none">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 pb-safe">

            {/* Photo ou bandeau couleur + bouton ✕ */}
            <div className="relative w-full aspect-square bg-gray-100 flex-shrink-0">
              {hasPhoto ? (
                <img src={etab.photo_url!} alt={etab.nom} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-7xl"
                  style={{ background: 'linear-gradient(135deg,#0a1f4e,#1A56DB)' }}
                >
                  🏪
                </div>
              )}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 50%)' }}
              />
              <button
                onClick={close}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold active:bg-black/60"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="px-5 py-4 space-y-4">

              {/* Nom */}
              <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
                {etab.nom}
              </h2>

              {/* Description */}
              {etab.description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  <MarkdownText text={etab.description} />
                </p>
              )}

              {/* Séparateur si on a des infos pratiques */}
              {(etab.adresse || etab.telephone || etab.email || etab.site_url || etab.horaires) && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Infos pratiques</p>

                  {etab.horaires && (
                    <InfoRow icon="🕐">
                      <MarkdownText text={etab.horaires} />
                    </InfoRow>
                  )}
                  {etab.adresse && (
                    <InfoRow icon="📍">
                      {etab.adresse}
                    </InfoRow>
                  )}
                  {etab.telephone && (
                    <InfoRow icon="📞" href={`tel:${etab.telephone.replace(/\s/g, '')}`}>
                      <span className="text-blue-600 font-medium">{etab.telephone}</span>
                    </InfoRow>
                  )}
                  {etab.email && (
                    <InfoRow icon="✉️" href={`mailto:${etab.email}`}>
                      <span className="text-blue-600 font-medium">{etab.email}</span>
                    </InfoRow>
                  )}
                  {etab.site_url && (
                    <InfoRow icon="🌐" href={etab.site_url}>
                      <span className="text-blue-600 font-medium break-all">
                        {etab.site_url.replace(/^https?:\/\//, '')}
                      </span>
                    </InfoRow>
                  )}
                </div>
              )}

              <div className="h-4" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
