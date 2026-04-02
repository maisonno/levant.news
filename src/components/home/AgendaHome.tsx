import { PostWithRelations } from '@/types/database'
import Link from 'next/link'

interface Props {
  posts: PostWithRelations[]
  today: string
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function CategoryBadge({ code, nom }: { code: string; nom: string }) {
  const COLORS: Record<string, string> = {
    CONCERT:   'bg-purple-100 text-purple-700',
    SOIREE:    'bg-indigo-100 text-indigo-700',
    SPORT:     'bg-green-100 text-green-700',
    EXPO:      'bg-amber-100 text-amber-700',
    MARCHE:    'bg-orange-100 text-orange-700',
    SPECTACLE: 'bg-pink-100 text-pink-700',
    INFO:      'bg-blue-100 text-blue-700',
    INFOCRITIQUE: 'bg-red-100 text-red-700',
    BAL:       'bg-fuchsia-100 text-fuchsia-700',
    BRUNCH:    'bg-yellow-100 text-yellow-700',
  }
  const cls = COLORS[code] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {nom}
    </span>
  )
}

function EventCard({ post }: { post: PostWithRelations }) {
  return (
    <Link href={`/agenda/${post.id}`} className="block">
      <div className={`rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 ${
        post.phare ? 'ring-2 ring-amber-400' : ''
      }`}>
        {/* Image */}
        {post.affiche_url && (
          <div className="relative h-36 bg-gray-100">
            <img
              src={post.affiche_url}
              alt={post.titre}
              className="w-full h-full object-cover"
            />
            {post.phare && (
              <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[11px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                ⭐ Phare
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }}
            />
          </div>
        )}

        <div className="p-4">
          {/* Catégorie + Phare */}
          <div className="flex items-center gap-2 mb-2">
            {post.categorie && (
              <CategoryBadge code={post.categorie.code} nom={post.categorie.nom} />
            )}
            {post.phare && !post.affiche_url && (
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                ⭐ Phare
              </span>
            )}
          </div>

          <h3 className="font-bold text-gray-900 text-base leading-snug">{post.titre}</h3>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            {post.heure && <span>🕐 {post.heure}</span>}
            {post.organisateur && <span>📍 {post.organisateur.nom}</span>}
          </div>

          {post.inscription && (
            <div className="mt-3 text-sm font-semibold text-blue-600">
              Inscription requise →
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function AgendaHome({ posts, today }: Props) {
  if (posts.length === 0) {
    return (
      <div className="mt-6 px-4 mb-8">
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-3">
          Aujourd'hui
        </h2>
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">🌊</p>
          <p className="text-gray-500 font-medium">Pas d'événement aujourd'hui</p>
          <Link href="/agenda" className="text-blue-600 font-semibold text-sm mt-2 inline-block">
            Voir l'agenda complet →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 px-4 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Aujourd'hui</h2>
          <p className="text-xs text-gray-500 capitalize">{formatDate(today)}</p>
        </div>
        <Link
          href="/agenda"
          className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full"
        >
          Agenda →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {posts.slice(0, 4).map(post => (
          <EventCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length > 4 && (
        <Link
          href="/agenda"
          className="block text-center text-sm font-bold text-blue-600 mt-4 py-3 bg-blue-50 rounded-2xl"
        >
          Voir les {posts.length - 4} autres événements →
        </Link>
      )}
    </div>
  )
}
