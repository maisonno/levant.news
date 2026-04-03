/**
 * Migration des images d'établissements : Glide/Slides → Supabase Storage
 *
 * Prérequis :
 *   1. Avoir créé le bucket etab-images dans Supabase (cf. storage-etab-article-images.sql)
 *   2. Ajouter SUPABASE_SERVICE_KEY dans .env.local
 *
 * Usage :
 *   node scripts/migrate-etab-images.mjs
 *
 * Options :
 *   --dry-run   Affiche ce qui serait fait sans rien modifier
 *   --limit N   Limite à N établissements (pour tester)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Chargement automatique de .env.local ────────────────────────────────────

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* fichier absent */ }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET  = 'etab-images'
const FOLDER  = 'etabs'
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT   = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? parseInt(process.argv[i + 1]) : null })()

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAlreadyMigrated(url) { return url?.includes(SUPABASE_URL) }

function guessExt(contentType, url) {
  if (contentType?.includes('png'))  return 'png'
  if (contentType?.includes('gif'))  return 'gif'
  if (contentType?.includes('webp')) return 'webp'
  if (url?.endsWith('.png'))  return 'png'
  if (url?.endsWith('.gif'))  return 'gif'
  if (url?.endsWith('.webp')) return 'webp'
  return 'jpg'
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'levant-news-migration/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
  const contentType = res.headers.get('content-type') ?? ''
  const buffer = await res.arrayBuffer()
  return { buffer, contentType }
}

async function uploadToSupabase(buffer, contentType, filename) {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, { contentType, upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍 Mode DRY-RUN activé (aucune modification)' : '🚀 Migration établissements démarrée')

  let query = supabase
    .from('etablissements')
    .select('id, nom, photo_url')
    .not('photo_url', 'is', null)
    .order('nom')

  if (LIMIT) query = query.limit(LIMIT)

  const { data: etabs, error } = await query
  if (error) { console.error('❌ Erreur Supabase :', error.message); process.exit(1) }

  const toMigrate  = etabs.filter(e => e.photo_url && !isAlreadyMigrated(e.photo_url))
  const alreadyDone = etabs.length - toMigrate.length

  console.log(`\n📋 ${etabs.length} établissements avec photo_url`)
  console.log(`   ✅ ${alreadyDone} déjà migrés`)
  console.log(`   ⏳ ${toMigrate.length} à migrer\n`)

  if (toMigrate.length === 0) { console.log('🎉 Rien à faire !'); return }

  let success = 0, errors = 0

  for (const etab of toMigrate) {
    const label = etab.nom.slice(0, 40)
    process.stdout.write(`  [${success + errors + 1}/${toMigrate.length}] ${label}… `)

    if (DRY_RUN) { console.log(`→ ${etab.photo_url}`); success++; continue }

    try {
      const { buffer, contentType } = await downloadImage(etab.photo_url)
      const ext = guessExt(contentType, etab.photo_url)
      const filename = `${FOLDER}/${etab.id}.${ext}`
      const publicUrl = await uploadToSupabase(buffer, contentType, filename)

      const { error: updateErr } = await supabase
        .from('etablissements').update({ photo_url: publicUrl }).eq('id', etab.id)
      if (updateErr) throw updateErr

      console.log(`✅ ${publicUrl.split('/').pop()}`)
      success++
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.log(`❌ ${err.message}`)
      errors++
    }
  }

  console.log(`\n─────────────────────────────`)
  console.log(`✅ Succès  : ${success}`)
  console.log(`❌ Erreurs : ${errors}`)
  console.log(`─────────────────────────────`)
  if (errors > 0) console.log('\n⚠️  Relance le script pour réessayer les erreurs.')
  else console.log('\n🎉 Migration terminée !')
}

main().catch(e => { console.error(e); process.exit(1) })
