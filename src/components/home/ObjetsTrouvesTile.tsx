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
    <Link
      href="/perdu"
      className="relative bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl p-3 text-white overflow-hidden"
    >
      <div className="text-2xl mb-1">📦</div>
      <p className="font-bold text-xs leading-tight">Objets trouvés</p>
      {count !== null && count > 0
        ? <p className="text-white font-extrabold text-xl mt-0.5 leading-none">{count}</p>
        : <p className="text-white/70 text-[10px] mt-0.5">Annonces</p>
      }
      <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(12px)' }} />
    </Link>
  )
}
