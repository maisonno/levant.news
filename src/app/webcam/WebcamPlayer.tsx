'use client'

import { useRef, useEffect, useState } from 'react'

interface WebcamPlayerProps {
  hlsUrl: string | null
  poster: string | null
  date: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  })
}

export default function WebcamPlayer({ hlsUrl, poster, date }: WebcamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return
    const video = videoRef.current

    const onPlay  = () => setPlaying(true)
    const onError = () => setError(true)
    video.addEventListener('playing', onPlay)
    video.addEventListener('error',   onError)

    video.src = hlsUrl
    video.load()
    video.play().catch(() => {
      // Autoplay bloqué → l'utilisateur doit appuyer sur Play
    })

    return () => {
      video.removeEventListener('playing', onPlay)
      video.removeEventListener('error',   onError)
    }
  }, [hlsUrl])

  if (!hlsUrl || error) {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-gray-900 flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-2xl">🎥</p>
        <p className="text-white/60 text-sm">Flux indisponible pour le moment</p>
        <a
          href="https://pv.viewsurf.com/2390/Ile-du-Levant"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-semibold"
        >
          Voir sur Viewsurf.com →
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl overflow-hidden shadow-sm bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          poster={poster ?? undefined}
          controls
          muted
          playsInline
          autoPlay
          className="w-full h-full object-cover"
        />
      </div>
      {date && (
        <p className="text-xs text-gray-400 text-right">
          Dernière mise à jour : {fmtDate(date)}
        </p>
      )}
    </div>
  )
}
