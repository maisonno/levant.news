'use client'

/**
 * PageHeader — en-tête uniforme pour toutes les pages (sauf accueil)
 *
 * Photo de fond : dépose les fichiers dans /public/images/ avec les noms :
 *   header-bateau.jpg | header-meteo.jpg | header-agenda.jpg
 *   header-annuaire.jpg | header-infos.jpg | header-perdu.jpg
 *   header-admin.jpg | header-compte.jpg
 *
 * Props :
 *   photo     — chemin vers la photo (/images/header-xxx.jpg)
 *   sticky    — header sticky (true pour Agenda, Annuaire, Infos)
 *   pb        — padding-bottom Tailwind class (défaut 'pb-5')
 *   children  — contenu sous la barre de nav (titre, sous-titre, filtres…)
 */

import Link from 'next/link'
import { useDrawer } from '@/contexts/DrawerContext'

interface Props {
  photo?:    string
  sticky?:   boolean
  pb?:       string
  children?: React.ReactNode
}

export default function PageHeader({ photo, sticky = false, pb = 'pb-5', children }: Props) {
  const { toggle } = useDrawer()

  return (
    <div
      className={`relative ${sticky ? 'sticky top-0 z-30' : ''} px-4 pt-14 ${pb} overflow-hidden`}
      style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
    >
      {/* ── Photo de fond ── */}
      {photo && (
        <img
          src={photo}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}

      {/* ── Overlay sombre pour lisibilité ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(4,12,42,0.70) 0%, rgba(10,31,78,0.88) 100%)' }}
      />

      {/* ── Contenu au-dessus de l'overlay ── */}
      <div className="relative z-10">

        {/* Barre de navigation */}
        <div className="flex items-center justify-between mb-3">

          {/* ← Chevron retour accueil */}
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          {/* Levant.news — centré entre les boutons */}
          <span className="text-[11px] font-semibold tracking-[0.12em] select-none" style={{ color: 'rgba(255,255,255,0.50)' }}>
            Levant<span style={{ opacity: 0.6 }}>.news</span>
          </span>

          {/* ☰ Burger — sans contour, style page d'accueil */}
          <button
            onClick={toggle}
            aria-label="Menu"
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] -mr-2"
          >
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>

        </div>

        {/* Contenu spécifique à la page */}
        {children}

      </div>
    </div>
  )
}
