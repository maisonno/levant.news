'use client'

import { useState, useEffect, useRef } from 'react'
import PageHeader from '@/components/PageHeader'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HourlySlot {
  time: string
  temp: number
  apparent: number
  code: number
  wind: number
  windDir: number
  windGusts: number
  precip: number
  uv: number
  cloud: number
  waveH: number
  waveDir: number
  swellH: number
  swellDir: number
  swellPeriod: number
  seaTemp: number | null
}

// ─── WMO weather codes ────────────────────────────────────────────────────────

const WMO_EMOJI: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '🌥️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '❄️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}
const WMO_LABEL: Record<number, string> = {
  0: 'Ciel dégagé', 1: 'Peu nuageux', 2: 'Partiellement nuageux', 3: 'Couvert',
  45: 'Brouillard', 48: 'Brouillard givrant',
  51: 'Bruine légère', 53: 'Bruine', 55: 'Bruine forte',
  61: 'Pluie légère', 63: 'Pluie', 65: 'Pluie forte',
  71: 'Neige légère', 73: 'Neige', 75: 'Neige forte',
  80: 'Averses légères', 81: 'Averses', 82: 'Averses fortes',
  85: 'Averses de neige', 86: 'Averses de neige fortes',
  95: 'Orage', 96: 'Orage avec grêle', 99: 'Orage fort',
}
function wemojiOf(code: number) { return WMO_EMOJI[code] ?? '🌡️' }
function wlabelOf(code: number) { return WMO_LABEL[code] ?? 'Inconnu' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function degToCardinal(deg: number) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function degToFull(deg: number) {
  const dirs = [
    'Nord', 'Nord-Nord-Est', 'Nord-Est', 'Est-Nord-Est',
    'Est', 'Est-Sud-Est', 'Sud-Est', 'Sud-Sud-Est',
    'Sud', 'Sud-Sud-Ouest', 'Sud-Ouest', 'Ouest-Sud-Ouest',
    'Ouest', 'Ouest-Nord-Ouest', 'Nord-Ouest', 'Nord-Nord-Ouest',
  ]
  return dirs[Math.round(deg / 22.5) % 16]
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today    = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const day      = new Date(d); day.setHours(0,0,0,0)
  if (day.getTime() === today.getTime())    return "Aujourd'hui"
  if (day.getTime() === tomorrow.getTime()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function dayKey(iso: string) { return iso.split('T')[0] }

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  return `il y a ${Math.floor(diff / 60)}h`
}

function WindArrow({ deg, size = 16 }: { deg: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: `rotate(${deg + 180}deg)`, display: 'inline-block' }}>
      <path d="M12 3v15M6 12l6-9 6 9" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseSlots(data: { marine: Record<string,unknown>, wind: Record<string,unknown> }): HourlySlot[] {
  const wh  = (data.wind  as { hourly: Record<string, unknown[]> }).hourly
  const mh  = (data.marine as { hourly: Record<string, unknown[]> }).hourly
  const times = wh.time as string[]

  return times.map((t, i) => ({
    time:       t,
    temp:       (wh.temperature_2m as number[])[i],
    apparent:   (wh.apparent_temperature as number[])[i],
    code:       (wh.weather_code as number[])[i],
    wind:       (wh.wind_speed_10m as number[])[i],
    windDir:    (wh.wind_direction_10m as number[])[i],
    windGusts:  (wh.wind_gusts_10m as number[])[i],
    precip:     (wh.precipitation_probability as number[])[i],
    uv:         (wh.uv_index as number[])[i],
    cloud:      (wh.cloud_cover as number[])[i],
    waveH:      (mh.wave_height as number[])[i],
    waveDir:    (mh.wave_direction as number[])[i],
    swellH:     (mh.swell_wave_height as number[])[i],
    swellDir:   (mh.swell_wave_direction as number[])[i],
    swellPeriod:(mh.swell_wave_period as number[])[i],
    seaTemp:    (mh.sea_surface_temperature as (number|null)[])[i] ?? null,
  }))
}

// ─── Carte horaire ────────────────────────────────────────────────────────────

function HourCard({ slot, selected, onClick }: { slot: HourlySlot; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-[72px] rounded-2xl border p-2.5 flex flex-col items-center gap-1 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-600 shadow-md shadow-blue-200'
          : 'border-gray-100 bg-white shadow-sm'
      }`}
    >
      <p className={`text-xs font-bold ${selected ? 'text-blue-100' : 'text-gray-500'}`}>
        {formatHour(slot.time)}
      </p>
      <span className="text-2xl leading-none">{wemojiOf(slot.code)}</span>
      <p className={`text-sm font-extrabold ${selected ? 'text-white' : 'text-gray-900'}`}>
        {Math.round(slot.temp)}°
      </p>
      {slot.precip > 0 && (
        <p className={`text-xs font-semibold ${selected ? 'text-blue-200' : 'text-blue-500'}`}>
          💧{slot.precip}%
        </p>
      )}
    </button>
  )
}

// ─── Bloc détails ─────────────────────────────────────────────────────────────

function DetailBlock({ slot }: { slot: HourlySlot }) {
  const label = dayLabel(slot.time)
  const hour  = formatHour(slot.time)

  return (
    <div className="mx-4 space-y-3">

      {/* Titre */}
      <h2 className="text-base font-extrabold text-gray-900">
        Météo {label === "Aujourd'hui" || label === 'Demain' ? label.toLowerCase() : `du ${label}`} à {hour}
      </h2>

      {/* 1 — Météo générale */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Météo</p>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{wemojiOf(slot.code)}</span>
          <div className="flex-1">
            <p className="text-gray-600 text-sm font-semibold">{wlabelOf(slot.code)}</p>
            <p className="text-3xl font-extrabold text-gray-900">{Math.round(slot.temp)}°C</p>
            <p className="text-sm text-gray-500">Ressenti {Math.round(slot.apparent)}°C</p>
          </div>
          {slot.precip > 0 ? (
            <div className="flex flex-col items-center gap-0.5 px-3 py-2.5 bg-blue-50 rounded-2xl flex-shrink-0">
              <span className="text-2xl leading-none">💧</span>
              <p className="text-xl font-extrabold text-blue-700 leading-none mt-1">{slot.precip}%</p>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide mt-0.5">pluie</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 px-3 py-2.5 bg-green-50 rounded-2xl flex-shrink-0">
              <span className="text-2xl leading-none">🌈</span>
              <p className="text-[11px] text-green-600 font-semibold text-center leading-tight mt-1">Pas de<br/>pluie</p>
            </div>
          )}
        </div>
      </div>

      {/* 2 — Ciel */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Ciel</p>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-gray-700">
            <WindArrow deg={slot.windDir} size={48} />
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{Math.round(slot.wind)} km/h</p>
              <p className="text-sm text-gray-500">Rafales {Math.round(slot.windGusts)} km/h</p>
              <p className="text-sm text-gray-500">Direction : {degToFull(slot.windDir)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">UV</p>
              <p className="text-lg font-extrabold text-gray-900">{slot.uv.toFixed(1)}</p>
              <p className="text-xs text-gray-500">
                {slot.uv < 3 ? 'Faible' : slot.uv < 6 ? 'Modéré' : slot.uv < 8 ? 'Élevé' : slot.uv < 11 ? 'Très élevé' : 'Extrême'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl px-3 py-2.5">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-0.5">Nuages</p>
              <p className="text-lg font-extrabold text-gray-900">{slot.cloud}%</p>
              <p className="text-xs text-gray-500">Couverture</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 — Mer */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Mer</p>
        <div className="space-y-3">
          {slot.seaTemp !== null && (
            <div className="flex items-center gap-4">
              <span className="text-5xl">🌊</span>
              <div>
                <p className="text-gray-600 text-sm font-semibold">Température de l'eau</p>
                <p className="text-3xl font-extrabold text-blue-600">{Math.round(slot.seaTemp)}°C</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-2xl px-3 py-2.5">
              <p className="text-xs text-blue-500 font-semibold uppercase mb-0.5">Vagues</p>
              <p className="text-lg font-extrabold text-blue-900">{slot.waveH.toFixed(1)} m</p>
              <p className="text-xs text-blue-500">{degToFull(slot.waveDir)}</p>
            </div>
            <div className="bg-indigo-50 rounded-2xl px-3 py-2.5">
              <p className="text-xs text-indigo-500 font-semibold uppercase mb-0.5">Houle</p>
              <p className="text-lg font-extrabold text-indigo-900">{slot.swellH.toFixed(1)} m</p>
              <p className="text-xs text-indigo-500">{degToFull(slot.swellDir)} · {slot.swellPeriod.toFixed(0)}s</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MeteoPage() {
  const [slots,     setSlots]     = useState<HourlySlot[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const [selected,  setSelected]  = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const res = await fetch('/api/meteo')
      if (!res.ok) throw new Error()
      const json = await res.json()
      const parsed = parseSlots(json)
      setSlots(parsed)
      setFetchedAt(json.fetchedAt)
      setError(false)

      // Sélectionner la prochaine heure future par défaut
      const now = new Date()
      const idx = parsed.findIndex(s => new Date(s.time) >= now)
      setSelected(idx >= 0 ? idx : 0)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Grouper par jour pour le carrousel
  const days: { label: string; key: string; slots: { slot: HourlySlot; idx: number }[] }[] = []
  const now = new Date()

  slots.forEach((slot, idx) => {
    if (new Date(slot.time) < now) return // passé

    const key   = dayKey(slot.time)
    const label = dayLabel(slot.time)
    const hour  = new Date(slot.time).getHours()

    // Aujourd'hui : toutes les heures
    // Autres jours : 4, 8, 12, 16, 20, 0
    const isToday     = key === dayKey(now.toISOString())
    const showForDay  = isToday || [0, 4, 8, 12, 16, 20].includes(hour)

    if (!showForDay) return

    const existing = days.find(d => d.key === key)
    if (existing) existing.slots.push({ slot, idx })
    else days.push({ label, key, slots: [{ slot, idx }] })
  })

  const selectedSlot = selected !== null ? slots[selected] : null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      <PageHeader photo="/images/header-meteo.jpg">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Météo</h1>
        <p className="text-white/50 text-xs mt-0.5">Île du Levant · 43.02°N 6.47°E</p>
        {fetchedAt && (
          <p className="text-white/35 text-[10px] mt-0.5">Mise à jour {timeAgo(fetchedAt)}</p>
        )}
      </PageHeader>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement des données…</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div className="mx-4 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">⛈️</p>
          <p className="text-red-700 font-semibold text-sm">Données indisponibles</p>
          <button onClick={load}
            className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">
            Réessayer
          </button>
        </div>
      )}

      {/* Carrousel + détails */}
      {!loading && !error && slots.length > 0 && (
        <>
          {/* Carrousel — une seule ligne scrollable */}
          <div className="mt-4" ref={scrollRef}>
            <div
              className="flex gap-0 overflow-x-auto px-4 pb-3 items-end"
              style={{ scrollbarWidth: 'none' }}
            >
              {days.map(({ label, key, slots: daySlots }, di) => (
                <div key={key} className="flex items-end flex-shrink-0">
                  {/* Séparateur vertical entre jours (juste une ligne) */}
                  {di > 0 && (
                    <div className="self-stretch w-px bg-gray-200 mx-2 flex-shrink-0" />
                  )}
                  {/* Groupe jour : label + cartes */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-0.5 capitalize">
                      {label}
                    </p>
                    <div className="flex gap-2">
                      {daySlots.map(({ slot, idx }) => (
                        <HourCard
                          key={slot.time}
                          slot={slot}
                          selected={selected === idx}
                          onClick={() => setSelected(idx)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc détails */}
          {selectedSlot && (
            <div className="mt-5">
              <DetailBlock slot={selectedSlot} />
            </div>
          )}

          {/* Attribution */}
          <p className="text-center text-[10px] text-gray-300 mt-6 px-4">
            Données : DWD via{' '}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer" className="underline">
              Open-Meteo
            </a>
            {' '}· Actualisation toutes les 15 min
          </p>
        </>
      )}
    </div>
  )
}
