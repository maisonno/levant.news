import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Posts
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('publie', true)

  // Établissements — tous
  const { data: allEtabs, error: etabError } = await supabase
    .from('etablissements')
    .select('id, nom, liste, type_code')
    .order('nom', { ascending: true })
    .limit(20)

  // Établissements — filtre liste=true
  const { data: listeEtabs, count: listeCount } = await supabase
    .from('etablissements')
    .select('id, nom, liste, type_code', { count: 'exact' })
    .eq('liste', true)

  // Types établissement
  const { data: types, error: typesError } = await supabase
    .from('types_etablissement')
    .select('*')
    .order('ordre', { ascending: true })

  return NextResponse.json({
    today,
    totalPostsPublies: totalPosts,
    etabError: etabError?.message ?? null,
    typesError: typesError?.message ?? null,
    allEtabs_sample: allEtabs,
    listeEtabs_count: listeCount,
    listeEtabs_sample: listeEtabs?.slice(0, 5),
    types,
  })
}
