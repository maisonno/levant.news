/**
 * GET /api/bus/live?ligne=878&date=YYYY-MM-DD
 *
 * Retourne les données temps réel GTFS-RT pour la ligne demandée.
 * On récupère les trips actifs depuis bus_horaires (même logique calendaire
 * que /api/bus), on télécharge le flux protobuf, on décode et on retourne
 * les délais par (stop_id, heure_théorique).
 *
 * Réponse :
 * {
 *   updated_at: string,             // ISO timestamp de la récupération
 *   ligne: string,
 *   delays: Array<{
 *     stop_id:        string,
 *     scheduled_time: string,       // 'HH:MM' normalisé (heure théorique)
 *     delay_seconds:  number,       // positif = retard, négatif = avance
 *   }>
 * }
 *
 * Erreurs :
 * - 400 si la ligne n'a pas de flux RT configuré
 * - 503 si le flux est indisponible (timeout, HTTP error)
 */

import { createClient }        from '@/lib/supabase/server'
import { NextResponse }        from 'next/server'
import { transit_realtime }    from 'gtfs-realtime-bindings'

export const revalidate = 30 // 30 s de cache côté serveur

// ─── Config des flux GTFS-RT par ligne ───────────────────────────────────────

const FEED_URLS: Record<string, string> = {
  '878': 'https://proxy.transport.data.gouv.fr/resource/region-sud-zou-express-gtfs-rt-trip-update',
  '67':  'https://feed-rdtpm-toulon.ratpdev.com/TripUpdate/GTFS-RT',
}

// Correspondance JS getDay() → colonne Supabase
const DOW_COLUMNS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

function normalizeTime(t: string): string {
  const parts = t.split(':')
  const h = parseInt(parts[0], 10)
  if (h < 24) return t.slice(0, 5)
  return `${String(h - 24).padStart(2, '0')}:${parts[1]}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const ligne   = searchParams.get('ligne') ?? '878'

  const feedUrl = FEED_URLS[ligne]
  if (!feedUrl) {
    return NextResponse.json({ error: `Ligne ${ligne} non supportée en temps réel` }, { status: 400 })
  }

  const dateGtfs = rawDate.replace(/-/g, '')
  const d        = new Date(rawDate + 'T00:00:00')
  const dowCol   = DOW_COLUMNS[d.getDay()]

  const supabase = await createClient()

  // ── 1. Trips actifs pour cette date ──────────────────────────────────────────
  const { data: regularRows, error: e1 } = await supabase
    .from('bus_horaires')
    .select('trip_id, stop_id, departure_time, service_id')
    .eq('ligne', ligne)
    .eq(dowCol, true)
    .lte('date_debut', dateGtfs)
    .gte('date_fin',   dateGtfs)

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const { data: exceptions } = await supabase
    .from('bus_calendar_exceptions')
    .select('service_id, exception_type')
    .eq('date', dateGtfs)

  const removedServiceIds = new Set(
    (exceptions ?? []).filter(e => e.exception_type === 2).map(e => e.service_id)
  )
  const addedServiceIds = (exceptions ?? [])
    .filter(e => e.exception_type === 1)
    .map(e => e.service_id)

  let addedRows: typeof regularRows = []
  if (addedServiceIds.length > 0) {
    const { data } = await supabase
      .from('bus_horaires')
      .select('trip_id, stop_id, departure_time, service_id')
      .eq('ligne', ligne)
      .in('service_id', addedServiceIds)
    addedRows = data ?? []
  }

  // Fusion (dédupliquée par trip_id+stop_id car un trip peut générer 2 rows
  // pour le même stop quand il passe par l'Aéroport)
  const seen = new Set<string>()
  const allRows = [
    ...(regularRows ?? []).filter(r => !removedServiceIds.has(r.service_id)),
    ...addedRows,
  ].filter(r => {
    const key = `${r.trip_id}|${r.stop_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (allRows.length === 0) {
    return NextResponse.json({ updated_at: new Date().toISOString(), ligne, delays: [] })
  }

  // ── 2. Index trip_id → stops ──────────────────────────────────────────────────
  const tripMap = new Map<string, Array<{ stop_id: string; departure_time: string }>>()
  for (const row of allRows) {
    if (!tripMap.has(row.trip_id)) tripMap.set(row.trip_id, [])
    tripMap.get(row.trip_id)!.push({
      stop_id:        row.stop_id,
      departure_time: row.departure_time,
    })
  }

  // ── 3. Téléchargement du flux GTFS-RT ─────────────────────────────────────────
  let feedBuffer: ArrayBuffer
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'levant-news/1.0 (horaires-live)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    feedBuffer = await res.arrayBuffer()
  } catch (err) {
    console.error('[api/bus/live] Flux indisponible :', err)
    return NextResponse.json({ error: 'Flux temps réel indisponible' }, { status: 503 })
  }

  // ── 4. Décodage protobuf ───────────────────────────────────────────────────────
  let feed: transit_realtime.FeedMessage
  try {
    feed = transit_realtime.FeedMessage.decode(new Uint8Array(feedBuffer))
  } catch (err) {
    console.error('[api/bus/live] Erreur décodage protobuf :', err)
    return NextResponse.json({ error: 'Erreur de décodage du flux' }, { status: 500 })
  }

  // ── 5. Extraction des délais ───────────────────────────────────────────────────
  const delays: Array<{
    stop_id:        string
    scheduled_time: string
    delay_seconds:  number
  }> = []

  for (const entity of feed.entity) {
    const tu = entity.tripUpdate
    if (!tu) continue

    const tripId = tu.trip?.tripId
    if (!tripId) continue

    const ourStops = tripMap.get(tripId)
    if (!ourStops) continue

    for (const stu of (tu.stopTimeUpdate ?? [])) {
      const stopId = stu.stopId
      if (!stopId) continue

      const ourStop = ourStops.find(s => s.stop_id === stopId)
      if (!ourStop) continue

      // Priorité : délai de départ, puis d'arrivée
      const delaySec = stu.departure?.delay ?? stu.arrival?.delay
      if (delaySec == null) continue

      delays.push({
        stop_id:        stopId,
        scheduled_time: normalizeTime(ourStop.departure_time),
        delay_seconds:  delaySec as number,
      })
    }
  }

  return NextResponse.json({
    updated_at: new Date().toISOString(),
    ligne,
    delays,
  })
}
