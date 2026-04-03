'use client'

import { useState, useEffect } from 'react'

interface InfoBateau {
  id: string
  date_debut: string
  date_fin: string
  compagnie: string | null
  message: string
  type: 'avertissement' | 'changement' | 'annulation'
}

const CONFIG = {
  avertissement: { accent: 'border-orange-400', iconBg: 'bg-orange-100', titleColor: 'text-orange-600', icon: '⚠️', label: 'Avertissement' },
  changement:    { accent: 'border-blue-400',   iconBg: 'bg-blue-100',   titleColor: 'text-blue-600',   icon: '🔄', label: 'Changement'    },
  annulation:    { accent: 'border-red-400',    iconBg: 'bg-red-100',    titleColor: 'text-red-600',    icon: '🚫', label: 'Annulation'    },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
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
        const isSameDay = info.date_debut === info.date_fin
        const dateLabel = isSameDay ? fmtDate(info.date_fin) : `${fmtDate(info.date_debut)} → ${fmtDate(info.date_fin)}`
        return (
          <a key={info.id} href="/bateau"
            className={`flex gap-3 bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${cfg.accent} active:opacity-80 transition-opacity`}
          >
            <div className="pl-4 py-3 flex gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${cfg.iconBg}`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-bold ${cfg.titleColor}`}>{cfg.label}</p>
                  {info.compagnie && (
                    <p className="text-xs text-gray-400 font-medium">{info.compagnie}</p>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-snug line-clamp-2">{info.message}</p>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <span>📅</span>
                  <span>{dateLabel}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center pr-4 text-gray-300 flex-shrink-0">
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </a>
        )
      })}
    </div>
  )
}
