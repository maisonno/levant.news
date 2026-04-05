'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MeduseTile() {
  const [hasWarning,  setHasWarning]  = useState(false)
  const [latestLieu,  setLatestLieu]  = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Recherche dans les signalements d'aujourd'hui et hier avec présence ≠ 'aucune'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const ysDate = yesterday.toISOString().split('T')[0]

    supabase
      .from('meduse_signalements')
      .select('presence, lieu, date_observation, heure_observation')
      .gte('date_observation', ysDate)
      .neq('presence', 'aucune')
      .order('date_observation', { ascending: false })
      .order('heure_observation', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasWarning(true)
          setLatestLieu(data[0].lieu)
        }
      })
  }, [])

  return (
    <Link
      href="/meduse"
      className="col-span-3 relative bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-3 text-white overflow-hidden flex items-center gap-3 active:scale-[0.98] transition-transform"
    >
      {/* Icône */}
      <div className="text-3xl flex-shrink-0">🪼</div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-sm leading-tight">Méduse Watch</p>
        <p className="text-white/70 text-[10px] mt-0.5">
          {latestLieu ? `Signalé : ${latestLieu}` : 'Signaler ou consulter'}
        </p>
      </div>

      {/* Badge alerte */}
      {hasWarning && (
        <div className="flex-shrink-0 bg-amber-400 text-amber-900 rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="text-sm leading-none">⚠️</span>
          <span className="text-[10px] font-extrabold">Présence</span>
        </div>
      )}

      {/* Décor */}
      <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(12px)' }} />
    </Link>
  )
}
