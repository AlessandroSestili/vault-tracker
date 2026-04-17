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
import { Plus, Loader2, Pencil } from 'lucide-react'
import type { Liability } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Obbligatorio'),
  type: z.enum(['debt', 'credit']),
  amount: z.string().transform((v) => parseFloat(v)).pipe(z.number().positive('Deve essere > 0')),
  currency: z.string().length(3, 'Codice ISO a 3 lettere'),
  counterparty: z.string().optional(),
  note: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

function LiabilityForm({
  defaultValues,
  onSubmit,
  isPending,
  imageUrl,
  onImageChange,
}: {
  defaultValues?: Partial<FormInput>
  onSubmit: (data: FormData) => void
  isPending: boolean
  imageUrl: string | null
  onImageChange: (url: string | null) => void
}) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR', type: 'debt', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <ImageUploader value={imageUrl} onChange={onImageChange} />
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input placeholder="es. Mutuo casa, Prestito auto" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select defaultValue={defaultValues?.type ?? 'debt'} onValueChange={(v) => setValue('type', v as 'debt' | 'credit')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="debt">Debito</SelectItem>
              <SelectItem value="credit">Credito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Valuta</Label>
          <Input placeholder="EUR" maxLength={3} className="uppercase" {...register('currency')} />
          {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Importo</Label>
        <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Controparte <span className="text-muted-foreground">(opzionale)</span></Label>
        <Input placeholder="es. Banca Intesa, Mario Rossi" {...register('counterparty')} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
      </Button>
    </form>
  )
}

export function AddLiabilityDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await createLiability({ ...data, imageUrl })
      setImageUrl(null)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Aggiungi debito/credito" />
      }>
        <Plus className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Aggiungi debito o credito</DialogTitle>
        </DialogHeader>
        <LiabilityForm onSubmit={onSubmit} isPending={isPending} imageUrl={imageUrl} onImageChange={setImageUrl} />
      </DialogContent>
    </Dialog>
  )
}

export function EditLiabilityDialog({ liability }: { liability: Liability }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(liability.image_url)

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await updateLiability(liability.id, { ...data, imageUrl })
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-white/5" />
      }>
        <Pencil className="w-3.5 h-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifica {liability.type === 'debt' ? 'debito' : 'credito'}</DialogTitle>
        </DialogHeader>
        <LiabilityForm
          defaultValues={{
            name: liability.name,
            type: liability.type,
            amount: liability.amount.toString(),
            currency: liability.currency,
            counterparty: liability.counterparty ?? '',
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
