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
import { Plus, Loader2, Pencil } from 'lucide-react'
import { createRecurringIncome, updateRecurringIncome } from '@/lib/actions'
import type { RecurringIncome, AccountWithLatestSnapshot } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Obbligatorio'),
  amount: z.string().refine((v) => parseFloat(v) > 0, 'Deve essere > 0'),
  currency: z.string().length(3, 'Codice ISO a 3 lettere'),
  day_of_month: z.string().refine((v) => {
    const n = parseInt(v); return n >= 1 && n <= 31
  }, 'Giorno tra 1 e 31'),
  account_id: z.string().min(1, 'Seleziona un conto'),
})

type FormInput = z.input<typeof schema>

export function AddRecurringIncomeDialog({ accounts }: { accounts: AccountWithLatestSnapshot[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR' },
  })

  function onSubmit(data: FormInput) {
    startTransition(async () => {
      await createRecurringIncome({
        accountId: data.account_id,
        name: data.name,
        amount: parseFloat(data.amount),
        currency: data.currency,
        dayOfMonth: parseInt(data.day_of_month),
      })
      reset()
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" strokeWidth={2} />Aggiungi entrata</Button>} />
      <DialogContent className="bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Nuova entrata ricorrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input placeholder="Es. Stipendio" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Importo</Label>
              <Input type="number" step="0.01" placeholder="3200" {...register('amount')} />
              {errors.amount && <p className="text-destructive text-xs">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Valuta</Label>
              <Input placeholder="EUR" {...register('currency')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Giorno del mese</Label>
            <Input type="number" min={1} max={31} placeholder="27" {...register('day_of_month')} />
            {errors.day_of_month && <p className="text-destructive text-xs">{errors.day_of_month.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Conto destinazione</Label>
            <Select onValueChange={(v) => setValue('account_id', v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona conto…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="text-destructive text-xs">{errors.account_id.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditRecurringIncomeDialog({
  income,
  accounts,
  open,
  onOpenChange,
}: {
  income: RecurringIncome
  accounts: AccountWithLatestSnapshot[]
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: income.name,
      amount: String(income.amount),
      currency: income.currency,
      day_of_month: String(income.day_of_month),
      account_id: income.account_id,
    },
  })

  function onSubmit(data: FormInput) {
    startTransition(async () => {
      await updateRecurringIncome(income.id, {
        accountId: data.account_id,
        name: data.name,
        amount: parseFloat(data.amount),
        currency: data.currency,
        dayOfMonth: parseInt(data.day_of_month),
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Modifica entrata ricorrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input placeholder="Es. Stipendio" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Importo</Label>
              <Input type="number" step="0.01" {...register('amount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Valuta</Label>
              <Input {...register('currency')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Giorno del mese</Label>
            <Input type="number" min={1} max={31} {...register('day_of_month')} />
            {errors.day_of_month && <p className="text-destructive text-xs">{errors.day_of_month.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Conto destinazione</Label>
            <Select defaultValue={income.account_id} onValueChange={(v) => setValue('account_id', v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiorna'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
