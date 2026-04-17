'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPosition } from '@/lib/actions'
import { Plus, Loader2 } from 'lucide-react'

const schema = z.object({
  isin: z.string().min(1, 'ISIN obbligatorio').toUpperCase(),
  units: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive('Deve essere > 0')),
  broker: z.string().min(1, 'Broker obbligatorio'),
  displayName: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function AddPositionDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await createPosition({
        isin: data.isin,
        units: data.units,
        broker: data.broker,
        displayName: data.displayName,
      })
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" />}>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Aggiungi posizione</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="isin">ISIN / Ticker</Label>
            <Input id="isin" placeholder="IE00B3RBWM25" {...register('isin')} className="uppercase" />
            {errors.isin && <p className="text-xs text-destructive">{errors.isin.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="units">Unità</Label>
            <Input id="units" type="number" step="0.000001" placeholder="10.5" {...register('units')} />
            {errors.units && <p className="text-xs text-destructive">{errors.units.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="broker">Broker / Piattaforma</Label>
            <Input id="broker" placeholder="TradeRepublic" {...register('broker')} />
            {errors.broker && <p className="text-xs text-destructive">{errors.broker.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Nome personalizzato <span className="text-muted-foreground">(opzionale)</span></Label>
            <Input id="displayName" placeholder="VWCE" {...register('displayName')} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
