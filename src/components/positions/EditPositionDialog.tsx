'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePosition } from '@/lib/actions'
import { Pencil, Loader2 } from 'lucide-react'
import type { Position } from '@/types'

const schema = z.object({
  isin: z.string().min(1, 'Obbligatorio').toUpperCase(),
  units: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive('Deve essere > 0')),
  broker: z.string().min(1, 'Obbligatorio'),
  displayName: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function EditPositionDialog({ position }: { position: Position }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isin: position.isin,
      units: position.units.toString(),
      broker: position.broker,
      displayName: position.display_name ?? '',
    },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await updatePosition(position.id, data)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-white/5" />
      }>
        <Pencil className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifica posizione</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>ISIN / Ticker</Label>
            <Input placeholder="IE00B3RBWM25" className="uppercase font-mono" {...register('isin')} />
            {errors.isin && <p className="text-xs text-destructive">{errors.isin.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Unità</Label>
            <Input type="number" step="0.000001" placeholder="10.5" {...register('units')} />
            {errors.units && <p className="text-xs text-destructive">{errors.units.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Broker / Piattaforma</Label>
            <Input placeholder="TradeRepublic" {...register('broker')} />
            {errors.broker && <p className="text-xs text-destructive">{errors.broker.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nome personalizzato <span className="text-muted-foreground">(opzionale)</span></Label>
            <Input placeholder="VWCE" {...register('displayName')} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva modifiche'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
