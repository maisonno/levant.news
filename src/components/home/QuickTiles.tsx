import Link from 'next/link'
import MeteoTile from './MeteoTile'
import BateauTile from './BateauTile'
import ObjetsTrouvesTile from './ObjetsTrouvesTile'
import MeduseTile from './MeduseTile'

const TILES = [
  {
    href: '/webcam',
    icon: '📷',
    label: 'Webcam',
    sub: 'Live',
    color: 'from-emerald-500 to-teal-500',
    live: true,
  },
  {
    href: '/infos',
    icon: 'ℹ️',
    label: 'Infos pratiques',
    sub: null,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    href: '/annuaire',
    icon: '🗂️',
    label: 'Annuaire & horaires',
    sub: null,
    color: 'from-violet-500 to-purple-600',
  },
]

export default function QuickTiles() {
  return (
    <div className="mt-6 px-4">
      <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-3">Accès rapide</h2>
      <div className="grid grid-cols-3 gap-2">

        {/* Tuiles dynamiques */}
        <MeteoTile />
        <BateauTile />

        {TILES.map(({ href, icon, label, sub, color, live }) => (
          <Link
            key={href}
            href={href}
            className={`relative bg-gradient-to-br ${color} rounded-2xl p-3 text-white overflow-hidden`}
          >
            {live && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/20 rounded-full px-1.5 py-0.5">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-[9px] font-bold">LIVE</span>
              </div>
            )}
            <div className="text-2xl mb-1">{icon}</div>
            <p className="font-bold text-xs leading-tight">{label}</p>
            {sub && <p className="text-white/70 text-[10px] mt-0.5">{sub}</p>}
            <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20"
              style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(12px)' }} />
          </Link>
        ))}

        {/* Tuile dynamique objets trouvés */}
        <ObjetsTrouvesTile />

        {/* Tuile Méduse Watch — pleine largeur */}
        <MeduseTile />
      </div>
    </div>
  )
}
