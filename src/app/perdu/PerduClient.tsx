'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ObjetPerdu } from '@/types/database'
import { useObjetPerduSheet } from '@/contexts/ObjetPerduSheetContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const today    = new Date(); today.setHours(0,0,0,0)
  const hier     = new Date(today); hier.setDate(hier.getDate() - 1)
  const dateOnly = new Date(d); dateOnly.setHours(0,0,0,0)

  if (dateOnly.getTime() === today.getTime()) return "Aujourd'hui"
  if (dateOnly.getTime() === hier.getTime())  return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isExpired(objet: ObjetPerdu): boolean {
  const created = new Date(objet.created_at)
  const limit   = new Date(created.getTime() + 10 * 24 * 60 * 60 * 1000)
  return new Date() > limit
}

// ─── Carte annonce ────────────────────────────────────────────────────────────

function AnnonceCard({ annonce, onClick }: { annonce: ObjetPerdu; onClick: () => void }) {
  const firstLine = annonce.description?.split('\n')[0] ?? ''

  return (
    <button
      onClick={onClick}
      className="block w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="flex items-stretch gap-0">
        {/* Vignette photo ou placeholder */}
        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
          {annonce.photo_url
            ? <img src={annonce.photo_url} alt={annonce.objet} className="w-full h-full object-cover" />
            : <span className="text-3xl">{annonce.type === 'PERDU' ? '🔍' : '📦'}</span>
          }
        </div>

        {/* Contenu */}
        <div className="flex-1 px-3 py-3 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              annonce.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            }`}>
              {annonce.type === 'PERDU' ? 'Perdu' : 'Trouvé'}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-sm leading-snug truncate">{annonce.objet}</p>
          {firstLine && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{firstLine}</p>
          )}
          {annonce.lieu && (
            <p className="text-xs text-gray-400 mt-0.5">📍 {annonce.lieu}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface PerduClientProps {
  annonces: ObjetPerdu[]
}

export default function PerduClient({ annonces }: PerduClientProps) {
  const { open } = useObjetPerduSheet()
  const [search, setSearch] = useState('')

  // Séparer actives (non expirées, non retrouvées) et fermées
  const actives = useMemo(() =>
    annonces.filter(a => !a.retrouve && !isExpired(a)),
    [annonces]
  )
  const fermees = useMemo(() =>
    annonces.filter(a => a.retrouve),
    [annonces]
  )

  // Filtrage recherche
  const q = search.toLowerCase().trim()
  const filterFn = (a: ObjetPerdu) =>
    !q ||
    a.objet.toLowerCase().includes(q) ||
    (a.description ?? '').toLowerCase().includes(q) ||
    (a.lieu ?? '').toLowerCase().includes(q) ||
    a.nom_declarant.toLowerCase().includes(q)

  const activesFiltered = actives.filter(filterFn)
  const fermeesFiltered = fermees.filter(filterFn)

  // Grouper les actives par date_evenement
  const grouped = useMemo(() => {
    const map = new Map<string, ObjetPerdu[]>()
    activesFiltered
      .slice()
      .sort((a, b) => b.date_evenement.localeCompare(a.date_evenement))
      .forEach(a => {
        const key = a.date_evenement
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(a)
      })
    return Array.from(map.entries())
  }, [activesFiltered])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div
        className="px-4 pt-14 pb-5"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Objets perdus et trouvés
        </h1>
        <p className="text-white/60 text-xs leading-snug">
          Les annonces sont publiées pendant 10 jours puis disparaissent automatiquement.
        </p>
      </div>

      {/* CTA + Recherche */}
      <div className="px-4 py-4 space-y-3 bg-white border-b border-gray-100 sticky top-0 z-20">
        <Link
          href="/perdu/nouveau"
          className="block w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold text-center active:bg-blue-700 transition-colors"
        >
          🏖️ J'ai perdu ou trouvé un objet
        </Link>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une annonce…"
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 pb-10">

        {/* Annonces actives groupées par date */}
        {grouped.length === 0 && !q && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌴</p>
            <p className="text-gray-400 text-sm">Aucune annonce active pour l'instant.</p>
          </div>
        )}

        {grouped.length === 0 && q && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-400 text-sm">Aucun résultat pour « {q} ».</p>
          </div>
        )}

        {grouped.map(([dateIso, items]) => (
          <div key={dateIso} className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1 capitalize">
              {formatDateLabel(dateIso)}
            </p>
            <div className="space-y-2">
              {items.map(a => (
                <AnnonceCard key={a.id} annonce={a} onClick={() => open(a)} />
              ))}
            </div>
          </div>
        ))}

        {/* Section annonces fermées */}
        {fermeesFiltered.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">
              Annonces fermées
            </p>
            <div className="space-y-2 opacity-60">
              {fermeesFiltered.map(a => (
                <AnnonceCard key={a.id} annonce={a} onClick={() => open(a)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
