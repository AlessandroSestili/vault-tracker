'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPosition, createManualPosition } from '@/lib/actions'
import { ImageUploader } from '@/components/ui/image-uploader'
import { Plus, Loader2 } from 'lucide-react'

const liveSchema = z.object({
  isin: z.string().min(1, 'Obbligatorio').toUpperCase(),
  units: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive('Deve essere > 0')),
  broker: z.string().default(''),
  displayName: z.string().optional(),
})

const manualSchema = z.object({
  displayName: z.string().min(1, 'Obbligatorio'),
  broker: z.string().default(''),
  initialValue: z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0, 'Deve essere ≥ 0')),
})

type LiveInput = z.input<typeof liveSchema>
type LiveData = z.output<typeof liveSchema>
type ManualInput = z.input<typeof manualSchema>
type ManualData = z.output<typeof manualSchema>

export function AddPositionDialog() {
  const [open, setOpen] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const liveForm = useForm<LiveInput, unknown, LiveData>({ resolver: zodResolver(liveSchema) })
  const manualForm = useForm<ManualInput, unknown, ManualData>({ resolver: zodResolver(manualSchema) })

  function handleClose() {
    setOpen(false)
    setIsManual(false)
    setImageUrl(null)
    liveForm.reset()
    manualForm.reset()
  }

  function onSubmitLive(data: LiveData) {
    startTransition(async () => {
      await createPosition({ isin: data.isin, units: data.units, broker: data.broker, displayName: data.displayName, imageUrl })
      handleClose()
    })
  }

  function onSubmitManual(data: ManualData) {
    startTransition(async () => {
      await createManualPosition({ displayName: data.displayName, broker: data.broker, initialValueEur: data.initialValue, imageUrl })
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true) }}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Aggiungi posizione" />
      }>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Aggiungi posizione</DialogTitle>
        </DialogHeader>

        {/* Toggle */}
        <div className="flex rounded-xl bg-secondary p-1 gap-1">
          <button
            type="button"
            onClick={() => setIsManual(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${!isManual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Con ISIN (live)
          </button>
          <button
            type="button"
            onClick={() => setIsManual(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${isManual ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Valore manuale
          </button>
        </div>

        {!isManual ? (
          <form onSubmit={liveForm.handleSubmit(onSubmitLive)} className="space-y-4">
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
            <div className="space-y-1.5">
              <Label>ISIN / Ticker</Label>
              <Input placeholder="IE00B3RBWM25" className="uppercase font-mono" {...liveForm.register('isin')} />
              {liveForm.formState.errors.isin && <p className="text-xs text-destructive">{liveForm.formState.errors.isin.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unità</Label>
              <Input type="number" step="0.000001" placeholder="10.5" {...liveForm.register('units')} />
              {liveForm.formState.errors.units && <p className="text-xs text-destructive">{liveForm.formState.errors.units.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Broker <span className="text-muted-foreground">(opzionale)</span></Label>
              <Input placeholder="TradeRepublic" {...liveForm.register('broker')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome personalizzato <span className="text-muted-foreground">(opzionale)</span></Label>
              <Input placeholder="VWCE" {...liveForm.register('displayName')} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
            </Button>
          </form>
        ) : (
          <form onSubmit={manualForm.handleSubmit(onSubmitManual)} className="space-y-4">
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
            <div className="space-y-1.5">
              <Label>Nome asset</Label>
              <Input placeholder="es. Fondo Immobiliare XYZ" {...manualForm.register('displayName')} />
              {manualForm.formState.errors.displayName && <p className="text-xs text-destructive">{manualForm.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Broker / Piattaforma <span className="text-muted-foreground">(opzionale)</span></Label>
              <Input placeholder="es. Azimut, Banca Mediolanum" {...manualForm.register('broker')} />
            </div>
            <div className="space-y-1.5">
              <Label>Valore attuale (€)</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...manualForm.register('initialValue')} />
              {manualForm.formState.errors.initialValue && <p className="text-xs text-destructive">{manualForm.formState.errors.initialValue.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
