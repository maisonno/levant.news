'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Article } from '@/types/database'
import { useArticleSheet } from '@/contexts/ArticleSheetContext'
import { useDrawer } from '@/contexts/DrawerContext'

// ─── Couleurs & icônes par thème ─────────────────────────────────────────────

const THEME_META: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  'Transport':                    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  icon: '⛵' },
  'Sécurité':                     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   icon: '🔥' },
  'Vie au Levant':                 { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  icon: '🌴' },
  'Logement':                      { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', icon: '🏠' },
  'A propos':                      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',icon: 'ℹ️' },
  'Partenaires sur le continent':  { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-200', icon: '🤝' },
}

function getMeta(theme: string) {
  return THEME_META[theme] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '📄' }
}

// ─── Carte hero (première carte d'une section) ───────────────────────────────

function HeroCard({ article }: { article: Article }) {
  const { open } = useArticleSheet()
  const meta = getMeta(article.theme_code)

  return (
    <button onClick={() => open(article)} className="w-full text-left active:scale-[0.98] transition-transform">
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100">
        {/* Image */}
        {article.image_url && (
          <div className="w-full aspect-[16/9] bg-gray-100">
            <img src={article.image_url} alt={article.titre} className="w-full h-full object-cover" />
          </div>
        )}
        {!article.image_url && (
          <div className={`w-full h-28 ${meta.bg} flex items-center justify-center text-4xl`}>
            {meta.icon}
          </div>
        )}
        {/* Texte */}
        <div className="p-4">
          <h3 className="font-extrabold text-gray-900 text-[17px] leading-snug mb-2">
            {article.titre}
          </h3>
          {article.texte && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
              {article.texte.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
            </p>
          )}
          {article.lien_url && (
            <p className={`text-xs font-semibold mt-2 ${meta.text}`}>Voir le lien →</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Carte verticale (grille 2 colonnes) ─────────────────────────────────────

function VerticalCard({ article }: { article: Article }) {
  const { open } = useArticleSheet()
  const meta = getMeta(article.theme_code)

  return (
    <button onClick={() => open(article)} className="w-full text-left active:scale-[0.97] transition-transform">
      <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 flex flex-col">
        {/* Image */}
        <div className="w-full aspect-square bg-gray-100 flex-shrink-0">
          {article.image_url ? (
            <img src={article.image_url} alt={article.titre} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${meta.bg} flex items-center justify-center text-3xl`}>
              {meta.icon}
            </div>
          )}
        </div>
        {/* Texte */}
        <div className="p-3 flex flex-col gap-1">
          <p className="font-bold text-gray-900 text-[13px] leading-snug line-clamp-2">
            {article.titre}
          </p>
          {article.texte && (
            <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">
              {article.texte.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split('\n')[0]}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Section thème ────────────────────────────────────────────────────────────

function ThemeSection({ theme, articles }: { theme: string; articles: Article[] }) {
  const meta = getMeta(theme)
  const [hero, ...rest] = articles

  return (
    <section>
      {/* En-tête de section */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center text-lg flex-shrink-0`}>
          {meta.icon}
        </span>
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">{theme}</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Hero */}
      <HeroCard article={hero} />

      {/* Grille 2 colonnes */}
      {rest.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {rest.map(article => (
            <VerticalCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

// Ordre des thèmes souhaité
const THEME_ORDER = [
  'Vie au Levant',
  'Transport',
  'Sécurité',
  'Logement',
  'A propos',
  'Partenaires sur le continent',
]

interface Props {
  articles: Article[]
}

export default function InfosClient({ articles }: Props) {
  const { toggle: openMenu } = useDrawer()

  // Grouper par thème, dans l'ordre THEME_ORDER
  const sections = useMemo(() => {
    const map = new Map<string, Article[]>()
    for (const a of articles) {
      if (!map.has(a.theme_code)) map.set(a.theme_code, [])
      map.get(a.theme_code)!.push(a)
    }

    // Ordre prioritaire + thèmes résiduels
    const ordered: { theme: string; articles: Article[] }[] = []
    for (const theme of THEME_ORDER) {
      const list = map.get(theme)
      if (list && list.length > 0) {
        ordered.push({ theme, articles: list })
        map.delete(theme)
      }
    }
    // Thèmes non prévus dans THEME_ORDER
    for (const [theme, list] of map) {
      if (list.length > 0) ordered.push({ theme, articles: list })
    }
    return ordered
  }, [articles])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header sticky */}
      <div
        className="sticky top-0 z-30 px-4 pt-14 pb-4"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={openMenu}
            className="w-9 h-9 rounded-xl bg-white/20 flex flex-col items-center justify-center gap-[4px] flex-shrink-0"
            aria-label="Menu"
          >
            <span className="w-4 h-0.5 bg-white rounded-full" />
            <span className="w-4 h-0.5 bg-white rounded-full" />
            <span className="w-4 h-0.5 bg-white rounded-full" />
          </button>

          <h1 className="text-xl font-extrabold text-white tracking-tight flex-1">Infos pratiques</h1>

          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"
            aria-label="Accueil"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 py-5 space-y-8">
        {sections.map(({ theme, articles: list }) => (
          <ThemeSection key={theme} theme={theme} articles={list} />
        ))}

        {sections.length > 0 && (
          <div className="text-center py-8 pb-safe">
            <p className="text-2xl mb-1">⚓</p>
            <p className="text-gray-300 text-xs">Fin des infos pratiques</p>
          </div>
        )}
      </div>
    </div>
  )
}
