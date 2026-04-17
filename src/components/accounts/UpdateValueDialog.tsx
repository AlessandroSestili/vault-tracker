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
import { Pencil } from 'lucide-react'

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
      <DialogTrigger render={<Button variant="ghost" size="icon" className="text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800" />}>
        <Pencil className="w-4 h-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update — {account.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="value">New Value ({account.currency})</Label>
            <Input id="value" type="number" step="0.01" placeholder="0.00" {...register('value')} />
            {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note <span className="text-zinc-500">(optional)</span></Label>
            <Input id="note" placeholder="e.g. Monthly update" {...register('note')} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
