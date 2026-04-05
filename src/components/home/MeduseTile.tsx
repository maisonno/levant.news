'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MeduseTile() {
  const [hasWarning, setHasWarning] = useState(false)

  useEffect(() => {
    const supabase  = createClient()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    supabase
      .from('meduse_signalements')
      .select('presence', { count: 'exact', head: false })
      .gte('date_observation', yesterday.toISOString().split('T')[0])
      .neq('presence', 'aucune')
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setHasWarning(true)
      })
  }, [])

  return (
    <Link
      href="/meduse"
      className="bg-blue-700 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform"
    >
      <p className="text-sm font-bold leading-tight mb-1.5">Méduse Watch</p>
      {hasWarning
        ? <p className="text-amber-300 text-xs font-bold">⚠️ Présence</p>
        : <p className="text-white/50 text-xs">Signalements</p>
      }
    </Link>
  )
}
