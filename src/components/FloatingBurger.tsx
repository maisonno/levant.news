'use client'

import { useDrawer } from '@/contexts/DrawerContext'
import { usePathname } from 'next/navigation'

/**
 * Bouton burger flottant — visible sur toutes les pages
 * sauf la page d'accueil (qui a son burger dans le Hero)
 * et la page Agenda (qui a son burger dans son propre header).
 */
export default function FloatingBurger() {
  const { toggle } = useDrawer()
  const pathname   = usePathname()

  if (pathname === '/' || pathname.startsWith('/agenda')) return null

  return (
    <button
      onClick={toggle}
      aria-label="Menu"
      className="fixed top-12 left-4 z-30 w-11 h-11 flex flex-col items-center justify-center gap-[5px] bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100"
    >
      <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
      <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
      <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
    </button>
  )
}
