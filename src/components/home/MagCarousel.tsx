'use client'

import { ArticleMag } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
  articles: ArticleMag[]
}

// Couleurs de fallback pour les cartes sans image
const FALLBACK_COLORS = [
  'linear-gradient(135deg,#1e3a8a,#3730a3)',
  'linear-gradient(135deg,#065f46,#047857)',
  'linear-gradient(135deg,#7c2d12,#c2410c)',
  'linear-gradient(135deg,#4a1d96,#6d28d9)',
  'linear-gradient(135deg,#0f172a,#1e40af)',
]

export default function MagCarousel({ articles }: Props) {
  if (articles.length === 0) return null

  return (
    <div className="mt-6">
      {/* En-tête section */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Levant Mag</h2>
          <p className="text-xs text-gray-500 font-medium">Articles & reportages</p>
        </div>
        <Link
          href="/mag"
          className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full"
        >
          Voir tout →
        </Link>
      </div>

      {/* Carousel */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}>
        {articles.map((article, i) => (
          <Link
            key={article.id}
            href={`/mag/${article.id}`}
            className="flex-shrink-0 snap-start w-52 rounded-2xl overflow-hidden relative"
            style={{ height: '140px' }}
          >
            {/* Image ou couleur de fond */}
            {article.photo_principale_url ? (
              <Image
                src={article.photo_principale_url}
                alt={article.titre}
                fill
                className="object-cover"
                sizes="208px"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
              />
            )}

            {/* Dégradé texte */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }}
            />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {article.tags[0]}
                </span>
              </div>
            )}

            {/* Titre */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-bold leading-tight line-clamp-2">
                {article.titre}
              </p>
              {article.auteur_nom && (
                <p className="text-white/60 text-[10px] mt-1">{article.auteur_nom}</p>
              )}
            </div>
          </Link>
        ))}

        {/* CTA card */}
        <Link
          href="/mag"
          className="flex-shrink-0 snap-start w-36 rounded-2xl flex flex-col items-center justify-center gap-2 bg-gray-100"
          style={{ height: '140px' }}
        >
          <span className="text-2xl">📖</span>
          <span className="text-sm font-bold text-gray-700 text-center px-2">Tous les articles</span>
          <span className="text-xs text-blue-600 font-semibold">→</span>
        </Link>
      </div>
    </div>
  )
}
