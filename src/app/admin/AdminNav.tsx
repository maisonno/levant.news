'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/posts',          label: 'Posts',         icon: '📅' },
  { href: '/admin/articles',       label: 'Articles',      icon: '📄' },
  { href: '/admin/etablissements', label: 'Établissements',icon: '🏪' },
  { href: '/admin/annonces',       label: 'Annonces',      icon: '🔍' },
  { href: '/admin/bateau',         label: 'Bateaux',       icon: '⛵' },
]

export default function AdminNav({ displayName }: { displayName: string }) {
  const pathname = usePathname()

  return (
    <div
      className="sticky top-0 z-30"
      style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
    >
      {/* Barre titre */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <div className="text-[20px] font-extrabold text-white tracking-tight">
          Levant<span className="opacity-40">.news</span>
          <span className="ml-2 text-[11px] font-bold uppercase tracking-widest text-white/50 align-middle">admin</span>
        </div>
        <span className="text-white/50 text-xs">{displayName}</span>
      </div>

      {/* Onglets */}
      <div className="flex overflow-x-auto scrollbar-none px-2 pb-0" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-white text-white'
                  : 'border-transparent text-white/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
