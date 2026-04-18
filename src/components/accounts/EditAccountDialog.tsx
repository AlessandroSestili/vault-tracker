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
import { ImageUploader } from '@/components/ui/image-uploader'
import { updateAccount } from '@/lib/actions'
import { ACCOUNT_TYPE_OPTIONS } from '@/lib/account-config'
import { Pencil, Loader2 } from 'lucide-react'
import type { AccountWithLatestSnapshot, AccountType } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'Obbligatorio'),
  type: z.enum(['investment', 'cash', 'pension', 'crypto', 'other']),
  currency: z.string().length(3, 'Codice ISO a 3 lettere'),
})

type FormInput = z.input<typeof schema>
type FormData = z.output<typeof schema>

export function EditAccountDialog({ account }: { account: AccountWithLatestSnapshot }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [imageUrl, setImageUrl] = useState<string | null>(account.image_url)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account.name,
      type: account.type,
      currency: account.currency,
    },
  })

  function onSubmit(data: FormData) {
    startTransition(async () => {
      await updateAccount(account.id, { ...data, imageUrl })
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
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Modifica account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <ImageUploader value={imageUrl} onChange={setImageUrl} />

          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select defaultValue={account.type} onValueChange={(v) => setValue('type', v as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ACCOUNT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valuta</Label>
              <Input placeholder="EUR" maxLength={3} className="uppercase" {...register('currency')} />
              {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva modifiche'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
