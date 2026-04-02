import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <p className="text-5xl mb-4">⚓</p>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Page introuvable</h1>
        <p className="text-gray-500 text-sm mb-6">
          Cette page a coulé quelque part entre Hyères et le Levant.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl text-sm"
        >
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
