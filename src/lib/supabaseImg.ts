/**
 * Converts a Supabase Storage URL to the image render endpoint with resize params.
 * Reduces cached egress bandwidth significantly.
 *
 * @param url    - Original storage URL (may be null/undefined)
 * @param width  - Target width in pixels (use 2× logical size for retina)
 * @param quality - JPEG quality 1-100 (default 75)
 */
export function supabaseImg(
  url: string | null | undefined,
  width: number,
  quality = 75,
): string | undefined {
  if (!url) return undefined
  if (!url.includes('/storage/v1/object/public/')) return url
  // Kill-switch global : si les transformations d'images Supabase sont
  // indisponibles (quota / plan), poser NEXT_PUBLIC_IMAGE_TRANSFORM=off
  // dans Vercel renvoie l'URL d'origine sans aucune requête vers /render.
  if (process.env.NEXT_PUBLIC_IMAGE_TRANSFORM === 'off') return url
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}&resize=contain`
  )
}
