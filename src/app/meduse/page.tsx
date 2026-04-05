'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIEUX = [
  'La piscine',
  'Plage des grottes',
  'La dalle du port',
  'Le bain de Diane',
  'Les plates',
  'Les pierres blanches',
  'La galère',
]

type Presence = 'aucune' | 'tres_peu' | 'beaucoup' | 'infeste'

const PRESENCE_OPTIONS: {
  value: Presence; label: string
  color: string; bg: string; dot: string
}[] = [
  { value: 'aucune',   label: 'Aucune',   color: 'text-green-700',  bg: 'bg-green-50 border-green-300',   dot: 'bg-green-500' },
  { value: 'tres_peu', label: 'Très peu', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-300', dot: 'bg-yellow-400' },
  { value: 'beaucoup', label: 'Beaucoup', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300', dot: 'bg-orange-500' },
  { value: 'infeste',  label: 'Infesté',  color: 'text-red-700',    bg: 'bg-red-50 border-red-300',       dot: 'bg-red-500' },
]

const PRESENCE_BADGE: Record<Presence, { label: string; cls: string }> = {
  aucune:   { label: 'Aucune',   cls: 'bg-green-100 text-green-700' },
  tres_peu: { label: 'Très peu', cls: 'bg-yellow-100 text-yellow-700' },
  beaucoup: { label: 'Beaucoup', cls: 'bg-orange-100 text-orange-700' },
  infeste:  { label: 'Infesté',  cls: 'bg-red-100 text-red-700' },
}

interface Signalement {
  id: string
  date_observation: string
  heure_observation: string
  lieu: string
  presence: Presence
  signale_par: string | null
  created_at: string
}

function getTodayStr()     { return new Date().toISOString().split('T')[0] }
function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}
function getNowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function formatHeure(h: string)  { return h.slice(0, 5) }
function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

interface FormProps {
  onSubmit:    (data: Omit<Signalement, 'id' | 'created_at'>) => Promise<void>
  onClose:     () => void
  defaultNom?: string
}

function SignalementForm({ onSubmit, onClose, defaultNom = '' }: FormProps) {
  const [date,      setDate]      = useState(getTodayStr())
  const [heure,     setHeure]     = useState(getNowTime())
  const [lieu,      setLieu]      = useState(LIEUX[0])
  const [presence,  setPresence]  = useState<Presence>('aucune')
  const [signalePar, setSignalePar] = useState(defaultNom)
  const [saving,    setSaving]    = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSubmit({ date_observation: date, heure_observation: heure, lieu, presence, signale_par: signalePar.trim() || null })
    setSaving(false)
  }

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Date</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className="label">Heure</label>
          <input type="time" required value={heure} onChange={e => setHeure(e.target.value)} className={field} />
        </div>
      </div>

      <div>
        <label className="label">Lieu d&apos;observation</label>
        <select value={lieu} onChange={e => setLieu(e.target.value)} className={field}>
          {LIEUX.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Présence de méduses</label>
        <div className="space-y-2">
          {PRESENCE_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setPresence(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                presence === opt.value
                  ? `${opt.bg} border-current`
                  : 'bg-white border-gray-200'
              }`}>
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.dot}`} />
              <span className={`text-sm font-semibold ${presence === opt.value ? opt.color : 'text-gray-700'}`}>
                {opt.label}
              </span>
              {presence === opt.value && (
                <svg className="ml-auto w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Votre nom <span className="normal-case font-normal text-gray-300">(optionnel)</span></label>
        <input
          type="text"
          value={signalePar}
          onChange={e => setSignalePar(e.target.value)}
          placeholder="Prénom ou pseudo…"
          className={field}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 rounded-2xl bg-cyan-500 text-white text-sm font-bold disabled:opacity-50">
          {saving ? 'Envoi…' : 'Signaler'}
        </button>
      </div>

      <style>{`.label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }`}</style>
    </form>
  )
}

// ─── Carte signalement ────────────────────────────────────────────────────────

function SignalementCard({ s, dim = false }: { s: Signalement; dim?: boolean }) {
  const badge = PRESENCE_BADGE[s.presence]
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 ${dim ? 'opacity-50' : ''}`}>
      <div className={`text-2xl flex-shrink-0 ${dim ? 'grayscale' : ''}`}>🪼</div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold leading-snug truncate ${dim ? 'text-gray-400 text-xs' : 'text-gray-900 text-sm'}`}>
          {s.lieu}
        </p>
        <p className={`mt-0.5 ${dim ? 'text-[10px] text-gray-300' : 'text-xs text-gray-400'}`}>
          {formatHeure(s.heure_observation)}
          {s.signale_par && <span className="ml-1.5">· {s.signale_par}</span>}
        </p>
      </div>
      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${badge.cls} ${dim ? 'opacity-60' : ''}`}>
        {badge.label}
      </span>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function MeduseWatchPage() {
  const supabase   = createClient()
  const { profile } = useAuth()
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [success,      setSuccess]      = useState(false)

  // Nom pré-rempli si connecté
  const defaultNom = profile ? `${profile.prenom} ${profile.nom}`.trim() : ''

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meduse_signalements')
      .select('*')
      .order('date_observation', { ascending: false })
      .order('heure_observation', { ascending: false })
    setSignalements((data ?? []) as Signalement[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function submit(data: Omit<Signalement, 'id' | 'created_at'>) {
    await supabase.from('meduse_signalements').insert(data)
    await load()
    setShowForm(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const todayStr = getTodayStr()
  const yestStr  = getYesterdayStr()

  const groupToday = signalements.filter(s => s.date_observation === todayStr)
  const groupHier  = signalements.filter(s => s.date_observation === yestStr)
  const groupAvant = signalements.filter(s => s.date_observation < yestStr)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/"
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
            aria-label="Accueil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">🪼 Méduse Watch</h1>
            <p className="text-xs text-gray-400 mt-0.5">Signalements communautaires</p>
          </div>
        </div>
      </div>

      {/* Bouton signaler */}
      <div className="px-4 pt-4">
        {success && (
          <div className="mb-3 p-3 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-sm font-semibold text-center">
            ✅ Signalement envoyé, merci !
          </div>
        )}
        <button onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform">
          <span className="text-xl">🪼</span>
          Signaler des méduses
        </button>
      </div>

      {/* Listes */}
      <div className="px-4 pt-5 space-y-6">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>
        )}

        {!loading && signalements.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🌊</p>
            <p className="text-gray-400 text-sm font-medium">Aucun signalement pour l&apos;instant.</p>
            <p className="text-gray-300 text-xs mt-1">Soyez le premier à signaler !</p>
          </div>
        )}

        {/* Aujourd'hui */}
        {groupToday.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-extrabold text-gray-900">Aujourd&apos;hui</h3>
              <span className="text-xs text-gray-400">{formatDate(todayStr)}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {groupToday.map(s => <SignalementCard key={s.id} s={s} />)}
            </div>
          </section>
        )}

        {/* Hier */}
        {groupHier.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-extrabold text-gray-900">Hier</h3>
              <span className="text-xs text-gray-400">{formatDate(yestStr)}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="space-y-2">
              {groupHier.map(s => <SignalementCard key={s.id} s={s} />)}
            </div>
          </section>
        )}

        {/* Avant */}
        {groupAvant.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold text-gray-400">Avant</h3>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-2">
              {groupAvant.map(s => <SignalementCard key={s.id} s={s} dim />)}
            </div>
          </section>
        )}
      </div>

      {/* Formulaire slide-up */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
                🪼 Nouveau signalement
              </h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <SignalementForm onSubmit={submit} onClose={() => setShowForm(false)} defaultNom={defaultNom} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
