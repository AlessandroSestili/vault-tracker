'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { UpdateValueDialog } from './UpdateValueDialog'
import { EditPositionDialog } from '@/components/positions/EditPositionDialog'
import { EditLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { deleteAccount, deletePosition, deleteLiability } from '@/lib/actions'
import type { AccountWithLatestSnapshot, Position, Liability, LiabilitySubtype } from '@/types'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { formatCurrency, formatDate } from '@/lib/formats'
import { liabilityBalance } from '@/lib/liability-calc'

const SUBTYPE_LABEL: Record<LiabilitySubtype, string> = {
  mortgage:       'Mutuo',
  installment:    'Rata fissa',
  informal_debt:  'Debito',
  dated_credit:   'Credito',
  informal_credit:'Credito',
}

const ACCOUNT_ICON_BG: Record<string, string> = {
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

const DeleteTrigger = (
  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
    <Trash2 className="w-3.5 h-3.5" />
  </Button>
)

export function AccountsList({
  accounts,
  positionsWithQuotes,
  manualPositions,
  liabilities,
}: {
  accounts: AccountWithLatestSnapshot[]
  positionsWithQuotes: PositionWithQuote[]
  manualPositions: Position[]
  liabilities: Liability[]
}) {
  type Item =
    | { kind: 'live-position'; data: PositionWithQuote }
    | { kind: 'manual-position'; data: Position }
    | { kind: 'account'; data: AccountWithLatestSnapshot }
    | { kind: 'liability'; data: Liability }

  const items: Item[] = [
    ...positionsWithQuotes.map((p) => ({ kind: 'live-position' as const, data: p })),
    ...manualPositions.map((p) => ({ kind: 'manual-position' as const, data: p })),
    ...accounts.map((a) => ({ kind: 'account' as const, data: a })),
    ...liabilities.map((l) => ({ kind: 'liability' as const, data: l })),
  ].sort((a, b) => {
    const val = (item: Item) => {
      if (item.kind === 'live-position') return item.data.value
      if (item.kind === 'manual-position') return item.data.current_value_eur ?? 0
      if (item.kind === 'account') return item.data.latest_value ?? 0
      return item.data.amount
    }
    return val(b) - val(a)
  })

  if (items.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Nessun asset ancora.</div>
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        if (item.kind === 'live-position') {
          const p = item.data
          const label = p.display_name ?? p.isin ?? ''
          return (
            <div key={`lp-${p.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
              <LogoAvatar name={p.broker || label} fallbackClassName="bg-emerald-500/15 text-emerald-400" customImageUrl={p.image_url} />
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
                <ConfirmDialog title="Elimina posizione" description={`Vuoi eliminare "${label}"? Questa azione non può essere annullata.`} trigger={DeleteTrigger} onConfirm={() => deletePosition(p.id)} />
              </div>
              <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(p.value, 'EUR')}</p>
                {p.changePercent !== undefined
                  ? <p className={`text-xs tabular-nums ${p.changePercent >= 0 ? 'text-primary' : 'text-destructive'}`}>{p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%</p>
                  : <p className="text-xs text-muted-foreground">—</p>}
              </div>
            </div>
          )
        }

        if (item.kind === 'manual-position') {
          const p = item.data
          const label = p.display_name ?? 'Asset'
          return (
            <div key={`mp-${p.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
              <LogoAvatar name={p.broker || label} fallbackClassName="bg-violet-500/15 text-violet-400" customImageUrl={p.image_url} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground">{p.broker || 'Manuale'}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <EditPositionDialog position={p} />
                <ConfirmDialog title="Elimina posizione" description={`Vuoi eliminare "${label}"? Questa azione non può essere annullata.`} trigger={DeleteTrigger} onConfirm={() => deletePosition(p.id)} />
              </div>
              <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(p.current_value_eur, 'EUR')}</p>
                <p className="text-xs text-muted-foreground">manuale</p>
              </div>
            </div>
          )
        }

        if (item.kind === 'account') {
          const a = item.data
          return (
            <div key={`acc-${a.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
              <LogoAvatar name={a.name} fallbackClassName={ACCOUNT_ICON_BG[a.type]} customImageUrl={a.image_url} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_CONFIG[a.type].label}</p>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <UpdateValueDialog account={a} />
                <ConfirmDialog title="Elimina account" description={`Vuoi eliminare "${a.name}" e tutto il suo storico?`} trigger={DeleteTrigger} onConfirm={() => deleteAccount(a.id)} />
              </div>
              <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
                <p className="text-sm font-medium tabular-nums">{formatCurrency(a.latest_value, a.currency)}</p>
                <p className="text-xs text-muted-foreground">—</p>
              </div>
            </div>
          )
        }

        // liability
        const l = item.data
        const isDebt = l.type === 'debt'
        return (
          <div key={`lib-${l.id}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
            {l.image_url
              ? <LogoAvatar name={l.name} fallbackClassName={isDebt ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'} customImageUrl={l.image_url} />
              : <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isDebt ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>{isDebt ? '−' : '+'}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
              <p className="text-xs text-muted-foreground">
                {SUBTYPE_LABEL[l.subtype]}
                {l.counterparty && ` · ${l.counterparty}`}
                {l.monthly_payment && ` · €${l.monthly_payment}/mese`}
                {l.due_date && ` · scade ${formatDate(l.due_date)}`}
              </p>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <EditLiabilityDialog liability={l} />
              <ConfirmDialog title={`Elimina ${isDebt ? 'debito' : 'credito'}`} description={`Vuoi eliminare "${l.name}"? Questa azione non può essere annullata.`} trigger={DeleteTrigger} onConfirm={() => deleteLiability(l.id)} />
            </div>
            <div className="text-right shrink-0 group-hover:opacity-30 transition-opacity">
              <p className={`text-sm font-medium tabular-nums ${isDebt ? 'text-destructive' : 'text-primary'}`}>
                {isDebt ? '−' : '+'}{formatCurrency(liabilityBalance(l), l.currency)}
              </p>
              <p className="text-xs text-muted-foreground">{isDebt ? 'debito' : 'credito'}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
