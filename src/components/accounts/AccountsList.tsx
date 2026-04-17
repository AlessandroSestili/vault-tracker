'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UpdateValueDialog } from './UpdateValueDialog'
import { EditPositionDialog } from '@/components/positions/EditPositionDialog'
import { deleteAccount, deletePosition } from '@/lib/actions'
import type { AccountWithLatestSnapshot, Position } from '@/types'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { formatCurrency } from '@/lib/formats'

const ICON_BG: Record<string, string> = {
  investment: 'bg-emerald-500/15 text-emerald-400',
  cash:       'bg-sky-500/15 text-sky-400',
  pension:    'bg-violet-500/15 text-violet-400',
  crypto:     'bg-orange-500/15 text-orange-400',
  other:      'bg-zinc-500/15 text-zinc-400',
}

export type PositionWithQuote = Position & {
  price: number
  value: number
  currency: string
  quoteName: string
  changePercent: number | undefined
}

type FlatItem =
  | { kind: 'position'; data: PositionWithQuote }
  | { kind: 'account'; data: AccountWithLatestSnapshot }

const DeleteTrigger = (
  <Button
    variant="ghost"
    size="icon"
    className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
  >
    <Trash2 className="w-3.5 h-3.5" />
  </Button>
)

export function AccountsList({
  accounts,
  positionsWithQuotes,
}: {
  accounts: AccountWithLatestSnapshot[]
  positionsWithQuotes: PositionWithQuote[]
}) {
  const items: FlatItem[] = [
    ...positionsWithQuotes.map((p) => ({ kind: 'position' as const, data: p })),
    ...accounts.map((a) => ({ kind: 'account' as const, data: a })),
  ].sort((a, b) => {
    const av = a.kind === 'position' ? a.data.value : (a.data.latest_value ?? 0)
    const bv = b.kind === 'position' ? b.data.value : (b.data.latest_value ?? 0)
    return bv - av
  })

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nessun asset ancora.
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        if (item.kind === 'position') {
          const p = item.data
          const label = p.display_name ?? p.isin
          return (
            <div
              key={`pos-${p.id}`}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-emerald-500/15 text-emerald-400">
                {label.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.broker && <span>{p.broker} · </span>}
                  <span className="font-mono">{p.isin}</span>
                  <span className="ml-1.5 text-primary/70">· live</span>
                </p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <EditPositionDialog position={p} />
                <ConfirmDialog
                  title="Elimina posizione"
                  description={`Vuoi eliminare "${label}"? Questa azione non può essere annullata.`}
                  trigger={DeleteTrigger}
                  onConfirm={() => deletePosition(p.id)}
                />
              </div>
              <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {formatCurrency(p.value, 'EUR')}
                </p>
                {p.changePercent !== undefined ? (
                  <p className={`text-xs tabular-nums ${p.changePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )
        }

        const a = item.data
        return (
          <div
            key={`acc-${a.id}`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${ICON_BG[a.type]}`}>
              {a.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
              <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_CONFIG[a.type].label}</p>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <UpdateValueDialog account={a} />
              <ConfirmDialog
                title="Elimina account"
                description={`Vuoi eliminare "${a.name}" e tutto il suo storico? Questa azione non può essere annullata.`}
                trigger={DeleteTrigger}
                onConfirm={() => deleteAccount(a.id)}
              />
            </div>
            <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
              <p className="text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(a.latest_value, a.currency)}
              </p>
              <p className="text-xs text-muted-foreground">—</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
