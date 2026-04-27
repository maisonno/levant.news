'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Article, ThemeArticle } from '@/types/database'
import ImagePicker from '@/components/admin/ImagePicker'
import { supabaseImg } from '@/lib/supabaseImg'

// ─── Formulaire ───────────────────────────────────────────────────────────────

function ArticleForm({
  initial, themes, onSave, onClose,
}: {
  initial?: Partial<Article>
  themes: string[]
  onSave: (data: Partial<Article>) => Promise<void>
  onClose: () => void
}) {
  const [titre,     setTitre]     = useState(initial?.titre ?? '')
  const [themeCode, setThemeCode] = useState(initial?.theme_code ?? '')
  const [texte,     setTexte]     = useState(initial?.texte ?? '')
  const [imageUrl,  setImageUrl]  = useState(initial?.image_url ?? '')
  const [lienUrl,   setLienUrl]   = useState(initial?.lien_url ?? '')
  const [ordre,     setOrdre]     = useState(initial?.ordre?.toString() ?? '0')
  const [publie,    setPublie]    = useState(initial?.publie ?? true)
  const [misEnAvant,setMisEnAvant]= useState(initial?.mis_en_avant ?? false)
  const [saving, setSaving] = useState(false)

  const field = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      titre, theme_code: themeCode, texte: texte || null,
      image_url: imageUrl || null, lien_url: lienUrl || null,
      ordre: parseInt(ordre) || 0, publie, mis_en_avant: misEnAvant,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Titre *</label>
        <input required value={titre} onChange={e => setTitre(e.target.value)} className={field} />
      </div>
      <div>
        <label className="label">Thème *</label>
        <input required value={themeCode} onChange={e => setThemeCode(e.target.value)}
          list="themes-list" placeholder="Vie au Levant, Transport…" className={field} />
        <datalist id="themes-list">
          {themes.map(t => <option key={t} value={t} />)}
        </datalist>
      </div>
      <div>
        <label className="label">Texte (Markdown)</label>
        <textarea rows={6} value={texte} onChange={e => setTexte(e.target.value)}
          className={field + ' resize-none font-mono text-xs'} />
      </div>
      <div>
        <label className="label">Image</label>
        <ImagePicker value={imageUrl} onChange={setImageUrl} bucket="article-images" folder="articles" />
      </div>
      <div>
        <label className="label">URL lien</label>
        <input value={lienUrl} onChange={e => setLienUrl(e.target.value)} placeholder="https://… (une par ligne pour plusieurs)" className={field} />
      </div>
      <div>
        <label className="label">Ordre</label>
        <input type="number" value={ordre} onChange={e => setOrdre(e.target.value)} min={0} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([
          [publie, setPublie, 'Publié'],
          [misEnAvant, setMisEnAvant, '📌 Épinglé à la une'],
        ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
          <button key={label} type="button" onClick={() => setter(!val)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold ${
              val ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-400'
            }`}>
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${val ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
              {val && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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

export default function ArticlesAdmin() {
  const supabase = createClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [editArticle, setEditArticle] = useState<Article | null>(null)
  const [showForm,    setShowForm]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('articles').select('*').order('theme_code').order('ordre')
    if (data) setArticles(data)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const themes = [...new Set(articles.map(a => a.theme_code))].sort()

  const filtered = articles.filter(a => {
    const q = search.toLowerCase()
    return !q || a.titre.toLowerCase().includes(q) || a.theme_code.toLowerCase().includes(q)
  })

  // Grouper par thème
  const grouped = themes.map(theme => ({
    theme,
    items: filtered.filter(a => a.theme_code === theme),
  })).filter(g => g.items.length > 0)

  async function togglePublie(id: string, val: boolean) {
    await supabase.from('articles').update({ publie: val }).eq('id', id)
    setArticles(prev => prev.map(a => a.id === id ? { ...a, publie: val } : a))
  }
  async function toggleMisEnAvant(id: string, val: boolean) {
    await supabase.from('articles').update({ mis_en_avant: val }).eq('id', id)
    setArticles(prev => prev.map(a => a.id === id ? { ...a, mis_en_avant: val } : a))
  }
  async function deleteArticle(id: string) {
    await supabase.from('articles').delete().eq('id', id)
    setArticles(prev => prev.filter(a => a.id !== id))
    setConfirmDelete(null)
  }
  async function saveArticle(data: Partial<Article>) {
    if (editArticle?.id) {
      await supabase.from('articles').update(data).eq('id', editArticle.id)
    } else {
      await supabase.from('articles').insert(data)
    }
    await load()
    setShowForm(false)
    setEditArticle(null)
  }

  return (
    <div className="pb-10">
      {/* Barre outils */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex gap-2 sticky top-[104px] z-20">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        <button onClick={() => { setEditArticle(null); setShowForm(true) }}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold flex-shrink-0">
          + Ajouter
        </button>
      </div>

      {/* Liste groupée */}
      <div className="px-4 pt-4 space-y-6">
        {loading && <p className="text-center text-gray-400 text-sm py-8">Chargement…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun article.</p>
        )}
        {grouped.map(({ theme, items }) => (
          <div key={theme}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 px-1">{theme}</p>
            <div className="space-y-2">
              {items.map(a => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    {a.image_url && (
                      <img src={supabaseImg(a.image_url, 100)} alt={a.titre}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-snug">{a.titre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Ordre {a.ordre}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => togglePublie(a.id, !a.publie)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.publie ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {a.publie ? 'Publié' : 'Non publié'}
                      </button>
                      <button onClick={() => toggleMisEnAvant(a.id, !a.mis_en_avant)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${a.mis_en_avant ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                        {a.mis_en_avant ? '⭐ Hero' : 'Standard'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setEditArticle(a); setShowForm(true) }}
                      className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
                      ✏️ Modifier
                    </button>
                    <button onClick={() => setConfirmDelete(a.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold">
                      Supprimer
                    </button>
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
              <h2 className="font-extrabold text-gray-900">{editArticle ? 'Modifier l\'article' : 'Nouvel article'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <ArticleForm initial={editArticle ?? undefined} themes={themes}
                onSave={saveArticle} onClose={() => setShowForm(false)} />
            </div>
          </div>
        </>
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 shadow-2xl">
            <p className="font-bold text-gray-900 text-center">Supprimer cet article ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">Annuler</button>
              <button onClick={() => deleteArticle(confirmDelete)} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
