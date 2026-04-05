/**
 * Import GTFS Bus Schedules
 * ──────────────────────────────────────────────────────────────────────────────
 * Télécharge les fichiers GTFS de Mistral (ligne 67) et Zou (ligne 878),
 * filtre les arrêts pertinents, et stocke les horaires en base Supabase.
 *
 * Dépendance : jszip (npm install jszip @types/jszip)
 *
 * CONFIGURATION DES ARRÊTS (stopPatterns) :
 *   Les patterns sont des sous-chaînes recherchées (insensible à la casse,
 *   accents normalisés) dans le nom des arrêts GTFS. Ajuster si les noms
 *   exacts dans le GTFS diffèrent. Un premier run avec LOG_STOPS=true
 *   affiche tous les arrêts des lignes concernées pour faciliter l'ajustement.
 */

import JSZip from 'jszip'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Configuration des réseaux ────────────────────────────────────────────────

export interface NetworkConfig {
  reseau: 'mistral' | 'zou'
  url: string
  lignes: string[]          // route_short_name dans le GTFS
  stopPatterns: string[]    // sous-chaînes (normalisées) des noms d'arrêts à conserver
}

export const BUS_NETWORKS: NetworkConfig[] = [
  {
    reseau: 'mistral',
    url: 'https://s3.eu-west-1.amazonaws.com/files.orchestra.ratpdev.com/networks/rd-toulon/exports/gtfs-complet.zip',
    lignes: ['67'],
    stopPatterns: [
      'lavandou',
      'gavine',
      'hyeres',   // captures "Hyères", "Gare de Hyères", etc.
    ],
  },
  {
    reseau: 'zou',
    // Note : cette URL redirige vers le fichier GTFS de la région SUD.
    // Si elle échoue, trouver l'URL directe sur datasud.fr ou transport.data.gouv.fr.
    url: 'https://www.datasud.fr/fr/dataset/datasets/3745/resource/5016/download/',
    lignes: ['878'],
    stopPatterns: [
      'des heros',  // "Square des Héros" (Le Lavandou) — plus spécifique que "square"
      'lavandou',
      'aeroport',   // "Aéroport Hyères"
      'toulon',     // endpoints côté Toulon
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Corrige les strings garbled UTF-8-as-Latin-1.
 * JSZip stocke les fichiers en interne comme des "binary strings" (1 char = 1 octet),
 * ce qui fait que les octets UTF-8 d'un caractère accentué (ex : é = 0xC3 0xA9)
 * arrivent en JS comme deux caractères distincts ('Ã' + '©').
 *
 * Cette fonction détecte et corrige ce cas sans risque :
 * - String garbled → les octets sont du UTF-8 valide → redécodage correct
 * - String déjà OK → les bytes incluent des codes > 127 isolés → UTF-8 invalide
 *   → exception capturée → on retourne la string originale sans modification
 */
function fixLatin1ToUtf8(s: string): string {
  try {
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xFF
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s // déjà correctement encodé, on ne touche pas
  }
}

/** Normalise une chaîne : minuscules + suppression des accents */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Parser CSV minimaliste gérant les champs entre guillemets */
function parseCSV(text: string): Record<string, string>[] {
  // Supprimer le BOM éventuel
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleaned.split('\n')
  if (lines.length === 0) return []

  const headers = splitCSVLine(lines[0]).map(h => h.trim())
  const result: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCSVLine(line)
    const obj: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fixLatin1ToUtf8((values[j] ?? '').trim())
    }
    result.push(obj)
  }
  return result
}

function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Extrait un fichier du ZIP (l'encoding est corrigé dans parseCSV via fixLatin1ToUtf8) */
async function getZipFile(zip: JSZip, name: string): Promise<string> {
  const file = zip.file(name)
  if (!file) throw new Error(`Fichier manquant dans le ZIP : ${name}`)
  return file.async('text')
}

/**
 * Parse stop_times.txt de façon efficace en mémoire :
 * ne garde que les lignes où trip_id ∈ relevantTripIds ET stop_id ∈ relevantStopIds.
 */
function parseStopTimesFiltered(
  text: string,
  relevantTripIds: Set<string>,
  relevantStopIds: Set<string>,
): Array<{ trip_id: string; stop_id: string; departure_time: string; stop_sequence: number }> {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleaned.split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const iTrip  = headers.indexOf('trip_id')
  const iStop  = headers.indexOf('stop_id')
  const iDep   = headers.indexOf('departure_time')
  const iSeq   = headers.indexOf('stop_sequence')

  if (iTrip < 0 || iStop < 0 || iDep < 0 || iSeq < 0) {
    throw new Error('stop_times.txt : colonnes manquantes')
  }

  const result: Array<{ trip_id: string; stop_id: string; departure_time: string; stop_sequence: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Découpe rapide par virgule (stop_times n'a pas de champs quotés normalement)
    const parts = line.split(',')
    const tripId = parts[iTrip]?.trim()
    if (!relevantTripIds.has(tripId)) continue

    const stopId = parts[iStop]?.trim()
    if (!relevantStopIds.has(stopId)) continue

    result.push({
      trip_id:        tripId,
      stop_id:        stopId,
      departure_time: parts[iDep]?.trim() ?? '',
      stop_sequence:  parseInt(parts[iSeq]?.trim() ?? '0', 10),
    })
  }
  return result
}

// ─── Fonction d'import principale ────────────────────────────────────────────

export interface ImportResult {
  reseau: string
  horaires: number
  exceptions: number
  stopsFound: string[]
  error?: string
}

export async function importNetwork(
  config: NetworkConfig,
  supabase: SupabaseClient,
  logStops = false,
): Promise<ImportResult> {
  // 1. Téléchargement du ZIP
  const response = await fetch(config.url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'levant-news/1.0 (horaires bus)' },
  })
  if (!response.ok) {
    throw new Error(`Téléchargement échoué (${config.url}) : HTTP ${response.status}`)
  }
  const buffer = await response.arrayBuffer()

  // 2. Chargement du ZIP
  const zip = await JSZip.loadAsync(buffer)

  // 3. Lecture des petits fichiers GTFS
  const [routesTxt, tripsTxt, stopsTxt, calendarTxt, calDatesTxt] = await Promise.all([
    getZipFile(zip, 'routes.txt'),
    getZipFile(zip, 'trips.txt'),
    getZipFile(zip, 'stops.txt'),
    getZipFile(zip, 'calendar.txt').catch(() => ''),     // peut être absent si tout est en calendar_dates
    getZipFile(zip, 'calendar_dates.txt').catch(() => ''),
  ])

  const routes   = parseCSV(routesTxt)
  const trips    = parseCSV(tripsTxt)
  const stops    = parseCSV(stopsTxt)
  const calendar = calendarTxt ? parseCSV(calendarTxt) : []
  const calDates = calDatesTxt ? parseCSV(calDatesTxt) : []

  // 4. Routes pertinentes (par route_short_name)
  const relevantRouteIds = new Set(
    routes
      .filter(r => config.lignes.includes(r.route_short_name))
      .map(r => r.route_id)
  )
  if (relevantRouteIds.size === 0) {
    throw new Error(`Lignes ${config.lignes.join(', ')} introuvables dans routes.txt`)
  }

  // 5. Arrêts pertinents (par pattern normalisé dans stop_name)
  const normalizedPatterns = config.stopPatterns.map(normalize)
  const relevantStops = stops.filter(s =>
    normalizedPatterns.some(p => normalize(s.stop_name).includes(p))
  )
  const relevantStopIds  = new Set(relevantStops.map(s => s.stop_id))
  const stopNameById     = new Map(relevantStops.map(s => [s.stop_id, s.stop_name]))
  const stopsFound       = relevantStops.map(s => s.stop_name)

  if (logStops) {
    // Mode découverte : affiche TOUS les arrêts des lignes concernées
    const allTripsForRoutes = trips.filter(t => relevantRouteIds.has(t.route_id))
    const allTripIds = new Set(allTripsForRoutes.map(t => t.trip_id))
    console.log(`[${config.reseau}] Tous les arrêts des lignes ${config.lignes.join(',')} :`)
    console.log(stops.map(s => s.stop_name).filter((_, i) => i < 200).join('\n'))
  }

  if (relevantStopIds.size === 0) {
    throw new Error(`Aucun arrêt trouvé pour les patterns : ${config.stopPatterns.join(', ')}`)
  }

  // 6. Trips pertinents
  const relevantTrips = trips.filter(t => relevantRouteIds.has(t.route_id))
  const relevantTripIds    = new Set(relevantTrips.map(t => t.trip_id))
  const relevantServiceIds = new Set(relevantTrips.map(t => t.service_id))

  // Map route_id → route_short_name
  const routeShortName = new Map(routes.map(r => [r.route_id, r.route_short_name]))

  // 7. Calendriers (calendar.txt)
  const calendarMap = new Map<string, Record<string, string>>()
  for (const c of calendar) {
    if (relevantServiceIds.has(c.service_id)) {
      calendarMap.set(c.service_id, c)
    }
  }

  // 8. Stop times (gros fichier, traitement filtré)
  const stopTimesTxt = await getZipFile(zip, 'stop_times.txt')
  const filteredST   = parseStopTimesFiltered(stopTimesTxt, relevantTripIds, relevantStopIds)

  // 9. Construction des lignes Supabase
  const tripById = new Map(relevantTrips.map(t => [t.trip_id, t]))

  const busHoraires = filteredST.map(st => {
    const trip = tripById.get(st.trip_id)!
    const cal  = calendarMap.get(trip.service_id)

    return {
      id:             `${config.reseau}|${st.trip_id}|${st.stop_id}`,
      reseau:         config.reseau,
      ligne:          routeShortName.get(trip.route_id) ?? '',
      trip_id:        st.trip_id,
      service_id:     trip.service_id,
      direction_id:   parseInt(trip.direction_id ?? '0', 10),
      headsign:       trip.trip_headsign ?? '',
      stop_id:        st.stop_id,
      stop_name:      stopNameById.get(st.stop_id) ?? '',
      stop_sequence:  st.stop_sequence,
      departure_time: st.departure_time,
      // Jours de service (calendar.txt utilise les noms anglais)
      lundi:          cal?.monday    === '1',
      mardi:          cal?.tuesday   === '1',
      mercredi:       cal?.wednesday === '1',
      jeudi:          cal?.thursday  === '1',
      vendredi:       cal?.friday    === '1',
      samedi:         cal?.saturday  === '1',
      dimanche:       cal?.sunday    === '1',
      // Plage de validité (sentinel si absent de calendar.txt)
      date_debut:     cal?.start_date ?? '20200101',
      date_fin:       cal?.end_date   ?? '20991231',
      imported_at:    new Date().toISOString(),
    }
  })

  // Exceptions calendaires pour les service_ids pertinents
  const busExceptions = calDates
    .filter(d => relevantServiceIds.has(d.service_id))
    .map(d => ({
      id:             `${config.reseau}|${d.service_id}|${d.date}`,
      reseau:         config.reseau,
      service_id:     d.service_id,
      date:           d.date,
      exception_type: parseInt(d.exception_type, 10),
    }))

  // 10. Upsert Supabase (suppression + ré-insertion pour ce réseau)
  //   Deletion par lot pour éviter les timeouts
  const DEL_BATCH = 1000
  const UPSERT_BATCH = 500

  // Suppression anciens horaires pour ce réseau
  await supabase.from('bus_horaires').delete().eq('reseau', config.reseau)
  await supabase.from('bus_calendar_exceptions').delete().eq('reseau', config.reseau)

  // Upsert horaires par lots
  for (let i = 0; i < busHoraires.length; i += UPSERT_BATCH) {
    const { error } = await supabase
      .from('bus_horaires')
      .upsert(busHoraires.slice(i, i + UPSERT_BATCH))
    if (error) throw new Error(`Upsert bus_horaires : ${error.message}`)
  }

  // Upsert exceptions par lots
  for (let i = 0; i < busExceptions.length; i += UPSERT_BATCH) {
    const { error } = await supabase
      .from('bus_calendar_exceptions')
      .upsert(busExceptions.slice(i, i + UPSERT_BATCH))
    if (error) throw new Error(`Upsert bus_calendar_exceptions : ${error.message}`)
  }

  return {
    reseau:     config.reseau,
    horaires:   busHoraires.length,
    exceptions: busExceptions.length,
    stopsFound,
  }
}
