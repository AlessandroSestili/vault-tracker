'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePosition, updateManualPosition } from '@/lib/actions'
import { ImageUploader } from '@/components/ui/image-uploader'
import { Pencil, Loader2 } from 'lucide-react'
import type { Position } from '@/types'

const liveSchema = z.object({
  isin: z.string().min(1, 'Obbligatorio').toUpperCase(),
  units: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive('Deve essere > 0')),
  broker: z.string().default(''),
  displayName: z.string().optional(),
})

const manualSchema = z.object({
  displayName: z.string().min(1, 'Obbligatorio'),
  broker: z.string().default(''),
  newValue: z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0, 'Deve essere ≥ 0')),
})

type LiveInput = z.input<typeof liveSchema>
type LiveData = z.output<typeof liveSchema>
type ManualInput = z.input<typeof manualSchema>
type ManualData = z.output<typeof manualSchema>

export function EditPositionDialog({
  position,
  open: propOpen,
  onOpenChange: propOnOpenChange,
}: {
  position: Position
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [selfOpen, setSelfOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(position.image_url)

  const controlled = propOpen !== undefined
  const open = controlled ? propOpen : selfOpen
  const setOpen = (v: boolean) => controlled ? propOnOpenChange?.(v) : setSelfOpen(v)

  const liveForm = useForm<LiveInput, unknown, LiveData>({
    resolver: zodResolver(liveSchema),
    defaultValues: {
      isin: position.isin ?? '',
      units: position.units?.toString() ?? '',
      broker: position.broker,
      displayName: position.display_name ?? '',
    },
  })

  const manualForm = useForm<ManualInput, unknown, ManualData>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      displayName: position.display_name ?? '',
      broker: position.broker,
      newValue: position.current_value_eur?.toString() ?? '0',
    },
  })

  function onSubmitLive(data: LiveData) {
    startTransition(async () => {
      await updatePosition(position.id, { ...data, imageUrl })
      setOpen(false)
    })
  }

  function onSubmitManual(data: ManualData) {
    startTransition(async () => {
      await updateManualPosition(position.id, { displayName: data.displayName, broker: data.broker, newValueEur: data.newValue, imageUrl })
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger render={
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-white/5" />
        }>
          <Pencil className="w-3.5 h-3.5" />
        </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifica posizione</DialogTitle>
        </DialogHeader>

        {!position.is_manual ? (
          <form onSubmit={liveForm.handleSubmit(onSubmitLive)} className="space-y-4 pt-2">
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
            <div className="space-y-1.5">
              <Label>ISIN / Ticker</Label>
              <Input className="uppercase font-mono" {...liveForm.register('isin')} />
              {liveForm.formState.errors.isin && <p className="text-xs text-destructive">{liveForm.formState.errors.isin.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Unità</Label>
              <Input type="number" step="0.000001" {...liveForm.register('units')} />
              {liveForm.formState.errors.units && <p className="text-xs text-destructive">{liveForm.formState.errors.units.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Broker</Label>
              <Input {...liveForm.register('broker')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome personalizzato <span className="text-muted-foreground">(opzionale)</span></Label>
              <Input {...liveForm.register('displayName')} />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva modifiche'}
            </Button>
          </form>
        ) : (
          <form onSubmit={manualForm.handleSubmit(onSubmitManual)} className="space-y-4 pt-2">
            <ImageUploader value={imageUrl} onChange={setImageUrl} />
            <div className="space-y-1.5">
              <Label>Nome asset</Label>
              <Input {...manualForm.register('displayName')} />
              {manualForm.formState.errors.displayName && <p className="text-xs text-destructive">{manualForm.formState.errors.displayName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Broker / Piattaforma</Label>
              <Input {...manualForm.register('broker')} />
            </div>
            <div className="space-y-1.5">
              <Label>Valore attuale (€)</Label>
              <Input type="number" step="0.01" {...manualForm.register('newValue')} />
              {manualForm.formState.errors.newValue && <p className="text-xs text-destructive">{manualForm.formState.errors.newValue.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva modifiche'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
