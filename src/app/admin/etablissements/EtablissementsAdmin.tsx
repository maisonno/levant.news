'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Etablissement, TypeEtablissement } from '@/types/database'
import ImagePicker from '@/components/admin/ImagePicker'

const TYPE_LABELS: Record<string, string> = {
  SERVICES:         'Services',
  BARS_RESTAURANTS: 'Bars & Restaurants',
  COMMERCES:        'Commerces',
  LIEU:             'Lieux',
  HOTELS:           'Hôtels',
  ASSOCIATIONS:     'Associations',
  SERVICES_PUBLICS: 'Services Publics',
  ARTS:             'Arts',
  SPORT_BIEN_ETRE:  'Sport & Bien-être',
}

// ─── Formulaire ───────────────────────────────────────────────────────────────

function EtabForm({
  initial, types, onSave, onClose,
}: {
  initial?: Partial<Etablissement>
  types: TypeEtablissement[]
  onSave: (data: Partial<Etablissement>) => Promise<void>
  onClose: () => void
}) {
  const [nom,          setNom]          = useState(initial?.nom ?? '')
  const [typeCode,     setTypeCode]     = useState(initial?.type_code ?? '')
  const [statut,       setStatut]       = useState(initial?.statut ?? '')
  const [description,  setDescription]  = useState(initial?.description ?? '')
  const [horaires,     setHoraires]     = useState(initial?.horaires ?? '')
  const [telephone,    setTelephone]    = useState(initial?.telephone ?? '')
  const [email,        setEmail]        = useState(initial?.email ?? '')
  const [siteUrl,      setSiteUrl]      = useState(initial?.site_url ?? '')
  const [adresse,      setAdresse]      = useState(initial?.adresse ?? '')
  const [photoUrl,     setPhotoUrl]     = useState(initial?.photo_url ?? '')
  const [liste,        setListe]        = useState(initial?.liste ?? true)
  const [estLieu,      setEstLieu]      = useState(initial?.est_lieu ?? false)
  const [estOrga,      setEstOrga]      = useState(initial?.est_organisateur ?? false)
  const [saving, setSaving] = useState(false)

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      nom, type_code: typeCode || null,
      statut: statut || null, description: description || null,
      horaires: horaires || null, telephone: telephone || null,
      email: email || null, site_url: siteUrl || null,
      adresse: adresse || null, photo_url: photoUrl || null,
      liste, est_lieu: estLieu, est_organisateur: estOrga,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Nom *</label>
        <input required value={nom} onChange={e => setNom(e.target.value)} className={field} />
      </div>
      <div>
        <label className="label">Type</label>
        <select value={typeCode} onChange={e => setTypeCode(e.target.value)} className={field}>
          <option value="">— Aucun —</option>
          {types.map(t => <option key={t.code} value={t.code}>{t.nom}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Statut</label>
        <input value={statut} onChange={e => setStatut(e.target.value)} placeholder="Ouvert, Fermé pour saison…" className={field} />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className={field + ' resize-none'} />
      </div>
      <div>
        <label className="label">Horaires</label>
        <textarea rows={2} value={horaires} onChange={e => setHoraires(e.target.value)} className={field + ' resize-none'} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Téléphone</label>
          <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={field} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label className="label">Site web</label>
        <input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://…" className={field} />
      </div>
      <div>
        <label className="label">Adresse</label>
        <input value={adresse} onChange={e => setAdresse(e.target.value)} className={field} />
      </div>
      <div>
        <label className="label">Photo</label>
        <ImagePicker value={photoUrl} onChange={setPhotoUrl} bucket="etab-images" folder="etabs" />
      </div>
      {/* Toggles */}
      <div className="grid grid-cols-3 gap-2">
        {([
          [liste, setListe, 'Listé'],
          [estLieu, setEstLieu, 'Lieu'],
          [estOrga, setEstOrga, 'Organisateur'],
        ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
          <button key={label} type="button" onClick={() => setter(!val)}
            className={`flex items-center gap-1.5 px-2 py-2.5 rounded-xl border text-xs font-semibold ${
              val ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400'
            }`}>
            <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${val ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
              {val && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            {label}
          </button>
        ))}
      </div>
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

interface EtablissementsAdminProps {
  etablissementIds?: string[] // undefined = admin (pas de filtre) ; tableau = filtre pro
  topOffset?: string           // classe Tailwind sticky top-* (défaut: top-[104px])
  isAdmin?: boolean
}

export default function EtablissementsAdmin({ etablissementIds, topOffset = 'top-[45px]', isAdmin = true }: EtablissementsAdminProps) {
  const supabase = createClient()
  const [etabs,   setEtabs]   = useState<Etablissement[]>([])
  const [types,   setTypes]   = useState<TypeEtablissement[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [editEtab,  setEditEtab]  = useState<Etablissement | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let etabQuery = supabase.from('etablissements').select('*').order('nom')

    // Filtre pro : seulement les établissements liés à l'utilisateur
    if (etablissementIds !== undefined) {
      if (etablissementIds.length === 0) {
        etabQuery = etabQuery.eq('id', 'none')
      } else {
        etabQuery = etabQuery.in('id', etablissementIds)
      }
    }

    const [etabRes, typeRes] = await Promise.all([
      etabQuery,
      supabase.from('type_etablissement').select('*').order('ordre'),
    ])
    if (etabRes.data) setEtabs(etabRes.data)
    if (typeRes.data) setTypes(typeRes.data)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const filtered = etabs.filter(e => {
    const q = search.toLowerCase()
    return !q || e.nom.toLowerCase().includes(q) || (e.type_code ?? '').toLowerCase().includes(q)
  })

  // Grouper par type
  const typeCodes = [...new Set(filtered.map(e => e.type_code ?? ''))].sort()
  const grouped = typeCodes.map(tc => ({
    typeCode: tc,
    label: types.find(t => t.code === tc)?.nom ?? tc ?? 'Sans type',
    items: filtered.filter(e => (e.type_code ?? '') === tc),
  })).filter(g => g.items.length > 0)

  async function toggleListe(id: string, val: boolean) {
    await supabase.from('etablissements').update({ liste: val }).eq('id', id)
    setEtabs(prev => prev.map(e => e.id === id ? { ...e, liste: val } : e))
  }
  async function deleteEtab(id: string) {
    await supabase.from('etablissements').delete().eq('id', id)
    setEtabs(prev => prev.filter(e => e.id !== id))
    setConfirmDelete(null)
  }
  async function saveEtab(data: Partial<Etablissement>) {
    if (editEtab?.id) {
      await supabase.from('etablissements').update(data).eq('id', editEtab.id)
    } else {
      await supabase.from('etablissements').insert({ ...data, code: data.nom?.toUpperCase().replace(/\s+/g, '_') ?? '' })
    }
    await load()
    setShowForm(false)
    setEditEtab(null)
  }

  return (
    <div className="pb-10">
      {/* Barre outils */}
      <div className={`px-4 py-3 bg-white border-b border-gray-100 flex gap-2 sticky ${topOffset} z-20`}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        {isAdmin && (
          <button onClick={() => { setEditEtab(null); setShowForm(true) }}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex-shrink-0">
            + Ajouter
          </button>
        )}
      </div>

      {/* Liste groupée */}
      <div className="px-4 pt-4 space-y-6">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun établissement.</p>
        )}
        {grouped.map(({ typeCode, label, items }) => (
          <div key={typeCode}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">{label}</p>
            <div className="space-y-2">
              {items.map(e => (
                <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    {e.photo_url
                      ? <img src={e.photo_url} alt={e.nom} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                      : <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">🏪</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{e.nom}</p>
                      {e.statut && <p className="text-xs text-gray-400">{e.statut}</p>}
                    </div>
                    <button onClick={() => toggleListe(e.id, !e.liste)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ${e.liste ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {e.liste ? 'Listé' : 'Caché'}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditEtab(e); setShowForm(true) }}
                      className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                      ✏️ Modifier
                    </button>
                    {isAdmin && (
                      <button onClick={() => setConfirmDelete(e.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
              <h2 className="font-extrabold text-gray-900">{editEtab ? 'Modifier' : 'Nouvel établissement'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <EtabForm initial={editEtab ?? undefined} types={types}
                onSave={saveEtab} onClose={() => setShowForm(false)} />
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
            <p className="font-bold text-gray-900 text-center">Supprimer cet établissement ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">Annuler</button>
              <button onClick={() => deleteEtab(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
