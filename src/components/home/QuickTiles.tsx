import Link from 'next/link'
import MeteoTile from './MeteoTile'
import BateauTile from './BateauTile'
import ObjetsTrouvesTile from './ObjetsTrouvesTile'
import MeduseTile from './MeduseTile'

const STATIC_TILES = [
  { href: '/webcam',  label: 'Webcam',            sub: 'Live',            live: true  },
  { href: '/infos',   label: 'Infos pratiques',   sub: null,              live: false },
  { href: '/annuaire',label: 'Annuaire',           sub: 'Horaires',        live: false },
]

const BASE = 'bg-blue-700 rounded-2xl p-3 text-white active:scale-[0.97] transition-transform'

export default function QuickTiles() {
  return (
    <div className="mt-4 px-4">
      <div className="grid grid-cols-3 gap-2">

        <MeteoTile />
        <BateauTile />

        {STATIC_TILES.map(({ href, label, sub, live }) => (
          <Link key={href} href={href} className={BASE}>
            <p className="text-sm font-bold leading-tight mb-1">{label}</p>
            <div className="flex items-center gap-1.5">
              {live && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />}
              {sub && <p className="text-white/50 text-xs">{sub}</p>}
            </div>
          </Link>
        ))}

        <ObjetsTrouvesTile />
        <MeduseTile />

      </div>
    </div>
  )
}
