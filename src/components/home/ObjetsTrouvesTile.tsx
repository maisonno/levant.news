'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ObjetsTrouvesTile() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('objets_perdus')
      .select('*', { count: 'exact', head: true })
      .eq('retrouve', false)
      .then(({ count: c }) => { if (c !== null) setCount(c) })
  }, [])

  return (
    <Link href="/perdu" className="bg-slate-800 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform">
      <p className="text-sm font-bold leading-tight mb-1.5">Objets trouvés</p>
      {count !== null && count > 0
        ? <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg leading-none">{count}</span>
            <span className="text-base leading-none">🕶️</span>
          </div>
        : <p className="text-white/50 text-xs">Annonces</p>
      }
    </Link>
  )
}
