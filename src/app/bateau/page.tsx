'use client'

import { useState, useEffect, useRef } from 'react'
import { useDrawer } from '@/contexts/DrawerContext'

// ─── Types ────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.getTime() === today.getTime())    return "Aujourd'hui"
  if (d.getTime() === tomorrow.getTime()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  if (d.getTime() === today.getTime()) return "Auj."
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatHeure(h: string) {
  return h.slice(0, 5)
}

const INFO_CONFIG = {
  avertissement: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', icon: '⚠️', label: 'Avertissement' },
  changement:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-700',   icon: '🔄', label: 'Changement' },
  annulation:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-700',    icon: '🚫', label: 'Annulation' },
}

const STATUT_CONFIG = {
  prevu:   { badge: 'bg-green-100 text-green-700',  label: 'Prévu' },
  annule:  { badge: 'bg-red-100 text-red-600 line-through',   label: 'Annulé' },
  change:  { badge: 'bg-orange-100 text-orange-700', label: 'Changé' },
}

// ─── DatePicker ───────────────────────────────────────────────

function DatePicker({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef<HTMLDivElement>(null)

  // Sync view month quand la date change de l'extérieur
  useEffect(() => {
    const d = new Date(value + 'T00:00:00')
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
  }, [value])

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const sel = new Date(value + 'T00:00:00')
  const dd = String(sel.getDate()).padStart(2, '0')
  const mm = String(sel.getMonth() + 1).padStart(2, '0')
  const yyyy = sel.getFullYear()

  const monthName = new Date(viewMonth.year, viewMonth.month, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Grille calendrier (semaine commence lundi)
  const firstDow = new Date(viewMonth.year, viewMonth.month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = todayIso()

  function prevMonth() {
    setViewMonth(vm => {
      const d = new Date(vm.year, vm.month - 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function nextMonth() {
    setViewMonth(vm => {
      const d = new Date(vm.year, vm.month + 1, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div ref={ref} className="relative">

      {/* Barre de navigation date */}
      <div className="flex items-center gap-2">

        {/* Flèche gauche */}
        <button
          onClick={() => onChange(addDays(value, -1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold transition-colors"
          aria-label="Jour précédent"
        >
          ‹
        </button>

        {/* Date cliquable */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-center gap-0.5 rounded-2xl border-2 border-blue-300 bg-white hover:bg-blue-50 px-4 py-2 transition-colors shadow-sm"
          aria-label="Choisir une date"
        >
          <span className="text-base font-bold text-gray-800">{dd}/</span>
          <span className="text-base font-bold bg-blue-600 text-white px-1.5 py-0 rounded-lg leading-tight">{mm}</span>
          <span className="text-base font-bold text-gray-800">/{yyyy}</span>
        </button>

        {/* Flèche droite */}
        <button
          onClick={() => onChange(addDays(value, 1))}
          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold transition-colors"
          aria-label="Jour suivant"
        >
          ›
        </button>
      </div>

      {/* Popup calendrier */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-4">

          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-sm transition-colors"
            >◄</button>
            <span className="text-sm font-bold text-gray-800 capitalize">{monthName}</span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 font-bold text-sm transition-colors"
            >►</button>
          </div>

          {/* Entêtes jours */}
          <div className="grid grid-cols-7 mb-1">
            {['L','M','M','J','V','S','D'].map((l, i) => (
              <div key={i} className="text-center text-xs font-bold text-gray-400 py-1">{l}</div>
            ))}
          </div>

          {/* Cases jours */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell) return <div key={i} className="h-9" />
              const cellIso = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2,'0')}-${String(cell).padStart(2,'0')}`
              const isSelected = cellIso === value
              const isToday = cellIso === today
              return (
                <button
                  key={i}
                  onClick={() => { onChange(cellIso); setOpen(false) }}
                  className={`h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'text-blue-600 font-bold ring-2 ring-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cell}
                </button>
              )
            })}
          </div>

          {/* Raccourci Aujourd'hui */}
          <button
            onClick={() => { onChange(today); setOpen(false) }}
            className="mt-3 w-full text-xs font-semibold text-blue-600 hover:text-blue-800 py-1 transition-colors"
          >
            Aujourd'hui
          </button>

        </div>
      )}
    </div>
  )
}

// ─── Composants ───────────────────────────────────────────────

function InfoCard({ info }: { info: InfoBateau }) {
  const cfg = INFO_CONFIG[info.type]
  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {info.compagnie && (
              <span className={`text-xs font-semibold ${cfg.text} opacity-70`}>{info.compagnie}</span>
            )}
          </div>
          <p className={`text-sm font-medium ${cfg.text}`}>{info.message}</p>
          <p className={`text-xs mt-1 opacity-60 ${cfg.text}`}>
            Jusqu'au {new Date(info.date_fin + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>
    </div>
  )
}

function HoraireRow({ h }: { h: Horaire }) {
  const cfg = STATUT_CONFIG[h.statut]
  const cancelled = h.statut === 'annule'
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${cancelled ? 'opacity-50' : ''}`}>
      <p className={`text-lg font-extrabold w-14 flex-shrink-0 ${cancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
        {formatHeure(h.heure)}
      </p>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          → {h.port_arrivee}
        </p>
        <p className="text-xs text-gray-400">
          {h.compagnie}{h.duree_min ? ` · ${h.duree_min} min` : ''}
        </p>
        {h.note && <p className="text-xs text-orange-600 mt-0.5">{h.note}</p>}
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function BateauPage() {
  const { toggle } = useDrawer()
  const today = todayIso()

  const [selectedDate, setSelectedDate] = useState(today)
  const [horaires,     setHoraires]     = useState<Horaire[]>([])
  const [infos,        setInfos]        = useState<InfoBateau[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/bateau?date=${selectedDate}`)
      .then(r => r.json())
      .then(({ horaires, infos }) => {
        setHoraires(horaires)
        setInfos(infos)
      })
      .finally(() => setLoading(false))
  }, [selectedDate])

  // Grouper par port de départ
  const byPort: Record<string, Horaire[]> = {}
  for (const h of horaires) {
    if (!byPort[h.port_depart]) byPort[h.port_depart] = []
    byPort[h.port_depart].push(h)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div
        className="px-4 pt-14 pb-5"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={toggle} aria-label="Menu"
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl">
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>
          <a href="/" className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center" aria-label="Accueil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </a>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Bateaux</h1>
        <p className="text-white/50 text-xs mt-0.5">Horaires de liaison maritime</p>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* Infos actives */}
        {infos.length > 0 && (
          <div className="space-y-2">
            {infos.map(info => <InfoCard key={info.id} info={info} />)}
          </div>
        )}

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

        {/* Aucun horaire */}
        {!loading && horaires.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-2xl mb-2">⛵</p>
            <p className="text-gray-500 text-sm font-medium">Aucun horaire ce jour</p>
          </div>
        )}

        {/* Horaires par port */}
        {!loading && Object.entries(byPort).map(([port, rows]) => (
          <div key={port} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/80">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Départ — {port}
              </p>
            </div>
            <div className="px-4">
              {rows.map(h => <HoraireRow key={h.id} h={h} />)}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
