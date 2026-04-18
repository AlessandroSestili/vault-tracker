'use client'

import { RefreshCcw, Pencil, Trash2, Settings2, ChevronRight } from 'lucide-react'
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
  sub?: string
  destructive?: boolean
  action: SheetAction
}

function getActions(item: SheetItem): ActionRow[] {
  if (item.kind === 'account') {
    return [
      { icon: <RefreshCcw className="w-4 h-4" />, label: 'Aggiorna valore', sub: 'Inserisci nuovo saldo', action: { kind: 'update-value', data: item.data } },
      { icon: <Settings2 className="w-4 h-4" />, label: 'Modifica dettagli', sub: 'Nome, tipo, valuta', action: { kind: 'edit-account', data: item.data } },
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
      <DialogContent showCloseButton={false} className="p-0 bg-[#0f0f11] border-white/[0.1]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Asset name header */}
        <div className="px-6 pt-2 pb-4 border-b border-white/[0.1]">
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a] mb-1">Azione</p>
          <p className="text-[15px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{title}</p>
        </div>
        <div className="pb-3">
          {actions.map((row, i) => {
            const color = row.destructive ? '#ef4444' : '#fafafa'
            const iconBg = row.destructive ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'
            const iconBorder = row.destructive ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'
            return (
              <button
                key={i}
                onClick={() => { onOpenChange(false); setTimeout(() => onAction(row.action), 150) }}
                className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
              >
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
                >
                  <span style={{ color }}>{row.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-medium tracking-[-0.1px]" style={{ color }}>{row.label}</p>
                  {row.sub && <p className="text-[12px] text-[#71717a] mt-0.5">{row.sub}</p>}
                </div>
                {!row.destructive && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#52525b] shrink-0" strokeWidth={1.5} />
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
