'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEventSheet } from '@/contexts/EventSheetContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabaseImg } from '@/lib/supabaseImg'
import { createClient } from '@/lib/supabase/client'

// ─── Couleurs catégories ──────────────────────────────────────────────────────

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  CONCERT:           { bg: 'bg-purple-100', text: 'text-purple-700' },
  SOIREE:            { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SPORT:             { bg: 'bg-green-100',  text: 'text-green-700'  },
  EXPO:              { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  MARCHE:            { bg: 'bg-orange-100', text: 'text-orange-700' },
  SPECTACLE:         { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  INFO:              { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  INFOCRITIQUE:      { bg: 'bg-red-100',    text: 'text-red-700'    },
  BAL:               { bg: 'bg-fuchsia-100',text: 'text-fuchsia-700'},
  BRUNCH:            { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ACTIVITE:          { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  CHANT:             { bg: 'bg-rose-100',   text: 'text-rose-700'   },
  SERVICE_RELIGIEUX: { bg: 'bg-stone-100',  text: 'text-stone-700'  },
  BANQUET:           { bg: 'bg-lime-100',   text: 'text-lime-700'   },
  JEU:               { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
  CUISINE:           { bg: 'bg-emerald-100',text: 'text-emerald-700'},
}

// ─── Formatage des dates ──────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatDateRange(debut: string, fin: string | null | undefined): string {
  const d = formatDate(debut)
  if (!fin || fin === debut) return d
  return `Du ${d} au ${formatDate(fin)}`
}

// ─── Rendu Markdown simple ────────────────────────────────────────────────────

type InlineNode = string | { type: 'bold' | 'italic' | 'link'; text: string; href?: string }

function parseInline(line: string): InlineNode[] {
  const nodes: InlineNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|(https?:\/\/[^\s]+))/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index))
    if (m[2] !== undefined)      nodes.push({ type: 'bold',   text: m[2] })
    else if (m[3] !== undefined) nodes.push({ type: 'italic', text: m[3] })
    else if (m[4] !== undefined) nodes.push({ type: 'link',   text: m[4], href: m[4] })
    last = m.index + m[0].length
  }
  if (last < line.length) nodes.push(line.slice(last))
  return nodes
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <span>
      {lines.map((line, i) => {
        const nodes = parseInline(line)
        return (
          <span key={i}>
            {i > 0 && <br />}
            {nodes.map((n, j) => {
              if (typeof n === 'string') return <span key={j}>{n}</span>
              if (n.type === 'bold')   return <strong key={j}>{n.text}</strong>
              if (n.type === 'italic') return <em key={j}>{n.text}</em>
              if (n.type === 'link')   return (
                <a
                  key={j}
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline break-all"
                  onClick={e => e.stopPropagation()}
                >
                  {n.text}
                </a>
              )
              return null
            })}
          </span>
        )
      })}
    </span>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EventSheet() {
  const { post, isOpen, close } = useEventSheet()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const touchStartY = useRef(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // ── Inscription ───────────────────────────────────────────────────────────
  const [mesInscriptions, setMesInscriptions] = useState<{ id: string; prenom: string; nom: string }[]>([])
  const [nbInscriptions, setNbInscriptions]   = useState(0)
  const [showForm, setShowForm]               = useState(false)
  const [form, setForm]                       = useState({ prenom: '', nom: '', telephone: '' })
  const [formStatus, setFormStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [cancellingIds, setCancellingIds]     = useState<Set<string>>(new Set())
  const [cancelErrorId, setCancelErrorId]     = useState<string | null>(null)

  // Charger le compteur total + les inscriptions de l'utilisateur
  useEffect(() => {
    if (!post?.inscription) return
    const supabase = createClient()
    supabase.from('inscriptions').select('id', { count: 'exact', head: true }).eq('post_id', post.id)
      .then(({ count }) => setNbInscriptions(count ?? 0))
    if (user) {
      supabase.from('inscriptions').select('id, prenom, nom').eq('post_id', post.id).eq('compte_id', user.id)
        .then(({ data }) => setMesInscriptions(data ?? []))
    }
  }, [post?.id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Réinitialiser à chaque nouveau post
  useEffect(() => {
    setShowForm(false)
    setForm({ prenom: '', nom: '', telephone: '' })
    setFormStatus('idle')
    setMesInscriptions([])
    setNbInscriptions(0)
    setCancelErrorId(null)
  }, [post?.id])

  function goToLogin()  { close(); router.push('/compte/connexion') }
  function goToSignup() { close(); router.push('/compte/inscription') }

  async function handleInscription(e: React.FormEvent) {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.telephone || !post || !user) return
    setFormStatus('loading')
    try {
      const { data, error } = await createClient()
        .from('inscriptions')
        .insert({ post_id: post.id, compte_id: user.id, ...form })
        .select('id, prenom, nom')
        .single()
      if (error) throw error
      setMesInscriptions(prev => [...prev, data])
      setNbInscriptions(n => n + 1)
      setForm({ prenom: '', nom: '', telephone: '' })
      setFormStatus('success')
      setTimeout(() => { setFormStatus('idle'); setShowForm(false) }, 1500)
    } catch {
      setFormStatus('error')
    }
  }

  async function handleCancel(id: string) {
    setCancellingIds(prev => new Set([...prev, id]))
    setCancelErrorId(null)
    try {
      const { error } = await createClient().from('inscriptions').delete().eq('id', id)
      if (error) throw error
      setMesInscriptions(prev => prev.filter(i => i.id !== id))
      setNbInscriptions(n => Math.max(0, n - 1))
    } catch {
      setCancelErrorId(id)
    } finally {
      setCancellingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) setTranslateY(0)
  }, [isOpen, post])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
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

  if (!post) return null

  const cat    = post.categorie
  const colors = cat ? (CAT_COLORS[cat.code] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }) : null
  const lieu   = post.lieu?.nom ?? null
  const organisateur = post.organisateur?.nom ?? null

  return (
    <>
      {/* Fond semi-transparent */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: isDragging ? 'none' : 'opacity 300ms ease',
        }}
        onClick={close}
      />

      {/* Sheet */}
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

          {/* Contenu scrollable */}
          <div className="overflow-y-auto flex-1 pb-safe">

            {/* Image carrée pleine largeur + poignée + bouton ✕ */}
            <div className="relative w-full aspect-square bg-gray-100 flex-shrink-0">

              {/* Poignée de drag — overlaid sur l'image */}
              <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                <div className="w-10 h-1 bg-white/70 backdrop-blur-sm rounded-full shadow-sm" />
              </div>
              {post.affiche_url ? (
                <img
                  src={supabaseImg(post.affiche_url, 860)}
                  alt={post.titre}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full ${colors?.bg ?? 'bg-gray-100'}`} />
              )}

              {/* Dégradé bas (optionnel, pour lisibilité) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 40%)' }}
              />

              {/* Bouton ✕ */}
              <button
                onClick={close}
                className="absolute top-10 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold active:bg-black/60"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Corps */}
            <div className="px-5 py-4 space-y-4">

              {/* Catégorie */}
              {cat && colors && (
                <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                  {cat.nom}
                </span>
              )}

              {/* Titre */}
              <h2 className="text-xl font-extrabold text-gray-900 leading-snug">
                {post.titre}
              </h2>

              {/* Infos clés */}
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-base mt-0.5">📅</span>
                  <span className="font-medium capitalize">
                    {formatDateRange(post.date_debut, post.date_fin)}
                  </span>
                </div>
                {post.heure && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">🕐</span>
                    <span className="font-medium">{post.heure}</span>
                  </div>
                )}
                {lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="text-base">📍</span>
                    <span className="font-medium">{lieu}</span>
                  </div>
                )}
                {organisateur && organisateur !== lieu && (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="text-base">🏪</span>
                    <span>{organisateur}</span>
                  </div>
                )}
              </div>

              {/* Description avec Markdown */}
              {post.complement && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  <MarkdownText text={post.complement} />
                </p>
              )}

              {/* Inscription */}
              {post.inscription && (() => {
                const placesRestantes = post.nb_inscriptions_max
                  ? post.nb_inscriptions_max - nbInscriptions
                  : null
                const isComplet = placesRestantes !== null && placesRestantes <= 0

                return (
                  <div className="space-y-3">
                    {/* Barre de progression si places limitées */}
                    {post.nb_inscriptions_max && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-semibold text-green-800 mb-2">📋 Inscription requise</p>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{nbInscriptions} inscrit{nbInscriptions > 1 ? 's' : ''}</span>
                          <span>{post.nb_inscriptions_max} places</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isComplet ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, (nbInscriptions / post.nb_inscriptions_max) * 100)}%` }}
                          />
                        </div>
                        <p className={`text-xs font-semibold mt-1.5 ${isComplet ? 'text-red-600' : 'text-green-600'}`}>
                          {isComplet
                            ? 'Complet'
                            : `${placesRestantes} place${placesRestantes! > 1 ? 's' : ''} restante${placesRestantes! > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    )}

                    {/* Badge simple si pas de limite de places */}
                    {!post.nb_inscriptions_max && (
                      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                        <p className="text-sm font-semibold text-green-800">📋 Inscription requise</p>
                      </div>
                    )}

                    {/* Non connecté → invite */}
                    {!authLoading && !user && !isComplet && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4 space-y-3">
                        <p className="text-sm font-semibold text-blue-900">Connectez-vous pour vous inscrire</p>
                        <p className="text-xs text-blue-700">Un compte est nécessaire pour réserver votre place.</p>
                        <div className="flex gap-2">
                          <button onClick={goToSignup} className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}>
                            Créer un compte
                          </button>
                          <button onClick={goToLogin} className="flex-1 py-2.5 rounded-xl text-blue-700 font-bold text-sm bg-white border border-blue-200">
                            Se connecter
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Connecté */}
                    {!authLoading && user && (
                      <div className="space-y-2">

                        {/* Liste des inscriptions de l'utilisateur */}
                        {mesInscriptions.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-1">
                              Mes inscriptions
                            </p>
                            {mesInscriptions.map(insc => (
                              <div key={insc.id} className="px-4 py-2.5 border-t border-gray-100 first:border-t-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-800">
                                    {insc.prenom} {insc.nom.toUpperCase()}
                                  </span>
                                  <button
                                    onClick={() => handleCancel(insc.id)}
                                    disabled={cancellingIds.has(insc.id)}
                                    className="text-xs text-red-500 font-semibold disabled:opacity-40 active:opacity-70 ml-3 flex-shrink-0"
                                  >
                                    {cancellingIds.has(insc.id) ? '…' : 'Annuler'}
                                  </button>
                                </div>
                                {cancelErrorId === insc.id && (
                                  <p className="text-xs text-red-500 mt-1">Erreur — réessayez.</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Complet */}
                        {isComplet && mesInscriptions.length === 0 && (
                          <div className="w-full py-3.5 rounded-2xl bg-gray-100 text-center text-gray-500 font-semibold text-sm">
                            Complet
                          </div>
                        )}

                        {/* Bouton ajouter (si places dispo) */}
                        {!isComplet && !showForm && (
                          <button
                            onClick={() => setShowForm(true)}
                            className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                            style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}
                          >
                            {mesInscriptions.length === 0 ? "S'inscrire" : '+ Ajouter une inscription'}
                          </button>
                        )}

                        {/* Formulaire */}
                        {showForm && (
                          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="font-bold text-gray-900 text-sm">Nouvelle inscription</p>
                              <button onClick={() => { setShowForm(false); setFormStatus('idle') }} className="text-gray-400 text-xl font-light leading-none">×</button>
                            </div>
                            {formStatus === 'success' ? (
                              <p className="text-center text-sm font-semibold text-green-700 py-2">✓ Inscription ajoutée !</p>
                            ) : (
                              <form onSubmit={handleInscription} className="space-y-2.5">
                                <input type="text" placeholder="Prénom *" value={form.prenom}
                                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-blue-400" required />
                                <input type="text" placeholder="Nom *" value={form.nom}
                                  onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-blue-400" required />
                                <input type="tel" placeholder="Téléphone *" value={form.telephone}
                                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-blue-400" required />
                                {formStatus === 'error' && (
                                  <p className="text-xs text-red-600">Erreur lors de l'inscription. Réessayez.</p>
                                )}
                                <button type="submit" disabled={formStatus === 'loading'}
                                  className="w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                                  style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}>
                                  {formStatus === 'loading' ? 'Envoi…' : "Confirmer l'inscription"}
                                </button>
                              </form>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Espace en bas pour que le dernier élément ne soit pas collé au bas de l'écran */}
              <div className="h-4" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
