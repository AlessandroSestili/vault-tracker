'use client'

import { useState, useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAccount } from '@/lib/actions'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/account-config'
import { Plus } from 'lucide-react'

const INSTRUMENT_TYPES = ['investment', 'crypto']

const schema = z.object({
  name: z.string().min(1, 'Required'),
  type: z.enum(['investment', 'cash', 'pension', 'crypto', 'other']),
  currency: z.string().length(3, 'Use 3-letter ISO code'),
  initialValue: z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0, 'Must be ≥ 0')),
  isin: z.string().optional(),
  units: z.string().transform((v) => v ? parseFloat(v) : undefined).pipe(z.number().positive().optional()),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function AddAccountDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR', type: 'cash' },
  })

  const selectedType = useWatch({ control, name: 'type' })
  const isInstrument = INSTRUMENT_TYPES.includes(selectedType)

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await createAccount(data)
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_oklch(0.75_0.18_152/0.3)] transition-all hover:shadow-[0_0_28px_oklch(0.75_0.18_152/0.5)]" />
      }>
        <Plus className="w-4 h-4" />
        Add Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Name</Label>
            <Input
              placeholder="e.g. TradeRepublic"
              className="bg-secondary border-border focus:border-primary/50 focus:ring-primary/20"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Type</Label>
              <Select defaultValue="cash" onValueChange={(v) => setValue('type', v as FormData['type'])}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ACCOUNT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Currency</Label>
              <Input
                placeholder="EUR"
                maxLength={3}
                className="bg-secondary border-border focus:border-primary/50 uppercase"
                {...register('currency')}
              />
              {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
            </div>
          </div>

          {isInstrument && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs text-primary/80 uppercase tracking-wider">Live Price Tracking</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">ISIN</Label>
                  <Input
                    placeholder="IE00B3RBWM25"
                    className="bg-secondary border-border focus:border-primary/50 uppercase font-mono text-sm"
                    {...register('isin')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Units held</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="0.00"
                    className="bg-secondary border-border focus:border-primary/50"
                    {...register('units')}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">If set, value is calculated automatically from live price.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
              {isInstrument ? 'Initial Value (fallback)' : 'Current Value'}
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="bg-secondary border-border focus:border-primary/50"
              {...register('initialValue')}
            />
            {errors.initialValue && <p className="text-xs text-destructive">{errors.initialValue.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_oklch(0.75_0.18_152/0.2)] transition-all"
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
