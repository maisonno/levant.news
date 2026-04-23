'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Normalisation robuste des noms de colonnes ───────────────────────────────
// Retire les accents, met en minuscule, retire les caractères spéciaux
// pour matcher quelle que soit l'encodage ou la casse du fichier CSV.

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

// Aliases pour chaque champ attendu (en normalised form)
const COL_ALIASES: Record<string, string[]> = {
  titre:               ['post', 'titre', 'title', 'nom', 'evenement'],
  date_debut:          ['date debut', 'date de debut', 'datedebut', 'debut'],
  date_fin:            ['date fin', 'datefin', 'fin'],
  heure:               ['heure', 'horaire'],
  ordre:               ['ordre dans la journee', 'ordre journee', 'ordre'],
  categorie_code:      ['categorie code', 'categorie', 'cat', 'category'],
  code_organisateur:   ['code organisateur', 'organisateur', 'org'],
  code_lieu:           ['code lieu', 'lieu', 'place'],
  publie:              ['publie', 'published', 'public'],
  mis_en_avant:        ['mis en avant', 'pin', 'featured'],
  a_laffiche:          ['a l affiche', 'a laffiche', 'laffiche', 'affiche tab'],
  dans_agenda:         ['agenda', 'dans agenda', 'in agenda'],
  affiche_url:         ['affiche', 'image', 'photo', 'visuel'],
  complement:          ['complement', 'description', 'texte', 'contenu', 'details'],
  inscription:         ['inscription', 'booking'],
  nb_places:           ['nb inscriptions max', 'places max', 'capacite', 'nb places'],
  refuse:              ['refuse', 'rejected'],
  message_admin:       ['message pour l administrateur', 'message admin', 'note admin'],
  nom_redacteur:       ['nom redacteur', 'nom auteur', 'auteur'],
  contact_redacteur:   ['contact redacteur', 'contact auteur', 'contact'],
}

function buildResolver(headers: string[]): (field: string) => string {
  const normHeaders = headers.map(h => ({ original: h, norm: normalize(h) }))
  const cache: Record<string, string> = {}
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const hit = normHeaders.find(h => h.norm === alias || h.norm.startsWith(alias))
      if (hit) { cache[field] = hit.original; break }
    }
  }
  return (field: string) => cache[field] ?? ''
}

// ─── Détection du délimiteur ──────────────────────────────────────────────────

function detectDelimiter(firstLine: string): string {
  const counts = {
    ',': (firstLine.match(/,/g) ?? []).length,
    ';': (firstLine.match(/;/g) ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
  }
  const max = Math.max(...Object.values(counts))
  return Object.entries(counts).find(([, v]) => v === max)?.[0] ?? ','
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────

function parseCSVPreview(rawContent: string) {
  // Supprimer le BOM (UTF-8 ou UTF-16)
  const content = rawContent.replace(/^﻿/, '')

  let i = 0
  let headers: string[] | null = null
  let delim = ','
  const rows: Record<string, string>[] = []

  function parseField(): string {
    if (content[i] === '"') {
      i++; let v = ''
      while (i < content.length) {
        if (content[i] === '"' && content[i + 1] === '"') { v += '"'; i += 2 }
        else if (content[i] === '"') { i++; break }
        else v += content[i++]
      }
      return v
    }
    let v = ''
    while (i < content.length && content[i] !== delim && content[i] !== '\n' && content[i] !== '\r') v += content[i++]
    return v
  }

  function parseLine(): string[] {
    const fs: string[] = []
    while (i < content.length) {
      fs.push(parseField())
      if (content[i] === delim) i++
      else { if (content[i] === '\r') i++; if (content[i] === '\n') i++; break }
    }
    return fs
  }

  while (i < content.length && rows.length < 3) {
    const start = i
    const fields = parseLine()
    if (!fields.length || (fields.length === 1 && !fields[0].trim())) continue
    if (!headers) {
      // Détection du délimiteur sur la première ligne
      const firstLine = content.slice(start, i)
      delim = detectDelimiter(firstLine)
      // Reparsing de la ligne avec le bon délimiteur si on en a changé
      if (delim !== ',') {
        i = start
        const fixed = parseLine()
        headers = fixed.map(h => h.trim())
      } else {
        headers = fields.map(h => h.trim())
      }
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').trim() })
    rows.push(row)
  }

  // Comptage total (scan rapide)
  let total = 0, inQ = false
  for (let j = 0; j < content.length; j++) {
    if (content[j] === '"') inQ = !inQ
    if (!inQ && content[j] === '\n') total++
  }

  const withImage = (content.match(/storage\.googleapis\.com/g) ?? []).length

  return { headers: headers ?? [], sampleRows: rows, totalRows: Math.max(0, total - 1), withImage }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'preview' | 'importing' | 'done'

interface PhaseState {
  phase: 'posts' | 'images'
  current: number
  total: number
  imgOk?: number
  imgErrs?: number
}

interface Results {
  ok: number; errors: number; skipped: number; total: number
  unmatchedCodes: string[]; errorDetails: string[]
  imgOk: number; imgErrors: number
}

interface Preview {
  totalRows: number; withImage: number
  sampleRows: Record<string, string>[]; headers: string[]
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function ImportClient() {
  const [step,    setStep]    = useState<Step>('idle')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [phase,   setPhase]   = useState<PhaseState | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [err,     setErr]     = useState<string | null>(null)
  const [dragging,setDragging]= useState(false)
  const fileRef  = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setErr('Le fichier doit être au format CSV.'); return
    }
    fileRef.current = file
    const reader = new FileReader()
    reader.onload = e => {
      const p = parseCSVPreview(e.target?.result as string)
      setPreview(p); setStep('preview'); setErr(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }, [])

  async function runImport() {
    if (!fileRef.current) return
    setStep('importing')
    setPhase({ phase: 'posts', current: 0, total: preview?.totalRows ?? 0 })
    setErr(null)
    try {
      const form = new FormData()
      form.append('csv', fileRef.current)
      const res = await fetch('/api/admin/import-posts', { method: 'POST', body: form })
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '')
        throw new Error(`Erreur serveur ${res.status}${txt ? ` : ${txt}` : ''}`)
      }
      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf      = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const msg = JSON.parse(line)
            if (msg.type === 'phase') {
              setPhase({ phase: msg.phase, current: 0, total: msg.total ?? 0 })
            } else if (msg.type === 'progress') {
              setPhase(prev => prev
                ? { ...prev, current: msg.current, total: msg.total, imgOk: msg.ok, imgErrs: msg.errors }
                : prev)
            } else if (msg.type === 'done') {
              setResults(msg); setStep('done')
            } else if (msg.type === 'error') {
              throw new Error(msg.message)
            }
          } catch (pe: any) {
            if (pe.message?.includes('JSON')) continue
            throw pe
          }
        }
      }
    } catch (e: any) {
      setErr(e.message); setStep('preview')
    }
  }

  function reset() {
    setStep('idle'); setPreview(null); setPhase(null)
    setResults(null); setErr(null); fileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
  }

  // Résolution des colonnes pour l'aperçu
  const resolver = preview ? buildResolver(preview.headers) : null
  const titreCol   = resolver ? resolver('titre')      : 'Post'
  const dateCol    = resolver ? resolver('date_debut') : 'Date début'
  const catCol     = resolver ? resolver('categorie_code') : 'Catégorie Code'
  const orgCol     = resolver ? resolver('code_organisateur') : 'Code Organisateur'
  const imgCol     = resolver ? resolver('affiche_url') : 'Affiche'

  const pct = phase && phase.total > 0 ? Math.round((phase.current / phase.total) * 100) : 0

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">

      {/* ── Idle ── */}
      {step === 'idle' && (
        <>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
              dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <p className="text-4xl mb-3">📂</p>
            <p className="font-bold text-gray-700">Dépose ton fichier CSV ici</p>
            <p className="text-sm text-gray-400 mt-1">ou clique pour choisir</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500">
            <p className="font-bold text-gray-600 text-sm mb-1">Format attendu (export Glide)</p>
            <p>Colonnes : <span className="font-mono">Post, Date début, Catégorie Code, Code Organisateur, Code Lieu, Affiche…</span></p>
            <p className="mt-1">Les images Glide sont téléchargées et migrées vers Supabase Storage.</p>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{err}</p>}
        </>
      )}

      {/* ── Aperçu ── */}
      {step === 'preview' && preview && (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-extrabold text-gray-900 text-lg">Aperçu du fichier</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-blue-700">{preview.totalRows}</p>
                <p className="text-xs font-semibold text-blue-600 mt-0.5">lignes détectées</p>
              </div>
              <div className="bg-amber-50 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-amber-700">{preview.withImage}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">avec image</p>
              </div>
            </div>

            {/* Colonnes détectées */}
            {titreCol ? (
              preview.sampleRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Premières lignes</p>
                  {preview.sampleRows.map((row, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm truncate">{row[titreCol] || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {row[dateCol] || '?'} · {row[catCol] || '—'} · {row[orgCol] || '—'}
                        {row[imgCol] ? ' · 🖼' : ''}
                      </p>
                    </div>
                  ))}
                  {preview.totalRows > 3 && (
                    <p className="text-xs text-gray-400 text-center">+ {preview.totalRows - 3} autres lignes…</p>
                  )}
                </div>
              )
            ) : (
              /* Colonnes non reconnues : afficher les headers détectés */
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-bold text-orange-800">⚠️ Colonnes non reconnues</p>
                <p className="text-xs text-orange-700">Colonnes détectées dans le fichier :</p>
                <p className="text-xs font-mono text-orange-800 break-all">
                  {preview.headers.join(' · ')}
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Colonnes attendues : <span className="font-mono">Post, Date début, Catégorie Code, Code Organisateur, Code Lieu, Affiche</span>
                </p>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">❌ {err}</p>}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">
              ← Changer de fichier
            </button>
            <button onClick={runImport}
              disabled={!titreCol}
              className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}>
              Lancer l'import →
            </button>
          </div>
        </>
      )}

      {/* ── Import en cours ── */}
      {step === 'importing' && phase && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-t-transparent animate-spin flex-shrink-0"
              style={{ borderWidth: 3, borderColor: '#1A56DB', borderTopColor: 'transparent' }} />
            <div>
              <p className="font-bold text-gray-900">
                {phase.phase === 'posts' ? 'Insertion des posts…' : 'Migration des images…'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {phase.current} / {phase.total} {phase.phase === 'posts' ? 'lignes' : 'images'}
                {phase.phase === 'images' && phase.imgOk !== undefined && (
                  <> · ✅ {phase.imgOk}{phase.imgErrs ? ` · ❌ ${phase.imgErrs}` : ''}</>
                )}
              </p>
            </div>
          </div>
          {phase.total > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>{phase.phase === 'posts' ? 'Posts' : 'Images'}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    background: phase.phase === 'posts'
                      ? 'linear-gradient(90deg,#1A56DB,#3730a3)'
                      : 'linear-gradient(90deg,#059669,#0d9488)',
                  }} />
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Ne ferme pas cet onglet pendant l'import.</p>
        </div>
      )}

      {/* ── Résultats ── */}
      {step === 'done' && results && (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-extrabold text-gray-900 text-lg">Import terminé 🎉</h2>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Posts</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Importés', val: results.ok,      color: 'green' },
                  { label: 'Ignorés',  val: results.skipped, color: 'gray'  },
                  { label: 'Erreurs',  val: results.errors,  color: results.errors > 0 ? 'red' : 'gray' },
                ].map(({ label, val, color }) => (
                  <div key={label} className={`rounded-2xl p-3 text-center bg-${color}-50`}>
                    <p className={`text-2xl font-black text-${color}-${color === 'gray' ? '400' : '700'}`}>{val}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 text-${color}-${color === 'gray' ? '400' : '600'}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {(results.imgOk + results.imgErrors) > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Images</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-teal-50 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-black text-teal-700">{results.imgOk}</p>
                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mt-0.5">Migrées</p>
                  </div>
                  <div className={`rounded-2xl p-3 text-center ${results.imgErrors > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <p className={`text-2xl font-black ${results.imgErrors > 0 ? 'text-orange-600' : 'text-gray-300'}`}>{results.imgErrors}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${results.imgErrors > 0 ? 'text-orange-500' : 'text-gray-400'}`}>Échecs</p>
                  </div>
                </div>
              </div>
            )}

            {results.unmatchedCodes.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 space-y-2">
                <p className="text-sm font-bold text-orange-800">⚠️ Codes sans correspondance en DB</p>
                <p className="text-xs text-orange-700">Ces posts ont été importés sans organisateur/lieu :</p>
                <div className="flex flex-wrap gap-1.5">
                  {results.unmatchedCodes.map(c => (
                    <span key={c} className="text-[10px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {results.errorDetails.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1">
                <p className="text-sm font-bold text-red-800">Détail des erreurs</p>
                {results.errorDetails.map((d, i) => (
                  <p key={i} className="text-xs text-red-700 font-mono break-all">{d}</p>
                ))}
              </div>
            )}
          </div>

          <button onClick={reset} className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">
            Nouvel import
          </button>
        </>
      )}
    </div>
  )
}
