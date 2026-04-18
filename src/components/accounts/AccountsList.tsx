'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EditAccountDialog } from './EditAccountDialog'
import { UpdateValueDialog } from './UpdateValueDialog'
import { EditPositionDialog } from '@/components/positions/EditPositionDialog'
import { EditLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { ItemActionSheet } from './ItemActionSheet'
import type { SheetItem, SheetAction } from './ItemActionSheet'
import { deleteAccount, deletePosition, deleteLiability } from '@/lib/actions'
import type { AccountWithLatestSnapshot, Position, Liability, LiabilitySubtype, PositionWithQuote } from '@/types'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { formatCurrency, formatDate } from '@/lib/formats'
import { liabilityBalance } from '@/lib/liability-calc'

export type { PositionWithQuote }

const SUBTYPE_LABEL: Record<LiabilitySubtype, string> = {
  mortgage:        'Mutuo',
  installment:     'Rata fissa',
  informal_debt:   'Debito',
  dated_credit:    'Credito',
  informal_credit: 'Credito',
}

const ACCOUNT_ICON_BG: Record<string, string> = {
  investment: 'bg-emerald-500/15 text-emerald-400',
  cash:       'bg-sky-500/15 text-sky-400',
  pension:    'bg-violet-500/15 text-violet-400',
  crypto:     'bg-orange-500/15 text-orange-400',
  other:      'bg-zinc-500/15 text-zinc-400',
}

type ActiveModal =
  | { kind: 'edit-account';   data: AccountWithLatestSnapshot }
  | { kind: 'update-value';   data: AccountWithLatestSnapshot }
  | { kind: 'edit-live';      data: PositionWithQuote }
  | { kind: 'edit-manual';    data: Position }
  | { kind: 'edit-liability'; data: Liability }
  | { kind: 'delete-account'; data: AccountWithLatestSnapshot }
  | { kind: 'delete-live';    data: PositionWithQuote }
  | { kind: 'delete-manual';  data: Position }
  | { kind: 'delete-liability'; data: Liability }
  | null

function DeskBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
        danger
          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

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
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null)
  const [modal, setModal] = useState<ActiveModal>(null)

  function openSheet(item: SheetItem) {
    if (window.innerWidth >= 768) return
    setSheetItem(item)
  }

  function onAction(action: SheetAction) {
    setModal(action as ActiveModal)
  }

  const closeModal = () => setModal(null)

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

  const cardClass = 'flex items-center gap-3 px-3 py-4 md:py-3 rounded-xl hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors group cursor-pointer md:cursor-default'

  return (
    <>
      <div className="space-y-0.5">
        {items.map((item) => {
          if (item.kind === 'live-position') {
            const p = item.data
            const label = p.display_name ?? p.isin ?? ''
            return (
              <div key={`lp-${p.id}`} className={cardClass} onClick={() => openSheet({ kind: 'live-position', data: p })}>
                <LogoAvatar name={p.broker || label} fallbackClassName="bg-emerald-500/15 text-emerald-400" customImageUrl={p.image_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.broker && <span>{p.broker} · </span>}
                    <span className="font-mono">{p.isin}</span>
                    <span className="ml-1.5 text-primary/70">· live</span>
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-live', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-live', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 md:group-hover:opacity-30 transition-opacity">
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
              <div key={`mp-${p.id}`} className={cardClass} onClick={() => openSheet({ kind: 'manual-position', data: p })}>
                <LogoAvatar name={p.broker || label} fallbackClassName="bg-violet-500/15 text-violet-400" customImageUrl={p.image_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">{p.broker || 'Manuale'}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-manual', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-manual', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 md:group-hover:opacity-30 transition-opacity">
                  <p className="text-sm font-medium tabular-nums">{formatCurrency(p.current_value_eur, 'EUR')}</p>
                  <p className="text-xs text-muted-foreground">manuale</p>
                </div>
              </div>
            )
          }

          if (item.kind === 'account') {
            const a = item.data
            return (
              <div key={`acc-${a.id}`} className={cardClass} onClick={() => openSheet({ kind: 'account', data: a })}>
                <LogoAvatar name={a.name} fallbackClassName={ACCOUNT_ICON_BG[a.type]} customImageUrl={a.image_url} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_CONFIG[a.type].label}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-account', data: a })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'update-value', data: a })}><span className="text-xs font-medium">€</span></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-account', data: a })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 md:group-hover:opacity-30 transition-opacity">
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
            <div key={`lib-${l.id}`} className={cardClass} onClick={() => openSheet({ kind: 'liability', data: l })}>
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
              <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <DeskBtn onClick={() => setModal({ kind: 'edit-liability', data: l })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                <DeskBtn onClick={() => setModal({ kind: 'delete-liability', data: l })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
              </div>
              <div className="text-right shrink-0 md:group-hover:opacity-30 transition-opacity">
                <p className={`text-sm font-medium tabular-nums ${isDebt ? 'text-destructive' : 'text-primary'}`}>
                  {isDebt ? '−' : '+'}{formatCurrency(liabilityBalance(l), l.currency)}
                </p>
                <p className="text-xs text-muted-foreground">{isDebt ? 'debito' : 'credito'}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile action sheet */}
      <ItemActionSheet
        item={sheetItem}
        open={sheetItem !== null}
        onOpenChange={(o) => !o && setSheetItem(null)}
        onAction={onAction}
      />

      {/* Controlled modals */}
      {modal !== null && modal.kind === 'edit-account' && (
        <EditAccountDialog account={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal !== null && modal.kind === 'update-value' && (
        <UpdateValueDialog account={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal !== null && modal.kind === 'edit-live' && (
        <EditPositionDialog position={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal !== null && modal.kind === 'edit-manual' && (
        <EditPositionDialog position={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal !== null && modal.kind === 'edit-liability' && (
        <EditLiabilityDialog liability={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal !== null && modal.kind === 'delete-account' && (
        <ConfirmDialog
          title="Elimina account"
          description={`Vuoi eliminare "${modal.data.name}" e tutto il suo storico?`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deleteAccount(modal.data.id)}
        />
      )}
      {modal !== null && modal.kind === 'delete-live' && (
        <ConfirmDialog
          title="Elimina posizione"
          description={`Vuoi eliminare "${modal.data.display_name ?? modal.data.isin}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deletePosition(modal.data.id)}
        />
      )}
      {modal !== null && modal.kind === 'delete-manual' && (
        <ConfirmDialog
          title="Elimina posizione"
          description={`Vuoi eliminare "${modal.data.display_name ?? 'Asset'}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deletePosition(modal.data.id)}
        />
      )}
      {modal !== null && modal.kind === 'delete-liability' && (
        <ConfirmDialog
          title={`Elimina ${modal.data.type === 'debt' ? 'debito' : 'credito'}`}
          description={`Vuoi eliminare "${modal.data.name}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deleteLiability(modal.data.id)}
        />
      )}
    </>
  )
}
