'use client'

import { useState, useMemo } from 'react'
import { PostWithRelations } from '@/types/database'
import Link from 'next/link'
import PostCardList from '@/components/PostCardList'
import { useEventSheet } from '@/contexts/EventSheetContext'
import PageHeader from '@/components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'agenda' | 'expositions' | 'affiche'

const TABS: { id: TabId; label: string }[] = [
  { id: 'agenda',       label: 'Agenda' },
  { id: 'expositions',  label: 'Expositions' },
  { id: 'affiche',      label: "À l'affiche" },
]

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDateHeader(iso: string, today: string): { jour: string; date: string } {
  const d        = new Date(iso + 'T12:00:00')
  const todayD   = new Date(today + 'T00:00:00')
  const demainD  = new Date(today + 'T00:00:00')
  demainD.setDate(demainD.getDate() + 1)
  const target = new Date(iso + 'T00:00:00')

  if (target.getTime() === todayD.getTime())  return { jour: "Aujourd'hui", date: '' }
  if (target.getTime() === demainD.getTime()) return { jour: 'Demain',       date: '' }

  const jour = d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return { jour: jour.charAt(0).toUpperCase() + jour.slice(1), date }
}

function formatCarouselDate(debut: string, fin: string | null): string {
  const d = new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (!fin || fin === debut) return d
  const f = new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${d} › ${f}`
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

// ─── Composants partagés ──────────────────────────────────────────────────────

function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      {subtitle && <span className="text-sm text-gray-400">{subtitle}</span>}
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

function CategoryBadge({ code, nom }: { code: string; nom: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
      CAT_COLORS[code] ?? 'bg-gray-100 text-gray-600'
    }`}>
      {nom}
    </span>
  )
}

// ─── Carte carrousel À l'affiche ──────────────────────────────────────────────

function AfficheCard({ post }: { post: PostWithRelations }) {
  const { open } = useEventSheet()
  return (
    <button
      onClick={() => open(post)}
      className="flex-shrink-0 snap-start w-44 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 text-left active:scale-[0.97] transition-transform"
    >
      <div className="w-full aspect-square bg-gray-100">
        {post.affiche_url ? (
          <img src={post.affiche_url} alt={post.titre} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: 'linear-gradient(135deg,#1e3a8a,#3730a3)' }}
          >
            {post.phare ? '⭐' : '📅'}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-blue-600 mb-1">
          {formatCarouselDate(post.date_debut, post.date_fin ?? null)}
        </p>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{post.titre}</p>
        {post.phare && (
          <span className="inline-block mt-1 text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
            ⭐ Phare
          </span>
        )}
        {post.lieu && !post.phare && (
          <p className="text-xs text-gray-400 mt-1 truncate">{post.lieu.nom}</p>
        )}
      </div>
    </button>
  )
}

// ─── Carte carrousel Expositions ──────────────────────────────────────────────

function ExpoCard({ post }: { post: PostWithRelations }) {
  const { open } = useEventSheet()
  return (
    <button
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
          {formatCarouselDate(post.date_debut, post.date_fin ?? null)}
        </p>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{post.titre}</p>
        {post.lieu && <p className="text-xs text-gray-400 mt-1 truncate">{post.lieu.nom}</p>}
      </div>
    </button>
  )
}

function HorizontalCarousel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {children}
    </div>
  )
}

// ─── Onglet Agenda ────────────────────────────────────────────────────────────

function AgendaTab({
  posts,
  today,
  afficheCarousel,
  onViewAllAffiche,
}: {
  posts:            PostWithRelations[]
  today:            string
  afficheCarousel:  PostWithRelations[]
  onViewAllAffiche: () => void
}) {
  const [search,      setSearch]      = useState('')
  const [filterDate,  setFilterDate]  = useState('')
  const [filterCats,  setFilterCats]  = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const availableCats = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of posts) {
      if (p.categorie && !map.has(p.categorie.code)) {
        map.set(p.categorie.code, p.categorie.nom)
      }
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.localeCompare(b))
  }, [posts])

  const hasActiveFilters = filterDate !== '' || filterCats.size > 0
  const resetFilters = () => { setFilterDate(''); setFilterCats(new Set()) }
  const toggleCat = (code: string) => {
    setFilterCats(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  const filtered = useMemo(() => {
    let result = posts
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.titre.toLowerCase().includes(q) ||
        p.organisateur?.nom.toLowerCase().includes(q) ||
        p.lieu?.nom.toLowerCase().includes(q) ||
        p.categorie?.nom.toLowerCase().includes(q)
      )
    }
    if (filterDate) result = result.filter(p => p.date_debut >= filterDate)
    if (filterCats.size > 0) result = result.filter(p => p.categorie && filterCats.has(p.categorie.code))
    return result
  }, [posts, search, filterDate, filterCats])

  const grouped = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>()
    for (const post of filtered) {
      if (!map.has(post.date_debut)) map.set(post.date_debut, [])
      map.get(post.date_debut)!.push(post)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const isFiltering = search.trim() !== '' || hasActiveFilters
  const todayPosts  = filtered.filter(p => p.date_debut <= today && (!p.date_fin || p.date_fin >= today))

  return (
    <>
      {/* Barre de recherche + filtres */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Chercher un événement…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-50 rounded-xl py-2.5 pl-9 pr-8 text-sm text-gray-800 placeholder-gray-400 outline-none border border-gray-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
              >×</button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border flex-shrink-0 transition-colors ${
              hasActiveFilters ? 'bg-amber-400 text-amber-900 border-amber-400' : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            <span>⊞</span>
            <span>Filtrer</span>
            {hasActiveFilters && (
              <span className="bg-amber-900/20 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {filterCats.size + (filterDate ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              À partir du
            </label>
            <input
              type="date"
              value={filterDate}
              min={today}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none"
            />
          </div>
          {availableCats.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Type d'événement
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCats.map(([code, nom]) => (
                  <button
                    key={code}
                    onClick={() => toggleCat(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      filterCats.has(code)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    {nom}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={resetFilters}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* Carousel À l'affiche — masqué si recherche ou filtre actif */}
      {!isFiltering && afficheCarousel.length > 0 && (
        <div className="bg-white border-b border-gray-100 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3 px-4">
            <h2 className="text-base font-extrabold text-gray-900">À l'affiche</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div
            className="flex items-start gap-3 overflow-x-auto pb-1 snap-x snap-mandatory px-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {afficheCarousel.map(post => (
              <AfficheCard key={post.id} post={post} />
            ))}
            {/* 6e carte — Voir tout */}
            <button
              onClick={onViewAllAffiche}
              className="flex-shrink-0 snap-start w-44 rounded-2xl overflow-hidden active:scale-[0.97] transition-transform"
            >
              <div
                className="w-full aspect-square flex flex-col items-center justify-center gap-3 p-5 text-center"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)' }}
              >
                <p className="font-extrabold text-sm text-white leading-tight">
                  Voir tous les événements à l'affiche
                </p>
                <span className="text-white/60 text-xl">→</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun événement pour ces critères'}
            </p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-3 text-blue-600 font-semibold text-sm">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Aujourd'hui */}
        {!filterDate && todayPosts.length > 0 && (
          <section>
            <SectionDivider
              title="Aujourd'hui"
              subtitle={new Date(today + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            />
            <PostCardList posts={todayPosts} />
          </section>
        )}

        {/* Jours suivants */}
        {(isFiltering ? grouped : grouped.filter(([d]) => d > today)).map(([date, datePosts]) => {
          const { jour, date: dateStr } = formatDateHeader(date, today)
          return (
            <section key={date}>
              <SectionDivider title={jour} subtitle={dateStr || undefined} />
              <PostCardList posts={datePosts} />
            </section>
          )
        })}

        {grouped.length > 0 && (
          <div className="text-center py-8 pb-safe">
            <p className="text-2xl mb-1">⚓</p>
            <p className="text-gray-300 text-xs">Fin de l'agenda</p>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Onglet Expositions ───────────────────────────────────────────────────────

function ExpositionsTab({ expos, today }: { expos: PostWithRelations[]; today: string }) {
  const enCours = expos.filter(p => p.date_debut < today)
  const aVenir  = expos.filter(p => p.date_debut >= today)

  if (expos.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-4xl mb-3">🖼️</p>
        <p className="text-gray-500 font-medium">Aucune exposition en ce moment</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-6">

      {enCours.length > 0 && (
        <section>
          <SectionDivider title="En ce moment" />
          <HorizontalCarousel>
            {enCours.map(post => <ExpoCard key={post.id} post={post} />)}
          </HorizontalCarousel>
        </section>
      )}

      {aVenir.length > 0 && (
        <section>
          <SectionDivider title="À venir" />
          <HorizontalCarousel>
            {aVenir.map(post => <ExpoCard key={post.id} post={post} />)}
          </HorizontalCarousel>
        </section>
      )}

      <div className="pb-safe h-8" />
    </div>
  )
}

// ─── Onglet À l'affiche ───────────────────────────────────────────────────────

function AfficheTab({ posts, today }: { posts: PostWithRelations[]; today: string }) {
  // Grouper par date_debut
  const grouped = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>()
    for (const post of posts) {
      if (!map.has(post.date_debut)) map.set(post.date_debut, [])
      map.get(post.date_debut)!.push(post)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [posts])

  if (posts.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-4xl mb-3">🎬</p>
        <p className="text-gray-500 font-medium">Aucun événement à l'affiche</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {grouped.map(([date, datePosts]) => {
        const { jour, date: dateStr } = formatDateHeader(date, today)
        return (
          <section key={date}>
            <SectionDivider title={jour} subtitle={dateStr || undefined} />
            <HorizontalCarousel>
              {datePosts.map(post => <AfficheCard key={post.id} post={post} />)}
            </HorizontalCarousel>
          </section>
        )
      })}

      <div className="pb-safe h-8" />
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  posts:            PostWithRelations[]
  afficheCarousel:  PostWithRelations[]
  afficheTab:       PostWithRelations[]
  expos:            PostWithRelations[]
  today:            string
  initialTab?:      TabId
}

export default function AgendaClient({ posts, afficheCarousel, afficheTab, expos, today, initialTab = 'agenda' }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  return (
    <div className="min-h-screen bg-gray-50">

      <PageHeader photo="/images/header-agenda.jpg">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Agenda</h1>
      </PageHeader>

      {/* Barre d'onglets — sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'agenda'      && <AgendaTab      posts={posts}      today={today} afficheCarousel={afficheCarousel} onViewAllAffiche={() => setActiveTab('affiche')} />}
      {activeTab === 'expositions' && <ExpositionsTab expos={expos}      today={today} />}
      {activeTab === 'affiche'     && <AfficheTab     posts={afficheTab} today={today} />}

    </div>
  )
}
