'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  trigger: React.ReactElement
  onConfirm: () => Promise<void> | void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Elimina',
  trigger,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleConfirm() {
    setIsPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) setOpen(o) }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xs bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            className="flex-1 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button
            className="flex-1 bg-destructive text-white hover:bg-destructive/90 transition-colors"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
