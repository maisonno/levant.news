'use client'

import { useState, useEffect } from 'react'

interface InfoBateau {
  id: string
  date_fin: string
  compagnie: string | null
  message: string
  type: 'avertissement' | 'changement' | 'annulation'
}

const CONFIG = {
  avertissement: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '⚠️' },
  changement:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: '🔄' },
  annulation:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: '🚫' },
}

export default function InfoBateauBanner() {
  const [infos, setInfos] = useState<InfoBateau[]>([])

  useEffect(() => {
    fetch('/api/bateau')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.infos) setInfos(json.infos) })
      .catch(() => {})
  }, [])

  if (infos.length === 0) return null

  return (
    <div className="mx-4 mt-4 space-y-2">
      {infos.map(info => {
        const cfg = CONFIG[info.type]
        return (
          <a key={info.id} href="/bateau"
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
            <span className="text-lg flex-shrink-0">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              {info.compagnie && (
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${cfg.text} opacity-70`}>
                  {info.compagnie}
                </p>
              )}
              <p className={`text-sm font-medium ${cfg.text} line-clamp-2`}>{info.message}</p>
            </div>
            <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.text} opacity-50`} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </a>
        )
      })}
    </div>
  )
}
