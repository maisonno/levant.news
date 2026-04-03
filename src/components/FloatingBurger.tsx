'use client'

import { useDrawer } from '@/contexts/DrawerContext'
import { usePathname } from 'next/navigation'

/**
 * Bouton burger flottant — UNIQUEMENT sur la page d'accueil,
 * après que le Hero a défilé hors de l'écran.
 * Positionné à DROITE pour correspondre au nouveau design.
 * Sur toutes les autres pages, PageHeader gère son propre burger sticky.
 */
export default function FloatingBurger() {
  const { toggle } = useDrawer()
  const pathname   = usePathname()

  if (pathname !== '/') return null

  return (
    <div className="sticky top-0 h-0 z-30 pointer-events-none">
      <button
        onClick={toggle}
        aria-label="Menu"
        className="pointer-events-auto absolute top-12 right-4 w-11 h-11 flex flex-col items-center justify-center gap-[5px] bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100"
      >
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
        <span className="w-5 h-0.5 bg-gray-700 rounded-full" />
      </button>
    </div>
  )
}
