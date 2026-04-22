'use client'

import { useState, useEffect, useRef } from 'react'
import PageHeader from '@/components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'bateaux' | 'bus'

const TABS: { id: TabId; label: string }[] = [
  { id: 'bateaux', label: 'Bateaux' },
  { id: 'bus',     label: 'Bus'     },
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

const STATUT_CONFIG: Record<'annule' | 'change', { badge: string; label: string }> = {
  annule: { badge: 'bg-red-100 text-red-600 line-through',         label: 'Annulé' },
  change: { badge: 'bg-orange-100 text-orange-700',                label: 'Changé' },
}

const LEVANT = 'Île du Levant'

function compagnieLabel(c: string): string {
  const n = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (n.includes('vedettes')) return 'VIO'
  return c
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
  const cancelled = h.statut === 'annule'
  const cfg       = h.statut !== 'prevu' ? STATUT_CONFIG[h.statut] : null
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${cancelled ? 'opacity-50' : ''}`}>
      <p className={`text-lg font-extrabold w-14 flex-shrink-0 ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {h.heure.slice(0, 5)}
      </p>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {h.port_depart} → {h.port_arrivee} <span className="text-gray-400 font-normal">({compagnieLabel(h.compagnie)})</span>
        </p>
        {h.duree_min && <p className="text-xs text-gray-400">{h.duree_min} min</p>}
        {h.note && <p className="text-xs text-orange-600 mt-0.5">{h.note}</p>}
      </div>
      {cfg && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>{cfg.label}</span>
      )}
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
  const [direction,    setDirection]    = useState<'vers' | 'depuis'>('vers')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/bateau?date=${selectedDate}`)
      .then(r => r.json())
      .then(({ horaires, infos }) => { setHoraires(horaires); setInfos(infos) })
      .finally(() => setLoading(false))
  }, [selectedDate])

  const byHeure = (a: Horaire, b: Horaire) => a.heure.localeCompare(b.heure)
  const versLevant   = horaires.filter(h => h.port_arrivee === LEVANT).sort(byHeure)
  const depuisLevant = horaires.filter(h => h.port_depart   === LEVANT).sort(byHeure)
  const visibles     = direction === 'vers' ? versLevant : depuisLevant

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

      {/* Sous-onglets direction */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        <button onClick={() => setDirection('vers')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            direction === 'vers' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}>
          → Vers le Levant
        </button>
        <button onClick={() => setDirection('depuis')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
            direction === 'depuis' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
          }`}>
          ← À partir du Levant
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && visibles.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-2xl mb-2">⛵</p>
          <p className="text-gray-500 text-sm font-medium">Aucun horaire ce jour</p>
        </div>
      )}

      {!loading && visibles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4">
            {visibles.map(h => <HoraireRow key={h.id} h={h} />)}
          </div>
        </div>
      )}

      {/* Disclaimer + liens compagnies */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-xs text-blue-700 leading-snug">
          ℹ️ Les horaires sont donnés à titre indicatif. Consultez directement les compagnies pour confirmer les départs.
        </p>
        {(() => {
          const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
          const urlByNorm = Object.fromEntries(
            Object.entries(COMPAGNIES_BATEAU_URLS).map(([k, v]) => [normalize(k), v])
          )
          const companies = [...new Set(horaires.map(h => h.compagnie).filter(Boolean))]
          const withUrl = companies.map(c => ({ nom: c, url: urlByNorm[normalize(c)] })).filter(c => c.url)
          if (withUrl.length === 0) return null
          return (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {withUrl.map(({ nom, url }) => (
                <a
                  key={nom}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-600 hover:text-white transition-colors"
                >
                  {nom} →
                </a>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ─── Jours fériés français ────────────────────────────────────────────────────

/**
 * Calcule la date de Pâques (dimanche) pour une année donnée.
 * Algorithme de Butcher/Anonymous Gregorian.
 */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1  // 0-indexed
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/**
 * Retourne true si la date ISO (YYYY-MM-DD) est un jour férié français.
 * Couvre les fériés métropole (hors Alsace-Moselle).
 */
function isFrenchHoliday(iso: string): { holiday: boolean; name: string } {
  const [y, m, dd] = iso.split('-').map(Number)
  const month = m - 1  // 0-indexed pour les comparaisons

  // Fériés fixes
  const fixed: Array<[number, number, string]> = [
    [0,  1,  "Jour de l'An"],
    [4,  1,  'Fête du Travail'],
    [4,  8,  'Victoire 1945'],
    [6,  14, 'Fête Nationale'],
    [7,  15, 'Assomption'],
    [10, 1,  'Toussaint'],
    [10, 11, 'Armistice'],
    [11, 25, 'Noël'],
  ]
  for (const [fm, fd, name] of fixed) {
    if (month === fm && dd === fd) return { holiday: true, name }
  }

  // Fériés mobiles (basés sur Pâques)
  const easter = easterSunday(y)
  const moveable: Array<[number, string]> = [
    [1,  'Lundi de Pâques'],
    [39, 'Ascension'],
    [50, 'Lundi de Pentecôte'],
  ]
  for (const [offset, name] of moveable) {
    const d = addDaysToDate(easter, offset)
    if (d.getFullYear() === y && d.getMonth() === month && d.getDate() === dd) {
      return { holiday: true, name }
    }
  }

  return { holiday: false, name: '' }
}

// ─── Types Bus ────────────────────────────────────────────────────────────────

interface BusDeparture {
  time: string
  travel_time_min: number | null
}

interface BusStop {
  stop_name:   string
  stop_id:     string
  destination: string
  departures:  BusDeparture[]
}

interface BusSchedule {
  date: string
  ligne: string
  aucun_service: boolean
  stops: BusStop[]
}

interface LiveDelay {
  stop_id:        string
  scheduled_time: string   // 'HH:MM'
  delay_seconds:  number
}

interface LiveData {
  updated_at: string
  ligne: string
  delays: LiveDelay[]
}

// ─── Compagnies ───────────────────────────────────────────────────────────────

/**
 * URLs des compagnies de bateaux — clé = valeur du champ `compagnie` en base.
 * Ajouter autant d'entrées que nécessaire.
 */
const COMPAGNIES_BATEAU_URLS: Record<string, string> = {
  'TLV':                   'https://www.tlv-tvm.com',
  'TLV-TVM':               'https://www.tlv-tvm.com',
  'Vedettes des îles d\'or': 'https://www.vedettesilesdor.fr',
  'Vedettes des îles':     'https://www.vedettesilesdor.fr',
  'Vedettes Iles d\'Or':   'https://www.vedettesilesdor.fr',
}

const LIGNES: { id: string; label: string; description: string; url: string }[] = [
  {
    id:          '878',
    label:       'Zou 878',
    description: 'Relie la gare de Toulon au Lavandou, en passant parfois par l\'aéroport de Hyères-Toulon.',
    url:         'https://zou.maregionsud.fr',
  },
  {
    id:          '67',
    label:       'Mistral 67',
    description: 'Relie la gare de Hyères au Port de Hyères (Port la Gavine).',
    url:         'https://www.varlib.fr',
  },
]

// ─── Onglet Bus ───────────────────────────────────────────────────────────────

/** Formate "08:30" → "8h30", "17:05" → "17h05" */
function formatBusTime(t: string): string {
  const [h, m] = t.split(':')
  return `${parseInt(h, 10)}h${m}`
}

/** Normalise un nom d'arrêt en label lisible */
const STOP_LABELS: Array<{ pattern: string; label: string }> = [
  // Plus spécifiques en premier
  { pattern: 'aeroport promenade',    label: 'Aéroport — Promenade'           },
  { pattern: 'square des heros',      label: 'Le Lavandou (Square des Héros)' },
  { pattern: 'gare routiere',         label: 'Gare Routière de Toulon'        },
  { pattern: 'aeroport',             label: 'Aéroport Hyères-Toulon'         },
  { pattern: 'gare (hy',             label: 'Gare de Hyères'                 },
  { pattern: 'port la gavine',        label: 'Port La Gavine'                 },
]

function stopLabel(name: string): string {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  for (const { pattern, label } of STOP_LABELS) {
    if (n.includes(pattern)) return label
  }
  return name
}

function BusTab() {
  const today = todayIso()
  const [selectedDate,  setSelectedDate]  = useState(today)
  const [selectedLigne, setSelectedLigne] = useState('878')
  const [schedule,      setSchedule]      = useState<BusSchedule | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [liveData,      setLiveData]      = useState<LiveData | null>(null)

  // Charge les horaires statiques
  useEffect(() => {
    setLoading(true)
    setSchedule(null)
    fetch(`/api/bus?date=${selectedDate}&ligne=${selectedLigne}`)
      .then(r => r.json())
      .then((data: BusSchedule) => setSchedule(data))
      .finally(() => setLoading(false))
  }, [selectedDate, selectedLigne])

  // Charge les données temps réel (seulement pour aujourd'hui)
  useEffect(() => {
    setLiveData(null)
    if (selectedDate !== today) return
    fetch(`/api/bus/live?date=${selectedDate}&ligne=${selectedLigne}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: LiveData | null) => {
        if (data && data.delays.length > 0) setLiveData(data)
      })
      .catch(() => { /* flux indisponible, on continue sans RT */ })
  }, [selectedDate, selectedLigne, today])

  // Map de lookup : `${stop_id}|${time}` → delay_seconds
  const delayMap = new Map<string, number>()
  for (const d of liveData?.delays ?? []) {
    delayMap.set(`${d.stop_id}|${d.scheduled_time}`, d.delay_seconds)
  }

  const ligne = LIGNES.find(l => l.id === selectedLigne)!
  const { holiday, name: holidayName } = isFrenchHoliday(selectedDate)

  return (
    <div className="px-4 mt-4 space-y-4 pb-10">

      {/* Sélecteur de date */}
      <DatePicker value={selectedDate} onChange={setSelectedDate} />

      {/* Titre du jour */}
      <h2 className="text-base font-extrabold text-gray-900 capitalize">
        {formatDate(selectedDate)}
      </h2>

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
          </button>
        ))}
      </div>

      {/* Description de la ligne */}
      <p className="text-xs text-gray-500 leading-snug -mt-1">
        {ligne.description}
      </p>

      {/* Avertissement jours fériés */}
      {holiday && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-3 items-start">
          <span className="text-lg flex-shrink-0">🗓️</span>
          <div>
            <p className="text-sm font-bold text-amber-700">{holidayName}</p>
            <p className="text-xs text-amber-600 mt-0.5 leading-snug">
              Les horaires affichés sont ceux du calendrier habituel.
              En jour férié, le service peut suivre les horaires du dimanche
              ou être suspendu — vérifiez auprès de l&apos;opérateur.
            </p>
          </div>
        </div>
      )}


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
      {!loading && !schedule?.aucun_service && (schedule?.stops.length ?? 0) === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-700 mb-1">⏳ Import en cours</p>
          <p className="text-xs text-amber-600">
            Les horaires sont importés chaque nuit. Si c&apos;est la première mise en service,
            déclencher l&apos;import manuellement via <code className="bg-amber-100 px-1 rounded">/api/cron/import-bus</code>.
          </p>
        </div>
      )}

      {/* Disclaimer + lien compagnie */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-xs text-blue-700 leading-snug">
          ℹ️ Les horaires sont donnés à titre indicatif. Consultez directement la compagnie pour confirmer les horaires.
        </p>
        <a
          href={ligne.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-600 hover:text-white transition-colors"
        >
          {ligne.label} →
        </a>
      </div>

      {/* Horaires par arrêt de départ */}
      {!loading && (schedule?.stops.length ?? 0) > 0 &&
        schedule!.stops.map(stop => (
          <div key={stop.stop_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* En-tête arrêt : "Départ de [stop] → [destination]" */}
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/80 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                🚏 {stopLabel(stop.stop_name)}
                {stop.destination && (
                  <span className="font-normal"> → {stop.destination}</span>
                )}
              </p>
              {liveData && (
                <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-semibold text-green-600">Live</span>
                </span>
              )}
            </div>

            {/* Liste des départs */}
            <div className="px-4 divide-y divide-gray-50">
              {stop.departures.map((dep, i) => {
                const liveKey  = `${stop.stop_id}|${dep.time}`
                const hasLive  = delayMap.has(liveKey)
                const delaySec = hasLive ? (delayMap.get(liveKey) ?? 0) : null
                const delayMin = delaySec != null ? Math.round(delaySec / 60) : null
                const isLate   = delayMin != null && delayMin > 1
                const isEarly  = delayMin != null && delayMin < -1
                const isOnTime = hasLive && !isLate && !isEarly
                return (
                  <div key={i} className="flex items-center gap-2.5 py-2.5">
                    {/* Heure théorique — orange si retard significatif */}
                    <span className={`text-base font-extrabold w-14 flex-shrink-0 ${
                      isLate ? 'text-orange-500' : 'text-gray-900'
                    }`}>
                      {formatBusTime(dep.time)}
                    </span>

                    {/* Indicateur live par ligne */}
                    {isOnTime && (
                      <span className="text-xs font-semibold text-green-600 flex-shrink-0">
                        À l&apos;heure
                      </span>
                    )}
                    {isLate && (
                      <span className="text-xs font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none">
                        +{delayMin} min
                      </span>
                    )}
                    {isEarly && (
                      <span className="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full flex-shrink-0 leading-none">
                        En avance ({-delayMin!} min)
                      </span>
                    )}

                    <span className="flex-1" />
                    {dep.travel_time_min != null && (
                      <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                        {dep.travel_time_min} min
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

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
        <p className="text-white/50 text-xs mt-0.5">Bateaux · Bus</p>
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
      {activeTab === 'bateaux' && <BateauxTab />}
      {activeTab === 'bus'     && <BusTab />}

    </div>
  )
}
