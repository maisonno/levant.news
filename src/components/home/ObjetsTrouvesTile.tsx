'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ObjetsTrouvesTile() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Annonce active = non retrouvée ET créée il y a moins de 10 jours (expiration /perdu)
    const cutoff = new Date(Date.now() - 10 * 86400000).toISOString()
    supabase
      .from('objets_perdus')
      .select('*', { count: 'exact', head: true })
      .eq('retrouve', false)
      .gte('created_at', cutoff)
      .then(({ count: c }) => { if (c !== null) setCount(c) })
  }, [])

  return (
    <Link href="/perdu" className="bg-blue-700 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform">
      <p className="text-sm font-bold leading-tight mb-1.5">Objets trouvés</p>
      {count !== null && count > 0
        ? <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg leading-none">{count}</span>
            <span className="text-xl leading-none">🕶️</span>
          </div>
        : <p className="text-white/50 text-xs">Annonces</p>
      }
    </Link>
  )
}
