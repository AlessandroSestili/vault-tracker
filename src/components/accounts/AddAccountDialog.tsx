'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
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

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['investment', 'cash', 'pension', 'crypto', 'other']),
  currency: z.string().length(3, 'Use ISO 4217 code'),
  initialValue: z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0, 'Must be ≥ 0')),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function AddAccountDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR', type: 'cash' },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await createAccount(data)
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        Add Account
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. TradeRepublic" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select defaultValue="cash" onValueChange={(v) => setValue('type', v as FormData['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" placeholder="EUR" maxLength={3} {...register('currency')} />
            {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="initialValue">Current Value</Label>
            <Input id="initialValue" type="number" step="0.01" placeholder="0.00" {...register('initialValue')} />
            {errors.initialValue && <p className="text-xs text-destructive">{errors.initialValue.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
