import Link from 'next/link'
import { PostWithRelations } from '@/types/database'

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  CONCERT:      { bg: 'bg-purple-100', text: 'text-purple-700' },
  SOIREE:       { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SPORT:        { bg: 'bg-green-100',  text: 'text-green-700'  },
  EXPO:         { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  MARCHE:       { bg: 'bg-orange-100', text: 'text-orange-700' },
  SPECTACLE:    { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  INFO:         { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  INFOCRITIQUE: { bg: 'bg-red-100',    text: 'text-red-700'    },
  BAL:          { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700'},
  BRUNCH:       { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ACTIVITE:     { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  CHANT:        { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  SERVICE_RELIGIEUX: { bg: 'bg-stone-100', text: 'text-stone-700' },
  BANQUET:      { bg: 'bg-lime-100',   text: 'text-lime-700'   },
  JEU:          { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  CUISINE:      { bg: 'bg-emerald-100',text: 'text-emerald-700'},
}

interface Props {
  post: PostWithRelations
}

export default function PostCard({ post }: Props) {
  const cat = post.categorie
  const colors = cat ? (CAT_COLORS[cat.code] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null
  const lieu = post.lieu?.nom ?? post.organisateur?.nom ?? null

  // Places disponibles
  const placesInfo = post.inscription
    ? post.nb_inscriptions_max
      ? 'PLACES DISPO'
      : 'INSCRIPTION'
    : null

  return (
    <Link href={`/agenda/${post.id}`}>
      <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">

        {/* Vignette gauche */}
        <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden bg-gray-100">
          {post.affiche_url ? (
            <img
              src={post.affiche_url}
              alt={post.titre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-2xl ${colors?.bg ?? 'bg-gray-100'}`}
            >
              {CAT_EMOJI[cat?.code ?? ''] ?? '📅'}
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {/* Pilule catégorie */}
          {cat && colors && (
            <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 ${colors.bg} ${colors.text}`}>
              {cat.nom}
            </span>
          )}

          {/* Titre */}
          <p className="font-bold text-gray-900 text-sm leading-snug truncate">
            {post.titre}
          </p>

          {/* Heure + Lieu */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            {post.heure && (
              <span className="flex items-center gap-0.5">
                <span>🕐</span> {post.heure}
              </span>
            )}
            {lieu && (
              <span className="flex items-center gap-0.5 truncate">
                <span>📍</span> {lieu}
              </span>
            )}
            {placesInfo && (
              <span className="ml-auto flex-shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                {placesInfo}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <span className="text-gray-300 text-sm flex-shrink-0">›</span>
      </div>
    </Link>
  )
}

// Emojis de fallback par catégorie
const CAT_EMOJI: Record<string, string> = {
  CONCERT:      '🎵',
  SOIREE:       '🎉',
  SPORT:        '🏃',
  EXPO:         '🖼️',
  MARCHE:       '🛍️',
  SPECTACLE:    '🎭',
  INFO:         'ℹ️',
  INFOCRITIQUE: '⚠️',
  BAL:          '💃',
  BRUNCH:       '☕',
  ACTIVITE:     '🧘',
  CHANT:        '🎤',
  SERVICE_RELIGIEUX: '⛪',
  BANQUET:      '🍽️',
  JEU:          '🎲',
  CUISINE:      '👨‍🍳',
}
