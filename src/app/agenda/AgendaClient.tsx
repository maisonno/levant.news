'use client'

import { useState, useMemo } from 'react'
import { PostWithRelations } from '@/types/database'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/PostCard'
import { useEventSheet } from '@/contexts/EventSheetContext'

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDateHeader(iso: string): { jour: string; date: string } {
  const d = new Date(iso + 'T12:00:00')
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)
  const demain = new Date(aujourd)
  demain.setDate(demain.getDate() + 1)
  const target = new Date(iso + 'T00:00:00')

  if (target.getTime() === aujourd.getTime()) return { jour: "Aujourd'hui", date: '' }
  if (target.getTime() === demain.getTime()) return { jour: 'Demain', date: '' }

  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return { jour: jour.charAt(0).toUpperCase() + jour.slice(1), date }
}

function isMultiDay(post: PostWithRelations): boolean {
  return !!post.date_fin && post.date_fin !== post.date_debut
}

const CAT_COLORS: Record<string, string> = {
  CONCERT:      'bg-purple-100 text-purple-700',
  SOIREE:       'bg-indigo-100 text-indigo-700',
  SPORT:        'bg-green-100 text-green-700',
  EXPO:         'bg-amber-100 text-amber-700',
  MARCHE:       'bg-orange-100 text-orange-700',
  SPECTACLE:    'bg-pink-100 text-pink-700',
  INFO:         'bg-blue-100 text-blue-700',
  INFOCRITIQUE: 'bg-red-100 text-red-700',
  BAL:          'bg-fuchsia-100 text-fuchsia-700',
  BRUNCH:       'bg-yellow-100 text-yellow-700',
  ACTIVITE:     'bg-teal-100 text-teal-700',
  CHANT:        'bg-rose-100 text-rose-700',
}

// ─── Composants ───────────────────────────────────────────────────────────────

function CategoryBadge({ code, nom }: { code: string; nom: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
      CAT_COLORS[code] ?? 'bg-gray-100 text-gray-600'
    }`}>
      {nom}
    </span>
  )
}

function EventCardFull({ post }: { post: PostWithRelations }) {
  const isPhare = post.phare

  return (
    <Link href={`/agenda/${post.id}`} className="block">
      <div className={`rounded-2xl overflow-hidden bg-white shadow-sm ${
        isPhare
          ? 'ring-2 ring-amber-400 bg-amber-50'
          : 'border border-gray-100'
      }`}>
        {/* Affiche */}
        {post.affiche_url && (
          <div className="relative h-40 bg-gray-100">
            <img
              src={post.affiche_url}
              alt={post.titre}
              className="w-full h-full object-cover"
            />
            {isPhare && (
              <div className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-[11px] font-black px-2.5 py-1 rounded-full">
                ⭐ Phare
              </div>
            )}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }}
            />
          </div>
        )}

        <div className={`p-4 ${isPhare && !post.affiche_url ? 'border-l-4 border-amber-400' : ''}`}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.categorie && (
              <CategoryBadge code={post.categorie.code} nom={post.categorie.nom} />
            )}
            {isPhare && !post.affiche_url && (
              <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                ⭐ Phare
              </span>
            )}
            {isMultiDay(post) && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Plusieurs jours
              </span>
            )}
          </div>

          <h3 className="font-bold text-gray-900 text-base leading-snug">{post.titre}</h3>

          <div className="flex items-center gap-x-4 gap-y-1 mt-2 flex-wrap text-sm text-gray-500">
            {post.heure && (
              <span className="flex items-center gap-1">
                <span>🕐</span> {post.heure}
              </span>
            )}
            {post.lieu && (
              <span className="flex items-center gap-1">
                <span>📍</span> {post.lieu.nom}
              </span>
            )}
            {post.organisateur && post.lieu?.nom !== post.organisateur.nom && (
              <span className="flex items-center gap-1 text-gray-400">
                <span>🏪</span> {post.organisateur.nom}
              </span>
            )}
          </div>

          {post.complement && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
              {post.complement}
            </p>
          )}

          {post.inscription && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-blue-600">
                Inscription requise
              </span>
              <span className="text-blue-600 text-sm">→</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function EventCardCompact({ post }: { post: PostWithRelations }) {
  return (
    <Link href={`/agenda/${post.id}`} className="block">
      <div className={`flex items-center gap-3 py-3 px-4 bg-white rounded-xl border ${
        post.phare ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
      }`}>
        {/* Heure */}
        <div className="w-12 flex-shrink-0 text-center">
          {post.heure ? (
            <span className="text-xs font-bold text-gray-700">{post.heure}</span>
          ) : (
            <span className="text-lg">{post.phare ? '⭐' : '•'}</span>
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{post.titre}</p>
          <p className="text-xs text-gray-500 truncate">
            {post.lieu?.nom ?? post.organisateur?.nom ?? ''}
          </p>
        </div>

        {/* Badge catégorie */}
        {post.categorie && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
            CAT_COLORS[post.categorie.code] ?? 'bg-gray-100 text-gray-600'
          }`}>
            {post.categorie.nom}
          </span>
        )}
      </div>
    </Link>
  )
}

function formatAfficheDate(debut: string, fin: string | null): string {
  const d = new Date(debut + 'T12:00:00')
  const dateDebut = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (!fin || fin === debut) return dateDebut
  const dateFin = new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${dateDebut} › ${dateFin}`
}

function AfficheCarousel({ posts }: { posts: PostWithRelations[] }) {
  const { open } = useEventSheet()
  if (posts.length === 0) return null

  return (
    <div className="mb-2">
      <div className="px-4 mb-3">
        <h2 className="text-base font-extrabold text-gray-900">À l'affiche</h2>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {posts.map(post => (
          <button
            key={post.id}
            onClick={() => open(post)}
            className="flex-shrink-0 snap-start w-44 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 text-left active:scale-[0.97] transition-transform"
          >
            <div className="w-full aspect-square bg-gray-100">
              {post.affiche_url ? (
                <img src={post.affiche_url} alt={post.titre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#1e3a8a,#3730a3)' }} />
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-blue-600 mb-1">
                {formatAfficheDate(post.date_debut, post.date_fin)}
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">
                {post.titre}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ExpoCarousel({ posts }: { posts: PostWithRelations[] }) {
  const { open } = useEventSheet()
  if (posts.length === 0) return null

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-extrabold text-gray-900">Expositions</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {posts.map(post => (
          <button
            key={post.id}
            onClick={() => open(post)}
            className="flex-shrink-0 snap-start w-44 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 text-left active:scale-[0.97] transition-transform"
          >
            <div className="w-full aspect-square bg-amber-50">
              {post.affiche_url ? (
                <img src={post.affiche_url} alt={post.titre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-amber-600 mb-1">
                {formatAfficheDate(post.date_debut, post.date_fin ?? null)}
              </p>
              <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{post.titre}</p>
              {post.lieu && <p className="text-xs text-gray-400 mt-1 truncate">{post.lieu.nom}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  posts: PostWithRelations[]
  aLaffiche: PostWithRelations[]
  expos: PostWithRelations[]
  today: string
}

export default function AgendaClient({ posts, aLaffiche, expos, today }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  // Filtrage par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return posts
    const q = search.toLowerCase()
    return posts.filter(p =>
      p.titre.toLowerCase().includes(q) ||
      p.organisateur?.nom.toLowerCase().includes(q) ||
      p.lieu?.nom.toLowerCase().includes(q) ||
      p.categorie?.nom.toLowerCase().includes(q)
    )
  }, [posts, search])

  // Grouper par date (utilise date_debut comme clé de regroupement)
  const grouped = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>()
    for (const post of filtered) {
      const key = post.date_debut
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(post)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Séparer aujourd'hui des jours suivants
  const todayPosts = filtered.filter(p => p.date_debut <= today && (!p.date_fin || p.date_fin >= today))
  const todayKey = today

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 pt-14 pb-4"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white"
            aria-label="Retour"
          >
            ←
          </button>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex-1">Agenda</h1>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un événement…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white rounded-xl py-3 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 outline-none shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* À l'affiche (si pas de recherche) */}
        {!search && <AfficheCarousel posts={aLaffiche} />}

        {/* Résultats vides */}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">Aucun résultat pour « {search} »</p>
          </div>
        )}

        {/* Aujourd'hui */}
        {!search && todayPosts.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-extrabold text-gray-900">Aujourd'hui</h2>
              <span className="text-sm text-gray-400">
                {new Date(today + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-4">
              {todayPosts.map(post => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        )}

        {/* Expositions (carrousel, hors recherche) */}
        {!search && <ExpoCarousel posts={expos} />}

        {/* Jours suivants */}
        {(search ? grouped : grouped.filter(([d]) => d > todayKey)).map(([date, datePosts]) => {
          const { jour, date: dateStr } = formatDateHeader(date)
          return (
            <section key={date}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-extrabold text-gray-900">{jour}</h2>
                {dateStr && <span className="text-sm text-gray-400">{dateStr}</span>}
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="space-y-4">
                {datePosts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </section>
          )
        })}

        {/* Fin de liste */}
        {grouped.length > 0 && (
          <div className="text-center py-8 pb-safe">
            <p className="text-2xl mb-1">⚓</p>
            <p className="text-gray-300 text-xs">Fin de l'agenda</p>
          </div>
        )}
      </div>
    </div>
  )
}
