import Link from 'next/link'
import MeteoTile from './MeteoTile'
import BateauTile from './BateauTile'

const TILES = [
  {
    href: '/perdu',
    icon: '🔍',
    label: 'Perdu / Trouvé',
    sub: 'Annonces',
    color: 'from-purple-500 to-violet-600',
  },
  {
    href: '/webcam',
    icon: '📷',
    label: 'Webcam',
    sub: 'Live',
    color: 'from-emerald-500 to-teal-500',
    live: true,
  },
]

export default function QuickTiles() {
  return (
    <div className="mt-6 px-4">
      <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-3">Accès rapide</h2>
      <div className="grid grid-cols-2 gap-3">

        {/* Tuiles dynamiques */}
        <MeteoTile />
        <BateauTile />

        {TILES.map(({ href, icon, label, sub, color, live }) => (
          <Link
            key={href}
            href={href}
            className={`relative bg-gradient-to-br ${color} rounded-2xl p-4 text-white overflow-hidden`}
          >
            {/* Badge LIVE */}
            {live && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold">LIVE</span>
              </div>
            )}

            <div className="text-3xl mb-2">{icon}</div>
            <p className="font-bold text-base leading-tight">{label}</p>
            <p className="text-white/70 text-xs mt-0.5">{sub}</p>

            {/* Glow décoratif */}
            <div
              className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-20"
              style={{ background: 'rgba(255,255,255,0.5)', filter: 'blur(15px)' }}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
