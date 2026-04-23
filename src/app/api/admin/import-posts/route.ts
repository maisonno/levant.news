import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300  // 5 min (Vercel Pro)

const BUCKET      = 'post-images'
const CONCURRENCY = 5            // téléchargements images en parallèle

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  let headers: string[] | null = null
  let i = 0

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
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = (fields[idx] ?? '').trim() })
      rows.push(row)
    }
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

function guessExt(contentType: string, url: string): string {
  if (contentType.includes('png'))  return 'png'
  if (contentType.includes('gif'))  return 'gif'
  if (contentType.includes('webp')) return 'webp'
  if (url.endsWith('.png'))  return 'png'
  if (url.endsWith('.gif'))  return 'gif'
  if (url.endsWith('.webp')) return 'webp'
  return 'jpg'
}

async function downloadImage(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'levant-news-migration/1.0' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await res.arrayBuffer()
  return { buffer, contentType }
}

// ─── Route streaming ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return new Response('Non authentifié', { status: 401 })

  const { data: profile } = await supabaseAuth
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response('Accès refusé', { status: 403 })

  const form = await req.formData()
  const file = form.get('csv') as File | null
  if (!file) return new Response('Fichier CSV manquant', { status: 400 })

  const content = await file.text()
  const rows    = parseCSV(content)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (data: object) =>
        ctrl.enqueue(encoder.encode(JSON.stringify(data) + '\n'))

      try {
        // ── Charger les établissements ────────────────────────────────────
        const { data: etabs } = await supabase.from('etablissements').select('id, code, nom')
        const etabByCode: Record<string, { id: string; nom: string }> = {}
        for (const e of (etabs ?? [])) {
          if (e.code) etabByCode[e.code.toUpperCase()] = e
        }

        // ── Phase 1 : insertion des posts ─────────────────────────────────
        send({ type: 'phase', phase: 'posts', total: rows.length })

        let ok = 0, errors = 0, skipped = 0
        const unmatchedCodes = new Set<string>()
        const errorDetails: string[]  = []
        const inserted: { id: string; glideUrl: string; titre: string }[] = []

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx]
          const col = (k: string) => row[k] ?? ''

          const titre     = col('Post')
          const dateDebut = parseDate(col('Date début') || col('Date debut'))

          if (!titre || !dateDebut) { skipped++; continue }

          const orgCode  = col('Code Organisateur').toUpperCase()
          const lieuCode = col('Code Lieu').toUpperCase()
          const orgEtab  = orgCode  ? etabByCode[orgCode]  : null
          const lieuEtab = lieuCode ? etabByCode[lieuCode] : null
          if (orgCode  && !orgEtab)  unmatchedCodes.add(`organisateur:${orgCode}`)
          if (lieuCode && !lieuEtab) unmatchedCodes.add(`lieu:${lieuCode}`)

          const catCode    = col('Catégorie Code') || col('Categorie Code')
          const afficheUrl = col('Affiche')

          const postData = {
            titre,
            complement:          col('Complément') || col('Complement') || null,
            date_debut:          dateDebut,
            date_fin:            parseDate(col('Date fin')) ?? null,
            heure:               col('Heure') || null,
            ordre_dans_journee:  parseInt(col('Ordre dans la journee')) || null,
            categorie_code:      catCode || null,
            organisateur_id:     orgEtab?.id ?? null,
            lieu_id:             lieuEtab?.id ?? null,
            publie:              parseBool(col('Publié') || col('Publie')),
            mis_en_avant:        parseBool(col('Mis en avant')),
            a_laffiche:          parseBool(col('A l affiche')),
            dans_agenda:         parseBool(col('Agenda'), true),
            inscription:         parseBool(col('Inscription')),
            nb_inscriptions_max: parseInt(col('Nb Inscriptions Max')) || null,
            refuse:              parseBool(col('Refusé') || col('Refuse')),
            message_admin:       col("Message pour l'administrateur") || null,
            nom_redacteur:       col('Nom rédacteur') || col('Nom redacteur') || null,
            contact_redacteur:   col('Contact rédacteur') || col('Contact redacteur') || null,
            phare:               false,
            affiche_url:         afficheUrl || null,  // URL Glide temporaire
          }

          const { data: ins, error } = await supabase
            .from('posts').insert(postData).select('id').single()

          if (error) {
            errors++
            if (errorDetails.length < 10) errorDetails.push(`"${titre}" : ${error.message}`)
          } else {
            ok++
            if (afficheUrl && ins) inserted.push({ id: ins.id, glideUrl: afficheUrl, titre })
          }

          // Progression tous les 20 posts
          if ((idx + 1) % 20 === 0 || idx === rows.length - 1) {
            send({ type: 'progress', phase: 'posts', current: idx + 1, total: rows.length })
          }
        }

        // ── Phase 2 : migration des images ────────────────────────────────
        const withImg = inserted.filter(p => !!p.glideUrl)

        if (withImg.length === 0) {
          send({ type: 'done', ok, errors, skipped, total: rows.length,
            unmatchedCodes: [...unmatchedCodes], errorDetails,
            imgOk: 0, imgErrors: 0 })
          ctrl.close()
          return
        }

        send({ type: 'phase', phase: 'images', total: withImg.length })

        let imgOk = 0, imgErrors = 0

        for (let i = 0; i < withImg.length; i += CONCURRENCY) {
          const chunk = withImg.slice(i, i + CONCURRENCY)

          const results = await Promise.allSettled(chunk.map(async post => {
            const { buffer, contentType } = await downloadImage(post.glideUrl)
            const ext      = guessExt(contentType, post.glideUrl)
            const filename = `posts/${post.id}.${ext}`

            const { error: upErr } = await supabase.storage
              .from(BUCKET).upload(filename, buffer, { contentType, upsert: true })
            if (upErr) throw upErr

            const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename)
            await supabase.from('posts')
              .update({ affiche_url: data.publicUrl }).eq('id', post.id)
          }))

          for (const r of results) {
            if (r.status === 'fulfilled') imgOk++
            else imgErrors++
          }

          send({ type: 'progress', phase: 'images',
            current: Math.min(i + CONCURRENCY, withImg.length),
            total: withImg.length, ok: imgOk, errors: imgErrors })
        }

        send({ type: 'done', ok, errors, skipped, total: rows.length,
          unmatchedCodes: [...unmatchedCodes], errorDetails,
          imgOk, imgErrors })

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
