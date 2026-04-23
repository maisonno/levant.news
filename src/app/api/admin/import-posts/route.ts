import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  let headers: string[] | null = null
  let i = 0

  function parseField(): string {
    if (content[i] === '"') {
      i++
      let value = ''
      while (i < content.length) {
        if (content[i] === '"' && content[i + 1] === '"') { value += '"'; i += 2 }
        else if (content[i] === '"') { i++; break }
        else { value += content[i++] }
      }
      return value
    }
    let value = ''
    while (i < content.length && content[i] !== ',' && content[i] !== '\n' && content[i] !== '\r') {
      value += content[i++]
    }
    return value
  }

  function parseLine(): string[] {
    const fields: string[] = []
    while (i < content.length) {
      fields.push(parseField())
      if (content[i] === ',') { i++ }
      else { if (content[i] === '\r') i++; if (content[i] === '\n') i++; break }
    }
    return fields
  }

  while (i < content.length) {
    const fields = parseLine()
    if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue
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

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check — admin only
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux admins' }, { status: 403 })
  }

  // Lire le fichier CSV
  const form = await req.formData()
  const file = form.get('csv') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier CSV manquant' }, { status: 400 })

  const content = await file.text()
  const rows    = parseCSV(content)

  // Client service-role pour les insertions
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Charger les établissements (code → id)
  const { data: etabs } = await supabase
    .from('etablissements')
    .select('id, code, nom')

  const etabByCode: Record<string, { id: string; nom: string }> = {}
  for (const e of (etabs ?? [])) {
    if (e.code) etabByCode[e.code.toUpperCase()] = e
  }

  // Importer les posts
  let ok = 0, errors = 0, skipped = 0
  const unmatchedCodes = new Set<string>()
  const errorDetails: string[] = []

  for (const row of rows) {
    const titre     = row['Post']
    const dateDebut = parseDate(row['Date début'] ?? row['Date debut'] ?? row['Date début'] ?? '')

    if (!titre || !dateDebut) { skipped++; continue }

    const orgCode  = (row['Code Organisateur'] ?? '').toUpperCase()
    const lieuCode = (row['Code Lieu'] ?? '').toUpperCase()
    const orgEtab  = orgCode  ? etabByCode[orgCode]  : null
    const lieuEtab = lieuCode ? etabByCode[lieuCode] : null

    if (orgCode  && !orgEtab)  unmatchedCodes.add(`organisateur:${orgCode}`)
    if (lieuCode && !lieuEtab) unmatchedCodes.add(`lieu:${lieuCode}`)

    const catCode = row['Catégorie Code'] || row['Categorie Code'] || ''
    const afficheUrl = row['Affiche'] ?? ''

    const col = (key: string) => row[key] ?? ''
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
      affiche_url:         afficheUrl || null,
    }

    const { error } = await supabase.from('posts').insert(postData)
    if (error) {
      errors++
      if (errorDetails.length < 10) errorDetails.push(`"${titre}" : ${error.message}`)
    } else {
      ok++
    }
  }

  return NextResponse.json({
    ok,
    errors,
    skipped,
    total: rows.length,
    unmatchedCodes: [...unmatchedCodes],
    errorDetails,
  })
}
