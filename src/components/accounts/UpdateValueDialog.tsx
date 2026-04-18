'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addSnapshot } from '@/lib/actions'
import type { AccountWithLatestSnapshot } from '@/types'
import { RefreshCcw, Loader2 } from 'lucide-react'

const schema = z.object({
  value: z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0, 'Must be ≥ 0')),
  note: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function UpdateValueDialog({ account }: { account: AccountWithLatestSnapshot }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: account.latest_value?.toString() ?? '0',
    },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await addSnapshot({ accountId: account.id, value: data.value, note: data.note })
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-white/5" title="Aggiorna valore" />}>
        <RefreshCcw className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Aggiorna — {account.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="value">Nuovo valore ({account.currency})</Label>
            <Input id="value" type="number" step="0.01" placeholder="0.00" {...register('value')} />
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Nota <span className="text-muted-foreground">(opzionale)</span></Label>
            <Input id="note" placeholder="es. Aggiornamento mensile" {...register('note')} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
