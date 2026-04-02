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
  const [emoji, setEmoji] = useState('☀️')
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
      .catch(() => {/* silent fail, garde les valeurs par défaut */})
  }, [])

  return (
    <Link
      href="/meteo"
      className="relative bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl p-4 text-white overflow-hidden"
    >
      <div className="text-3xl mb-1">{emoji}</div>
      <p className="font-bold text-base leading-tight">Météo</p>
      {temp !== null
        ? <p className="text-white font-extrabold text-lg mt-0.5">{temp}°C</p>
        : <p className="text-white/70 text-xs mt-0.5">Levant</p>
      }

      {/* Glow décoratif */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(15px)' }}
      />
    </Link>
  )
}
