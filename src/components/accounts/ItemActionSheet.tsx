'use client'

import { RefreshCcw, Pencil, Trash2, Settings2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { AccountWithLatestSnapshot, Position, Liability, PositionWithQuote } from '@/types'

export type SheetItem =
  | { kind: 'account'; data: AccountWithLatestSnapshot }
  | { kind: 'live-position'; data: PositionWithQuote }
  | { kind: 'manual-position'; data: Position }
  | { kind: 'liability'; data: Liability }

export type SheetAction =
  | { kind: 'edit-account'; data: AccountWithLatestSnapshot }
  | { kind: 'update-value'; data: AccountWithLatestSnapshot }
  | { kind: 'edit-live'; data: PositionWithQuote }
  | { kind: 'edit-manual'; data: Position }
  | { kind: 'edit-liability'; data: Liability }
  | { kind: 'delete-account'; data: AccountWithLatestSnapshot }
  | { kind: 'delete-live'; data: PositionWithQuote }
  | { kind: 'delete-manual'; data: Position }
  | { kind: 'delete-liability'; data: Liability }

interface Props {
  item: SheetItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: SheetAction) => void
}

type ActionRow = {
  icon: React.ReactNode
  label: string
  destructive?: boolean
  action: SheetAction
}

function getActions(item: SheetItem): ActionRow[] {
  if (item.kind === 'account') {
    return [
      { icon: <RefreshCcw className="w-4 h-4" />, label: 'Aggiorna valore', action: { kind: 'update-value', data: item.data } },
      { icon: <Settings2 className="w-4 h-4" />, label: 'Modifica dettagli', action: { kind: 'edit-account', data: item.data } },
      { icon: <Trash2 className="w-4 h-4" />, label: 'Elimina', destructive: true, action: { kind: 'delete-account', data: item.data } },
    ]
  }
  if (item.kind === 'live-position') {
    return [
      { icon: <Pencil className="w-4 h-4" />, label: 'Modifica posizione', action: { kind: 'edit-live', data: item.data } },
      { icon: <Trash2 className="w-4 h-4" />, label: 'Elimina', destructive: true, action: { kind: 'delete-live', data: item.data } },
    ]
  }
  if (item.kind === 'manual-position') {
    return [
      { icon: <Pencil className="w-4 h-4" />, label: 'Modifica posizione', action: { kind: 'edit-manual', data: item.data } },
      { icon: <Trash2 className="w-4 h-4" />, label: 'Elimina', destructive: true, action: { kind: 'delete-manual', data: item.data } },
    ]
  }
  // liability
  return [
    { icon: <Settings2 className="w-4 h-4" />, label: 'Modifica', action: { kind: 'edit-liability', data: item.data } },
    { icon: <Trash2 className="w-4 h-4" />, label: 'Elimina', destructive: true, action: { kind: 'delete-liability', data: item.data } },
  ]
}

function getTitle(item: SheetItem): string {
  if (item.kind === 'account') return item.data.name
  if (item.kind === 'live-position') return item.data.display_name ?? item.data.isin ?? 'Posizione'
  if (item.kind === 'manual-position') return item.data.display_name ?? 'Posizione'
  return item.data.name
}

export function ItemActionSheet({ item, open, onOpenChange, onAction }: Props) {
  if (!item) return null

  const actions = getActions(item)
  const title = getTitle(item)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-border">
        <DialogTitle className="text-sm text-muted-foreground font-normal truncate pb-2 border-b border-border/60">
          {title}
        </DialogTitle>
        <div className="-mx-1 -mb-1 space-y-0.5">
          {actions.map((row, i) => (
            <button
              key={i}
              onClick={() => { onOpenChange(false); setTimeout(() => onAction(row.action), 150) }}
              className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium transition-colors active:scale-[0.98] ${
                row.destructive
                  ? 'text-destructive hover:bg-destructive/10 active:bg-destructive/15'
                  : 'text-foreground hover:bg-white/[0.06] active:bg-white/[0.08]'
              }`}
            >
              <span className={row.destructive ? 'text-destructive' : 'text-muted-foreground'}>
                {row.icon}
              </span>
              {row.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
