'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Parser CSV léger côté client (pour l'aperçu uniquement) ─────────────────

function parseCSVPreview(content: string): { headers: string[]; rows: Record<string, string>[] } {
  let i = 0
  let headers: string[] | null = null
  const rows: Record<string, string>[] = []

  function parseField(): string {
    if (content[i] === '"') {
      i++
      let v = ''
      while (i < content.length) {
        if (content[i] === '"' && content[i + 1] === '"') { v += '"'; i += 2 }
        else if (content[i] === '"') { i++; break }
        else { v += content[i++] }
      }
      return v
    }
    let v = ''
    while (i < content.length && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') v += content[i++]
    return v
  }

  function parseLine(): string[] {
    const fs: string[] = []
    while (i < content.length) {
      fs.push(parseField())
      if (content[i] === ',') i++
      else { if (content[i] === '\r') i++; if (content[i] === '\n') i++; break }
    }
    return fs
  }

  while (i < content.length) {
    const fields = parseLine()
    if (!fields.length || (fields.length === 1 && !fields[0])) continue
    if (!headers) {
      headers = fields.map(h => h.trim())
    } else {
      if (rows.length >= 5) { /* on ne charge que 5 lignes pour l'aperçu */ }
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').trim() })
      rows.push(row)
    }
  }
  return { headers: headers ?? [], rows }
}

function countAllRows(content: string): number {
  let count = 0, inQuotes = false
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '"') inQuotes = !inQuotes
    if (!inQuotes && content[i] === '\n') count++
  }
  return Math.max(0, count - 1) // -1 pour le header
}

// ─── Composant principal ──────────────────────────────────────────────────────

type Step = 'idle' | 'preview' | 'importing' | 'done'

interface Results {
  ok: number
  errors: number
  skipped: number
  total: number
  unmatchedCodes: string[]
  errorDetails: string[]
}

interface Preview {
  totalRows: number
  withImage: number
  sampleRows: Record<string, string>[]
  headers: string[]
}

export default function ImportClient() {
  const [step,     setStep]     = useState<Step>('idle')
  const [preview,  setPreview]  = useState<Preview | null>(null)
  const [results,  setResults]  = useState<Results | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef  = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const TITRE_COL   = 'Post'
  const DATE_COL    = 'Date début'
  const IMAGE_COL   = 'Affiche'

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Le fichier doit être au format CSV.')
      return
    }
    fileRef.current = file
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      const { headers, rows } = parseCSVPreview(content)
      const totalRows = countAllRows(content)
      const withImage = rows.filter(r => r[IMAGE_COL]).length
      setPreview({ totalRows, withImage, sampleRows: rows.slice(0, 3), headers })
      setStep('preview')
      setError(null)
    }
    reader.readAsText(file, 'utf-8')
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  async function runImport() {
    if (!fileRef.current) return
    setStep('importing')
    setError(null)
    try {
      const form = new FormData()
      form.append('csv', fileRef.current)
      const res = await fetch('/api/admin/import-posts', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`)
      setResults(json)
      setStep('done')
    } catch (err: any) {
      setError(err.message)
      setStep('preview')
    }
  }

  function reset() {
    setStep('idle')
    setPreview(null)
    setResults(null)
    setError(null)
    fileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

      {/* ── Étape 1 : Upload ── */}
      {step === 'idle' && (
        <>
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
              dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <p className="text-4xl mb-3">📂</p>
            <p className="font-bold text-gray-700">Dépose ton fichier CSV ici</p>
            <p className="text-sm text-gray-400 mt-1">ou clique pour choisir</p>
          </div>

          {/* Format attendu */}
          <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
            <p className="font-bold text-gray-600 text-sm mb-2">Format attendu (export Glide)</p>
            <p>Colonnes : <span className="font-mono">Post, Date début, Catégorie Code, Code Organisateur, Code Lieu, Affiche…</span></p>
            <p className="mt-1">Les URLs d'images Glide sont conservées telles quelles. Tu pourras les migrer vers Supabase Storage avec <span className="font-mono">migrate-post-images.mjs</span>.</p>
          </div>
        </>
      )}

      {/* ── Étape 2 : Aperçu ── */}
      {step === 'preview' && preview && (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-extrabold text-gray-900 text-lg">Aperçu</h2>

            {/* Stats */}
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

            {/* Aperçu des premières lignes */}
            {preview.sampleRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Premières lignes</p>
                {preview.sampleRows.map((row, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl px-4 py-3 text-sm">
                    <p className="font-semibold text-gray-900 truncate">{row[TITRE_COL] || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {row[DATE_COL] || '?'} · {row['Catégorie Code'] || '—'} · {row['Code Organisateur'] || '—'}
                      {row[IMAGE_COL] ? ' · 🖼' : ''}
                    </p>
                  </div>
                ))}
                {preview.totalRows > 3 && (
                  <p className="text-xs text-gray-400 text-center">+ {preview.totalRows - 3} autres lignes</p>
                )}
              </div>
            )}

            {/* Note images */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-800">
              🖼 Les images seront conservées avec leurs URLs Glide d'origine. Pour les migrer vers Supabase Storage, lance <span className="font-mono">migrate-post-images.mjs</span> après l'import.
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
            >
              ← Changer de fichier
            </button>
            <button
              onClick={runImport}
              className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg,#1A56DB,#3730a3)' }}
            >
              Lancer l'import →
            </button>
          </div>
        </>
      )}

      {/* ── Étape 3 : Import en cours ── */}
      {step === 'importing' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <p className="font-bold text-gray-900">Import en cours…</p>
          <p className="text-sm text-gray-400">Insertion des posts dans Supabase</p>
        </div>
      )}

      {/* ── Étape 4 : Résultats ── */}
      {step === 'done' && results && (
        <>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-extrabold text-gray-900 text-lg">Résultats</h2>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-green-700">{results.ok}</p>
                <p className="text-[10px] font-bold text-green-600 mt-0.5 uppercase tracking-wide">Importés</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-gray-500">{results.skipped}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wide">Ignorés</p>
              </div>
              <div className={`rounded-2xl p-3 text-center ${results.errors > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className={`text-2xl font-black ${results.errors > 0 ? 'text-red-600' : 'text-gray-300'}`}>{results.errors}</p>
                <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wide ${results.errors > 0 ? 'text-red-500' : 'text-gray-400'}`}>Erreurs</p>
              </div>
            </div>

            {results.unmatchedCodes.length > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 space-y-1">
                <p className="text-sm font-bold text-orange-800">⚠️ Codes sans correspondance en DB</p>
                <p className="text-xs text-orange-700">Ces posts ont été importés sans organisateur/lieu :</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {results.unmatchedCodes.map(code => (
                    <span key={code} className="text-[10px] font-mono bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                      {code}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-orange-600 mt-1">Crée les établissements manquants et relance l'import sur les lignes concernées.</p>
              </div>
            )}

            {results.errorDetails.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 space-y-1">
                <p className="text-sm font-bold text-red-800">Détail des erreurs</p>
                {results.errorDetails.map((d, i) => (
                  <p key={i} className="text-xs text-red-700 font-mono">{d}</p>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-800">
              🖼 Les images sont conservées avec leurs URLs d'origine. Pour les migrer vers Supabase Storage, lance :<br />
              <span className="font-mono mt-1 block">node scripts/migrate-post-images.mjs</span>
            </div>
          </div>

          <button
            onClick={reset}
            className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
          >
            Nouvel import
          </button>
        </>
      )}
    </div>
  )
}
