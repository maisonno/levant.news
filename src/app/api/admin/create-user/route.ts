import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

type Role = 'user' | 'pro' | 'compagnie' | 'admin'

interface Body {
  prenom:           string
  nom:              string
  email:            string
  role:             Role
  moderateur:       boolean
  etablissementIds: string[]
}

function isValidRole(r: string): r is Role {
  return r === 'user' || r === 'pro' || r === 'compagnie' || r === 'admin'
}

export async function POST(req: NextRequest) {
  // Auth check
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabaseAuth
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  } catch (authErr: any) {
    return NextResponse.json({ error: `Erreur auth: ${authErr.message}` }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_KEY manquant dans les variables d\'environnement' },
      { status: 500 }
    )
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const prenom           = (body.prenom ?? '').trim()
  const nom              = (body.nom ?? '').trim()
  const email            = (body.email ?? '').trim().toLowerCase()
  const role             = body.role
  const moderateur       = Boolean(body.moderateur)
  const etablissementIds = Array.isArray(body.etablissementIds)
    ? body.etablissementIds.filter((id: any) => typeof id === 'string' && id.length > 0)
    : []

  if (!prenom || !nom) return NextResponse.json({ error: 'Prénom et nom obligatoires' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  if (!isValidRole(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Base URL pour le lien dans l'email (priorité à SITE_URL, sinon origine de la requête)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  // Passe par /auth/callback (SSR, pas de PKCE) qui établit la session
  // puis redirige vers /compte/reinitialiser où l'utilisateur définit son mot de passe
  const redirectTo = `${origin}/auth/callback?next=/compte/reinitialiser`

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { prenom, nom, newsletter: false },
    redirectTo,
  })

  if (inviteErr || !invited?.user) {
    return NextResponse.json(
      { error: inviteErr?.message || 'Invitation échouée' },
      { status: 400 }
    )
  }

  // Le trigger Supabase a créé une ligne profiles avec role=user par défaut.
  // On applique le rôle et le flag modérateur choisis par l'admin.
  const { error: updateErr } = await admin
    .from('profiles')
    .update({ prenom, nom, role, moderateur })
    .eq('id', invited.user.id)

  if (updateErr) {
    return NextResponse.json(
      { error: `Compte créé mais rôle non appliqué : ${updateErr.message}` },
      { status: 500 }
    )
  }

  // Liaison aux établissements sélectionnés
  if (etablissementIds.length > 0) {
    const rows = etablissementIds.map(id => ({ user_id: invited.user.id, etablissement_id: id }))
    const { error: linkErr } = await admin.from('compte_etablissements').insert(rows)
    if (linkErr) {
      return NextResponse.json(
        { error: `Compte créé mais établissements non associés : ${linkErr.message}` },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true, userId: invited.user.id })
}
