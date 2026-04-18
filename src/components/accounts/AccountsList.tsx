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

// Category dot colors
const CAT_DOT = {
  invest:  'oklch(0.82 0.18 130)',  // lime
  cash:    'oklch(0.78 0.14 220)',  // sky
  pension: 'oklch(0.72 0.18 300)', // violet
  crypto:  'oklch(0.75 0.16 50)',  // amber
  other:   'oklch(0.72 0.02 260)', // gray
  debt:    '#ef4444',
  credit:  'oklch(0.82 0.18 130)',
} as const

const ACCOUNT_TYPE_TO_CAT: Record<string, keyof typeof CAT_DOT> = {
  investment: 'invest',
  cash:       'cash',
  pension:    'pension',
  crypto:     'crypto',
  other:      'other',
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
          ? 'text-muted-foreground hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)]'
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
    return (
      <div className="text-center py-8 font-mono text-[12px] text-[#52525b] tracking-[0.4px]">
        Nessun asset ancora.
      </div>
    )
  }

  const rowClass = 'flex items-center py-[14px] md:py-[10px] border-b border-white/[0.04] cursor-pointer md:cursor-default active:bg-white/[0.02] transition-colors group overflow-hidden'

  return (
    <>
      <div>
        {items.map((item) => {

          if (item.kind === 'live-position') {
            const p = item.data
            const label = p.display_name ?? p.isin ?? ''
            return (
              <div key={`lp-${p.id}`} className={rowClass} onClick={() => openSheet({ kind: 'live-position', data: p })}>
                <LogoAvatar name={p.broker || label} catColor={CAT_DOT.invest} customImageUrl={p.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{label}</span>
                    <span className="font-mono text-[9px] tracking-[0.8px] uppercase text-[var(--primary)] border border-[var(--primary)] rounded-[3px] px-[5px] py-[2px] leading-none opacity-80 shrink-0">
                      live
                    </span>
                  </div>
                  <p className="text-[12px] text-[#71717a] mt-0.5 truncate">
                    {p.broker && <span>{p.broker} · </span>}
                    <span className="font-mono">{p.isin}</span>
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-live', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-live', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa]">{formatCurrency(p.value, 'EUR')}</p>
                  {p.changePercent !== undefined
                    ? <p className={`font-mono text-[10.5px] tabular-nums mt-0.5 ${p.changePercent >= 0 ? 'text-[var(--primary)]' : 'text-[#ef4444]'}`}>
                        {p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%
                      </p>
                    : <p className="font-mono text-[10.5px] text-[#71717a]">—</p>}
                </div>
              </div>
            )
          }

          if (item.kind === 'manual-position') {
            const p = item.data
            const label = p.display_name ?? 'Asset'
            return (
              <div key={`mp-${p.id}`} className={rowClass} onClick={() => openSheet({ kind: 'manual-position', data: p })}>
                <LogoAvatar name={p.broker || label} catColor={CAT_DOT.invest} customImageUrl={p.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{label}</p>
                  <p className="text-[12px] text-[#71717a] mt-0.5">{p.broker || 'Manuale'}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-manual', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-manual', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa]">{formatCurrency(p.current_value_eur, 'EUR')}</p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">manuale</p>
                </div>
              </div>
            )
          }

          if (item.kind === 'account') {
            const a = item.data
            const catKey = ACCOUNT_TYPE_TO_CAT[a.type] ?? 'other'
            return (
              <div key={`acc-${a.id}`} className={rowClass} onClick={() => openSheet({ kind: 'account', data: a })}>
                <LogoAvatar name={a.name} catColor={CAT_DOT[catKey]} customImageUrl={a.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{a.name}</p>
                  <p className="text-[12px] text-[#71717a] mt-0.5">{ACCOUNT_TYPE_CONFIG[a.type].label}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskBtn onClick={() => setModal({ kind: 'edit-account', data: a })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'update-value', data: a })}><span className="text-xs font-medium">€</span></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-account', data: a })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa]">{formatCurrency(a.latest_value, a.currency)}</p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">—</p>
                </div>
              </div>
            )
          }

          // liability
          const l = item.data
          const isDebt = l.type === 'debt'
          const balance = liabilityBalance(l)
          return (
            <div key={`lib-${l.id}`} className={rowClass} onClick={() => openSheet({ kind: 'liability', data: l })}>
              <LogoAvatar
                name={l.name}
                catColor={isDebt ? CAT_DOT.debt : CAT_DOT.credit}
                customImageUrl={l.image_url}
              />
              <div className="flex-1 min-w-0 ml-3">
                <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{l.name}</p>
                <p className="text-[12px] text-[#71717a] mt-0.5 truncate">
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
              <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                <p className={`font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] ${isDebt ? 'text-[#ef4444]' : 'text-[var(--primary)]'}`}>
                  {isDebt ? '−' : '+'}{formatCurrency(balance, l.currency)}
                </p>
                <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">{isDebt ? 'debito' : 'credito'}</p>
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
