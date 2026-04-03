import PageHeader from '@/components/PageHeader'

export default function WebcamPage() {
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

        {/* Player webcam */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-black" style={{ aspectRatio: '16/9' }}>
          <iframe
            src="https://v.viewsurf.com/2390?i=ODMxODp1bmRlZmluZWQ"
            className="w-full h-full border-0"
            allow="autoplay; fullscreen"
            allowFullScreen
            loading="lazy"
            title="Webcam Île du Levant"
          />
        </div>

        {/* Source */}
        <p className="text-xs text-gray-400 text-right">
          Source :{' '}
          <a
            href="https://pv.viewsurf.com/2390/Ile-du-Levant?i=ODMxODp1bmRlZmluZWQ"
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
