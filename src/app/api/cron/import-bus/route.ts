/**
 * Vercel Cron Job : import des horaires de bus depuis les GTFS
 * ──────────────────────────────────────────────────────────────
 * Planifié à 04h00 chaque matin (voir vercel.json).
 *
 * Peut aussi être déclenché manuellement via GET /api/cron/import-bus
 * en passant l'en-tête Authorization: Bearer {CRON_SECRET}.
 *
 * Variables d'environnement requises :
 *   CRON_SECRET          — secret partagé pour protéger l'endpoint
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (pas la clé anon — on a besoin des droits INSERT/DELETE)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { importNetwork, BUS_NETWORKS } from '@/lib/gtfs/import'

export const maxDuration = 60 // Vercel Pro : 60s max

export async function GET(request: Request) {
  // Vérification du secret (Vercel injecte automatiquement l'en-tête pour les crons)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Client Supabase avec clé service_role (pour contourner les RLS en écriture)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { searchParams } = new URL(request.url)
  const logStops = searchParams.get('log_stops') === 'true' // mode découverte

  const results = []
  const errors  = []

  for (const network of BUS_NETWORKS) {
    try {
      console.log(`[import-bus] Démarrage import ${network.reseau}…`)
      const result = await importNetwork(network, supabase, logStops)
      console.log(`[import-bus] ${network.reseau} OK — ${result.horaires} horaires, ${result.exceptions} exceptions`)
      console.log(`[import-bus] ${network.reseau} arrêts trouvés :`, result.stopsFound)
      results.push(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[import-bus] ${network.reseau} ERREUR :`, msg)
      errors.push({ reseau: network.reseau, error: msg })
    }
  }

  const status = errors.length > 0 && results.length === 0 ? 500 : 200
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    errors,
  }, { status })
}
