/**
 * Import CSV de posts depuis l'ancienne Levant.news (Glide) → Supabase
 *
 * Colonnes CSV attendues :
 *   🔒 Row ID, Post, Complément, Date début, Heure, Ordre dans la journee,
 *   Catégorie Code, Code Organisateur, Code Lieu, Publié, Mis en avant,
 *   NbLectures, Affiche, Refusé, Agenda, A l affiche, Message pour l'administrateur,
 *   Nom rédacteur, Contact rédacteur, Date fin, Inscription, Nb Inscriptions Max,
 *   DerniereInscriptionID
 *
 * Prérequis :
 *   - SUPABASE_URL + SUPABASE_SERVICE_KEY dans .env.local
 *   - Bucket "post-images" créé dans Supabase Storage (public)
 *   - Les établissements/lieux en DB avec leur champ `code`
 *
 * Usage :
 *   node scripts/import-posts-csv.mjs --csv data/posts.csv
 *   node scripts/import-posts-csv.mjs --csv data/posts.csv --dry-run
 *   node scripts/import-posts-csv.mjs --csv data/posts.csv --skip-images
 *   node scripts/import-posts-csv.mjs --csv data/posts.csv --limit 10
 *   node scripts/import-posts-csv.mjs --csv data/posts.csv --list-codes
 */

import { createClient }     from '@supabase/supabase-js'
import { readFileSync }      from 'fs'
import { resolve, basename } from 'path'

// ─── Chargement .env.local ────────────────────────────────────────────────────

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
  } catch { }
}
loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

// ─── Arguments CLI ────────────────────────────────────────────────────────────

function getArg(name) {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : null
}

const CSV_PATH    = getArg('--csv')
const LIMIT       = getArg('--limit') ? parseInt(getArg('--limit')) : null
const DRY_RUN     = process.argv.includes('--dry-run')
const SKIP_IMAGES = process.argv.includes('--skip-images')
const LIST_CODES  = process.argv.includes('--list-codes')  // mode diagnostic

if (!CSV_PATH) {
  console.error('Usage: node scripts/import-posts-csv.mjs --csv <fichier.csv> [options]')
  console.error('')
  console.error('Options :')
  console.error('  --dry-run        Affiche ce qui serait fait sans rien insérer')
  console.error('  --skip-images    Ne pas télécharger/migrer les images')
  console.error('  --limit N        Limiter à N lignes')
  console.error('  --list-codes     Lister tous les codes organisateur/lieu du CSV (diagnostic)')
  process.exit(1)
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BUCKET               = 'post-images'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables manquantes : SUPABASE_URL et SUPABASE_SERVICE_KEY requis')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Parser CSV robuste ───────────────────────────────────────────────────────
// Gère les guillemets, virgules dans les champs, retours à la ligne dans les champs.

function parseCSV(content) {
  const rows = []
  let headers = null
  let i = 0

  function parseField() {
    if (content[i] === '"') {
      // Champ entre guillemets
      i++ // sauter le guillemet ouvrant
      let value = ''
      while (i < content.length) {
        if (content[i] === '"' && content[i + 1] === '"') {
          value += '"'
          i += 2
        } else if (content[i] === '"') {
          i++ // sauter le guillemet fermant
          break
        } else {
          value += content[i++]
        }
      }
      return value
    } else {
      // Champ sans guillemets : jusqu'à la prochaine virgule ou fin de ligne
      let value = ''
      while (i < content.length && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
        value += content[i++]
      }
      return value
    }
  }

  function parseLine() {
    const fields = []
    while (i < content.length) {
      fields.push(parseField())
      if (content[i] === ',') {
        i++ // sauter la virgule
      } else {
        // Fin de ligne ou fin de fichier
        if (content[i] === '\r') i++
        if (content[i] === '\n') i++
        break
      }
    }
    return fields
  }

  while (i < content.length) {
    const fields = parseLine()
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue

    if (!headers) {
      // Nettoyer les BOM et caractères invisibles du header
      headers = fields.map(h => h.trim().replace(/^﻿/, '').replace(/[^\x20-\x7EÀ-ɏ✀-➿]/g, h.trim()))
      // Normalisation manuelle des colonnes qu'on utilise
      headers = fields.map(h => h.trim())
    } else {
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = (fields[idx] ?? '').trim()
      })
      rows.push(row)
    }
  }

  return rows
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** DD/MM/YYYY H:MM:SS ou DD/MM/YYYY → YYYY-MM-DD */
function parseDate(str) {
  if (!str) return null
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/** "true" / "false" / "" → boolean */
function parseBool(str, defaultVal = false) {
  if (str === 'true' || str === '1') return true
  if (str === 'false' || str === '0') return false
  return defaultVal
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

async function downloadAndUploadImage(url, postId) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'levant-news-migration/1.0' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? ''
  const buffer      = await res.arrayBuffer()
  const ext         = guessExt(contentType, url)
  const filename    = `posts/${postId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType, upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Lire le CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8')
  let rows = parseCSV(csvContent)
  console.log(`\n📂 CSV lu : ${rows.length} lignes (${basename(CSV_PATH)})`)

  // ── Mode diagnostic : lister les codes organisateur/lieu ──────────────────
  if (LIST_CODES) {
    const orgCodes = new Set()
    const lieuCodes = new Set()
    for (const row of rows) {
      if (row['Code Organisateur']) orgCodes.add(row['Code Organisateur'])
      if (row['Code Lieu'])         lieuCodes.add(row['Code Lieu'])
    }
    console.log('\n📋 Codes Organisateur trouvés dans le CSV :')
    for (const code of [...orgCodes].sort()) console.log(`   ${code}`)
    console.log('\n📋 Codes Lieu trouvés dans le CSV :')
    for (const code of [...lieuCodes].sort()) console.log(`   ${code}`)
    console.log('\n💡 Ces codes doivent correspondre au champ `code` dans la table etablissements.')
    return
  }

  if (LIMIT) {
    rows = rows.slice(0, LIMIT)
    console.log(`⚠️  Limité à ${LIMIT} lignes`)
  }
  if (DRY_RUN) console.log('🔍 Mode DRY-RUN activé (aucune insertion)')

  // 2. Charger les établissements (code → id)
  const { data: etabs, error: etabErr } = await supabase
    .from('etablissements')
    .select('id, code, nom')
  if (etabErr) { console.error('❌ Erreur chargement établissements :', etabErr.message); process.exit(1) }

  const etabByCode = {}
  for (const e of etabs) {
    if (e.code) etabByCode[e.code.toUpperCase()] = e
  }
  console.log(`🏪 ${etabs.length} établissements chargés`)

  // 3. Importer ligne par ligne
  let ok = 0, errors = 0, skipped = 0
  const unmatchedCodes = new Set()

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    const num = `[${idx + 1}/${rows.length}]`

    const titre     = row['Post']
    const dateDebut = parseDate(row['Date début'])

    if (!titre || !dateDebut) {
      console.log(`${num} ⏭  IGNORÉ — titre ou date manquant (titre=${titre}, date=${row['Date début']})`)
      skipped++
      continue
    }

    const shortTitle = titre.slice(0, 45)
    process.stdout.write(`${num} ${shortTitle}… `)

    // Matching établissements par code
    const orgCode  = (row['Code Organisateur'] ?? '').toUpperCase()
    const lieuCode = (row['Code Lieu'] ?? '').toUpperCase()
    const orgEtab  = orgCode  ? etabByCode[orgCode]  : null
    const lieuEtab = lieuCode ? etabByCode[lieuCode] : null

    if (orgCode  && !orgEtab)  unmatchedCodes.add(`organisateur: ${orgCode}`)
    if (lieuCode && !lieuEtab) unmatchedCodes.add(`lieu: ${lieuCode}`)

    // Construire l'objet post
    const postData = {
      titre,
      complement:          row['Complément']                || null,
      date_debut:          dateDebut,
      date_fin:            parseDate(row['Date fin'])       || null,
      heure:               row['Heure']                     || null,
      ordre_dans_journee:  parseInt(row['Ordre dans la journee']) || null,
      categorie_code:      row['Catégorie Code']            || null,
      organisateur_id:     orgEtab?.id                      ?? null,
      lieu_id:             lieuEtab?.id                     ?? null,
      publie:              parseBool(row['Publié'],          false),
      mis_en_avant:        parseBool(row['Mis en avant'],   false),
      a_laffiche:          parseBool(row['A l affiche'],    false),
      dans_agenda:         parseBool(row['Agenda'],          true),
      inscription:         parseBool(row['Inscription'],    false),
      nb_inscriptions_max: parseInt(row['Nb Inscriptions Max']) || null,
      refuse:              parseBool(row['Refusé'],          false),
      message_admin:       row['Message pour l\'administrateur'] || null,
      nom_redacteur:       row['Nom rédacteur']             || null,
      contact_redacteur:   row['Contact rédacteur']         || null,
      phare:               false,
      affiche_url:         null,
    }

    if (DRY_RUN) {
      console.log(`→ ${dateDebut} | org=${orgEtab?.nom ?? orgCode || '—'} | lieu=${lieuEtab?.nom ?? lieuCode || '—'} | img=${!!row['Affiche']}`)
      ok++
      continue
    }

    try {
      // Insérer le post
      const { data: inserted, error: insertErr } = await supabase
        .from('posts')
        .insert(postData)
        .select('id')
        .single()

      if (insertErr) throw insertErr

      // Télécharger + uploader l'image
      let imgNote = ''
      const afficheUrl = row['Affiche']
      if (afficheUrl && !SKIP_IMAGES) {
        try {
          const publicUrl = await downloadAndUploadImage(afficheUrl, inserted.id)
          await supabase.from('posts').update({ affiche_url: publicUrl }).eq('id', inserted.id)
          imgNote = ' 🖼'
        } catch (imgErr) {
          imgNote = ` ⚠️ img: ${imgErr.message}`
        }
      } else if (afficheUrl && SKIP_IMAGES) {
        // Stocker l'URL d'origine en attendant une migration d'images séparée
        await supabase.from('posts').update({ affiche_url: afficheUrl }).eq('id', inserted.id)
        imgNote = ' (img originale conservée)'
      }

      console.log(`✅${imgNote}`)
      ok++

      // Pause légère pour ne pas saturer
      await new Promise(r => setTimeout(r, 100))

    } catch (err) {
      console.log(`❌ ${err.message}`)
      errors++
    }
  }

  // 4. Rapport final
  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Importés  : ${ok}`)
  console.log(`⏭  Ignorés   : ${skipped}`)
  console.log(`❌ Erreurs   : ${errors}`)
  console.log('─'.repeat(50))

  if (unmatchedCodes.size > 0) {
    console.log('\n⚠️  Codes sans correspondance en DB (organisateur_id / lieu_id = null) :')
    for (const code of [...unmatchedCodes].sort()) console.log(`   ${code}`)
    console.log('\n   → Crée les établissements manquants et relance le script.')
    console.log('   → Tu peux utiliser --list-codes pour voir tous les codes avant d\'importer.')
  }

  if (!DRY_RUN && ok > 0) {
    console.log(`\n🎉 ${ok} post${ok > 1 ? 's' : ''} importé${ok > 1 ? 's' : ''} !`)
    if (!SKIP_IMAGES) {
      console.log('   Les images ont été téléchargées et migrées dans Supabase Storage.')
    } else {
      console.log('   Les URLs d\'images originales ont été conservées.')
      console.log('   Lance migrate-post-images.mjs pour les migrer vers Supabase Storage.')
    }
  }
}

main().catch(e => { console.error('\n❌ Erreur fatale :', e); process.exit(1) })
