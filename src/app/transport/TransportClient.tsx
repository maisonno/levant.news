'use client'

import { useState, useEffect, useRef } from 'react'
import PageHeader from '@/components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'bateaux' | 'bus' | 'covoiturage'

const TABS: { id: TabId; label: string }[] = [
  { id: 'bateaux',      label: 'Bateaux'      },
  { id: 'bus',          label: 'Bus'           },
  { id: 'covoiturage',  label: 'Covoiturage'  },
]

interface Horaire {
  id: string
  date: string
  heure: string
  port_depart: string
  port_arrivee: string
  compagnie: string
  duree_min: number | null
  statut: 'prevu' | 'annule' | 'change'
  note: string | null
}

interface InfoBateau {
  id: string
  date_debut: string
  date_fin: string
  compagnie: string | null
  message: string
  type: 'avertissement' | 'changement' | 'annulation'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.getTime() === today.getTime())    return "Aujourd'hui"
  if (d.getTime() === tomorrow.getTime()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const INFO_CONFIG = {
  avertissement: { accent: 'border-orange-400', iconBg: 'bg-orange-100', titleColor: 'text-orange-600', icon: '⚠️', label: 'Avertissement' },
  changement:    { accent: 'border-blue-400',   iconBg: 'bg-blue-100',   titleColor: 'text-blue-600',   icon: '🔄', label: 'Changement'    },
  annulation:    { accent: 'border-red-400',     iconBg: 'bg-red-100',    titleColor: 'text-red-600',    icon: '🚫', label: 'Annulation'    },
}

const STATUT_CONFIG = {
  prevu:  { badge: 'bg-green-100 text-green-700',                  label: 'Prévu'  },
  annule: { badge: 'bg-red-100 text-red-600 line-through',         label: 'Annulé' },
  change: { badge: 'bg-orange-100 text-orange-700',                label: 'Changé' },
}

// ─── DatePicker ───────────────────────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const [open,      setOpen]      = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const d = new Date(value + 'T00:00:00')
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const sel  = new Date(value + 'T00:00:00')
  const dd   = String(sel.getDate()).padStart(2, '0')
  const mm   = String(sel.getMonth() + 1).padStart(2, '0')
  const yyyy = sel.getFullYear()

  const monthName  = new Date(viewMonth.year, viewMonth.month, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const firstDow   = new Date(viewMonth.year, viewMonth.month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = todayIso()

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(addDays(value, -1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold transition-colors"
        >‹</button>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-center gap-0.5 rounded-2xl border-2 border-blue-300 bg-white hover:bg-blue-50 px-4 py-2 transition-colors shadow-sm"
        >
          <span className="text-base font-bold text-gray-800">{dd}/</span>
          <span className="text-base font-bold bg-blue-600 text-white px-1.5 py-0 rounded-lg leading-tight">{mm}</span>
          <span className="text-base font-bold text-gray-800">/{yyyy}</span>
        </button>
        <button
          onClick={() => onChange(addDays(value, 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold transition-colors"
        >›</button>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewMonth(vm => { const d = new Date(vm.year, vm.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-sm">◄</button>
            <span className="text-sm font-bold text-gray-800 capitalize">{monthName}</span>
            <button onClick={() => setViewMonth(vm => { const d = new Date(vm.year, vm.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() } })}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-sm">►</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {['L','M','M','J','V','S','D'].map((l, i) => (
              <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{l}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="h-9" />
              const cellIso = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2,'0')}-${String(cell).padStart(2,'0')}`
              return (
                <button key={i} onClick={() => { onChange(cellIso); setOpen(false) }}
                  className={`h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                    cellIso === value ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : cellIso === today ? 'text-blue-600 font-bold ring-2 ring-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >{cell}</button>
              )
            })}
          </div>
          <button onClick={() => { onChange(today); setOpen(false) }}
            className="mt-3 w-full text-xs font-semibold text-blue-600 hover:text-blue-800 py-1 transition-colors">
            Aujourd'hui
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Composants Bateaux ───────────────────────────────────────────────────────

function InfoCard({ info }: { info: InfoBateau }) {
  const cfg = INFO_CONFIG[info.type]
  const dateDebut  = new Date(info.date_debut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const dateFin    = new Date(info.date_fin   + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const isSameDay  = info.date_debut === info.date_fin
  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.accent}`}>
      <div className="px-4 py-3 flex gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${cfg.iconBg}`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-sm font-bold ${cfg.titleColor}`}>{cfg.label}</p>
            {info.compagnie && <p className="text-xs text-gray-400 font-medium">{info.compagnie}</p>}
          </div>
          <p className="text-sm text-gray-700 leading-snug">{info.message}</p>
          <p className="text-xs text-gray-400 mt-1.5">
            📅 {isSameDay ? dateDebut : `${dateDebut} → ${dateFin}`}
          </p>
        </div>
      </div>
    </div>
  )
}

function HoraireRow({ h }: { h: Horaire }) {
  const cfg       = STATUT_CONFIG[h.statut]
  const cancelled = h.statut === 'annule'
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${cancelled ? 'opacity-50' : ''}`}>
      <p className={`text-lg font-extrabold w-14 flex-shrink-0 ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {h.heure.slice(0, 5)}
      </p>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">→ {h.port_arrivee}</p>
        <p className="text-xs text-gray-400">{h.compagnie}{h.duree_min ? ` · ${h.duree_min} min` : ''}</p>
        {h.note && <p className="text-xs text-orange-600 mt-0.5">{h.note}</p>}
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
    </div>
  )
}

// ─── Onglet Bateaux ───────────────────────────────────────────────────────────

function BateauxTab() {
  const today = todayIso()
  const [selectedDate, setSelectedDate] = useState(today)
  const [horaires,     setHoraires]     = useState<Horaire[]>([])
  const [infos,        setInfos]        = useState<InfoBateau[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/bateau?date=${selectedDate}`)
      .then(r => r.json())
      .then(({ horaires, infos }) => { setHoraires(horaires); setInfos(infos) })
      .finally(() => setLoading(false))
  }, [selectedDate])

  const byPort: Record<string, Horaire[]> = {}
  for (const h of horaires) {
    if (!byPort[h.port_depart]) byPort[h.port_depart] = []
    byPort[h.port_depart].push(h)
  }

  return (
    <div className="px-4 mt-4 space-y-4 pb-10">
      {infos.length > 0 && (
        <div className="space-y-2">
          {infos.map(info => <InfoCard key={info.id} info={info} />)}
        </div>
      )}

      <DatePicker value={selectedDate} onChange={setSelectedDate} />

      <h2 className="text-base font-extrabold text-gray-900 capitalize">
        {formatDate(selectedDate)}
      </h2>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && horaires.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-2xl mb-2">⛵</p>
          <p className="text-gray-500 text-sm font-medium">Aucun horaire ce jour</p>
        </div>
      )}

      {!loading && Object.entries(byPort).map(([port, rows]) => (
        <div key={port} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/80">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Départ — {port}</p>
          </div>
          <div className="px-4">
            {rows.map(h => <HoraireRow key={h.id} h={h} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Types Bus ────────────────────────────────────────────────────────────────

interface BusDeparture {
  time: string
  headsign: string
}

interface BusStop {
  stop_name: string
  stop_id: string
  direction_id: number
  departures: BusDeparture[]
}

interface BusSchedule {
  date: string
  ligne: string
  aucun_service: boolean
  stops: BusStop[]
}

const LIGNES: { id: string; label: string; reseau: string; description: string }[] = [
  {
    id:          '878',
    label:       'Zou 878',
    reseau:      'zou',
    description: 'Toulon · Hyères Aéroport · Le Lavandou',
  },
  {
    id:          '67',
    label:       'Mistral 67',
    reseau:      'mistral',
    description: 'Gare Hyères · Port La Gavine',
  },
]

const DIRECTION_LABELS: Record<number, string> = {
  0: 'Aller',
  1: 'Retour',
}

// ─── Onglet Bus ───────────────────────────────────────────────────────────────

function BusTab() {
  const today = todayIso()
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedLigne, setSelectedLigne] = useState('878')
  const [schedule, setSchedule] = useState<BusSchedule | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    setLoading(true)
    setSchedule(null)
    fetch(`/api/bus?date=${selectedDate}&ligne=${selectedLigne}`)
      .then(r => r.json())
      .then((data: BusSchedule) => setSchedule(data))
      .finally(() => setLoading(false))
  }, [selectedDate, selectedLigne])

  // Regrouper les arrêts par direction
  const byDirection: Record<number, BusStop[]> = {}
  for (const stop of (schedule?.stops ?? [])) {
    if (!byDirection[stop.direction_id]) byDirection[stop.direction_id] = []
    byDirection[stop.direction_id].push(stop)
  }

  return (
    <div className="px-4 mt-4 space-y-4 pb-10">

      {/* Sélecteur de ligne */}
      <div className="flex gap-2">
        {LIGNES.map(l => (
          <button
            key={l.id}
            onClick={() => setSelectedLigne(l.id)}
            className={`flex-1 rounded-2xl py-2.5 px-3 text-left transition-all ${
              selectedLigne === l.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-100 text-gray-700'
            }`}
          >
            <p className={`text-xs font-extrabold ${selectedLigne === l.id ? 'text-white' : 'text-blue-600'}`}>
              {l.label}
            </p>
            <p className={`text-[10px] leading-tight mt-0.5 ${selectedLigne === l.id ? 'text-white/70' : 'text-gray-400'}`}>
              {l.description}
            </p>
          </button>
        ))}
      </div>

      {/* Sélecteur de date */}
      <DatePicker value={selectedDate} onChange={setSelectedDate} />

      {/* Titre du jour */}
      <h2 className="text-base font-extrabold text-gray-900 capitalize">
        {formatDate(selectedDate)}
      </h2>

      {/* Chargement */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Aucun service */}
      {!loading && schedule?.aucun_service && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-2xl mb-2">🚌</p>
          <p className="text-gray-500 text-sm font-medium">Pas de service ce jour</p>
        </div>
      )}

      {/* Données pas encore importées */}
      {!loading && !schedule?.aucun_service && schedule?.stops.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-700 mb-1">⏳ Import en cours</p>
          <p className="text-xs text-amber-600">
            Les horaires sont importés chaque nuit. Si c&apos;est la première mise en service,
            déclencher l&apos;import manuellement via <code className="bg-amber-100 px-1 rounded">/api/cron/import-bus</code>.
          </p>
        </div>
      )}

      {/* Horaires par direction */}
      {!loading && (schedule?.stops.length ?? 0) > 0 &&
        Object.entries(byDirection).map(([dirId, stops]) => (
          <div key={dirId} className="space-y-2">

            {/* En-tête direction */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {DIRECTION_LABELS[parseInt(dirId)] ?? `Direction ${dirId}`}
              </span>
              {stops[0]?.departures[0]?.headsign && (
                <span className="text-xs font-semibold text-gray-500">
                  → {stops[0].departures[0].headsign}
                </span>
              )}
            </div>

            {/* Arrêts */}
            {stops.map(stop => (
              <div key={stop.stop_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/80">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    🚏 {stop.stop_name}
                  </p>
                </div>
                <div className="px-4 py-2 flex flex-wrap gap-x-3 gap-y-1">
                  {stop.departures.map((dep, i) => (
                    <span key={i} className="text-base font-extrabold text-gray-900 py-1.5">
                      {dep.time}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      }

    </div>
  )
}

// ─── Onglet Covoiturage ───────────────────────────────────────────────────────

function CovoiturageTab() {
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-4xl mb-3">🚗</p>
      <p className="text-gray-500 font-medium">Bientôt disponible</p>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TransportClient({ initialTab = 'bateaux' }: { initialTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  return (
    <div className="min-h-screen bg-gray-50">

      <PageHeader photo="/images/header-bateau.jpg">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Transport</h1>
        <p className="text-white/50 text-xs mt-0.5">Bateaux · Bus · Covoiturage</p>
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
      {activeTab === 'bateaux'     && <BateauxTab />}
      {activeTab === 'bus'         && <BusTab />}
      {activeTab === 'covoiturage' && <CovoiturageTab />}

    </div>
  )
}
