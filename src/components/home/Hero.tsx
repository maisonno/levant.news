'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useDrawer } from '@/contexts/DrawerContext'
import { useAuth } from '@/contexts/AuthContext'

// Pour utiliser une photo de fond : dépose le fichier dans /public/ sous le nom hero-bg.jpg
// (ou hero-bg.png / hero-bg.webp) et change la constante ci-dessous.
const HERO_BG = '/hero-bg.jpg'

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

export default function Hero() {
  const { toggle } = useDrawer()
  const { user, profile } = useAuth()
  const [emoji, setEmoji] = useState<string | null>(null)
  const [temp,  setTemp]  = useState<number | null>(null)

  const accountHref    = user ? '/compte/profil' : '/compte/connexion'
  const accountInitial = profile?.prenom?.charAt(0).toUpperCase()
                      ?? user?.email?.charAt(0).toUpperCase()
                      ?? null

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
    <div
      className="relative h-60 overflow-hidden flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg,#87BFDB 0%,#2E8B9A 60%,#083540 100%)',
      }}
    >
      {/* Photo de fond (si elle existe) */}
      <img
        src={HERO_BG}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />

      {/* Dégradé sombre en haut pour lisibilité des boutons */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)' }}
      />

      {/* Barre de navigation */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 6px)' }}
      >
        {/* Compte — à gauche */}
        <Link
          href={accountHref}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          aria-label="Mon compte"
        >
          {accountInitial ? (
            <span className="text-white font-extrabold text-base">{accountInitial}</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </Link>

        {/* Burger — à droite (caché sur desktop, sidebar permanente) */}
        <button
          onClick={toggle}
          className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] md:hidden"
          aria-label="Menu"
        >
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
        </button>
      </div>

      {/* Logo centré */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
          <div className="text-white font-black text-3xl tracking-tight drop-shadow-lg">
            Levant<span className="opacity-60">.news</span>
          </div>
          <div className="text-white/80 text-[11px] font-semibold tracking-[0.12em] mt-1 italic">
            l'actu toute nue
          </div>
        </div>
      </div>

      {/* Pastille météo — bas gauche */}
      {(emoji || temp !== null) && (
        <Link
          href="/meteo"
          className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-white/25 backdrop-blur-sm rounded-full px-4 py-2 active:scale-[0.96] transition-transform"
        >
          {emoji && <span className="text-2xl leading-none">{emoji}</span>}
          {temp !== null && <span className="text-white font-extrabold text-lg leading-none">{temp}°</span>}
        </Link>
      )}
    </div>
  )
}

