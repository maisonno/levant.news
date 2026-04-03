'use client'

import { useDrawer } from '@/contexts/DrawerContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const MODULES = [
  { href: '/',          icon: '🏠', label: 'Accueil' },
  { href: '/agenda',    icon: '📅', label: 'Agenda' },
  { href: '/annuaire',  icon: '🗂️', label: 'Annuaire' },
  { href: '/mag',       icon: '📖', label: 'Levant Mag' },
  { href: '/perdu',     icon: '🔍', label: 'Perdu / Trouvé' },
  { href: '/infos',     icon: 'ℹ️', label: 'Infos pratiques' },
  { href: '/webcam',    icon: '📷', label: 'Webcam' },
  { href: '/meteo',     icon: '☀️', label: 'Météo' },
  { href: '/bateau',    icon: '⛵', label: 'Bateau' },
]

const PRO_MODULES = [
  { href: '/pro/evenements', icon: '✏️', label: 'Mes événements' },
  { href: '/pro/fiche',      icon: '🏪', label: 'Ma fiche' },
]

export default function DrawerMenu() {
  const { isOpen, close } = useDrawer()
  const { user, profile } = useAuth()
  const pathname = usePathname()

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-250 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 z-50 flex flex-col bg-white rounded-r-3xl shadow-2xl transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header drawer */}
        <div style={{ background: 'linear-gradient(160deg,#0a1f4e,#1A56DB)' }} className="px-5 pb-5 pt-14">
          <Link href="/" onClick={close} className="block text-[22px] font-extrabold text-white tracking-tight mb-1">
            Levant<span className="opacity-50">.news</span>
          </Link>
          <div className="text-[11px] font-semibold text-white/55 tracking-widest mb-4 italic">
            l'actu toute nue
          </div>

          {/* Auth block */}
          {user ? (
            <Link href="/compte/profil" onClick={close}
              className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-base font-extrabold text-white flex-shrink-0">
                {(profile?.prenom ?? user.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-snug truncate">
                  {profile ? `${profile.prenom} ${profile.nom}` : user.email}
                </p>
                <p className="text-white/50 text-[10px] uppercase tracking-wide">
                  {profile?.role === 'pro' ? 'Compte Pro' : 'Mon compte'}
                </p>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-white/40 flex-shrink-0">
                <path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ) : (
            <Link href="/compte/connexion" onClick={close}
              className="flex items-center justify-center gap-2 bg-white rounded-2xl px-4 py-3 text-sm font-bold text-blue-700">
              <span>👤</span>
              <span>Se connecter / Créer un compte</span>
            </Link>
          )}
        </div>

        {/* Liens */}
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

          <div className="h-px bg-gray-200 mx-5 my-2" />

          {/* Section Pro */}
          <div style={{ background: 'linear-gradient(120deg,#1e3a8a,#3730a3)' }} className="mx-3 rounded-xl px-4 py-3 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Espace Pro</p>
            {PRO_MODULES.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="flex items-center gap-3 py-2 text-white"
              >
                <span className="text-sm">{icon}</span>
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
