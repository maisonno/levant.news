'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚓</p>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              Une erreur est survenue
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Nous travaillons à la résoudre.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#1A56DB', color: 'white', border: 'none',
                fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '1rem',
                fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            <br />
            <a href="/" style={{ display: 'inline-block', marginTop: '1rem', color: '#6b7280', fontSize: '0.75rem' }}>
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
