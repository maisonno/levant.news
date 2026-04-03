/**
 * Migration des images de posts : Glide/Slides → Supabase Storage
 *
 * Prérequis :
 *   1. Avoir créé le bucket post-images dans Supabase (cf. storage-post-images.sql)
 *   2. Définir les variables d'environnement :
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_KEY=eyJ...  (clé service role, PAS la clé anon)
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-post-images.mjs
 *
 * Options :
 *   --dry-run   Affiche ce qui serait fait sans rien modifier
 *   --limit N   Limite à N posts (pour tester)
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
      if (!process.env[key]) process.env[key] = val  // ne pas écraser les vars du shell
    }
  } catch { /* fichier absent, pas grave */ }
}

// Cherche .env.local dans le répertoire courant et celui du script
loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

// ─── Config ───────────────────────────────────────────────────────────────────

// Accepte SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_URL         = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET           = 'post-images'
const DRY_RUN          = process.argv.includes('--dry-run')
const LIMIT            = (() => {
  const i = process.argv.indexOf('--limit')
  return i >= 0 ? parseInt(process.argv[i + 1]) : null
})()

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAlreadyMigrated(url) {
  return url?.includes(SUPABASE_URL)
}

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
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: false,
    })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍 Mode DRY-RUN activé (aucune modification)' : '🚀 Migration démarrée')

  // 1. Récupérer tous les posts avec une affiche_url non migrée
  let query = supabase
    .from('posts')
    .select('id, titre, affiche_url')
    .not('affiche_url', 'is', null)
    .order('created_at', { ascending: false })

  if (LIMIT) query = query.limit(LIMIT)

  const { data: posts, error } = await query
  if (error) { console.error('❌ Erreur Supabase :', error.message); process.exit(1) }

  const toMigrate = posts.filter(p => p.affiche_url && !isAlreadyMigrated(p.affiche_url))
  const alreadyDone = posts.length - toMigrate.length

  console.log(`\n📋 ${posts.length} posts avec affiche_url`)
  console.log(`   ✅ ${alreadyDone} déjà migrés`)
  console.log(`   ⏳ ${toMigrate.length} à migrer\n`)

  if (toMigrate.length === 0) {
    console.log('🎉 Rien à faire !')
    return
  }

  let success = 0, errors = 0

  for (const post of toMigrate) {
    const shortTitle = post.titre.slice(0, 40)
    process.stdout.write(`  [${success + errors + 1}/${toMigrate.length}] ${shortTitle}… `)

    if (DRY_RUN) {
      console.log(`→ ${post.affiche_url}`)
      success++
      continue
    }

    try {
      // Télécharger l'image
      const { buffer, contentType } = await downloadImage(post.affiche_url)
      const ext = guessExt(contentType, post.affiche_url)
      const filename = `posts/${post.id}.${ext}`

      // Uploader dans Supabase Storage
      const publicUrl = await uploadToSupabase(buffer, contentType, filename)

      // Mettre à jour le post
      const { error: updateErr } = await supabase
        .from('posts')
        .update({ affiche_url: publicUrl })
        .eq('id', post.id)

      if (updateErr) throw updateErr

      console.log(`✅ ${publicUrl.split('/').pop()}`)
      success++

      // Pause légère pour éviter de saturer
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

  if (errors > 0) {
    console.log('\n⚠️  Relance le script pour réessayer les erreurs.')
    console.log('   (Les images déjà migrées seront ignorées.)')
  } else {
    console.log('\n🎉 Migration terminée !')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
