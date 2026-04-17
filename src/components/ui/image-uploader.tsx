'use client'

import { useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Camera, Loader2, X } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ImageUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      console.error('Upload failed:', e)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-14 h-14 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-card group"
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : value ? (
          <img src={value} alt="logo" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </button>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">Logo personalizzato</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
          >
            <X className="w-3 h-3" /> Rimuovi
          </button>
        )}
      </div>
    </div>
  )
}
