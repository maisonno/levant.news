'use client'

import { useDrawer } from '@/contexts/DrawerContext'

export default function Hero() {
  const { toggle } = useDrawer()

  return (
    <>
      <style>{`
        .hero-landscape {
          position: relative;
          height: 240px;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(
            180deg,
            #87BFDB 0%,
            #A8D4E6 28%,
            #C4E4EE 40%,
            #8CC5C8 50%,
            #5EADB5 58%,
            #2E8B9A 68%,
            #1B6E7A 78%,
            #0F4F5A 88%,
            #083540 100%
          );
        }
        /* Pins maritimes — gauche */
        .hero-landscape::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: -10px;
          width: 120px;
          height: 160px;
          background: #0a2a1a;
          opacity: 0.85;
          clip-path: polygon(
            50% 0%, 30% 30%, 40% 30%, 20% 55%, 32% 55%,
            10% 80%, 25% 80%, 18% 100%, 82% 100%, 75% 80%,
            90% 80%, 68% 55%, 80% 55%, 60% 30%, 70% 30%
          );
        }
        /* Falaises — droite */
        .hero-landscape::after {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          width: 180px;
          height: 120px;
          background: #1a3020;
          opacity: 0.75;
          clip-path: polygon(
            100% 100%, 0% 100%, 0% 70%, 15% 50%, 35% 40%,
            50% 55%, 65% 35%, 80% 45%, 90% 30%, 100% 40%
          );
        }
        .hero-shimmer {
          position: absolute;
          bottom: 55px;
          left: 80px;
          width: 160px;
          height: 8px;
          background: rgba(255,255,255,0.18);
          border-radius: 50%;
          filter: blur(3px);
        }
        .hero-top-grad {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 90px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent);
        }
      `}</style>

      <div className="hero-landscape">
        {/* Dégradé sombre en haut pour les icônes */}
        <div className="hero-top-grad" />
        {/* Reflet eau */}
        <div className="hero-shimmer" />

        {/* Barre de navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-4 z-10">
          {/* Burger */}
          <button
            onClick={toggle}
            className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl"
            aria-label="Menu"
          >
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full" />
          </button>

          {/* Compte */}
          <button
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Mon compte"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </div>

        {/* Logo centré */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white font-black text-3xl tracking-tight drop-shadow-lg">
              Levant<span className="opacity-60">.news</span>
            </div>
            <div className="text-white/60 text-[10px] font-medium uppercase tracking-[0.15em] mt-1">
              L'Île du Levant
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
