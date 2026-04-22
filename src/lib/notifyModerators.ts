export async function notifyModerators(
  type: 'post' | 'annonce',
  data: Record<string, unknown>,
) {
  try {
    await fetch('/api/notify-moderators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    })
  } catch {
    // best-effort — ne bloque jamais l'action principale
  }
}
