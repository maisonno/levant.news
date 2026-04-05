'use client'

import { useDrawer } from '@/contexts/DrawerContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const MODULES = [
  { href: '/',          icon: '🏠', label: 'Accueil' },
  { href: '/agenda',    icon: '📅', label: 'Agenda' },
  { href: '/annuaire',  icon: '🗂️', label: 'Annuaire' },
  { href: '/perdu',     icon: '🔍', label: 'Perdu / Trouvé' },
  { href: '/infos',     icon: 'ℹ️', label: 'Infos pratiques' },
  { href: '/webcam',    icon: '📷', label: 'Webcam' },
  { href: '/meteo',     icon: '☀️', label: 'Météo' },
  { href: '/transport', icon: '⛵', label: 'Transport' },
]

export default function DrawerMenu() {
  const { isOpen, close } = useDrawer()
  const { user, profile } = useAuth()
  const pathname = usePathname()

  return (
    <>
      {/* Overlay — mobile uniquement */}
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-250 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Drawer (mobile) / Sidebar (desktop) */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-72 z-50 flex flex-col bg-white rounded-r-3xl shadow-2xl
          transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:sticky md:top-0 md:h-screen md:w-64 md:translate-x-0
          md:rounded-none md:shadow-none md:border-r md:border-gray-100 md:transition-none
        `}
      >
        {/* Header — fond blanc, titre en bleu */}
        <div className="px-5 pb-4 pt-14 bg-white border-b border-gray-100">
          <Link href="/" onClick={close} className="block text-[22px] font-extrabold tracking-tight mb-1">
            <span className="text-blue-700">Levant</span><span className="text-blue-400">.news</span>
          </Link>
          <div className="text-[11px] font-semibold text-gray-400 tracking-widest italic">
            l'actu toute nue
          </div>
        </div>

        {/* Liens de navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-5 pt-3 pb-1">
            Navigation
          </p>
          {MODULES.map(({ href, icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                    active ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
                >
                  {icon}
                </span>
                <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Mon Compte — tout en bas */}
        <div className="border-t border-gray-100 px-4 py-4">
          {user ? (
            <Link href="/compte/profil" onClick={close}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-base font-extrabold text-blue-700 flex-shrink-0">
                {(profile?.prenom ?? user.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-gray-900 font-bold text-sm leading-snug truncate">
                  {profile ? `${profile.prenom} ${profile.nom}` : user.email}
                </p>
                <p className="text-gray-400 text-[10px] uppercase tracking-wide">Mon compte</p>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-gray-300 flex-shrink-0 ml-auto">
                <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : (
            <Link href="/compte/connexion" onClick={close}
              className="flex items-center justify-center gap-2 bg-blue-600 rounded-2xl px-4 py-3 text-sm font-bold text-white">
              <span>👤</span>
              <span>Se connecter</span>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
