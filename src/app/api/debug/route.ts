import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const past = new Date()
  past.setDate(past.getDate() - 30)
  const pastStr = past.toISOString().split('T')[0]

  const future = new Date()
  future.setDate(future.getDate() + 60)
  const futureStr = future.toISOString().split('T')[0]

  // Test 1 : count total posts publiés
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('publie', true)

  // Test 2 : posts dans la fenêtre temporelle
  const { data: windowPosts, error: windowError } = await supabase
    .from('posts')
    .select('id, titre, date_debut, date_fin, publie, dans_agenda')
    .eq('publie', true)
    .eq('dans_agenda', true)
    .gte('date_debut', pastStr)
    .lte('date_debut', futureStr)
    .order('date_debut', { ascending: true })
    .limit(5)

  // Test 3 : les 5 prochains posts sans filtre de date
  const { data: nextPosts } = await supabase
    .from('posts')
    .select('id, titre, date_debut, publie, dans_agenda')
    .eq('publie', true)
    .gte('date_debut', today)
    .order('date_debut', { ascending: true })
    .limit(5)

  return NextResponse.json({
    today,
    pastStr,
    futureStr,
    totalPostsPublies: totalPosts,
    postsInWindow: windowPosts,
    windowError: windowError?.message ?? null,
    next5Posts: nextPosts,
  })
}
