'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ObjetPerdu } from '@/types/database'
import PageHeader from '@/components/PageHeader'
import { supabaseImg } from '@/lib/supabaseImg'
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

// ─── Modal connexion requise ──────────────────────────────────────────────────

function AuthRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]"
           style={{ transform: 'translateY(0)', transition: 'transform 350ms cubic-bezier(0.32,0.72,0,1)' }}>
        <div className="bg-white rounded-t-3xl shadow-2xl px-5 pt-6 pb-10 space-y-5">
          {/* Handle */}
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-3xl">🔐</p>
            <h2 className="text-lg font-extrabold text-gray-900">Connexion requise</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Pour déclarer un objet perdu ou trouvé, tu dois avoir un compte Levant.news.
            </p>
          </div>
          <div className="space-y-3">
            <a href="/compte/connexion?redirect=/perdu/nouveau"
              className="block w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold text-center">
              J'ai déjà un compte
            </a>
            <a href="/compte/inscription"
              className="block w-full py-3.5 rounded-2xl bg-gray-100 text-gray-800 text-sm font-bold text-center">
              Créer un compte
            </a>
          </div>
        </div>
      </div>
    </>
  )
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
        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
          {annonce.photo_url
            ? <img src={supabaseImg(annonce.photo_url, 160)} alt={annonce.objet} className="w-full h-full object-cover" />
            : <span className="text-3xl">{annonce.type === 'PERDU' ? '🔍' : '📦'}</span>
          }
        </div>
        <div className="flex-1 px-3 py-3 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              annonce.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
            }`}>
              {annonce.type === 'PERDU' ? 'Perdu' : 'Trouvé'}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-sm leading-snug truncate">{annonce.objet}</p>
          {firstLine && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{firstLine}</p>}
          {annonce.lieu && <p className="text-xs text-gray-400 mt-0.5">📍 {annonce.lieu}</p>}
        </div>
      </div>
    </button>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PerduClient() {
  const supabase = createClient()
  const { user } = useAuth()
  const { open, refreshKey } = useObjetPerduSheet()

  const [annonces, setAnnonces] = useState<ObjetPerdu[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('objets_perdus')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setAnnonces(data ?? [])
    setLoading(false)
  }

  // Charge à l'init + re-charge quand le sheet signale un changement
  useEffect(() => { load() }, [refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const actives = useMemo(() => annonces.filter(a => !a.retrouve && !isExpired(a)), [annonces])
  const fermees = useMemo(() => annonces.filter(a => a.retrouve), [annonces])

  const q = search.toLowerCase().trim()
  const filterFn = (a: ObjetPerdu) =>
    !q || a.objet.toLowerCase().includes(q) ||
    (a.description ?? '').toLowerCase().includes(q) ||
    (a.lieu ?? '').toLowerCase().includes(q) ||
    a.nom_declarant.toLowerCase().includes(q)

  const activesFiltered = actives.filter(filterFn)
  const fermeesFiltered = fermees.filter(filterFn)

  const grouped = useMemo(() => {
    const map = new Map<string, ObjetPerdu[]>()
    activesFiltered
      .slice()
      .sort((a, b) => b.date_evenement.localeCompare(a.date_evenement))
      .forEach(a => {
        if (!map.has(a.date_evenement)) map.set(a.date_evenement, [])
        map.get(a.date_evenement)!.push(a)
      })
    return Array.from(map.entries())
  }, [activesFiltered])

  function handleCTA() {
    if (user) {
      window.location.href = '/perdu/nouveau'
    } else {
      setShowAuthModal(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <PageHeader photo="/images/header-perdu.jpg">
        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Objets perdus et trouvés
        </h1>
        <p className="text-white/60 text-xs leading-snug">
          Les annonces sont publiées pendant 10 jours puis disparaissent automatiquement.
        </p>
      </PageHeader>

      {/* CTA + Recherche — sticky */}
      <div className="px-4 py-4 space-y-3 bg-white border-b border-gray-100 sticky top-0 z-20">
        <button
          onClick={handleCTA}
          className="block w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold text-center active:bg-blue-700 transition-colors"
        >
          🏖️ J'ai perdu ou trouvé un objet
        </button>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une annonce…"
            className="w-full bg-gray-100 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 pb-10">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && grouped.length === 0 && !q && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌴</p>
            <p className="text-gray-400 text-sm">Aucune annonce active pour l'instant.</p>
          </div>
        )}
        {!loading && grouped.length === 0 && q && (
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
              {items.map(a => <AnnonceCard key={a.id} annonce={a} onClick={() => open(a)} />)}
            </div>
          </div>
        ))}

        {fermeesFiltered.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">Annonces fermées</p>
            <div className="space-y-2 opacity-60">
              {fermeesFiltered.map(a => <AnnonceCard key={a.id} annonce={a} onClick={() => open(a)} />)}
            </div>
          </div>
        )}
      </div>

      {/* Modal auth */}
      {showAuthModal && <AuthRequiredModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
