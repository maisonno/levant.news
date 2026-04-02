'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────

interface Horaire {
  id: string
  date: string
  heure: string
  port_depart: string
  port_arrivee: string
  compagnie: string
  duree_min: number | null
  statut: 'prevu' | 'annule' | 'change'
  note: string | null
}

interface InfoBateau {
  id: string
  date_debut: string
  date_fin: string
  compagnie: string | null
  message: string
  type: 'avertissement' | 'changement' | 'annulation'
}

// ─── Helpers ──────────────────────────────────────────────────

const COMPAGNIES = ['TLV', 'Vedettes Îles d\'Or']
const PORTS      = ['Hyères', 'Le Lavandou', 'Île du Levant', 'Port-Cros', 'Cavalaire']

function todayIso() { return new Date().toISOString().split('T')[0] }

const STATUT_BADGE: Record<string, string> = {
  prevu:  'bg-green-100 text-green-700',
  annule: 'bg-red-100 text-red-600',
  change: 'bg-orange-100 text-orange-700',
}

const INFO_BADGE: Record<string, string> = {
  avertissement: 'bg-orange-100 text-orange-700',
  changement:    'bg-blue-100 text-blue-700',
  annulation:    'bg-red-100 text-red-600',
}

const INFO_ICON: Record<string, string> = {
  avertissement: '⚠️',
  changement:    '🔄',
  annulation:    '🚫',
}

// ─── Formulaire horaire ───────────────────────────────────────

function HoraireForm({
  initial, onSave, onCancel,
}: {
  initial?: Partial<Horaire>
  onSave: (data: Omit<Horaire, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    date:         initial?.date         ?? todayIso(),
    heure:        initial?.heure?.slice(0, 5) ?? '',
    port_depart:  initial?.port_depart  ?? 'Île du Levant',
    port_arrivee: initial?.port_arrivee ?? 'Hyères',
    compagnie:    initial?.compagnie    ?? 'TLV',
    duree_min:    initial?.duree_min    ?? '',
    statut:       initial?.statut       ?? 'prevu',
    note:         initial?.note         ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      date:         form.date,
      heure:        form.heure,
      port_depart:  form.port_depart,
      port_arrivee: form.port_arrivee,
      compagnie:    form.compagnie,
      duree_min:    form.duree_min ? Number(form.duree_min) : null,
      statut:       form.statut as Horaire['statut'],
      note:         form.note || null,
    })
    setSaving(false)
  }

  const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Heure</label>
          <input type="time" value={form.heure} onChange={e => set('heure', e.target.value)} required className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Port départ</label>
          <select value={form.port_depart} onChange={e => set('port_depart', e.target.value)} className={inputCls}>
            {PORTS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Port arrivée</label>
          <select value={form.port_arrivee} onChange={e => set('port_arrivee', e.target.value)} className={inputCls}>
            {PORTS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Compagnie</label>
          <select value={form.compagnie} onChange={e => set('compagnie', e.target.value)} className={inputCls}>
            {COMPAGNIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Durée (min)</label>
          <input type="number" value={form.duree_min} onChange={e => set('duree_min', e.target.value)} placeholder="60" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Statut</label>
          <select value={form.statut} onChange={e => set('statut', e.target.value)} className={inputCls}>
            <option value="prevu">Prévu</option>
            <option value="annule">Annulé</option>
            <option value="change">Changé</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Note</label>
          <input type="text" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ex: départ à 9h15" className={inputCls} />
        </div>
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

// ─── Formulaire info bateau ───────────────────────────────────

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

// ─── Import CSV ───────────────────────────────────────────────

function CsvImport({ onImported }: { onImported: () => void }) {
  const [open,    setOpen]    = useState(false)
  const [preview, setPreview] = useState<Omit<Horaire, 'id'>[]>([])
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function parseCSV(text: string): Omit<Horaire, 'id'>[] {
    const lines = text.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('CSV vide ou sans données')

    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const required = ['date','heure','port_depart','port_arrivee','compagnie']
    for (const r of required) {
      if (!header.includes(r)) throw new Error(`Colonne manquante : "${r}"`)
    }

    return lines.slice(1).map((line, i) => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const get = (k: string) => vals[header.indexOf(k)] ?? ''
      const heure = get('heure').padStart(5, '0')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(get('date')))
        throw new Error(`Ligne ${i + 2} : date invalide "${get('date')}"`)
      if (!/^\d{2}:\d{2}$/.test(heure))
        throw new Error(`Ligne ${i + 2} : heure invalide "${heure}"`)
      return {
        date:         get('date'),
        heure,
        port_depart:  get('port_depart'),
        port_arrivee: get('port_arrivee'),
        compagnie:    get('compagnie'),
        duree_min:    get('duree_min') ? Number(get('duree_min')) : null,
        statut:       (get('statut') as Horaire['statut']) || 'prevu',
        note:         get('note') || null,
      }
    })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target!.result as string)
        setPreview(parsed)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur de lecture')
        setPreview([])
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!preview.length) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('horaires_bateau').insert(preview)
    setSaving(false)
    if (error) { setError(error.message); return }
    setPreview([])
    setOpen(false)
    if (fileRef.current) fileRef.current.value = ''
    onImported()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold">
        📂 Importer CSV
      </button>
    )
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">Import CSV</p>
        <button onClick={() => { setOpen(false); setPreview([]); setError('') }}
          className="text-gray-400 text-lg leading-none">✕</button>
      </div>

      <p className="text-xs text-gray-500">
        Format : <code className="bg-gray-100 px-1 rounded">date,heure,port_depart,port_arrivee,compagnie,duree_min,statut,note</code>
      </p>

      <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile}
        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold" />

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      {preview.length > 0 && (
        <>
          <p className="text-xs text-gray-500 font-semibold">{preview.length} trajet(s) prêt(s) à importer</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {preview.map((h, i) => (
              <div key={i} className="text-xs bg-white rounded-lg px-3 py-1.5 border border-gray-100 flex items-center gap-2">
                <span className="font-bold text-gray-700">{h.date}</span>
                <span className="text-gray-500">{h.heure}</span>
                <span className="text-gray-600">{h.port_depart} → {h.port_arrivee}</span>
                <span className="text-gray-400">{h.compagnie}</span>
              </div>
            ))}
          </div>
          <button onClick={handleImport} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Import en cours…' : `Importer ${preview.length} trajets`}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Admin principal ──────────────────────────────────────────

export default function BateauAdmin() {
  const supabase = createClient()

  const [tab,       setTab]       = useState<'horaires' | 'infos'>('horaires')
  const [horaires,  setHoraires]  = useState<Horaire[]>([])
  const [infos,     setInfos]     = useState<InfoBateau[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filterDate, setFilterDate] = useState(todayIso())

  const [showHoraireForm, setShowHoraireForm] = useState(false)
  const [editHoraire,     setEditHoraire]     = useState<Horaire | null>(null)
  const [showInfoForm,    setShowInfoForm]     = useState(false)
  const [editInfo,        setEditInfo]         = useState<InfoBateau | null>(null)

  async function loadHoraires() {
    const { data } = await supabase
      .from('horaires_bateau')
      .select('*')
      .eq('date', filterDate)
      .order('heure', { ascending: true })
    setHoraires(data ?? [])
  }

  async function loadInfos() {
    const { data } = await supabase
      .from('info_bateau')
      .select('*')
      .order('date_debut', { ascending: false })
    setInfos(data ?? [])
  }

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadHoraires(), loadInfos()])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [filterDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Horaires CRUD
  async function saveHoraire(data: Omit<Horaire, 'id'>) {
    if (editHoraire) {
      await supabase.from('horaires_bateau').update(data).eq('id', editHoraire.id)
    } else {
      await supabase.from('horaires_bateau').insert(data)
    }
    setShowHoraireForm(false)
    setEditHoraire(null)
    loadHoraires()
  }

  async function toggleStatut(h: Horaire) {
    const newStatut = h.statut === 'annule' ? 'prevu' : 'annule'
    await supabase.from('horaires_bateau').update({ statut: newStatut }).eq('id', h.id)
    loadHoraires()
  }

  async function deleteHoraire(id: string) {
    if (!confirm('Supprimer ce trajet ?')) return
    await supabase.from('horaires_bateau').delete().eq('id', id)
    loadHoraires()
  }

  // Infos CRUD
  async function saveInfo(data: Omit<InfoBateau, 'id'>) {
    if (editInfo) {
      await supabase.from('info_bateau').update(data).eq('id', editInfo.id)
    } else {
      await supabase.from('info_bateau').insert(data)
    }
    setShowInfoForm(false)
    setEditInfo(null)
    loadInfos()
  }

  async function deleteInfo(id: string) {
    if (!confirm('Supprimer ce message ?')) return
    await supabase.from('info_bateau').delete().eq('id', id)
    loadInfos()
  }

  const today = todayIso()
  const activeInfos  = infos.filter(i => i.date_fin >= today)
  const expiredInfos = infos.filter(i => i.date_fin < today)

  return (
    <div className="pb-20">
      {/* Onglets */}
      <div className="flex gap-1 mx-4 mt-4 bg-gray-100 rounded-2xl p-1">
        {(['horaires', 'infos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
            }`}>
            {t === 'horaires' ? '🕐 Horaires' : '📢 Infos'}
          </button>
        ))}
      </div>

      {/* ── TAB HORAIRES ── */}
      {tab === 'horaires' && (
        <div className="mx-4 mt-4 space-y-4">
          {/* Filtre date + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <CsvImport onImported={loadHoraires} />
            <button
              onClick={() => { setEditHoraire(null); setShowHoraireForm(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold ml-auto">
              + Trajet
            </button>
          </div>

          {(showHoraireForm || editHoraire) && (
            <HoraireForm
              initial={editHoraire ?? undefined}
              onSave={saveHoraire}
              onCancel={() => { setShowHoraireForm(false); setEditHoraire(null) }}
            />
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : horaires.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">Aucun trajet ce jour</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {horaires.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">
                      {h.heure.slice(0,5)} — {h.port_depart} → {h.port_arrivee}
                    </p>
                    <p className="text-xs text-gray-400">
                      {h.compagnie}{h.duree_min ? ` · ${h.duree_min} min` : ''}
                      {h.note ? ` · ${h.note}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUT_BADGE[h.statut]}`}>
                    {h.statut === 'prevu' ? 'Prévu' : h.statut === 'annule' ? 'Annulé' : 'Changé'}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => toggleStatut(h)}
                      className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold">
                      {h.statut === 'annule' ? '↩ Rétablir' : '✕ Annuler'}
                    </button>
                    <button onClick={() => { setEditHoraire(h); setShowHoraireForm(false) }}
                      className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                      ✏️
                    </button>
                    <button onClick={() => deleteHoraire(h.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB INFOS ── */}
      {tab === 'infos' && (
        <div className="mx-4 mt-4 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditInfo(null); setShowInfoForm(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">
              + Message
            </button>
          </div>

          {(showInfoForm || editInfo) && (
            <InfoForm
              initial={editInfo ?? undefined}
              onSave={saveInfo}
              onCancel={() => { setShowInfoForm(false); setEditInfo(null) }}
            />
          )}

          {/* Actifs */}
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
                        <span className="text-xs text-gray-400">jusqu'au {info.date_fin}</span>
                      </div>
                      <p className="text-sm text-gray-700">{info.message}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditInfo(info); setShowInfoForm(false) }}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600">✏️</button>
                      <button onClick={() => deleteInfo(info.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expirés */}
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

          {!loading && infos.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">Aucun message</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
