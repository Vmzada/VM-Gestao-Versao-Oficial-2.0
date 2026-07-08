'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function PhotoUpload({
  folder,
  value,
  onChange,
}: {
  folder: 'products' | 'courts'
  value: string | null
  onChange: (url: string | null) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Escolha um arquivo de imagem.' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ variant: 'destructive', title: 'Imagem muito grande', description: 'O tamanho máximo é 5MB.' })
      return
    }

    setIsUploading(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true })

    if (error) {
      setIsUploading(false)
      toast({ variant: 'destructive', title: 'Não foi possível enviar a imagem', description: error.message })
      return
    }

    const { data } = supabase.storage.from('images').getPublicUrl(path)
    setIsUploading(false)
    onChange(data.publicUrl)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
        {value ? (
          <Image src={value} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <Camera className="h-6 w-6 text-muted-foreground" />
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {value ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3 w-3" />
            Remover
          </button>
        )}
      </div>
    </div>
  )
}
