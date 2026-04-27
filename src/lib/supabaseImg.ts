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
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}`
  )
}
