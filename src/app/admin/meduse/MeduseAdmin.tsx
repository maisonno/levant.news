'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Presence = 'aucune' | 'tres_peu' | 'beaucoup' | 'infeste'

interface Signalement {
  id:                string
  date_observation:  string
  heure_observation: string
  lieu:              string
  presence:          Presence
  signale_par:       string | null
  created_at:        string
}

const PRESENCE_BADGE: Record<Presence, { label: string; cls: string }> = {
  aucune:   { label: 'Aucune',   cls: 'bg-green-100 text-green-700' },
  tres_peu: { label: 'Très peu', cls: 'bg-yellow-100 text-yellow-700' },
  beaucoup: { label: 'Beaucoup', cls: 'bg-orange-100 text-orange-700' },
  infeste:  { label: 'Infesté',  cls: 'bg-red-100 text-red-700' },
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const hier  = new Date(today); hier.setDate(hier.getDate() - 1)
  const dateOnly = new Date(d); dateOnly.setHours(0,0,0,0)
  if (dateOnly.getTime() === today.getTime()) return "Aujourd'hui"
  if (dateOnly.getTime() === hier.getTime())  return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatHeure(h: string) { return h.slice(0, 5) }

export default function MeduseAdmin() {
  const supabase = createClient()

  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meduse_signalements')
      .select('*')
      .order('date_observation', { ascending: false })
      .order('heure_observation', { ascending: false })
    setSignalements((data ?? []) as Signalement[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function remove(id: string) {
    setDeleting(id)
    await supabase.from('meduse_signalements').delete().eq('id', id)
    setSignalements(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  // Grouper par date
  const grouped = signalements.reduce<Map<string, Signalement[]>>((acc, s) => {
    if (!acc.has(s.date_observation)) acc.set(s.date_observation, [])
    acc.get(s.date_observation)!.push(s)
    return acc
  }, new Map())

  return (
    <div className="pb-10">
      {/* En-tête */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-gray-900">🪼 Méduse Watch</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Chargement…' : `${signalements.length} signalement${signalements.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 pt-4 space-y-6">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-12">Chargement…</p>
        )}

        {!loading && signalements.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌊</p>
            <p className="text-gray-400 text-sm">Aucun signalement.</p>
          </div>
        )}

        {Array.from(grouped.entries()).map(([date, items]) => (
          <section key={date}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 capitalize">
                {formatDate(date)}
              </p>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300">{items.length}</span>
            </div>

            <div className="space-y-2">
              {items.map(s => {
                const badge = PRESENCE_BADGE[s.presence]
                return (
                  <div key={s.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">🪼</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-gray-900 truncate">{s.lieu}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatHeure(s.heure_observation)}
                        {s.signale_par && <span className="ml-1.5">· {s.signale_par}</span>}
                      </p>
                    </div>

                    <button
                      onClick={() => remove(s.id)}
                      disabled={deleting === s.id}
                      className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 disabled:opacity-40 transition-colors"
                      title="Supprimer"
                    >
                      {deleting === s.id
                        ? <span className="text-xs">…</span>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
