'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-8">
      <div className="text-center">
        <p className="text-5xl mb-4">⚓</p>
        <h1 className="text-xl font-extrabold text-gray-900 mb-2">Une erreur est survenue</h1>
        <p className="text-gray-500 text-sm mb-6">Nous travaillons à la résoudre.</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl text-sm"
        >
          Réessayer
        </button>
        <br />
        <a href="/" className="inline-block mt-4 text-gray-400 text-xs">
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  )
}
