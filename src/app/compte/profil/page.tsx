'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { ObjetPerdu, NotifPref } from '@/types/database'

// ─── Section : Mes coordonnées ────────────────────────────────────────────────

function SectionCoordonnees() {
  const { user, profile } = useAuth()
  const supabase = createClient()

  const [prenom,    setPrenom]    = useState(profile?.prenom ?? '')
  const [nom,       setNom]       = useState(profile?.nom ?? '')
  const [telephone, setTelephone] = useState(profile?.telephone ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setPrenom(profile.prenom)
      setNom(profile.nom)
      setTelephone(profile.telephone ?? '')
    }
  }, [profile])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ prenom, nom, telephone: telephone || null })
      .eq('id', user!.id)
    if (error) { setError('Erreur lors de la sauvegarde.'); setSaving(false) }
    else { setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 2500) }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Prénom</label>
          <input value={prenom} onChange={e => setPrenom(e.target.value)} required
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nom</label>
          <input value={nom} onChange={e => setNom(e.target.value)} required
            className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
        <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-400">
          {user?.email}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Téléphone</label>
        <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
          placeholder="+33 6 00 00 00 00"
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
        {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}

// ─── Section : Mes annonces ───────────────────────────────────────────────────

function SectionAnnonces() {
  const { user } = useAuth()
  const supabase  = createClient()
  const [annonces, setAnnonces] = useState<ObjetPerdu[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('objets_perdus')
      .select('*')
      .eq('compte_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAnnonces(data ?? []); setLoading(false) })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fermer(id: string) {
    await supabase.from('objets_perdus').update({ retrouve: true }).eq('id', id)
    setAnnonces(prev => prev.map(a => a.id === id ? { ...a, retrouve: true } : a))
  }
  async function supprimer(id: string) {
    await supabase.from('objets_perdus').delete().eq('id', id)
    setAnnonces(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>
  if (annonces.length === 0) return (
    <div className="text-center py-6">
      <p className="text-3xl mb-2">🔍</p>
      <p className="text-sm text-gray-400">Aucune annonce pour l'instant.</p>
      <Link href="/perdu/nouveau" className="mt-3 inline-block text-blue-600 font-semibold text-sm">
        Déclarer un objet
      </Link>
    </div>
  )

  return (
    <div className="space-y-2">
      {annonces.map(a => (
        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mr-2 ${
                a.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {a.type === 'PERDU' ? 'Perdu' : 'Trouvé'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                a.retrouve ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-700'
              }`}>
                {a.retrouve ? 'Fermée' : 'Active'}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(a.date_evenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-sm">{a.objet}</p>
          {a.lieu && <p className="text-xs text-gray-400 mt-0.5">📍 {a.lieu}</p>}
          {!a.retrouve && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => fermer(a.id)}
                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                Marquer retrouvé
              </button>
              <button onClick={() => supprimer(a.id)}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold">
                Supprimer
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Section : Notifications ──────────────────────────────────────────────────

const NOTIF_OPTIONS: { value: NotifPref; label: string; desc: string; icon: string }[] = [
  { value: 'toujours',   label: 'Toujours',          desc: 'Toutes les notifications, où que tu sois', icon: '🔔' },
  { value: 'sur_ile',    label: 'Sur l\'île seulement', desc: 'Uniquement quand tu es à l\'Île du Levant',  icon: '🏝️' },
  { value: 'jamais',     label: 'Jamais',             desc: 'Aucune notification',                      icon: '🔕' },
]

function SectionNotifications() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [pref,   setPref]   = useState<NotifPref>(profile?.notification_pref ?? 'sur_ile')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function save(value: NotifPref) {
    setPref(value)
    setSaving(true)
    await supabase.from('profiles').update({ notification_pref: value }).eq('id', user!.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      {NOTIF_OPTIONS.map(opt => (
        <button key={opt.value} onClick={() => save(opt.value)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${
            pref === opt.value
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 bg-white active:bg-gray-50'
          }`}>
          <span className="text-xl">{opt.icon}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${pref === opt.value ? 'text-blue-700' : 'text-gray-900'}`}>
              {opt.label}
            </p>
            <p className="text-xs text-gray-400">{opt.desc}</p>
          </div>
          {pref === opt.value && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600 flex-shrink-0">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      ))}
      {saving && <p className="text-xs text-gray-400 text-center">Enregistrement…</p>}
      {saved  && <p className="text-xs text-blue-600 text-center">✓ Préférence enregistrée</p>}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'coordonnees',   label: 'Mes coordonnées',  icon: '👤' },
  { id: 'annonces',      label: 'Mes annonces',      icon: '🔍' },
  { id: 'notifications', label: 'Notifications',     icon: '🔔' },
]

export default function ProfilPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [active, setActive] = useState('coordonnees')

  useEffect(() => {
    if (!loading && !user) router.push('/compte/connexion')
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Chargement…</p>
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile ? `${profile.prenom} ${profile.nom}` : user.email ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-4 pt-14 pb-5"
        style={{ background: 'linear-gradient(180deg,#0a1f4e 0%, #1A56DB 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Link href="/"
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"
            aria-label="Accueil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </Link>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex-1">Mon compte</h1>
          <button onClick={handleSignOut}
            className="text-white/60 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10">
            Déconnexion
          </button>
        </div>

        {/* Avatar + nom */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-extrabold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-bold text-base leading-snug">{displayName}</p>
            {profile?.role === 'pro' && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-400 text-amber-900">
                Compte Pro
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto scrollbar-none"
           style={{ scrollbarWidth: 'none' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3.5 text-xs font-bold border-b-2 transition-colors ${
              active === s.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400'
            }`}>
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
        {profile?.role === 'pro' && (
          <Link href="/pro/evenements"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3.5 text-xs font-bold border-b-2 border-transparent text-indigo-500">
            <span>🏪</span>
            <span>Espace Pro</span>
          </Link>
        )}
      </div>

      {/* Contenu */}
      <div className="px-4 py-5 max-w-sm mx-auto">
        {active === 'coordonnees'   && <SectionCoordonnees />}
        {active === 'annonces'      && <SectionAnnonces />}
        {active === 'notifications' && <SectionNotifications />}
      </div>
    </div>
  )
}
