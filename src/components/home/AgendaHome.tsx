import { PostWithRelations } from '@/types/database'
import PostCard from '@/components/PostCard'
import Link from 'next/link'

interface Props {
  posts: PostWithRelations[]
  today: string
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export default function AgendaHome({ posts, today }: Props) {
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

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
          <p className="text-3xl mb-2">🌊</p>
          <p className="text-gray-500 font-medium">Pas d'événement aujourd'hui</p>
          <Link href="/agenda" className="text-blue-600 font-semibold text-sm mt-2 inline-block">
            Voir l'agenda complet →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
          {posts.length >= 10 && (
            <Link
              href="/agenda"
              className="block text-center text-sm font-bold text-blue-600 py-3 bg-blue-50 rounded-2xl"
            >
              Voir tous les événements →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
