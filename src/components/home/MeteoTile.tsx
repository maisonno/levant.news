'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

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

export default function MeteoTile() {
  const [emoji, setEmoji] = useState<string | null>(null)
  const [temp,  setTemp]  = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/meteo')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json) return
        const times = json.wind?.hourly?.time as string[]
        const codes = json.wind?.hourly?.weather_code as number[]
        const temps = json.wind?.hourly?.temperature_2m as number[]
        if (!times || !codes || !temps) return
        const now = new Date()
        const idx = times.findIndex((t: string) => new Date(t) >= now)
        const i   = idx >= 0 ? idx : 0
        setEmoji(WMO_EMOJI[codes[i]] ?? '🌡️')
        setTemp(Math.round(temps[i]))
      })
      .catch(() => {})
  }, [])

  return (
    <Link href="/meteo" className="bg-slate-800 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform">
      <p className="text-sm font-bold leading-tight mb-1.5">Météo</p>
      <div className="flex items-center gap-1.5">
        {emoji && <span className="text-lg leading-none">{emoji}</span>}
        {temp !== null
          ? <span className="font-extrabold text-lg leading-none">{temp}°</span>
          : <span className="text-white/50 text-xs">Levant</span>
        }
      </div>
    </Link>
  )
}
