'use client'

import { useState } from 'react'
import { supabaseImg } from '@/lib/supabaseImg'

interface Props {
  url:       string
  width:     number
  quality?:  number
  alt:       string
  className?: string
}

/**
 * <img> qui charge la version transformée (render endpoint Supabase) et, si
 * celle-ci échoue (transformations désactivées, quota dépassé…), bascule
 * automatiquement sur l'URL d'origine non transformée.
 */
export default function SmartImg({ url, width, quality, alt, className }: Props) {
  const transformed = supabaseImg(url, width, quality) ?? url
  const [src, setSrc] = useState(transformed)

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
