'use client'

import { useState, useEffect } from 'react'
import { useDrawer } from '@/contexts/DrawerContext'
import { usePathname } from 'next/navigation'

// Hauteur du Hero (h-60 = 240px) — le burger n'apparaît qu'une fois le Hero défilé
const HERO_HEIGHT = 230

/**
 * Bouton burger flottant — UNIQUEMENT sur la page d'accueil,
 * ET seulement APRÈS que le Hero a défilé hors de l'écran.
 * Sur toutes les autres pages, PageHeader gère son propre burger sticky.
 */
export default function FloatingBurger() {
  const { toggle }       = useDrawer()
  const pathname         = usePathname()
  const [show, setShow]  = useState(false)

  useEffect(() => {
    if (pathname !== '/') return
    const onScroll = () => setShow(window.scrollY > HERO_HEIGHT)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  if (pathname !== '/') return null

  return (
    <div className="sticky top-0 h-0 z-30 pointer-events-none md:hidden">
      <button
        onClick={toggle}
        aria-label="Menu"
        className={`pointer-events-auto absolute right-4 w-11 h-11 flex flex-col items-center justify-center gap-[5px] bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100 transition-opacity duration-200 ${
          show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
      </button>
    </div>
  )
}
