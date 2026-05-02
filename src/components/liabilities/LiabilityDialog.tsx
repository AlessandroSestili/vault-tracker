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
import { createLiability, updateLiability } from '@/lib/actions'
import { ImageUploader } from '@/components/ui/image-uploader'
import { isStructuredDebt } from '@/lib/liability-calc'
import { Plus, Loader2, Pencil } from 'lucide-react'
import type { BillingCycle, Liability, LiabilitySubtype } from '@/types'

export const SUBTYPE_OPTIONS: { value: LiabilitySubtype; label: string }[] = [
  { value: 'mortgage',        label: 'Mutuo / Prestito bancario' },
  { value: 'installment',     label: 'Rata fissa (tasso 0)' },
  { value: 'informal_debt',   label: 'Debito informale' },
  { value: 'dated_credit',    label: 'Credito a scadenza' },
  { value: 'informal_credit', label: 'Credito informale' },
  { value: 'subscription',    label: 'Abbonamento ricorrente' },
]

const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: 'monthly',    label: 'Mensile' },
  { value: 'quarterly',  label: 'Trimestrale' },
  { value: 'semiannual', label: 'Semestrale' },
  { value: 'annual',     label: 'Annuale' },
]

const schema = z.object({
  subtype: z.enum(['mortgage', 'installment', 'informal_debt', 'dated_credit', 'informal_credit', 'subscription']),
  name: z.string().min(1, 'Obbligatorio'),
  currency: z.string().length(3, 'Codice ISO a 3 lettere'),
  counterparty: z.string().optional(),
  note: z.string().optional(),
  amount: z.string().optional(),
  current_balance: z.string().optional(),
  monthly_payment: z.string().optional(),
  interest_rate: z.string().optional(),
  next_payment_date: z.string().optional(),
  due_date: z.string().optional(),
  billing_cycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual']).optional(),
  day_of_month: z.string().optional(),
}).superRefine((data, ctx) => {
  const subtype = data.subtype as LiabilitySubtype
  if (isStructuredDebt(subtype) && subtype !== 'subscription') {
    if (!data.current_balance || parseFloat(data.current_balance) <= 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Deve essere > 0', path: ['current_balance'] })
    if (!data.monthly_payment || parseFloat(data.monthly_payment) <= 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Deve essere > 0', path: ['monthly_payment'] })
    if (!data.next_payment_date)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obbligatorio', path: ['next_payment_date'] })
  } else if (subtype === 'subscription') {
    if (!data.amount || parseFloat(data.amount) <= 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Deve essere > 0', path: ['amount'] })
    if (!data.billing_cycle)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obbligatorio', path: ['billing_cycle'] })
    if (!data.day_of_month || parseInt(data.day_of_month) < 1 || parseInt(data.day_of_month) > 31)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Inserisci un giorno (1-31)', path: ['day_of_month'] })
  } else {
    if (!data.amount || parseFloat(data.amount) <= 0)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Deve essere > 0', path: ['amount'] })
  }
  if (subtype === 'dated_credit' && !data.due_date)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Obbligatorio', path: ['due_date'] })
})

type FormInput = z.input<typeof schema>

function toActionData(data: FormInput) {
  const subtype = data.subtype as LiabilitySubtype
  const structured = isStructuredDebt(subtype) && subtype !== 'subscription'
  return {
    name: data.name,
    subtype,
    currency: data.currency,
    counterparty: data.counterparty,
    note: data.note,
    amount: (structured || subtype === 'subscription') ? undefined : parseFloat(data.amount ?? '0'),
    currentBalance: structured ? parseFloat(data.current_balance ?? '0') : undefined,
    monthlyPayment: structured ? parseFloat(data.monthly_payment ?? '0') : undefined,
    interestRate: data.subtype === 'mortgage' && data.interest_rate ? parseFloat(data.interest_rate) : undefined,
    nextPaymentDate: structured ? data.next_payment_date : undefined,
    dueDate: data.subtype === 'dated_credit' ? data.due_date : undefined,
    billingCycle: subtype === 'subscription' ? data.billing_cycle : undefined,
    dayOfMonth: subtype === 'subscription' && data.day_of_month ? parseInt(data.day_of_month) : undefined,
    ...(subtype === 'subscription' ? { amount: parseFloat(data.amount ?? '0') } : {}),
  }
}

function LiabilityForm({
  defaultValues,
  onSubmit,
  isPending,
  imageUrl,
  onImageChange,
}: {
  defaultValues?: Partial<FormInput>
  onSubmit: (data: FormInput) => void
  isPending: boolean
  imageUrl: string | null
  onImageChange: (url: string | null) => void
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR', subtype: 'informal_debt', billing_cycle: 'monthly', ...defaultValues },
  })

  const subtype = watch('subtype') as LiabilitySubtype
  const structured = isStructuredDebt(subtype) && subtype !== 'subscription'
  const isSubscription = subtype === 'subscription'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <ImageUploader value={imageUrl} onChange={onImageChange} />

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select
          defaultValue={defaultValues?.subtype ?? 'informal_debt'}
          onValueChange={(v) => setValue('subtype', v as LiabilitySubtype)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            {SUBTYPE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input
          placeholder={isSubscription ? 'es. Netflix, SIM Vodafone' : structured ? 'es. Mutuo BancaXYZ' : 'es. Prestito Mario'}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Valuta</Label>
          <Input placeholder="EUR" maxLength={3} className="uppercase" {...register('currency')} />
          {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Controparte <span className="text-muted-foreground">(opz.)</span></Label>
          <Input placeholder={isSubscription ? 'es. Vodafone' : 'es. Banca Intesa'} {...register('counterparty')} />
        </div>
      </div>

      {isSubscription ? (
        <>
          <div className="space-y-1.5">
            <Label>Importo</Label>
            <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Periodicità</Label>
              <Select
                defaultValue={defaultValues?.billing_cycle ?? 'monthly'}
                onValueChange={(v) => setValue('billing_cycle', v as BillingCycle)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BILLING_CYCLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.billing_cycle && <p className="text-xs text-destructive">{errors.billing_cycle.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Giorno di addebito</Label>
              <Input type="number" min={1} max={31} placeholder="es. 15" {...register('day_of_month')} />
              {errors.day_of_month && <p className="text-xs text-destructive">{errors.day_of_month.message}</p>}
            </div>
          </div>
        </>
      ) : !structured ? (
        <div className="space-y-1.5">
          <Label>Importo</Label>
          <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>Saldo residuo attuale (€)</Label>
            <Input type="number" step="0.01" placeholder="es. 150000" {...register('current_balance')} />
            {errors.current_balance && <p className="text-xs text-destructive">{errors.current_balance.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rata mensile (€)</Label>
              <Input type="number" step="0.01" placeholder="es. 850" {...register('monthly_payment')} />
              {errors.monthly_payment && <p className="text-xs text-destructive">{errors.monthly_payment.message}</p>}
            </div>
            {subtype === 'mortgage' && (
              <div className="space-y-1.5">
                <Label>Tasso annuo (%) <span className="text-muted-foreground">(opz.)</span></Label>
                <Input type="number" step="0.01" placeholder="es. 2.5" {...register('interest_rate')} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Data prossima rata</Label>
            <Input type="date" {...register('next_payment_date')} />
            {errors.next_payment_date && <p className="text-xs text-destructive">{errors.next_payment_date.message}</p>}
          </div>
        </>
      )}

      {subtype === 'dated_credit' && (
        <div className="space-y-1.5">
          <Label>Scadenza</Label>
          <Input type="date" {...register('due_date')} />
          {errors.due_date && <p className="text-xs text-destructive">{errors.due_date.message}</p>}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
      </Button>
    </form>
  )
}

export function AddLiabilityDialog({
  open: propOpen,
  onOpenChange: propOnOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
} = {}) {
  const [selfOpen, setSelfOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const controlled = propOpen !== undefined
  const open = controlled ? propOpen : selfOpen
  const setOpen = (v: boolean) => controlled ? propOnOpenChange?.(v) : setSelfOpen(v)

  function onSubmit(data: FormInput) {
    startTransition(async () => {
      await createLiability({ ...toActionData(data), imageUrl })
      setImageUrl(null)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger render={
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Aggiungi debito/credito" />
        }>
          <Plus className="w-4 h-4" />
        </DialogTrigger>
      )}
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Aggiungi debito o credito</DialogTitle>
        </DialogHeader>
        <LiabilityForm onSubmit={onSubmit} isPending={isPending} imageUrl={imageUrl} onImageChange={setImageUrl} />
      </DialogContent>
    </Dialog>
  )
}

export function EditLiabilityDialog({
  liability,
  open: propOpen,
  onOpenChange: propOnOpenChange,
}: {
  liability: Liability
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [selfOpen, setSelfOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(liability.image_url)

  const controlled = propOpen !== undefined
  const open = controlled ? propOpen : selfOpen
  const setOpen = (v: boolean) => controlled ? propOnOpenChange?.(v) : setSelfOpen(v)

  function onSubmit(data: FormInput) {
    startTransition(async () => {
      await updateLiability(liability.id, { ...toActionData(data), imageUrl })
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
          <DialogTitle>Modifica {liability.type === 'debt' ? 'debito' : 'credito'}</DialogTitle>
        </DialogHeader>
        <LiabilityForm
          defaultValues={{
            subtype: liability.subtype,
            name: liability.name,
            currency: liability.currency,
            counterparty: liability.counterparty ?? '',
            note: liability.note ?? '',
            amount: isStructuredDebt(liability.subtype) && liability.subtype !== 'subscription'
              ? ''
              : liability.amount.toString(),
            current_balance: liability.current_balance?.toString() ?? '',
            monthly_payment: liability.monthly_payment?.toString() ?? '',
            interest_rate: liability.interest_rate?.toString() ?? '',
            next_payment_date: liability.next_payment_date ?? '',
            due_date: liability.due_date ?? '',
            billing_cycle: liability.billing_cycle ?? 'monthly',
            day_of_month: liability.day_of_month?.toString() ?? '',
          }}
          onSubmit={onSubmit}
          isPending={isPending}
          imageUrl={imageUrl}
          onImageChange={setImageUrl}
        />
      </DialogContent>
    </Dialog>
  )
}
