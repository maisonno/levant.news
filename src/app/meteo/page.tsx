'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeteoData {
  marine: {
    current: {
      time: string
      wave_height: number
      wave_direction: number
      wave_period: number
      swell_wave_height: number
      swell_wave_direction: number
      swell_wave_period: number
      wind_wave_height: number
      wind_wave_direction: number
    }
    hourly: {
      time: string[]
      wave_height: number[]
      wave_direction: number[]
      wave_period: number[]
      swell_wave_height: number[]
    }
  }
  wind: {
    current: {
      time: string
      wind_speed_10m: number
      wind_direction_10m: number
      wind_gusts_10m: number
      temperature_2m: number
    }
    hourly: {
      time: string[]
      wind_speed_10m: number[]
      wind_direction_10m: number[]
      wind_gusts_10m: number[]
    }
  }
  fetchedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function degToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO']
  return dirs[Math.round(deg / 22.5) % 16]
}

function beaufortLabel(kn: number): { label: string; color: string } {
  if (kn < 1)  return { label: 'Calme',          color: 'text-emerald-600' }
  if (kn < 4)  return { label: 'Très légère brise', color: 'text-emerald-500' }
  if (kn < 7)  return { label: 'Légère brise',   color: 'text-green-500'   }
  if (kn < 11) return { label: 'Petite brise',   color: 'text-lime-500'    }
  if (kn < 17) return { label: 'Jolie brise',    color: 'text-yellow-500'  }
  if (kn < 22) return { label: 'Bonne brise',    color: 'text-amber-500'   }
  if (kn < 28) return { label: 'Vent frais',     color: 'text-orange-500'  }
  if (kn < 34) return { label: 'Grand frais',    color: 'text-orange-600'  }
  if (kn < 41) return { label: 'Coup de vent',   color: 'text-red-500'     }
  return { label: 'Tempête',                      color: 'text-red-700'     }
}

function seaStateLabel(h: number): string {
  if (h < 0.1)  return 'Calme (huile)'
  if (h < 0.5)  return 'Belle'
  if (h < 1.25) return 'Peu agitée'
  if (h < 2.5)  return 'Agitée'
  if (h < 4)    return 'Forte'
  if (h < 6)    return 'Très forte'
  return 'Grosse mer'
}

function seaStateColor(h: number): string {
  if (h < 0.5)  return '#10b981'
  if (h < 1.25) return '#22c55e'
  if (h < 2.5)  return '#eab308'
  if (h < 4)    return '#f97316'
  return '#ef4444'
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'à l\'instant'
  if (diff < 60) return `il y a ${diff} min`
  return `il y a ${Math.floor(diff / 60)}h`
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dOnly = new Date(d); dOnly.setHours(0,0,0,0)
  if (dOnly.getTime() === today.getTime())    return "Aujourd'hui"
  if (dOnly.getTime() === tomorrow.getTime()) return 'Demain'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
}

// Flèche de direction (pointe dans le sens d'où vient le vent)
function WindArrow({ deg, size = 20 }: { deg: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: `rotate(${deg + 180}deg)` }}>
      <path d="M12 3v15M6 12l6-9 6 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Carte conditions actuelles ───────────────────────────────────────────────

function CurrentConditions({ data }: { data: MeteoData }) {
  const { marine, wind } = data
  const c = marine.current
  const w = wind.current
  const bf = beaufortLabel(w.wind_speed_10m)
  const seaColor = seaStateColor(c.wave_height)

  return (
    <div
      className="mx-4 mt-4 rounded-3xl overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(135deg, #0a1f4e 0%, #1A56DB 60%, ${seaColor}44 100%)` }}
    >
      <div className="px-5 py-5">
        {/* Titre + last update */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide">Conditions actuelles</p>
          <p className="text-white/40 text-[10px]">Màj {timeAgo(data.fetchedAt)}</p>
        </div>

        {/* Vent — section principale */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-white">{Math.round(w.wind_speed_10m)}</span>
              <span className="text-white/60 text-lg font-bold">nœuds</span>
            </div>
            <p className={`text-sm font-bold mt-0.5 ${bf.color}`}>{bf.label}</p>
            <p className="text-white/50 text-xs mt-0.5">
              Rafales {Math.round(w.wind_gusts_10m)} nœuds
            </p>
          </div>
          <div className="flex flex-col items-center text-white/80">
            <WindArrow deg={w.wind_direction_10m} size={36} />
            <span className="text-sm font-bold mt-1">{degToCardinal(w.wind_direction_10m)}</span>
          </div>
        </div>

        {/* Séparateur */}
        <div className="h-px bg-white/10 mb-4" />

        {/* Vagues + Houle */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wide font-semibold mb-1">Vagues</p>
            <p className="text-white text-xl font-extrabold">{c.wave_height.toFixed(1)} m</p>
            <p className="text-white/60 text-xs">{seaStateLabel(c.wave_height)}</p>
            <p className="text-white/40 text-[10px] mt-0.5">
              {degToCardinal(c.wave_direction)} · {c.wave_period.toFixed(0)}s
            </p>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wide font-semibold mb-1">Houle</p>
            <p className="text-white text-xl font-extrabold">{c.swell_wave_height.toFixed(1)} m</p>
            <p className="text-white/60 text-xs">Période {c.swell_wave_period.toFixed(0)}s</p>
            <p className="text-white/40 text-[10px] mt-0.5">
              {degToCardinal(c.swell_wave_direction)}
            </p>
          </div>
        </div>

        {/* Température air */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-white/40 text-xs">🌡 Air</span>
          <span className="text-white/70 text-sm font-bold">{Math.round(w.temperature_2m)}°C</span>
        </div>
      </div>
    </div>
  )
}

// ─── Prévisions horaires ──────────────────────────────────────────────────────

function HourlyForecast({ data }: { data: MeteoData }) {
  const now = new Date()
  const times = data.marine.hourly.time

  // On garde les 24 prochaines heures
  const upcoming = times
    .map((t, i) => ({
      time: t,
      waveH: data.marine.hourly.wave_height[i],
      waveDir: data.marine.hourly.wave_direction[i],
      swellH: data.marine.hourly.swell_wave_height[i],
      windKn: data.wind.hourly.wind_speed_10m[i],
      windDir: data.wind.hourly.wind_direction_10m[i],
      windGusts: data.wind.hourly.wind_gusts_10m[i],
    }))
    .filter(h => new Date(h.time) >= now)
    .slice(0, 24)

  if (!upcoming.length) return null

  // Grouper par jour
  const days: { label: string; hours: typeof upcoming }[] = []
  upcoming.forEach(h => {
    const label = formatDay(h.time)
    const last = days[days.length - 1]
    if (last?.label === label) last.hours.push(h)
    else days.push({ label, hours: [h] })
  })

  return (
    <div className="mt-5">
      {days.map(({ label, hours }) => (
        <div key={label} className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-4 mb-2 capitalize">{label}</p>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
            {hours.map(h => {
              const bf = beaufortLabel(h.windKn)
              const seaC = seaStateColor(h.waveH)
              return (
                <div key={h.time}
                  className="flex-shrink-0 w-[76px] bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1.5">
                  <p className="text-[11px] font-bold text-gray-500">{formatHour(h.time)}</p>

                  {/* Vent */}
                  <div className="flex items-center gap-1" style={{ color: '#1A56DB' }}>
                    <WindArrow deg={h.windDir} size={14} />
                    <span className="text-xs font-extrabold">{Math.round(h.windKn)} kn</span>
                  </div>
                  <p className={`text-[9px] font-bold text-center leading-tight ${bf.color}`}>{bf.label}</p>

                  {/* Vagues */}
                  <div className="w-full h-px bg-gray-100" />
                  <p className="text-xs font-extrabold" style={{ color: seaC }}>
                    {h.waveH.toFixed(1)} m
                  </p>
                  <p className="text-[9px] text-gray-400 text-center">{degToCardinal(h.waveDir)}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MeteoPage() {
  const [data,    setData]    = useState<MeteoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/meteo')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Refresh toutes les 15 min
    const interval = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div
        className="px-4 pt-14 pb-5"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <div className="flex items-center gap-3 mb-1">
          <Link href="/"
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"
            aria-label="Accueil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Météo marine</h1>
            <p className="text-white/50 text-xs">Île du Levant · 43.02°N 6.47°E</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Chargement des données marines…</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div className="mx-4 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">🌊</p>
          <p className="text-red-700 font-semibold text-sm">Données indisponibles</p>
          <p className="text-red-400 text-xs mt-1">Vérifie ta connexion et réessaie.</p>
          <button onClick={load}
            className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">
            Réessayer
          </button>
        </div>
      )}

      {/* Contenu */}
      {data && !loading && (
        <>
          <CurrentConditions data={data} />
          <HourlyForecast data={data} />

          {/* Attribution */}
          <p className="text-center text-[10px] text-gray-300 mt-6 px-4">
            Données météo : DWD via{' '}
            <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer"
              className="underline">Open-Meteo</a>
            {' '}· Mise à jour toutes les 15 min
          </p>
        </>
      )}
    </div>
  )
}
