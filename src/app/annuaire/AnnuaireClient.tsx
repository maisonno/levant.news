'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Etablissement, TypeEtablissement } from '@/types/database'
import { useEtabSheet } from '@/contexts/EtabSheetContext'
import PageHeader from '@/components/PageHeader'

// ─── Carte établissement ──────────────────────────────────────────────────────

function EtabCard({ etab, grouped }: { etab: Etablissement; grouped: boolean }) {
  const { open } = useEtabSheet()

  return (
    <button onClick={() => open(etab)} className="w-full text-left">
      <div className={
        grouped
          ? 'flex bg-white h-20 active:bg-gray-50 transition-colors'
          : 'flex bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 h-20 active:scale-[0.98] transition-transform'
      }>
        {/* Photo ou placeholder */}
        <div className="w-20 flex-shrink-0 bg-gray-100">
          {etab.photo_url ? (
            <img src={etab.photo_url} alt={etab.nom} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)' }}
            >
              🏪
            </div>
          )}
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center gap-0.5">
          <p className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">
            {etab.nom}
          </p>
          {etab.description && (
            <p className="text-xs text-gray-400 line-clamp-1 leading-snug">
              {etab.description.replace(/\*\*/g, '').replace(/\*/g, '')}
            </p>
          )}
          {!etab.description && etab.adresse && (
            <p className="text-xs text-gray-400 line-clamp-1">📍 {etab.adresse}</p>
          )}
        </div>

        {/* Chevron */}
        <div className="flex items-center pr-4 text-gray-300 flex-shrink-0">
          <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
            <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </button>
  )
}

// ─── Groupe iOS-style ─────────────────────────────────────────────────────────

function EtabGroup({ etabs }: { etabs: Etablissement[] }) {
  if (etabs.length === 1) {
    return <EtabCard etab={etabs[0]} grouped={false} />
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm divide-y divide-gray-100">
      {etabs.map(etab => (
        <EtabCard key={etab.id} etab={etab} grouped={true} />
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  etabs: Etablissement[]
  types: TypeEtablissement[]
}

export default function AnnuaireClient({ etabs, types }: Props) {
  const [search, setSearch] = useState('')

  // Types présents dans les données
  const typeMap = useMemo(() => {
    const m = new Map<string, TypeEtablissement>()
    for (const t of types) m.set(t.code, t)
    return m
  }, [types])

  // Filtrage par recherche
  const filtered = useMemo(() => {
    if (!search.trim()) return etabs
    const q = search.toLowerCase()
    return etabs.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.adresse?.toLowerCase().includes(q)
    )
  }, [etabs, search])

  // Grouper par type, ordonné par types.ordre
  const sections = useMemo(() => {
    const map = new Map<string | null, Etablissement[]>()
    for (const e of filtered) {
      const key = e.type_code
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }

    // Trier les sections selon l'ordre des types (si dispo), sinon ordre alpha des codes
    const typeCodes = types.length > 0
      ? types.map(t => t.code)
      : [...map.keys()].filter(Boolean).sort() as string[]

    const result: { type: TypeEtablissement | null; etabs: Etablissement[] }[] = []

    for (const code of typeCodes) {
      const list = map.get(code)
      if (list && list.length > 0) {
        // Fallback si pas de type connu : nom = code
        const knownType = typeMap.get(code) ?? { code, nom: code, ordre: 0 }
        result.push({ type: knownType, etabs: list })
      }
      map.delete(code)
    }

    // Les sans-type (null) en dernier
    const orphans = map.get(null)
    if (orphans && orphans.length > 0) {
      result.push({ type: null, etabs: orphans })
    }

    return result
  }, [filtered, types, typeMap])

  return (
    <div className="min-h-screen bg-gray-50">

      <PageHeader photo="/images/header-annuaire.jpg">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Annuaire</h1>
      </PageHeader>

      {/* Barre de recherche (sous le header, non-sticky) */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un établissement…"
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
      </div>

      {/* Contenu */}
      <div className="px-4 py-4 space-y-6">

        {/* Résultat vide */}
        {sections.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">
              Aucun résultat pour « {search} »
            </p>
            <button onClick={() => setSearch('')} className="mt-3 text-blue-600 font-semibold text-sm">
              Réinitialiser
            </button>
          </div>
        )}

        {sections.map(({ type, etabs: list }) => (
          <section key={type?.code ?? '__orphans__'}>
            {/* En-tête de section */}
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-extrabold text-gray-900">
                {type?.nom ?? 'Autres'}
              </h2>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">{list.length}</span>
            </div>

            {/* Groupe iOS */}
            <EtabGroup etabs={list} />
          </section>
        ))}

        {/* Fin */}
        {sections.length > 0 && (
          <div className="text-center py-8 pb-safe">
            <p className="text-2xl mb-1">⚓</p>
            <p className="text-gray-300 text-xs">Fin de l'annuaire</p>
          </div>
        )}
      </div>
    </div>
  )
}
