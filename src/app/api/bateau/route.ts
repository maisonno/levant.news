import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  const [horairesRes, infosRes] = await Promise.allSettled([
    supabase
      .from('horaires_bateau')
      .select('*')
      .eq('date', date)
      .order('heure', { ascending: true }),

    supabase
      .from('info_bateau')
      .select('*')
      .gte('date_fin', today)
      .order('date_debut', { ascending: true }),
  ])

  const horaires = horairesRes.status === 'fulfilled' ? (horairesRes.value.data ?? []) : []
  const infos    = infosRes.status    === 'fulfilled' ? (infosRes.value.data    ?? []) : []

  return NextResponse.json({ horaires, infos, date })
}
