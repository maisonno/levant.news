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
  const [sub,   setSub]   = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/bateau?date=${today}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!json?.horaires) return
        const now    = new Date()
        const nowStr = now.toTimeString().slice(0, 5)
        const fromLevant = (json.horaires as Horaire[]).filter(
          h => h.statut === 'prevu' && h.port_depart.toLowerCase().includes('levant')
        )
        const next = fromLevant.find(h => h.heure.slice(0, 5) > nowStr)
        if (next) {
          setLabel(next.heure.slice(0, 5))
          setSub(`→ ${next.port_arrivee}`)
        } else {
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          fetch(`/api/bateau?date=${tomorrow.toISOString().split('T')[0]}`)
            .then(r => r.ok ? r.json() : null)
            .then(json2 => {
              const first = (json2?.horaires as Horaire[] | undefined)
                ?.filter(h => h.statut === 'prevu' && h.port_depart.toLowerCase().includes('levant'))?.[0]
              if (first) {
                setLabel(`Dem. ${first.heure.slice(0, 5)}`)
                setSub(`→ ${first.port_arrivee}`)
              }
            })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <Link href="/transport" className="bg-blue-700 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform">
      <p className="text-sm font-bold leading-tight mb-1.5">Bateau</p>
      {label !== null
        ? <>
            <p className="font-extrabold text-sm leading-tight">{label}</p>
            {sub && <p className="text-white/50 text-[10px] truncate mt-0.5">{sub}</p>}
          </>
        : <p className="text-white/50 text-xs">Horaires</p>
      }
    </Link>
  )
}
