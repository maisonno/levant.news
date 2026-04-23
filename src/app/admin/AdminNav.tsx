'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDrawer } from '@/contexts/DrawerContext'

interface AccessFlags {
  isAdmin:     boolean
  isPro:       boolean
  isCompagnie: boolean
  isModerator: boolean
}

interface TabDef {
  href:  string
  label: string
  icon:  string
  show:  (a: AccessFlags) => boolean
}

const TABS: TabDef[] = [
  { href: '/admin/moderation',     label: 'Modération',     icon: '🛡️',
    show: a => a.isAdmin || a.isModerator },
  { href: '/admin/posts',          label: 'Événements',     icon: '📅',
    show: a => a.isAdmin || a.isPro },
  { href: '/admin/articles',       label: 'Articles',       icon: '📄',
    show: a => a.isAdmin },
  { href: '/admin/etablissements', label: 'Établissements', icon: '🏪',
    show: a => a.isAdmin || a.isPro },
  { href: '/admin/annonces',       label: 'Annonces',       icon: '🔍',
    show: a => a.isAdmin },
  { href: '/admin/bateau',         label: 'Bateaux',        icon: '⛵',
    show: a => a.isAdmin || a.isCompagnie },
  { href: '/admin/utilisateurs',   label: 'Utilisateurs',   icon: '👥',
    show: a => a.isAdmin },
  { href: '/admin/import',          label: 'Import CSV',      icon: '📥',
    show: a => a.isAdmin },
]

interface AdminNavProps {
  displayName: string
  isAdmin?:     boolean
  isPro?:       boolean
  isCompagnie?: boolean
  isModerator?: boolean
}

export default function AdminNav({
  displayName,
  isAdmin     = false,
  isPro       = false,
  isCompagnie = false,
  isModerator = false,
}: AdminNavProps) {
  const pathname = usePathname()
  const { toggle } = useDrawer()

  const flags: AccessFlags = { isAdmin, isPro, isCompagnie, isModerator }
  const tabs = TABS.filter(t => t.show(flags))

  const roleLabel = isAdmin     ? 'admin'
                  : isPro       ? 'pro'
                  : isCompagnie ? 'compagnie'
                  : isModerator ? 'modération'
                  : ''

  return (
    <>
      {/* Hero — grande image, titre dessus */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}>
        <img
          src="/images/header-admin.jpg"
          alt="" aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(4,12,42,0.35) 0%, rgba(10,31,78,0.75) 100%)' }}
        />

        {/* Barre titre compacte */}
        <div
          className="relative z-10 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <Link href="/" aria-label="Retour à l'accueil" className="w-10 h-10 flex items-center justify-center -ml-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          <div className="text-[13px] font-extrabold text-white tracking-tight">
            Levant<span className="opacity-40">.news</span>
          </div>

          <button onClick={toggle} aria-label="Menu" className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] -mr-2">
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>
        </div>

        {/* Corps du hero : titre + nom/rôle */}
        <div className="relative z-10 px-5 pt-8 pb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
            Espace admin
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-white leading-tight">
            {displayName}
          </h1>
          {roleLabel && (
            <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 text-white">
              {roleLabel}
            </span>
          )}
        </div>
      </div>

      {/* Onglets — sous le hero, sur fond blanc, sticky */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex overflow-x-auto px-2" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const active = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
