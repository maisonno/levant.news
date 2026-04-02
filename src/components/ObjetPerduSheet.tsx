'use client'

import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useObjetPerduSheet } from '@/contexts/ObjetPerduSheetContext'

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Bloc connexion requise (inline dans la sheet) ────────────────────────────

function AuthPrompt({ message }: { message: string }) {
  return (
    <div className="border border-gray-200 rounded-2xl px-4 py-4 space-y-3 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      <div className="flex flex-col gap-2">
        <a href="/compte/connexion"
          className="block py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">
          J'ai déjà un compte
        </a>
        <a href="/compte/inscription"
          className="block py-2.5 rounded-xl bg-gray-100 text-gray-800 text-sm font-semibold">
          Créer un compte
        </a>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ObjetPerduSheet() {
  const { objet, isOpen, close, updateObjet, triggerRefresh } = useObjetPerduSheet()
  const { user, profile } = useAuth()
  const supabase = createClient()

  const touchStartY  = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [actionDone, setActionDone] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) { setTranslateY(0); setActionDone(false) }
  }, [isOpen, objet])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY; setIsDragging(true)
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setTranslateY(delta)
  }
  const handleTouchEnd = () => {
    setIsDragging(false)
    if (translateY > 120) close()
    else setTranslateY(0)
  }

  async function handleMarkRetrouve() {
    if (!objet) return
    const updated = { ...objet, retrouve: true }
    await supabase.from('objets_perdus').update({ retrouve: true }).eq('id', objet.id)
    setActionDone(true)
    updateObjet(updated)
    setTimeout(() => close(), 800)
  }

  async function handleReopen() {
    if (!objet) return
    const updated = { ...objet, retrouve: false }
    await supabase.from('objets_perdus').update({ retrouve: false }).eq('id', objet.id)
    updateObjet(updated)
    triggerRefresh()
    setTimeout(() => close(), 400)
  }

  if (!objet) return null

  const isAdmin   = profile?.role === 'admin'
  const isOwner   = objet.compte_id !== null && objet.compte_id === user?.id
  const canClose  = !objet.retrouve
  const canReopen = objet.retrouve && (isOwner || isAdmin)

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDragging ? 'none' : 'opacity 300ms ease',
        }}
        onClick={close}
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px]"
        style={{
          transform: isOpen ? `translateY(${translateY}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.32,0.72,0,1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-white rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
          <div className="overflow-y-auto flex-1 pb-safe">

            {/* Zone image / header */}
            <div className="relative w-full bg-gray-100 flex-shrink-0"
                 style={{ aspectRatio: objet.photo_url ? '1/1' : 'auto', minHeight: objet.photo_url ? undefined : '80px' }}>
              <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                <div className="w-10 h-1 bg-white/70 backdrop-blur-sm rounded-full shadow-sm" />
              </div>
              {objet.photo_url ? (
                <>
                  <img src={objet.photo_url} alt={objet.objet} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none"
                       style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 40%)' }} />
                  <button onClick={close} aria-label="Fermer"
                    className="absolute top-10 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold active:bg-black/60">
                    ✕
                  </button>
                </>
              ) : (
                <div className={`w-full h-20 flex items-center justify-center ${objet.type === 'PERDU' ? 'bg-orange-50' : 'bg-green-50'}`}>
                  <span className="text-4xl">{objet.type === 'PERDU' ? '🔍' : '📦'}</span>
                  <button onClick={close} aria-label="Fermer"
                    className="absolute top-10 right-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-gray-700 text-lg font-bold">
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Corps */}
            <div className="px-5 py-4 space-y-4">

              {/* Badges */}
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${
                  objet.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                }`}>{objet.type === 'PERDU' ? 'Perdu' : 'Trouvé'}</span>
                {objet.retrouve && (
                  <span className="text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-gray-100 text-gray-500">
                    Retrouvé ✓
                  </span>
                )}
              </div>

              <h2 className="text-xl font-extrabold text-gray-900 leading-snug">{objet.objet}</h2>

              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-base mt-0.5">📅</span>
                  <span className="font-medium capitalize">{formatDate(objet.date_evenement)}</span>
                </div>
                {objet.lieu && (
                  <div className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="text-base mt-0.5">📍</span>
                    <span className="font-medium">{objet.lieu}</span>
                  </div>
                )}
                {objet.description && (
                  <p className="text-sm text-gray-600 leading-relaxed pt-1">{objet.description}</p>
                )}
              </div>

              {/* Contact */}
              <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Contact</p>
                <p className="text-sm font-semibold text-gray-900">{objet.nom_declarant}</p>
                {objet.telephone && (
                  <a href={`tel:${objet.telephone}`}
                     className="flex items-center gap-2 text-sm text-blue-600 font-medium"
                     onClick={e => e.stopPropagation()}>
                    📞 {objet.telephone}
                  </a>
                )}
                {objet.contact && <p className="text-sm text-gray-500">{objet.contact}</p>}
              </div>

              {/* Action : marquer retrouvé */}
              {canClose && (
                <div className="border border-gray-200 rounded-2xl px-4 py-3 space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Cet objet a retrouvé son propriétaire ?
                  </p>
                  {!user ? (
                    <AuthPrompt message="Connecte-toi pour fermer cette annonce." />
                  ) : (
                    <button
                      onClick={handleMarkRetrouve}
                      disabled={actionDone}
                      className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-60 active:scale-[0.98] transition-transform"
                    >
                      {actionDone ? '✓ Annonce fermée' : '✅ Marquer comme retrouvé'}
                    </button>
                  )}
                </div>
              )}

              {/* Action : réouvrir l'annonce */}
              {canReopen && (
                <div className="border border-blue-100 bg-blue-50 rounded-2xl px-4 py-3 space-y-2">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Annonce fermée</p>
                  <button
                    onClick={handleReopen}
                    className="w-full py-2.5 rounded-xl bg-white border border-blue-300 text-blue-700 text-sm font-bold active:bg-blue-50"
                  >
                    ↩ Réouvrir l'annonce
                  </button>
                </div>
              )}

              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
