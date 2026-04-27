'use client'

import { useRef, useState, useEffect } from 'react'
import { useArticleSheet } from '@/contexts/ArticleSheetContext'
import { supabaseImg } from '@/lib/supabaseImg'

// ─── Markdown simple ──────────────────────────────────────────────────────────

type InlineNode = string | { type: 'bold' | 'italic' | 'link'; text: string; href?: string }

function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^\)]+)\)|(https?:\/\/[^\s]+))/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index))
    if (m[2] !== undefined)      nodes.push({ type: 'bold',   text: m[2] })
    else if (m[3] !== undefined) nodes.push({ type: 'italic', text: m[3] })
    else if (m[4] !== undefined) nodes.push({ type: 'link',   text: m[4], href: m[5] })
    else if (m[6] !== undefined) nodes.push({ type: 'link',   text: m[6], href: m[6] })
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

// ─── Couleurs par thème ───────────────────────────────────────────────────────

const THEME_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  'Transport':                   { bg: 'bg-blue-100',   text: 'text-blue-700',   accent: '#1d4ed8' },
  'Sécurité':                    { bg: 'bg-red-100',    text: 'text-red-700',    accent: '#dc2626' },
  'Vie au Levant':               { bg: 'bg-teal-100',   text: 'text-teal-700',   accent: '#0d9488' },
  'Logement':                    { bg: 'bg-amber-100',  text: 'text-amber-700',  accent: '#d97706' },
  'A propos':                    { bg: 'bg-indigo-100', text: 'text-indigo-700', accent: '#4f46e5' },
  'Partenaires sur le continent':{ bg: 'bg-slate-100',  text: 'text-slate-600',  accent: '#475569' },
}

function getTheme(code: string) {
  return THEME_COLORS[code] ?? { bg: 'bg-gray-100', text: 'text-gray-600', accent: '#6b7280' }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ArticleSheet() {
  const { article, isOpen, close } = useArticleSheet()

  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) setTranslateY(0)
  }, [isOpen, article])

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

  if (!article) return null

  const theme = getTheme(article.theme_code)
  const hasImage = !!article.image_url

  // Extraire les URLs du champ lien_url (peut en contenir plusieurs séparées par \n)
  const liens = article.lien_url
    ? article.lien_url.split('\n').map(l => l.trim()).filter(Boolean)
    : []

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

            {/* Image ou bandeau thème */}
            <div className={`relative w-full flex-shrink-0 ${hasImage ? 'aspect-[4/3]' : 'h-32'}`}>
              {hasImage ? (
                <img src={supabaseImg(article.image_url, 860)} alt={article.titre} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full ${theme.bg}`} />
              )}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 50%)' }}
              />
              {/* Poignée */}
              <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                <div className="w-10 h-1 bg-white/70 backdrop-blur-sm rounded-full shadow-sm" />
              </div>
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
            <div className="px-5 py-5 space-y-4">

              {/* Badge thème */}
              <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${theme.bg} ${theme.text}`}>
                {article.theme_code}
              </span>

              {/* Titre */}
              <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
                {article.titre}
              </h2>

              {/* Texte */}
              {article.texte && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  <MarkdownText text={article.texte} />
                </p>
              )}

              {/* Liens externes */}
              {liens.length > 0 && (
                <div className="space-y-2 pt-1">
                  {liens.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 active:bg-gray-50"
                    >
                      <span className="truncate">🔗 {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                      <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-shrink-0 text-gray-400">
                        <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  ))}
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
