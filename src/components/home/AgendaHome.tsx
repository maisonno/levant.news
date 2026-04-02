import { PostWithRelations } from '@/types/database'
import PostCard from '@/components/PostCard'
import Link from 'next/link'

interface Props {
  todayPosts:  PostWithRelations[]
  enCeMoment:  PostWithRelations[]
  aLaffiche:   PostWithRelations[]
  demainPosts: PostWithRelations[]
  autresPosts: PostWithRelations[]
  expos:       PostWithRelations[]
  today:       string
  tomorrow:    string
}

function formatDateShort(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long',
  })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatCarouselDate(debut: string, fin: string | null): string {
  const d = new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (!fin || fin === debut) return d
  const f = new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${d} › ${f}`
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
      {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function CarouselCard({ post, accentColor = 'text-blue-600' }: { post: PostWithRelations; accentColor?: string }) {
  return (
    <Link
      href={`/agenda/${post.id}`}
      className="flex-shrink-0 snap-start w-44 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100"
    >
      <div className="w-full aspect-square bg-gray-100">
        {post.affiche_url ? (
          <img src={post.affiche_url} alt={post.titre} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg,#1e3a8a,#3730a3)' }}
          >
            {post.categorie?.code === 'EXPO' ? '🖼️' : '📅'}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className={`text-xs font-semibold mb-1 ${accentColor}`}>
          {formatCarouselDate(post.date_debut, post.date_fin ?? null)}
        </p>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{post.titre}</p>
        {post.lieu && (
          <p className="text-xs text-gray-400 mt-1 truncate">{post.lieu.nom}</p>
        )}
      </div>
    </Link>
  )
}

export default function AgendaHome({
  todayPosts, enCeMoment, aLaffiche, demainPosts, autresPosts, expos, today, tomorrow,
}: Props) {

  // Grouper autresPosts par date
  const grouped = new Map<string, PostWithRelations[]>()
  for (const post of autresPosts) {
    if (!grouped.has(post.date_debut)) grouped.set(post.date_debut, [])
    grouped.get(post.date_debut)!.push(post)
  }
  const autresGrouped = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))

  const hasAny = [todayPosts, enCeMoment, aLaffiche, demainPosts, autresPosts, expos].some(a => a.length > 0)

  return (
    <div className="mt-6 px-4 mb-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Agenda</h2>
        <Link href="/agenda" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
          Tout l'agenda →
        </Link>
      </div>

      {/* État vide */}
      {!hasAny && (
        <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
          <p className="text-3xl mb-2">🌊</p>
          <p className="text-gray-500 font-medium">Rien à venir dans les 7 prochains jours</p>
          <Link href="/agenda" className="text-blue-600 font-semibold text-sm mt-2 inline-block">
            Voir l'agenda complet →
          </Link>
        </div>
      )}

      <div className="space-y-6">

        {/* Aujourd'hui */}
        {todayPosts.length > 0 && (
          <section>
            <SectionHeader title="Aujourd'hui" subtitle={formatDateShort(today)} />
            <div className="space-y-4">
              {todayPosts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {/* En ce moment (multi-jours en cours) */}
        {enCeMoment.length > 0 && (
          <section>
            <SectionHeader title="En ce moment" />
            <div className="space-y-4">
              {enCeMoment.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {/* À l'affiche — cartes horizontales */}
        {aLaffiche.length > 0 && (
          <section>
            <SectionHeader title="À l'affiche" />
            <div className="space-y-4">
              {aLaffiche.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {/* Demain */}
        {demainPosts.length > 0 && (
          <section>
            <SectionHeader title="Demain" subtitle={formatDateShort(tomorrow)} />
            <div className="space-y-4">
              {demainPosts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {/* Autres jours (groupés par date, max 7j) */}
        {autresGrouped.map(([date, datePosts]) => (
          <section key={date}>
            <SectionHeader title={formatDateLabel(date)} />
            <div className="space-y-4">
              {datePosts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        ))}

        {/* Expositions — carrousel séparé */}
        {expos.length > 0 && (
          <section>
            <SectionHeader title="Expositions" />
            <div
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {expos.map(post => (
                <CarouselCard key={post.id} post={post} accentColor="text-amber-600" />
              ))}
            </div>
          </section>
        )}

        {/* Lien vers agenda complet */}
        {hasAny && (
          <Link
            href="/agenda"
            className="block text-center text-sm font-bold text-blue-600 py-3 bg-blue-50 rounded-2xl"
          >
            Voir tout l'agenda →
          </Link>
        )}

      </div>
    </div>
  )
}
