'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PostWithRelations, ObjetPerdu } from '@/types/database'

type Tab = 'posts' | 'annonces' | 'bateaux'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'posts',    label: 'À modérer', icon: '📅' },
  { id: 'annonces', label: 'Annonces',  icon: '🔍' },
  { id: 'bateaux',  label: 'Bateaux',   icon: '⛵' },
]

// ─── Onglet 1 : événements à modérer ──────────────────────────

function PostsToModerate() {
  const supabase = createClient()
  const [posts,   setPosts]   = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*, organisateur:etablissements!organisateur_id(id,nom,photo_url), lieu:etablissements!lieu_id(id,nom), categorie:categories(code,nom)')
      .eq('publie', false)
      .eq('refuse', false)
      .order('created_at', { ascending: false })
    setPosts((data ?? []) as PostWithRelations[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function publier(id: string) {
    await supabase.from('posts').update({ publie: true, refuse: false }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  async function refuser(id: string) {
    await supabase.from('posts').update({ refuse: true, publie: false }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>
  }

  if (posts.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">✅ File de modération vide.</p>
  }

  return (
    <div className="px-4 pt-4 space-y-3">
      {posts.map(p => (
        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-gray-900 text-sm leading-tight">{p.titre}</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {p.date_debut}{p.date_fin && p.date_fin !== p.date_debut ? ` → ${p.date_fin}` : ''}
                {p.heure ? ` · ${p.heure}` : ''}
              </p>
              {p.organisateur?.nom && (
                <p className="text-xs text-gray-500 mt-0.5">🎤 {p.organisateur.nom}</p>
              )}
              {p.lieu?.nom && (
                <p className="text-xs text-gray-500 mt-0.5">📍 {p.lieu.nom}</p>
              )}
              {p.categorie?.nom && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {p.categorie.nom}
                </span>
              )}
            </div>
          </div>

          {p.complement && (
            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{p.complement}</p>
          )}

          {(p.nom_redacteur || p.contact_redacteur) && (
            <p className="text-xs text-gray-400 mb-3">
              Soumis par {p.nom_redacteur ?? '—'}{p.contact_redacteur ? ` · ${p.contact_redacteur}` : ''}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => publier(p.id)}
              className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-bold">
              ✓ Publier
            </button>
            <button onClick={() => refuser(p.id)}
              className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-200">
              ✕ Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Onglet 2 : liste simple des annonces ─────────────────────

function AnnoncesList() {
  const supabase = createClient()
  const [annonces, setAnnonces] = useState<ObjetPerdu[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('objets_perdus')
      .select('*')
      .order('created_at', { ascending: false })
    setAnnonces(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function supprimer(id: string) {
    if (!confirm('Supprimer cette annonce ?')) return
    await supabase.from('objets_perdus').delete().eq('id', id)
    setAnnonces(prev => prev.filter(a => a.id !== id))
  }

  if (loading) {
    return <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>
  }

  if (annonces.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">Aucune annonce.</p>
  }

  return (
    <div className="px-4 pt-4 space-y-2">
      {annonces.map(a => (
        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">{a.type === 'PERDU' ? '🔍' : '📦'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-gray-900 text-sm">{a.objet}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                a.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              }`}>
                {a.type === 'PERDU' ? 'Perdu' : 'Trouvé'}
              </span>
              {a.retrouve && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Retrouvé
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {a.date_evenement}{a.lieu ? ` · ${a.lieu}` : ''}
            </p>
            {a.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.description}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              {a.nom_declarant}{a.telephone ? ` · ${a.telephone}` : ''}{a.contact ? ` · ${a.contact}` : ''}
            </p>
          </div>
          <button onClick={() => supprimer(a.id)}
            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 flex-shrink-0">🗑</button>
        </div>
      ))}
    </div>
  )
}

// ─── Onglet 3 : infos bateaux ─────────────────────────────────

interface InfoBateau {
  id: string
  date_debut: string
  date_fin: string
  compagnie: string | null
  message: string
  type: 'avertissement' | 'changement' | 'annulation'
}

const COMPAGNIES = ['TLV', 'Vedettes Îles d\'Or']
const INFO_ICON: Record<string, string> = { avertissement: '⚠️', changement: '🔄', annulation: '🚫' }
const INFO_BADGE: Record<string, string> = {
  avertissement: 'bg-orange-100 text-orange-700',
  changement:    'bg-blue-100 text-blue-700',
  annulation:    'bg-red-100 text-red-600',
}

function todayIso() { return new Date().toISOString().split('T')[0] }

function InfoForm({
  initial, onSave, onCancel,
}: {
  initial?: Partial<InfoBateau>
  onSave: (data: Omit<InfoBateau, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    date_debut: initial?.date_debut ?? todayIso(),
    date_fin:   initial?.date_fin   ?? todayIso(),
    compagnie:  initial?.compagnie  ?? '',
    message:    initial?.message    ?? '',
    type:       initial?.type       ?? 'avertissement',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      date_debut: form.date_debut,
      date_fin:   form.date_fin,
      compagnie:  form.compagnie || null,
      message:    form.message,
      type:       form.type as InfoBateau['type'],
    })
    setSaving(false)
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Début</label>
          <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Fin</label>
          <input type="date" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} required className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
            <option value="avertissement">Avertissement</option>
            <option value="changement">Changement</option>
            <option value="annulation">Annulation</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Compagnie</label>
          <select value={form.compagnie} onChange={e => set('compagnie', e.target.value)} className={inputCls}>
            <option value="">Toutes</option>
            {COMPAGNIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
        <textarea value={form.message} onChange={e => set('message', e.target.value)} required rows={3}
          className={`${inputCls} resize-none`} placeholder="Ex: Risque de perturbations les 3 et 4 avril en raison du fort vent…" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">
          Annuler
        </button>
      </div>
    </form>
  )
}

function BateauInfos() {
  const supabase = createClient()
  const [infos,    setInfos]    = useState<InfoBateau[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editInfo, setEditInfo] = useState<InfoBateau | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('info_bateau')
      .select('*')
      .order('date_debut', { ascending: false })
    setInfos(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveInfo(data: Omit<InfoBateau, 'id'>) {
    if (editInfo) {
      await supabase.from('info_bateau').update(data).eq('id', editInfo.id)
    } else {
      await supabase.from('info_bateau').insert(data)
    }
    setShowForm(false)
    setEditInfo(null)
    load()
  }

  async function deleteInfo(id: string) {
    if (!confirm('Supprimer ce message ?')) return
    await supabase.from('info_bateau').delete().eq('id', id)
    setInfos(prev => prev.filter(i => i.id !== id))
  }

  const today = todayIso()
  const activeInfos  = infos.filter(i => i.date_fin >= today)
  const expiredInfos = infos.filter(i => i.date_fin < today)

  return (
    <div className="mx-4 mt-4 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setEditInfo(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">
          + Message
        </button>
      </div>

      {(showForm || editInfo) && (
        <InfoForm
          initial={editInfo ?? undefined}
          onSave={saveInfo}
          onCancel={() => { setShowForm(false); setEditInfo(null) }}
        />
      )}

      {loading ? (
        <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>
      ) : (
        <>
          {activeInfos.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Actifs</p>
              <div className="space-y-2">
                {activeInfos.map(info => (
                  <div key={info.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{INFO_ICON[info.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${INFO_BADGE[info.type]}`}>
                          {info.type.charAt(0).toUpperCase() + info.type.slice(1)}
                        </span>
                        {info.compagnie && <span className="text-xs text-gray-400">{info.compagnie}</span>}
                        <span className="text-xs text-gray-400">jusqu&apos;au {info.date_fin}</span>
                      </div>
                      <p className="text-sm text-gray-700">{info.message}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditInfo(info); setShowForm(false) }}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">✏️</button>
                      <button onClick={() => deleteInfo(info.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiredInfos.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Expirés</p>
              <div className="space-y-2 opacity-50">
                {expiredInfos.map(info => (
                  <div key={info.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{INFO_ICON[info.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{info.date_debut} → {info.date_fin}</p>
                      <p className="text-sm text-gray-700">{info.message}</p>
                    </div>
                    <button onClick={() => deleteInfo(info.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 flex-shrink-0">🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {infos.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Aucun message.</p>
          )}
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

function ModerationContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) ?? 'posts'
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="pb-20">
      <div className="sticky top-[104px] z-20 bg-white border-b border-gray-100 px-4 flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'posts'    && <PostsToModerate />}
      {tab === 'annonces' && <AnnoncesList />}
      {tab === 'bateaux'  && <BateauInfos />}
    </div>
  )
}

export default function ModerationPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>}>
      <ModerationContent />
    </Suspense>
  )
}
