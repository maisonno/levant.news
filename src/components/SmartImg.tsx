'use client'

import { useState, useEffect } from 'react'
import { supabaseImg } from '@/lib/supabaseImg'

interface Props {
  url:       string
  width:     number
  quality?:  number
  alt:       string
  className?: string
}

export default function SmartImg({ url, width, quality, alt, className }: Props) {
  const getTransformed = () => supabaseImg(url, width, quality) ?? url
  const [src, setSrc] = useState(getTransformed)

  useEffect(() => {
    setSrc(getTransformed())
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => { if (src !== url) setSrc(url) }}
    />
  )
}
