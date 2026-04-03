'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ImagePickerProps {
  value: string
  onChange: (url: string) => void
  bucket: string   // ex: 'post-images', 'article-images', 'etab-images'
  folder: string   // ex: 'posts', 'articles', 'etabs'
}

export default function ImagePicker({ value, onChange, bucket, folder }: ImagePickerProps) {
  const supabase    = createClient()
  const inputRef    = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setUploadErr('Format non supporté'); return }
    setUploading(true); setUploadErr('')
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(bucket).upload(path, file, { contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch {
      setUploadErr("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

      {value ? (
        <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
          <img src={value} alt="Aperçu" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-end p-2 gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm">
              Changer
            </button>
            <button type="button" onClick={() => onChange('')}
              className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm">
              Supprimer
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-colors">
          {uploading
            ? <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            : <><span className="text-2xl">🖼️</span><span className="text-xs font-semibold">Importer une image</span></>
          }
        </button>
      )}
      {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
    </div>
  )
}
