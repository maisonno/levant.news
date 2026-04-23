import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60   // 60s max (compatible tous plans Vercel)

const BUCKET      = 'post-images'
const CONCURRENCY = 8

// ─── Normalisation colonnes ───────────────────────────────────────────────────

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

const COL_ALIASES: Record<string, string[]> = {
  titre:             ['post', 'titre', 'title', 'evenement', 'nom'],
  date_debut:        ['date debut', 'date de debut', 'datedebut', 'debut'],
  date_fin:          ['date fin', 'datefin', 'fin'],
  heure:             ['heure', 'horaire'],
  ordre:             ['ordre dans la journee', 'ordre journee', 'ordre'],
  categorie_code:    ['categorie code', 'categorie', 'cat', 'category'],
  code_org:          ['code organisateur', 'organisateur', 'org'],
  code_lieu:         ['code lieu', 'lieu', 'place'],
  publie:            ['publie', 'published'],
  mis_en_avant:      ['mis en avant', 'featured'],
  a_laffiche:        ['a l affiche', 'a laffiche', 'laffiche'],
  dans_agenda:       ['agenda', 'dans agenda'],
  affiche_url:       ['affiche', 'image', 'photo', 'visuel'],
  complement:        ['complement', 'description', 'texte', 'contenu', 'details'],
  inscription:       ['inscription', 'booking'],
  nb_places:         ['nb inscriptions max', 'places max', 'capacite', 'nb places'],
  refuse:            ['refuse', 'rejected'],
  message_admin:     ['message pour l administrateur', 'message admin', 'note admin'],
  nom_redacteur:     ['nom redacteur', 'nom auteur', 'auteur'],
  contact_redacteur: ['contact redacteur', 'contact auteur', 'contact'],
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

// ─── Parser CSV ───────────────────────────────────────────────────────────────

function detectDelimiter(firstLine: string): string {
  const c = { ',': 0, ';': 0, '\t': 0 }
  for (const ch of firstLine) if (ch in c) c[ch as keyof typeof c]++
  return Object.entries(c).sort(([, a], [, b]) => b - a)[0][0]
}

function parseCSV(rawContent: string): Record<string, string>[] {
  const content = rawContent.replace(/^﻿/, '')
  let i = 0, delim = ','
  let headers: string[] | null = null
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

  while (i < content.length) {
    const start = i
    const fields = parseLine()
    if (!fields.length || (fields.length === 1 && !fields[0].trim())) continue
    if (!headers) {
      delim = detectDelimiter(content.slice(start, i))
      if (delim !== ',') { i = start; headers = parseLine().map(h => h.trim()) }
      else headers = fields.map(h => h.trim())
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').trim() })
    rows.push(row)
  }
  return rows
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str: string): string | null {
  if (!str) return null
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function parseBool(str: string, def = false): boolean {
  if (str === 'true' || str === '1') return true
  if (str === 'false' || str === '0') return false
  return def
}

function guessExt(ct: string, url: string): string {
  if (ct.includes('png') || url.endsWith('.png'))   return 'png'
  if (ct.includes('gif') || url.endsWith('.gif'))   return 'gif'
  if (ct.includes('webp') || url.endsWith('.webp')) return 'webp'
  return 'jpg'
}

async function downloadImage(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'levant-news-migration/1.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct     = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()
  return { buffer, ct }
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return new Response('Non authentifié', { status: 401 })

    const { data: profile } = await supabaseAuth
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response('Accès refusé', { status: 403 })
  } catch (authErr: any) {
    return new Response(`Erreur auth: ${authErr.message}`, { status: 500 })
  }

  // Vérifier les variables d'environnement
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return new Response('SUPABASE_SERVICE_KEY manquant dans les variables d\'environnement', { status: 500 })
  }

  let rows: Record<string, string>[]
  try {
    const form    = await req.formData()
    const file    = form.get('csv') as File | null
    if (!file) return new Response('Fichier CSV manquant', { status: 400 })
    const content = await file.text()
    rows = parseCSV(content)
    if (rows.length === 0) return new Response('Aucune ligne détectée dans le CSV', { status: 400 })
  } catch (parseErr: any) {
    return new Response(`Erreur lecture CSV: ${parseErr.message}`, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) =>
        ctrl.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

      try {
        const { data: etabs } = await supabase.from('etablissements').select('id, code, nom')
        const etabByCode: Record<string, { id: string }> = {}
        for (const e of (etabs ?? [])) {
          if (e.code) etabByCode[e.code.toUpperCase()] = e
        }

        // Résoudre les colonnes à partir des headers
        const headers  = rows.length > 0 ? Object.keys(rows[0]) : []
        const col      = buildResolver(headers)
        const T_TITRE  = col('titre')
        const T_DATE   = col('date_debut')

        // ── Phase 1 : posts ─────────────────────────────────────────────────
        send({ type: 'phase', phase: 'posts', total: rows.length })

        let ok = 0, errors = 0, skipped = 0
        const unmatchedCodes = new Set<string>()
        const errorDetails: string[] = []
        const inserted: { id: string; glideUrl: string }[] = []

        for (let idx = 0; idx < rows.length; idx++) {
          const row  = rows[idx]
          const get  = (field: string) => row[col(field)] ?? ''

          const titre     = row[T_TITRE]?.trim()
          const dateDebut = parseDate(row[T_DATE] ?? '')

          if (!titre || !dateDebut) { skipped++; continue }

          const orgCode  = get('code_org').toUpperCase()
          const lieuCode = get('code_lieu').toUpperCase()
          if (orgCode  && !etabByCode[orgCode])  unmatchedCodes.add(`organisateur:${orgCode}`)
          if (lieuCode && !etabByCode[lieuCode]) unmatchedCodes.add(`lieu:${lieuCode}`)

          const afficheUrl = get('affiche_url')

          const postData = {
            titre,
            complement:          get('complement') || null,
            date_debut:          dateDebut,
            date_fin:            parseDate(get('date_fin')) ?? null,
            heure:               get('heure') || null,
            ordre_dans_journee:  parseInt(get('ordre')) || null,
            categorie_code:      get('categorie_code') || null,
            organisateur_id:     etabByCode[orgCode]?.id  ?? null,
            lieu_id:             etabByCode[lieuCode]?.id ?? null,
            publie:              parseBool(get('publie')),
            mis_en_avant:        parseBool(get('mis_en_avant')),
            a_laffiche:          parseBool(get('a_laffiche')),
            dans_agenda:         parseBool(get('dans_agenda'), true),
            inscription:         parseBool(get('inscription')),
            nb_inscriptions_max: parseInt(get('nb_places')) || null,
            refuse:              parseBool(get('refuse')),
            message_admin:       get('message_admin') || null,
            nom_redacteur:       get('nom_redacteur') || null,
            contact_redacteur:   get('contact_redacteur') || null,
            phare:               false,
            affiche_url:         afficheUrl || null,
          }

          const { data: ins, error } = await supabase
            .from('posts').insert(postData).select('id').single()

          if (error) {
            errors++
            if (errorDetails.length < 10) errorDetails.push(`"${titre}": ${error.message}`)
          } else {
            ok++
            if (afficheUrl && ins) inserted.push({ id: ins.id, glideUrl: afficheUrl })
          }

          if ((idx + 1) % 20 === 0 || idx === rows.length - 1) {
            send({ type: 'progress', phase: 'posts', current: idx + 1, total: rows.length })
          }
        }

        // ── Phase 2 : images ────────────────────────────────────────────────
        const withImg = inserted.filter(p => !!p.glideUrl)
        if (withImg.length === 0) {
          send({ type: 'done', ok, errors, skipped, total: rows.length,
            unmatchedCodes: [...unmatchedCodes], errorDetails, imgOk: 0, imgErrors: 0 })
          ctrl.close(); return
        }

        send({ type: 'phase', phase: 'images', total: withImg.length })

        let imgOk = 0, imgErrors = 0

        for (let i = 0; i < withImg.length; i += CONCURRENCY) {
          const chunk = withImg.slice(i, i + CONCURRENCY)
          const results = await Promise.allSettled(chunk.map(async post => {
            const { buffer, ct } = await downloadImage(post.glideUrl)
            const ext  = guessExt(ct, post.glideUrl)
            const name = `posts/${post.id}.${ext}`
            const { error } = await supabase.storage
              .from(BUCKET).upload(name, buffer, { contentType: ct, upsert: true })
            if (error) throw error
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(name)
            await supabase.from('posts').update({ affiche_url: data.publicUrl }).eq('id', post.id)
          }))
          for (const r of results) r.status === 'fulfilled' ? imgOk++ : imgErrors++
          send({ type: 'progress', phase: 'images',
            current: Math.min(i + CONCURRENCY, withImg.length),
            total: withImg.length, ok: imgOk, errors: imgErrors })
        }

        send({ type: 'done', ok, errors, skipped, total: rows.length,
          unmatchedCodes: [...unmatchedCodes], errorDetails, imgOk, imgErrors })

      } catch (err: any) {
        send({ type: 'error', message: err.message ?? String(err) })
      } finally {
        ctrl.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
