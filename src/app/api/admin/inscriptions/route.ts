import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role, id').eq('id', user.id).single()
  if (!profile || !['admin', 'moderateur'].includes(profile.role)) return null
  return user
}

// ── GET /api/admin/inscriptions?post_id=xxx ────────────────────────────────

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const postId = req.nextUrl.searchParams.get('post_id')
  if (!postId) return NextResponse.json({ error: 'post_id manquant' }, { status: 400 })

  const admin = adminClient()

  // Inscriptions du post
  const { data: inscriptions, error } = await admin
    .from('inscriptions')
    .select('id, nom, prenom, telephone, compte_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Profils associés
  const compteIds = [...new Set((inscriptions ?? []).map(i => i.compte_id).filter(Boolean))]
  let profileMap: Record<string, { prenom: string; nom: string; email?: string }> = {}
  if (compteIds.length > 0) {
    const { data: profiles } = await admin
      .from('profiles').select('id, prenom, nom').in('id', compteIds)
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = Object.fromEntries((authUsers?.users ?? []).map(u => [u.id, u.email ?? '']))
    for (const p of profiles ?? []) {
      profileMap[p.id] = { prenom: p.prenom, nom: p.nom, email: emailMap[p.id] }
    }
  }

  return NextResponse.json(
    (inscriptions ?? []).map(i => ({
      ...i,
      compte: i.compte_id ? (profileMap[i.compte_id] ?? null) : null,
    }))
  )
}

// ── POST /api/admin/inscriptions ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { post_id, nom, prenom, telephone, email } = await req.json()
  if (!post_id || !nom || !prenom) return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })

  const admin = adminClient()

  // Recherche d'un compte existant
  let compteId: string | null = null

  if (telephone) {
    const { data } = await admin
      .from('profiles').select('id').eq('telephone', telephone).maybeSingle()
    if (data) compteId = data.id
  }

  if (!compteId && email) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const match = (data?.users ?? []).find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (match) compteId = match.id
  }

  // Fallback : compte de l'admin qui réalise l'inscription
  if (!compteId) compteId = adminUser.id

  const { data, error } = await admin
    .from('inscriptions')
    .insert({ post_id, nom, prenom, telephone: telephone || null, compte_id: compteId })
    .select('id, nom, prenom, telephone, compte_id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Profil associé
  let compte = null
  if (data.compte_id) {
    const { data: profile } = await admin
      .from('profiles').select('prenom, nom').eq('id', data.compte_id).single()
    if (profile) compte = profile
  }

  return NextResponse.json({ ...data, compte })
}

// ── DELETE /api/admin/inscriptions?id=xxx ──────────────────────────────────

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })

  const { error } = await adminClient().from('inscriptions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
