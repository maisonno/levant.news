'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostWithRelations, Categorie, Etablissement } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  CONCERT: 'bg-purple-100 text-purple-700', SOIREE: 'bg-indigo-100 text-indigo-700',
  SPORT: 'bg-green-100 text-green-700',     EXPO: 'bg-amber-100 text-amber-700',
  MARCHE: 'bg-orange-100 text-orange-700',  SPECTACLE: 'bg-pink-100 text-pink-700',
  INFO: 'bg-blue-100 text-blue-700',        INFOCRITIQUE: 'bg-red-100 text-red-700',
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Tab = 'moderation' | 'avenir' | 'tous'

// ─── Formulaire post ──────────────────────────────────────────────────────────

interface PostFormProps {
  initial?: Partial<PostWithRelations>
  categories: Categorie[]
  etablissements: Etablissement[]
  onSave: (data: Partial<PostWithRelations>) => Promise<void>
  onClose: () => void
}

function PostForm({ initial, categories, etablissements, onSave, onClose }: PostFormProps) {
  const [titre,        setTitre]        = useState(initial?.titre ?? '')
  const [complement,   setComplement]   = useState(initial?.complement ?? '')
  const [dateDebut,    setDateDebut]    = useState(initial?.date_debut ?? '')
  const [dateFin,      setDateFin]      = useState(initial?.date_fin ?? '')
  const [heure,        setHeure]        = useState(initial?.heure ?? '')
  const [categorieCode,setCategorieCode]= useState(initial?.categorie_code ?? '')
  const [organisateurId,setOrganisateurId] = useState(initial?.organisateur_id ?? '')
  const [lieuId,       setLieuId]       = useState(initial?.lieu_id ?? '')
  const [publie,       setPublie]       = useState(initial?.publie ?? false)
  const [misEnAvant,   setMisEnAvant]   = useState(initial?.mis_en_avant ?? false)
  const [afficheUrl,   setAfficheUrl]   = useState(initial?.affiche_url ?? '')
  const [inscription,  setInscription]  = useState(initial?.inscription ?? false)
  const [nbMax,        setNbMax]        = useState(initial?.nb_inscriptions_max?.toString() ?? '')
  const [refuse,       setRefuse]       = useState(initial?.refuse ?? false)
  const [saving, setSaving] = useState(false)

  const lieux = etablissements.filter(e => e.est_lieu)
  const orgas = etablissements.filter(e => e.est_organisateur)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      titre, complement: complement || null,
      date_debut: dateDebut, date_fin: dateFin || null,
      heure: heure || null, categorie_code: categorieCode || null,
      organisateur_id: organisateurId || null, lieu_id: lieuId || null,
      publie, mis_en_avant: misEnAvant, affiche_url: afficheUrl || null,
      inscription, nb_inscriptions_max: nbMax ? parseInt(nbMax) : null,
      refuse,
    })
    setSaving(false)
  }

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Titre *</label>
        <input required value={titre} onChange={e => setTitre(e.target.value)} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Date début *</label>
          <input type="date" required value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={field} />
        </div>
        <div>
          <label className="label">Date fin</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label className="label">Heure</label>
        <input value={heure} onChange={e => setHeure(e.target.value)} placeholder="21h, 18h-20h…" className={field} />
      </div>
      <div>
        <label className="label">Catégorie</label>
        <select value={categorieCode} onChange={e => setCategorieCode(e.target.value)} className={field}>
          <option value="">— Aucune —</option>
          {categories.map(c => <option key={c.code} value={c.code}>{c.nom}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Organisateur</label>
        <select value={organisateurId} onChange={e => setOrganisateurId(e.target.value)} className={field}>
          <option value="">— Aucun —</option>
          {orgas.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Lieu</label>
        <select value={lieuId} onChange={e => setLieuId(e.target.value)} className={field}>
          <option value="">— Aucun —</option>
          {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea rows={4} value={complement} onChange={e => setComplement(e.target.value)} className={field + ' resize-none'} />
      </div>
      <div>
        <label className="label">URL affiche</label>
        <input value={afficheUrl} onChange={e => setAfficheUrl(e.target.value)} placeholder="https://…" className={field} />
      </div>
      {/* Toggles */}
      <div className="grid grid-cols-2 gap-2">
        {([
          [publie, setPublie, 'Publié'],
          [misEnAvant, setMisEnAvant, 'Mis en avant'],
          [inscription, setInscription, 'Inscription'],
          [refuse, setRefuse, 'Refusé'],
        ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
          <button key={label} type="button" onClick={() => setter(!val)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold text-left ${
              val ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400'
            }`}>
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${val ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
              {val && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            {label}
          </button>
        ))}
      </div>
      {inscription && (
        <div>
          <label className="label">Places max</label>
          <input type="number" value={nbMax} onChange={e => setNbMax(e.target.value)} min={1} className={field} />
        </div>
      )}
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

// ─── Carte post ───────────────────────────────────────────────────────────────

interface PostCardProps {
  post: PostWithRelations
  onPublier:   () => void
  onDepublier: () => void
  onRefuser:   () => void
  onEdit:      () => void
  onDelete:    () => void
}

function PostCard({ post, onPublier, onDepublier, onRefuser, onEdit, onDelete }: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cat = post.categorie
  const catColor = cat ? (CAT_COLORS[cat.code] ?? 'bg-gray-100 text-gray-600') : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {cat && catColor && (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${catColor} mr-1`}>
              {cat.nom}
            </span>
          )}
          {post.refuse && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600 mr-1">Refusé</span>
          )}
        </div>
        {/* Menu … */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(v => !v)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-lg leading-none">
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden min-w-[140px]">
              <button onClick={() => { onEdit(); setMenuOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">✏️ Modifier</button>
              {!post.publie && !post.refuse && (
                <button onClick={() => { onPublier(); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-3 text-sm text-green-700 hover:bg-green-50">✅ Publier</button>
              )}
              {post.publie && (
                <button onClick={() => { onDepublier(); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-3 text-sm text-orange-700 hover:bg-orange-50">⏸ Dépublier</button>
              )}
              {!post.refuse && !post.publie && (
                <button onClick={() => { onRefuser(); setMenuOpen(false) }}
                  className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-red-50">❌ Refuser</button>
              )}
              <button onClick={() => { onDelete(); setMenuOpen(false) }}
                className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-red-50 border-t border-gray-100">🗑 Supprimer</button>
            </div>
          )}
        </div>
      </div>

      <p className="font-bold text-gray-900 text-sm leading-snug">{post.titre}</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
        <span>📅 {fmtDate(post.date_debut)}</span>
        {post.lieu && <span>📍 {post.lieu.nom}</span>}
        {post.organisateur && <span>🏪 {post.organisateur.nom}</span>}
        {post.nom_redacteur && <span>✍️ {post.nom_redacteur}</span>}
      </div>

      {/* Action principale selon statut */}
      {!post.publie && !post.refuse && (
        <div className="flex gap-2 pt-1">
          <button onClick={onPublier}
            className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">
            ✅ Publier
          </button>
          <button onClick={onRefuser}
            className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold">
            Refuser
          </button>
        </div>
      )}
      {post.publie && (
        <button onClick={onDepublier}
          className="w-full py-2 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold">
          Dépublier
        </button>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PostsAdmin() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('moderation')
  const [posts, setPosts]           = useState<PostWithRelations[]>([])
  const [categories, setCategories] = useState<Categorie[]>([])
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [editPost, setEditPost]     = useState<PostWithRelations | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const [postsRes, catRes, etabRes] = await Promise.all([
      supabase.from('posts').select(`
        *,
        organisateur:organisateur_id(id,nom,photo_url),
        lieu:lieu_id(id,nom),
        categorie:categorie_code(code,nom)
      `).order('created_at', { ascending: false }).limit(300),
      supabase.from('categories').select('*').order('nom'),
      supabase.from('etablissements').select('*').order('nom'),
    ])
    if (postsRes.data) setPosts(postsRes.data as PostWithRelations[])
    if (catRes.data)   setCategories(catRes.data)
    if (etabRes.data)  setEtablissements(etabRes.data)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Filtres selon onglet
  const filtered = posts.filter(p => {
    if (tab === 'moderation') return !p.publie && !p.refuse
    if (tab === 'avenir')     return p.publie && p.date_debut >= today
    return true
  }).filter(p => {
    const q = search.toLowerCase()
    return !q || p.titre.toLowerCase().includes(q) ||
      (p.organisateur?.nom ?? '').toLowerCase().includes(q) ||
      (p.nom_redacteur ?? '').toLowerCase().includes(q)
  })

  const count = {
    moderation: posts.filter(p => !p.publie && !p.refuse).length,
    avenir:     posts.filter(p => p.publie && p.date_debut >= today).length,
    tous:       posts.length,
  }

  async function updatePost(id: string, data: object) {
    await supabase.from('posts').update(data).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
  }

  async function deletePost(id: string) {
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
  }

  async function savePost(data: Partial<PostWithRelations>) {
    if (editPost?.id) {
      await supabase.from('posts').update(data).eq('id', editPost.id)
      await load()
    } else {
      await supabase.from('posts').insert({ ...data, dans_agenda: true })
      await load()
    }
    setShowForm(false)
    setEditPost(null)
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'moderation', label: 'À modérer', count: count.moderation },
    { id: 'avenir',     label: 'À venir',   count: count.avenir     },
    { id: 'tous',       label: 'Tous',      count: count.tous       },
  ]

  return (
    <div className="pb-10">
      {/* Sous-onglets */}
      <div className="bg-white border-b border-gray-100 px-4 flex gap-1 overflow-x-auto sticky top-[104px] z-20" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-3 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                t.id === 'moderation' && t.count > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Barre outils */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        <button onClick={() => { setEditPost(null); setShowForm(true) }}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex-shrink-0">
          + Ajouter
        </button>
      </div>

      {/* Liste */}
      <div className="px-4 pt-4 space-y-3">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            {tab === 'moderation' ? '✅ File de modération vide.' : 'Aucun résultat.'}
          </p>
        )}
        {filtered.map(p => (
          <PostCard key={p.id} post={p}
            onPublier={()   => updatePost(p.id, { publie: true, refuse: false })}
            onDepublier={() => updatePost(p.id, { publie: false })}
            onRefuser={() => updatePost(p.id, { refuse: true, publie: false })}
            onEdit={() => { setEditPost(p); setShowForm(true) }}
            onDelete={() => setConfirmDelete(p.id)}
          />
        ))}
      </div>

      {/* Formulaire slide-up */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-extrabold text-gray-900">{editPost ? 'Modifier le post' : 'Nouveau post'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <PostForm
                initial={editPost ?? undefined}
                categories={categories}
                etablissements={etablissements}
                onSave={savePost}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        </>
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
            <p className="font-bold text-gray-900 text-center">Supprimer ce post ?</p>
            <p className="text-sm text-gray-400 text-center">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">Annuler</button>
              <button onClick={() => deletePost(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
