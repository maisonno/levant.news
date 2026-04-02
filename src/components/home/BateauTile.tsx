'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Horaire {
  heure: string
  port_depart: string
  port_arrivee: string
  statut: string
}

export default function BateauTile() {
  const [label, setLabel] = useState<string | null>(null)
  const [sub,   setSub]   = useState('Horaires')

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/bateau?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.horaires) return
        const now = new Date()
        const nowStr = now.toTimeString().slice(0, 5)

        // Prochain départ prévu aujourd'hui
        const next = (json.horaires as Horaire[]).find(
          h => h.statut === 'prevu' && h.heure.slice(0, 5) > nowStr
        )

        if (next) {
          setLabel(next.heure.slice(0, 5))
          setSub(`${next.port_depart} → ${next.port_arrivee}`)
        } else {
          // Chercher demain
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowIso = tomorrow.toISOString().split('T')[0]
          fetch(`/api/bateau?date=${tomorrowIso}`)
            .then(r => r.ok ? r.json() : null)
            .then(json2 => {
              const first = (json2?.horaires as Horaire[] | undefined)?.find(h => h.statut === 'prevu')
              if (first) {
                setLabel(`Dem. ${first.heure.slice(0, 5)}`)
                setSub(`${first.port_depart} → ${first.port_arrivee}`)
              }
            })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Link
      href="/bateau"
      className="relative bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-4 text-white overflow-hidden"
    >
      {/* Dot vert "actif" */}
      <div className="absolute top-3 right-3">
        <span className="w-2.5 h-2.5 bg-green-400 rounded-full block animate-pulse" />
      </div>

      <div className="text-3xl mb-1">⛵</div>
      <p className="font-bold text-base leading-tight">Bateau</p>
      {label !== null
        ? <>
            <p className="text-white font-extrabold text-lg mt-0.5">{label}</p>
            <p className="text-white/70 text-xs truncate">{sub}</p>
          </>
        : <p className="text-white/70 text-xs mt-0.5">{sub}</p>
      }

      {/* Glow décoratif */}
      <div
        className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(15px)' }}
      />
    </Link>
  )
}
