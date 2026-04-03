'use client'

/**
 * PageHeader — en-tête uniforme pour toutes les pages (sauf accueil)
 *
 * Comportement :
 *  - La nav [‹ | Levant.news | ☰] est STICKY, toujours visible
 *  - Au chargement de la page : fond TRANSPARENT → la photo passe DERRIÈRE la nav
 *  - Au scroll : le fond de la nav devient progressivement bleu marine (0 → 100%)
 *  - La photo + le titre défilent et disparaissent au scroll
 *
 * Astuce du margin négatif :
 *  Le bloc photo a un marginTop = -(hauteur nav) pour qu'il parte
 *  du sommet de l'écran et passe physiquement SOUS la barre sticky.
 *
 * Photos : déposer dans /public/images/ :
 *  header-bateau.jpg | header-meteo.jpg | header-agenda.jpg
 *  header-annuaire.jpg | header-infos.jpg | header-perdu.jpg | header-admin.jpg
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useDrawer } from '@/contexts/DrawerContext'

interface Props {
  photo?:    string
  pb?:       string
  children?: React.ReactNode
}

// Hauteur de la barre nav = safe-area-inset-top + 6px (pt) + 40px (boutons) + 6px (pb) = +52px
const NAV_H = 'calc(env(safe-area-inset-top) + 52px)'

export default function PageHeader({ photo, pb = 'pb-6', children }: Props) {
  const { toggle } = useDrawer()
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      // Fondu sur les 80 premiers px de scroll
      setOpacity(Math.min(window.scrollY / 80, 1))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // état initial (si page chargée mid-scroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ══ 1. BARRE NAV — sticky, fond transparent→opaque au scroll ══ */}
      <div
        className="sticky top-0 z-30 px-3"
        style={{
          background: `rgba(11, 30, 74, ${opacity})`,
          // Léger backdrop-blur quand la barre commence à devenir opaque
          backdropFilter: opacity > 0.05 ? `blur(${Math.min(opacity * 10, 10)}px)` : 'none',
          WebkitBackdropFilter: opacity > 0.05 ? `blur(${Math.min(opacity * 10, 10)}px)` : 'none',
          paddingTop:    'calc(env(safe-area-inset-top) + 6px)',
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
            style={{ color: 'rgba(255,255,255,0.50)' }}
          >
            Levant<span style={{ opacity: 0.6 }}>.news</span>
          </span>

          {/* ☰ Burger — caché sur desktop (sidebar permanente) */}
          <button
            onClick={toggle}
            aria-label="Menu"
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] md:hidden"
          >
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>
          {/* Espaceur sur desktop pour garder "Levant.news" centré */}
          <div className="w-10 hidden md:block" />

        </div>
      </div>

      {/* ══ 2. BLOC PHOTO + TITRE — défile avec la page, part de DERRIÈRE la nav ══ */}
      {children && (
        <div
          className={`relative overflow-hidden px-4 ${pb}`}
          style={{
            background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)',
            // Remonte de la hauteur de la nav → passe physiquement sous la barre sticky
            marginTop:   `calc(-1 * ${NAV_H})`,
            paddingTop:  NAV_H,             // le contenu (titre) reste visible sous la nav
          }}
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

          {/* Overlay sombre pour lisibilité */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(10,31,78,0.80) 100%)' }}
          />

          {/* Titre / sous-titre */}
          <div className="relative z-10 pt-2">
            {children}
          </div>
        </div>
      )}
    </>
  )
}
