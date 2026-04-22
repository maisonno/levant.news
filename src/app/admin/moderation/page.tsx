'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import PostsAdmin from '@/app/admin/posts/PostsAdmin'
import AnnoncesAdmin from '@/app/admin/annonces/AnnoncesAdmin'
import BateauAdmin from '@/app/admin/bateau/BateauAdmin'

type Tab = 'posts' | 'annonces' | 'bateaux'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'posts',    label: 'Événements',  icon: '📅' },
  { id: 'annonces', label: 'Annonces',    icon: '🔍' },
  { id: 'bateaux',  label: 'Bateaux',     icon: '⛵' },
]

function ModerationContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'posts'
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div>
      {/* Sous-onglets */}
      <div className="sticky top-[104px] z-20 bg-white border-b border-gray-100 px-4 flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <PostsAdmin isAdmin topOffset="top-[148px]" />
      )}
      {tab === 'annonces' && (
        <AnnoncesAdmin topOffset="top-[148px]" />
      )}
      {tab === 'bateaux' && (
        <BateauAdmin />
      )}
    </div>
  )
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>}>
      <ModerationContent />
    </Suspense>
  )
}
