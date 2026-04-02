'use client'

import Link from 'next/link'
import { useDrawer } from '@/contexts/DrawerContext'
import { useAuth } from '@/contexts/AuthContext'

// Pour utiliser une photo de fond : dépose le fichier dans /public/ sous le nom hero-bg.jpg
// (ou hero-bg.png / hero-bg.webp) et change la constante ci-dessous.
const HERO_BG = '/hero-bg.jpg'

export default function Hero() {
  const { toggle } = useDrawer()
  const { user, profile } = useAuth()

  const accountHref    = user ? '/compte/profil' : '/compte/connexion'
  const accountInitial = profile?.prenom?.charAt(0).toUpperCase()
                      ?? user?.email?.charAt(0).toUpperCase()
                      ?? null

  return (
    <div
      className="relative h-60 overflow-hidden flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg,#87BFDB 0%,#2E8B9A 60%,#083540 100%)',
      }}
    >
      {/* Photo de fond (si elle existe) */}
      <img
        src={HERO_BG}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />

      {/* Dégradé sombre en haut pour lisibilité des boutons */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)' }}
      />

      {/* Barre de navigation */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12 z-10">
        {/* Burger */}
        <button
          onClick={toggle}
          className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl"
          aria-label="Menu"
        >
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
          <span className="w-5 h-0.5 bg-white rounded-full" />
        </button>

        {/* Compte */}
        <Link
          href={accountHref}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          aria-label="Mon compte"
        >
          {accountInitial ? (
            <span className="text-white font-extrabold text-base">{accountInitial}</span>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </Link>
      </div>

      {/* Logo centré */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}>
          <div className="text-white font-black text-3xl tracking-tight drop-shadow-lg">
            Levant<span className="opacity-60">.news</span>
          </div>
          <div className="text-white/80 text-[11px] font-semibold tracking-[0.12em] mt-1 italic">
            l'actu toute nue
          </div>
        </div>
      </div>
    </div>
  )
}
