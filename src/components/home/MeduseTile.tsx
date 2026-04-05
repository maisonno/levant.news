'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MeduseTile() {
  const [hasWarning, setHasWarning] = useState(false)
  const [latestLieu, setLatestLieu] = useState<string | null>(null)

  useEffect(() => {
    const supabase  = createClient()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    supabase
      .from('meduse_signalements')
      .select('presence, lieu, date_observation, heure_observation')
      .gte('date_observation', yesterday.toISOString().split('T')[0])
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
      className="col-span-3 bg-slate-800 rounded-2xl p-3 text-white flex items-center gap-3 active:scale-[0.97] transition-transform"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-tight">Méduse Watch</p>
        <p className="text-white/50 text-xs mt-0.5 truncate">
          {latestLieu ? `Signalé : ${latestLieu}` : 'Signaler ou consulter'}
        </p>
      </div>

      {hasWarning && (
        <div className="flex-shrink-0 bg-amber-400 text-amber-900 rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className="text-sm leading-none">⚠️</span>
          <span className="text-[10px] font-extrabold">Présence</span>
        </div>
      )}
    </Link>
  )
}
