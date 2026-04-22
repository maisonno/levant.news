import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

function row(label: string, value: string | null | undefined) {
  if (!value) return ''
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:4px 0;color:#111827;font-size:13px">${value}</td>
    </tr>`
}

function emailHtml(subject: string, tableRows: string, editUrl: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#0a1f4e,#1A56DB);padding:24px 28px">
      <p style="margin:0;color:rgba(255,255,255,.6);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Levant.news · Modération</p>
      <h1 style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:800">${subject}</h1>
    </div>
    <div style="padding:24px 28px">
      <table style="border-collapse:collapse;width:100%">
        ${tableRows}
      </table>
    </div>
    <div style="padding:0 28px 28px">
      <a href="${editUrl}"
        style="display:inline-block;background:#1A56DB;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700">
        Ouvrir dans la modération →
      </a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:11px">
      Envoyé automatiquement par Levant.news. Tu reçois cet email car tu es modérateur.
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const resend = new Resend(apiKey)

  // Vérifier que l'appelant est authentifié
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, data } = await request.json()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://levant.news'

  // Récupérer les IDs des modérateurs
  const { data: moderators } = await serverClient
    .from('profiles')
    .select('id')
    .eq('moderateur', true)

  if (!moderators || moderators.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Récupérer leurs emails via le service role
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const moderatorIds = moderators.map(m => m.id)
  const emails: string[] = []
  for (const id of moderatorIds) {
    const { data: { user: u } } = await supabaseAdmin.auth.admin.getUserById(id)
    if (u?.email) emails.push(u.email)
  }

  if (emails.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Construire l'email
  let subject: string
  let tableRows: string
  let editUrl: string

  if (type === 'post') {
    subject = `Post : ${data.titre ?? '—'}`
    editUrl = `${siteUrl}/admin/moderation`
    tableRows = [
      row('Titre', data.titre),
      row('Date début', data.date_debut),
      row('Date fin', data.date_fin),
      row('Heure', data.heure),
      row('Catégorie', data.categorie_code),
      row('Description', data.complement),
    ].join('')
  } else {
    subject = `Annonce : ${data.objet ?? '—'}`
    editUrl = `${siteUrl}/admin/moderation?tab=annonces`
    tableRows = [
      row('Type', data.type === 'PERDU' ? '🔍 Perdu' : '📦 Trouvé'),
      row('Objet', data.objet),
      row('Date', data.date_evenement),
      row('Lieu', data.lieu),
      row('Description', data.description),
      row('Déclarant', data.nom_declarant),
      row('Téléphone', data.telephone),
      row('Contact', data.contact),
    ].join('')
  }

  const html = emailHtml(subject, tableRows, editUrl)

  // Envoyer à tous les modérateurs
  await Promise.allSettled(
    emails.map(email =>
      resend.emails.send({
        from: 'Levant.news <noreply@levant.news>',
        to: email,
        subject,
        html,
      })
    )
  )

  return NextResponse.json({ sent: emails.length })
}
