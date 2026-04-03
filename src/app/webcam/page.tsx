import PageHeader from '@/components/PageHeader'
import WebcamPlayer from './WebcamPlayer'

// ─── Fetch du flux courant via l'API Viewsurf ─────────────────────────────────

interface ViewsurfMedia {
  id: string
  source: string   // UUID Quanteec
  date: string
  thumbnail: string
  poster: string
}

async function getCurrentStream() {
  const today = new Date().toISOString().split('T')[0]
  try {
    const res = await fetch(
      `https://pv.viewsurf.com/2390/Ile-du-Levant?a=daymedias&c=8318&day=${today}`,
      { next: { revalidate: 600 } } // mise en cache 10 min (cadence des vidéos)
    )
    if (!res.ok) return null
    const data: ViewsurfMedia[] = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const latest = data[data.length - 1]
    return {
      hlsUrl: `https://deliverys4.quanteec.com/contents/encodings/vod/${latest.source}/master.m3u8`,
      poster: `https:${latest.poster}`,
      date: latest.date,
    }
  } catch {
    return null
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WebcamPage() {
  const stream = await getCurrentStream()

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader photo="/images/header-webcam.jpg">
        <h1 className="text-xl font-extrabold text-white tracking-tight">Webcam</h1>
      </PageHeader>

      <div className="px-4 py-5 space-y-4">

        {/* Titre + badge live */}
        <div className="flex items-center gap-3">
          <h2 className="text-base font-extrabold text-gray-900">Île du Levant — Vue en direct</h2>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse block" />
            Live
          </span>
        </div>

        {/* Player */}
        <WebcamPlayer
          hlsUrl={stream?.hlsUrl ?? null}
          poster={stream?.poster ?? null}
          date={stream?.date ?? null}
        />

        {/* Lien source */}
        <p className="text-xs text-gray-400 text-right">
          Source :{' '}
          <a
            href="https://pv.viewsurf.com/2390/Ile-du-Levant"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            Viewsurf
          </a>
        </p>

      </div>
    </div>
  )
}
