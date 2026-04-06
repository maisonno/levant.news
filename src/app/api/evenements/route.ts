/**
 * GET /api/evenements?etablissement=POMME
 *
 * API publique — retourne les événements à venir d'un établissement donné
 * (organisateur OU lieu), triés par date croissante.
 *
 * Paramètres :
 *   etablissement  (requis)  Code de l'établissement (ex : "POMME")
 *
 * Filtre appliqué :
 *   (organisateur_id = id OU lieu_id = id)
 *   ET publie = true
 *   ET date_debut >= aujourd'hui
 *
 * Réponse :
 * {
 *   etablissement: { id, code, nom },
 *   evenements: Array<{
 *     id, titre, complement,
 *     date_debut, date_fin, heure,
 *     affiche_url,
 *     categorie: { code, nom } | null,
 *     organisateur: { id, nom } | null,
 *     lieu: { id, nom } | null,
 *   }>
 * }
 *
 * CORS ouvert : peut être consommé par n'importe quel domaine externe.
 * Cache de 5 minutes côté serveur.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

export const revalidate = 300

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('etablissement')?.toUpperCase()

  if (!code) {
    return NextResponse.json(
      { error: 'Paramètre "etablissement" requis (ex : ?etablissement=POMME)' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = await createClient()
  const today    = new Date().toISOString().split('T')[0]

  // ── 1. Résolution du code → établissement ─────────────────────────────────
  const { data: etab, error: etabError } = await supabase
    .from('etablissements')
    .select('id, code, nom')
    .eq('code', code)
    .single()

  if (etabError || !etab) {
    return NextResponse.json(
      { error: `Établissement introuvable : ${code}` },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  // ── 2. Événements : organisateur OU lieu, publiés, à venir ────────────────
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, titre, complement, date_debut, date_fin, heure, affiche_url, organisateur_id, lieu_id, categorie:categories(code, nom)')
    .eq('publie', true)
    .or(`organisateur_id.eq.${etab.id},lieu_id.eq.${etab.id}`)
    .gte('date_debut', today)
    .order('date_debut', { ascending: true })
    .order('ordre_dans_journee', { ascending: true, nullsFirst: false })

  if (postsError) {
    console.error('[api/evenements] Erreur posts :', postsError.message)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  // ── 3. Enrichissement : noms des organisateurs et lieux ───────────────────
  const etabIds = [
    ...new Set(
      (posts ?? [])
        .flatMap(p => [p.organisateur_id, p.lieu_id])
        .filter(Boolean) as string[]
    ),
  ]

  let etabMap: Record<string, { id: string; nom: string }> = {}
  if (etabIds.length > 0) {
    const { data: etabs } = await supabase
      .from('etablissements')
      .select('id, nom')
      .in('id', etabIds)
    if (etabs) etabMap = Object.fromEntries(etabs.map(e => [e.id, e]))
  }

  // ── 4. Mise en forme de la réponse ────────────────────────────────────────
  const evenements = (posts ?? []).map(p => ({
    id:           p.id,
    titre:        p.titre,
    complement:   p.complement ?? null,
    date_debut:   p.date_debut,
    date_fin:     p.date_fin   ?? null,
    heure:        p.heure      ?? null,
    affiche_url:  p.affiche_url ?? null,
    categorie:    p.categorie  ?? null,
    organisateur: p.organisateur_id ? (etabMap[p.organisateur_id] ?? null) : null,
    lieu:         p.lieu_id         ? (etabMap[p.lieu_id]         ?? null) : null,
  }))

  return NextResponse.json(
    { etablissement: etab, evenements },
    { headers: CORS_HEADERS }
  )
}
