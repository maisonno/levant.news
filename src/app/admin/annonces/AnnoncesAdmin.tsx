'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ObjetPerdu, ObjetType } from '@/types/database'
import { notifyModerators } from '@/lib/notifyModerators'
import { supabaseImg } from '@/lib/supabaseImg'

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

export function AnnonceForm({
  initial, onSave, onClose,
}: {
  initial?: Partial<ObjetPerdu>
  onSave: (data: Partial<ObjetPerdu>) => Promise<void>
  onClose: () => void
}) {
  const [type,         setType]         = useState<ObjetType>(initial?.type ?? 'PERDU')
  const [objet,        setObjet]        = useState(initial?.objet ?? '')
  const [date,         setDate]         = useState(initial?.date_evenement ?? today())
  const [description,  setDescription]  = useState(initial?.description ?? '')
  const [lieu,         setLieu]         = useState(initial?.lieu ?? '')
  const [nomDeclarant, setNomDeclarant] = useState(initial?.nom_declarant ?? '')
  const [telephone,    setTelephone]    = useState(initial?.telephone ?? '')
  const [contact,      setContact]      = useState(initial?.contact ?? '')
  const [retrouve,     setRetrouve]     = useState(initial?.retrouve ?? false)
  const [saving, setSaving] = useState(false)

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      type, objet: objet.trim(),
      date_evenement: date,
      description: description.trim() || null,
      lieu: lieu.trim() || null,
      nom_declarant: nomDeclarant.trim(),
      telephone: telephone.trim() || null,
      contact: contact.trim() || null,
      retrouve,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(['PERDU', 'TROUVE'] as ObjetType[]).map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`py-2.5 rounded-xl text-sm font-bold border-2 ${
              type === t
                ? t === 'PERDU' ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-400'
            }`}>
            {t === 'PERDU' ? '🔍 Perdu' : '📦 Trouvé'}
          </button>
        ))}
      </div>
      <div>
        <label className="label">Objet *</label>
        <input required value={objet} onChange={e => setObjet(e.target.value)} maxLength={50} className={field} />
      </div>
      <div>
        <label className="label">Date *</label>
        <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={field} />
      </div>
      <div>
        <label className="label">Lieu</label>
        <input value={lieu} onChange={e => setLieu(e.target.value)} className={field} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={field + ' resize-none'} />
      </div>
      <div>
        <label className="label">Nom du déclarant *</label>
        <input required value={nomDeclarant} onChange={e => setNomDeclarant(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Téléphone</label>
          <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={field} />
        </div>
        <div>
          <label className="label">Contact</label>
          <input value={contact} onChange={e => setContact(e.target.value)} className={field} />
        </div>
      </div>
      <button type="button" onClick={() => setRetrouve(!retrouve)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold ${
          retrouve ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'
        }`}>
        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${retrouve ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
          {retrouve && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        Marqué comme retrouvé (annonce fermée)
      </button>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">Annuler</button>
        <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
      <style>{`.label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }`}</style>
    </form>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface AnnoncesAdminProps {
  topOffset?: string
}

export default function AnnoncesAdmin({ topOffset = 'top-[45px]' }: AnnoncesAdminProps) {
  const supabase = createClient()
  const [annonces, setAnnonces] = useState<ObjetPerdu[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editAnnonce,   setEditAnnonce]   = useState<ObjetPerdu | null>(null)
  const [showForm,      setShowForm]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('objets_perdus').select('*').order('created_at', { ascending: false })
    if (data) setAnnonces(data)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const filtered = annonces.filter(a => {
    const q = search.toLowerCase()
    return !q || a.objet.toLowerCase().includes(q) ||
      (a.lieu ?? '').toLowerCase().includes(q) ||
      a.nom_declarant.toLowerCase().includes(q)
  })

  async function toggleRetrouve(id: string, val: boolean) {
    await supabase.from('objets_perdus').update({ retrouve: val }).eq('id', id)
    setAnnonces(prev => prev.map(a => a.id === id ? { ...a, retrouve: val } : a))
  }
  async function deleteAnnonce(id: string) {
    await supabase.from('objets_perdus').delete().eq('id', id)
    setAnnonces(prev => prev.filter(a => a.id !== id))
    setConfirmDelete(null)
  }
  async function saveAnnonce(data: Partial<ObjetPerdu>) {
    if (editAnnonce?.id) {
      await supabase.from('objets_perdus').update(data).eq('id', editAnnonce.id)
    } else {
      await supabase.from('objets_perdus').insert(data)
      void notifyModerators('annonce', { ...data })
    }
    await load()
    setShowForm(false)
    setEditAnnonce(null)
  }

  return (
    <div className="pb-10">
      {/* Barre outils */}
      <div className={`px-4 py-3 bg-white border-b border-gray-100 flex gap-2 sticky ${topOffset} z-20`}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        <button onClick={() => { setEditAnnonce(null); setShowForm(true) }}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex-shrink-0">
          + Ajouter
        </button>
      </div>

      {/* Stats rapides */}
      <div className="px-4 py-3 flex gap-3">
        {[
          { label: 'Actives', count: annonces.filter(a => !a.retrouve).length, color: 'text-blue-600' },
          { label: 'Fermées', count: annonces.filter(a => a.retrouve).length,  color: 'text-gray-400' },
          { label: 'Total',   count: annonces.length,                          color: 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl px-3 py-2 flex-1 text-center shadow-sm border border-gray-100">
            <p className={`text-lg font-extrabold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Liste */}
      <div className="px-4 pt-2 space-y-2">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucune annonce.</p>
        )}
        {filtered.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              {a.photo_url
                ? <img src={supabaseImg(a.photo_url, 100)} alt={a.objet} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {a.type === 'PERDU' ? '🔍' : '📦'}
                  </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    a.type === 'PERDU' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>{a.type === 'PERDU' ? 'Perdu' : 'Trouvé'}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    a.retrouve ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
                  }`}>{a.retrouve ? 'Fermée' : 'Active'}</span>
                </div>
                <p className="font-bold text-gray-900 text-sm truncate">{a.objet}</p>
                <p className="text-xs text-gray-400">
                  {fmtDate(a.date_evenement)}
                  {a.lieu && ` · ${a.lieu}`}
                </p>
                <p className="text-xs text-gray-400">✍️ {a.nom_declarant}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => toggleRetrouve(a.id, !a.retrouve)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold ${
                  a.retrouve ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'
                }`}>
                {a.retrouve ? '↩ Restaurer' : '✅ Fermer'}
              </button>
              <button onClick={() => { setEditAnnonce(a); setShowForm(true) }}
                className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                ✏️ Modifier
              </button>
              <button onClick={() => setConfirmDelete(a.id)}
                className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire slide-up */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-extrabold text-gray-900">{editAnnonce ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <AnnonceForm initial={editAnnonce ?? undefined}
                onSave={saveAnnonce} onClose={() => setShowForm(false)} />
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
            <p className="font-bold text-gray-900 text-center">Supprimer cette annonce ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">Annuler</button>
              <button onClick={() => deleteAnnonce(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
