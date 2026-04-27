'use client'

import { useEventSheet } from '@/contexts/EventSheetContext'
import { PostWithRelations } from '@/types/database'
import { supabaseImg } from '@/lib/supabaseImg'

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

const CAT_EMOJI: Record<string, string> = {
  CONCERT:           '🎵',
  SOIREE:            '🎉',
  SPORT:             '🏃',
  EXPO:              '🖼️',
  MARCHE:            '🛍️',
  SPECTACLE:         '🎭',
  INFO:              'ℹ️',
  INFOCRITIQUE:      '⚠️',
  BAL:               '💃',
  BRUNCH:            '☕',
  ACTIVITE:          '🧘',
  CHANT:             '🎤',
  SERVICE_RELIGIEUX: '⛪',
  BANQUET:           '🍽️',
  JEU:               '🎲',
  CUISINE:           '👨‍🍳',
}

function formatPostDate(debut: string, fin: string | null): string {
  const d = new Date(debut + 'T12:00:00')
  if (!fin || fin === debut) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }
  const f = new Date(fin + 'T12:00:00')
  const sameMonth = d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear()
  const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: sameMonth ? undefined : 'short' })
  const fs = f.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${ds} › ${fs}`
}

interface Props {
  post:         PostWithRelations
  grouped?:     boolean   // carte dans un PostCardList groupé (pas de border/shadow/rounded propres)
  showDate?:    boolean   // afficher la date sous le titre (MisEnAvant uniquement)
  ignorePhare?: boolean   // désactiver le rendu Phare (ex: section Mis en Avant)
}

export default function PostCard({ post, grouped = false, showDate = false, ignorePhare = false }: Props) {
  const { open } = useEventSheet()

  const cat    = post.categorie
  const colors = cat ? (CAT_COLORS[cat.code] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null
  const lieu   = post.lieu?.nom ?? post.organisateur?.nom ?? null
  const placesInfo = post.inscription
    ? (post.nb_inscriptions_max ? 'PLACES DISPO' : 'INSCRIPTION')
    : null

  // ── Carte PHARE ────────────────────────────────────────────────────────────
  // Image à gauche (50 % plus grande), texte à droite aligné à gauche, titre grand
  if (post.phare && !ignorePhare) {
    return (
      <button onClick={() => open(post)} className="w-full text-left">
        <div className="flex bg-white rounded-2xl overflow-hidden shadow-md border border-blue-100 h-44 active:scale-[0.98] transition-transform">

          {/* Image — gauche, 50 % plus large que la normale (w-28 → w-44) */}
          <div className="w-44 flex-shrink-0 bg-gray-100">
            {post.affiche_url ? (
              <img
                src={supabaseImg(post.affiche_url, 360)}
                alt={post.titre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-4xl ${colors?.bg ?? 'bg-gray-50'}`}>
                {CAT_EMOJI[cat?.code ?? ''] ?? '📅'}
              </div>
            )}
          </div>

          {/* Texte — droite de l'image, aligné à gauche */}
          <div className="flex-1 min-w-0 px-4 py-4 flex flex-col justify-center gap-1.5">
            {cat && colors && (
              <span className={`inline-block self-start text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {cat.nom}
              </span>
            )}
            <p className="font-extrabold text-gray-900 text-[18px] leading-snug line-clamp-3">
              {post.titre}
            </p>
            {showDate && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span>📅</span>
                <span>{formatPostDate(post.date_debut, post.date_fin ?? null)}</span>
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              {lieu && <span className="truncate">📍 {lieu}</span>}
              {post.heure && <span>🕐 {post.heure}</span>}
              {placesInfo && (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  {placesInfo}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  // ── Carte normale ─────────────────────────────────────────────────────────
  return (
    <button onClick={() => open(post)} className="w-full text-left">
      <div className={
        grouped
          ? 'flex bg-white h-28 active:bg-gray-50 transition-colors'
          : 'flex bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 h-28 active:scale-[0.98] transition-transform'
      }>
        <div className="w-28 flex-shrink-0 bg-gray-100">
          {post.affiche_url ? (
            <img
              src={supabaseImg(post.affiche_url, 240)}
              alt={post.titre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-3xl ${colors?.bg ?? 'bg-gray-50'}`}>
              {CAT_EMOJI[cat?.code ?? ''] ?? '📅'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-1">
          {cat && colors && (
            <span className={`inline-block self-start text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
              {cat.nom}
            </span>
          )}
          <p className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2">
            {post.titre}
          </p>
          {showDate && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>📅</span>
              <span>{formatPostDate(post.date_debut, post.date_fin ?? null)}</span>
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {post.heure && <span className="flex items-center gap-1">🕐 {post.heure}</span>}
            {lieu && <span className="flex items-center gap-1 truncate">📍 {lieu}</span>}
            {placesInfo && (
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                {placesInfo}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
