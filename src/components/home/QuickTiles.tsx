import Link from 'next/link'
import BateauTile from './BateauTile'
import ObjetsTrouvesTile from './ObjetsTrouvesTile'
import MeduseTile from './MeduseTile'

const GRAY_TILES = [
  { href: '/annuaire', label: 'Commerçants' },
  { href: '/infos',    label: 'Infos'    },
  { href: '/webcam',   label: 'Webcam'   },
]

export default function QuickTiles() {
  return (
    <div className="mt-3 px-4 flex flex-col gap-2">

      {/* Ligne 1 : Bateaux, Méduse Watch, Objets trouvés */}
      <div className="grid grid-cols-3 gap-2">
        <BateauTile />
        <MeduseTile />
        <ObjetsTrouvesTile />
      </div>

      {/* Ligne 2 : boutons gris — Annuaire, Infos, Webcam */}
      <div className="grid grid-cols-3 gap-2">
        {GRAY_TILES.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="bg-gray-200 rounded-2xl py-3 text-center text-sm font-semibold text-gray-700 active:scale-[0.97] transition-transform"
          >
            {label}
          </Link>
        ))}
      </div>

    </div>
  )
}
