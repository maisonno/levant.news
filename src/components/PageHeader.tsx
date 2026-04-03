'use client'

/**
 * PageHeader — en-tête uniforme pour toutes les pages (sauf accueil)
 *
 * Architecture en 2 parties :
 *   1. Barre de nav STICKY — toujours visible au scroll, fond bleu marine plein
 *      Utilise env(safe-area-inset-top) pour gérer l'encoche iOS correctement.
 *   2. Contenu de l'en-tête SCROLLABLE — photo + titre + sous-titre
 *
 * Props :
 *   photo          — chemin vers la photo (/images/header-xxx.jpg)
 *   pb             — padding-bottom Tailwind du bloc photo (défaut 'pb-5')
 *   stickyContent  — contenu supplémentaire dans la zone sticky (barre de recherche, etc.)
 *   children       — contenu du bloc photo (titre, sous-titre…)
 *
 * Photos : déposer dans /public/images/ :
 *   header-bateau.jpg | header-meteo.jpg | header-agenda.jpg
 *   header-annuaire.jpg | header-infos.jpg | header-perdu.jpg | header-admin.jpg
 */

import Link from 'next/link'
import { useDrawer } from '@/contexts/DrawerContext'

interface Props {
  photo?:         string
  pb?:            string
  stickyContent?: React.ReactNode
  children?:      React.ReactNode
}

// Fond bleu marine opaque pour la barre sticky
const NAV_BG = '#0b1e4a'

export default function PageHeader({ photo, pb = 'pb-5', stickyContent, children }: Props) {
  const { toggle } = useDrawer()

  return (
    <>
      {/* ══════════════════════════════════════════════════
          1. BARRE DE NAV — toujours sticky, fond opaque
          Padding-top = zone status bar iOS + petite marge
          env(safe-area-inset-top) = 0 sur desktop,
          44–59 px sur iPhone (notch/Dynamic Island)
         ══════════════════════════════════════════════════ */}
      <div
        className="sticky top-0 z-30 px-3"
        style={{
          background: NAV_BG,
          paddingTop: 'calc(env(safe-area-inset-top) + 6px)',
          paddingBottom: '6px',
        }}
      >
        <div className="flex items-center justify-between">

          {/* ← Chevron retour accueil */}
          <Link
            href="/"
            aria-label="Retour à l'accueil"
            className="w-10 h-10 flex items-center justify-center"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          {/* Levant.news */}
          <span
            className="text-[11px] font-semibold tracking-[0.12em] select-none"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            Levant<span style={{ opacity: 0.55 }}>.news</span>
          </span>

          {/* ☰ Burger — 3 lignes sans contour */}
          <button
            onClick={toggle}
            aria-label="Menu"
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px]"
          >
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>

        </div>

        {/* Contenu sticky supplémentaire (barre de recherche pour Agenda/Annuaire) */}
        {stickyContent && (
          <div className="mt-2 pb-1">{stickyContent}</div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          2. BLOC PHOTO + TITRE — défile avec la page
         ══════════════════════════════════════════════════ */}
      {children && (
        <div
          className={`relative px-4 pt-4 ${pb} overflow-hidden`}
          style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
        >
          {/* Photo de fond */}
          {photo && (
            <img
              src={photo}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover object-center"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}

          {/* Overlay sombre */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(4,12,42,0.65) 0%, rgba(10,31,78,0.85) 100%)' }}
          />

          {/* Titre / sous-titre */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
      )}
    </>
  )
}
