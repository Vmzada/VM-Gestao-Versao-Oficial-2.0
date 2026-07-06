'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    setError(null)

    reader
      .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          onDetected(result.getText())
          onOpenChange(false)
        }
        // NotFoundException fires continuously between frames with no
        // barcode in view — that's expected, not a real error.
        if (err && err.name !== 'NotFoundException') {
          setError('Não foi possível acessar a câmera.')
        }
      })
      .catch(() => setError('Não foi possível acessar a câmera.'))

    return () => {
      reader.reset()
      readerRef.current = null
    }
  }, [open, onDetected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escanear código de barras</DialogTitle>
          <DialogDescription>Aponte a câmera para o código de barras do produto.</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-video w-full" muted playsInline />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
