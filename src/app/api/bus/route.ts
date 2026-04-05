/**
 * GET /api/bus?date=YYYY-MM-DD&ligne=878
 *
 * Retourne les horaires de la ligne demandée pour la date donnée,
 * en appliquant la logique calendaire GTFS (jours de service + exceptions).
 *
 * Réponse :
 * {
 *   date: string,
 *   ligne: string,
 *   aucun_service: boolean,
 *   stops: Array<{
 *     stop_name: string,
 *     stop_id: string,
 *     direction_id: 0 | 1,
 *     departures: Array<{ time: string, headsign: string }>
 *   }>
 * }
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 300 // 5 min de cache (les horaires ne changent pas souvent)

// Correspondance JS getDay() → colonne Supabase
const DOW_COLUMNS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const ligne   = searchParams.get('ligne') ?? '878'

  // Date en format GTFS (YYYYMMDD)
  const dateGtfs = rawDate.replace(/-/g, '')
  const d        = new Date(rawDate + 'T00:00:00')
  const dowCol   = DOW_COLUMNS[d.getDay()]

  const supabase = await createClient()

  // ── 1. Horaires du calendrier régulier ──────────────────────────────────────
  const { data: regularRows, error: e1 } = await supabase
    .from('bus_horaires')
    .select('id, service_id, direction_id, headsign, stop_id, stop_name, stop_sequence, departure_time')
    .eq('ligne', ligne)
    .eq(dowCol, true)
    .lte('date_debut', dateGtfs)
    .gte('date_fin',   dateGtfs)

  if (e1) {
    console.error('[api/bus] Erreur lecture bus_horaires :', e1.message)
    return NextResponse.json({ error: e1.message }, { status: 500 })
  }

  // ── 2. Exceptions calendaires pour cette date ────────────────────────────────
  const { data: exceptions } = await supabase
    .from('bus_calendar_exceptions')
    .select('service_id, exception_type')
    .eq('date', dateGtfs)

  const removedServiceIds = new Set(
    (exceptions ?? [])
      .filter(e => e.exception_type === 2)
      .map(e => e.service_id)
  )
  const addedServiceIds = (exceptions ?? [])
    .filter(e => e.exception_type === 1)
    .map(e => e.service_id)

  // ── 3. Services ajoutés hors calendrier régulier ────────────────────────────
  let addedRows: typeof regularRows = []
  if (addedServiceIds.length > 0) {
    const { data } = await supabase
      .from('bus_horaires')
      .select('id, service_id, direction_id, headsign, stop_id, stop_name, stop_sequence, departure_time')
      .eq('ligne', ligne)
      .in('service_id', addedServiceIds)
    addedRows = data ?? []
  }

  // ── 4. Fusion : régulier (sans supprimés) + ajoutés ─────────────────────────
  const seen = new Set<string>()
  const allRows = [
    ...(regularRows ?? []).filter(r => !removedServiceIds.has(r.service_id)),
    ...addedRows,
  ].filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  if (allRows.length === 0) {
    return NextResponse.json({
      date:          rawDate,
      ligne,
      aucun_service: true,
      stops:         [],
    })
  }

  // ── 5. Normaliser l'heure (GTFS peut avoir 24:xx ou 25:xx pour les services de nuit)
  function normalizeTime(t: string): string {
    const parts = t.split(':')
    const h = parseInt(parts[0], 10)
    if (h < 24) return t.slice(0, 5)
    return `${String(h - 24).padStart(2, '0')}:${parts[1]}`
  }

  // ── 6. Regroupement par stop_name (toutes directions confondues) ──────────────
  // Un groupe par arrêt physique ; les départs listent leur destination (headsign).
  const stopMap = new Map<string, {
    stop_name:    string
    stop_id:      string
    min_sequence: number  // plus petite séquence vue, pour tri indicatif
    departures:   Array<{ time: string; headsign: string; raw_time: string }>
  }>()

  for (const row of allRows) {
    const key = row.stop_name
    if (!stopMap.has(key)) {
      stopMap.set(key, {
        stop_name:    row.stop_name,
        stop_id:      row.stop_id,
        min_sequence: row.stop_sequence,
        departures:   [],
      })
    }
    const entry = stopMap.get(key)!
    entry.departures.push({
      time:     normalizeTime(row.departure_time),
      headsign: row.headsign ?? '',
      raw_time: row.departure_time,
    })
    if (row.stop_sequence < entry.min_sequence) {
      entry.min_sequence = row.stop_sequence
    }
  }

  // ── 7. Tri des départs et des arrêts ─────────────────────────────────────────
  const stops = [...stopMap.values()]
    .map(s => ({
      stop_name:  s.stop_name,
      stop_id:    s.stop_id,
      departures: s.departures
        .sort((a, b) => a.raw_time.localeCompare(b.raw_time))
        .map(({ time, headsign }) => ({ time, headsign })),
      _seq: s.min_sequence,
    }))
    .sort((a, b) => a._seq - b._seq)
    .map(({ _seq: _, ...s }) => s)

  return NextResponse.json({
    date:          rawDate,
    ligne,
    aucun_service: false,
    stops,
  })
}
