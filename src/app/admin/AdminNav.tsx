'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDrawer } from '@/contexts/DrawerContext'

const TABS = [
  { href: '/admin/posts',          label: 'Posts',         icon: '📅' },
  { href: '/admin/articles',       label: 'Articles',      icon: '📄' },
  { href: '/admin/etablissements', label: 'Établissements',icon: '🏪' },
  { href: '/admin/annonces',       label: 'Annonces',      icon: '🔍' },
  { href: '/admin/bateau',         label: 'Bateaux',       icon: '⛵' },
]

export default function AdminNav({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const { toggle } = useDrawer()

  return (
    <div
      className="sticky top-0 z-30 overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
    >
      {/* Photo de fond */}
      <img
        src="/images/header-admin.jpg"
        alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(4,12,42,0.70) 0%, rgba(10,31,78,0.90) 100%)' }}
      />

      {/* Barre titre */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-1">

        {/* ← Retour accueil */}
        <Link href="/" aria-label="Retour à l'accueil" className="w-10 h-10 flex items-center justify-center -ml-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>

        {/* Levant.news admin */}
        <div className="text-center">
          <div className="text-[13px] font-extrabold text-white tracking-tight leading-tight">
            Levant<span className="opacity-40">.news</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">admin · {displayName}</div>
        </div>

        {/* ☰ Burger */}
        <button onClick={toggle} aria-label="Menu" className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] -mr-2">
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
        </button>

      </div>

      {/* Onglets */}
      <div className="relative z-10 flex overflow-x-auto px-2 pb-0" style={{ scrollbarWidth: 'none' }}>
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
