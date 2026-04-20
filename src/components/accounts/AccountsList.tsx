'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Info, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EditAccountDialog } from './EditAccountDialog'
import { UpdateValueDialog } from './UpdateValueDialog'
import { EditPositionDialog } from '@/components/positions/EditPositionDialog'
import { EditLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { EditRecurringIncomeDialog } from '@/components/recurring/RecurringIncomeDialog'
import { ItemActionSheet } from './ItemActionSheet'
import type { SheetItem, SheetAction } from './ItemActionSheet'
import { deleteAccount, deletePosition, deleteLiability, confirmRecurringIncome, deleteRecurringIncome } from '@/lib/actions'
import type { AccountWithLatestSnapshot, Position, Liability, LiabilitySubtype, PositionWithQuote, RecurringIncome } from '@/types'
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

const CAT_DOT = {
  invest:  'oklch(0.82 0.18 130)',
  cash:    'oklch(0.78 0.14 220)',
  pension: 'oklch(0.72 0.18 300)',
  crypto:  'oklch(0.75 0.16 50)',
  other:   'oklch(0.72 0.02 260)',
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
  | { kind: 'edit-account';      data: AccountWithLatestSnapshot }
  | { kind: 'update-value';      data: AccountWithLatestSnapshot }
  | { kind: 'edit-live';         data: PositionWithQuote }
  | { kind: 'edit-manual';       data: Position }
  | { kind: 'edit-liability';    data: Liability }
  | { kind: 'delete-account';    data: AccountWithLatestSnapshot }
  | { kind: 'delete-live';       data: PositionWithQuote }
  | { kind: 'delete-manual';     data: Position }
  | { kind: 'delete-liability';  data: Liability }
  | null

function DeskLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
    >
      {children}
    </Link>
  )
}

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

function GroupHeader({
  label,
  count,
  total,
  totalColor,
  open,
  onToggle,
  children,
}: {
  label: string
  count: number
  total: string
  totalColor?: string
  open: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 group"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/50">{count}</span>
        {children}
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[12px] tabular-nums font-medium ${totalColor ?? 'text-foreground/70'}`}>{total}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </div>
    </button>
  )
}

const todayDay = new Date().getDate()

export function AccountsList({
  accounts,
  positionsWithQuotes,
  manualPositions,
  liabilities,
  incomes = [],
}: {
  accounts: AccountWithLatestSnapshot[]
  positionsWithQuotes: PositionWithQuote[]
  manualPositions: Position[]
  liabilities: Liability[]
  incomes?: RecurringIncome[]
}) {
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null)
  const [modal, setModal] = useState<ActiveModal>(null)
  const [debtView, setDebtView] = useState<'totale' | 'rata'>('totale')
  const [openGroups, setOpenGroups] = useState({ conti: true, posizioni: true, liabilities: true })
  const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null)
  const [deletingIncome, setDeletingIncome] = useState<RecurringIncome | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirmIncome(income: RecurringIncome) {
    setConfirming(income.id)
    startTransition(async () => {
      await confirmRecurringIncome(income.id, income.account_id, income.amount, income.currency)
      setConfirming(null)
    })
  }

  const hasDebtWithPayment = liabilities.some(l => l.type === 'debt' && l.monthly_payment)
  const [showLiabilities, setShowLiabilities] = useState(true)

  function openSheet(item: SheetItem) {
    if (window.innerWidth >= 768) return
    setSheetItem(item)
  }

  function onAction(action: SheetAction) {
    if (action.kind === 'edit-recurring') { setEditingIncome(action.data); return }
    if (action.kind === 'delete-recurring') { setDeletingIncome(action.data); return }
    setModal(action as ActiveModal)
  }

  const closeModal = () => setModal(null)

  function toggleGroup(key: keyof typeof openGroups) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Sorted slices
  const sortedAccounts = [...accounts].sort((a, b) => (b.latest_value ?? 0) - (a.latest_value ?? 0))
  const sortedPositions = [
    ...positionsWithQuotes.map(p => ({ kind: 'live' as const, data: p })),
    ...manualPositions.map(p => ({ kind: 'manual' as const, data: p })),
  ].sort((a, b) => {
    const val = (x: typeof a) => x.kind === 'live' ? x.data.value : (x.data.current_value_eur ?? 0)
    return val(b) - val(a)
  })
  const sortedLiabilities = [...liabilities].sort((a, b) => liabilityBalance(b) - liabilityBalance(a))

  // Group totals
  const contiTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const posizioniTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
    + manualPositions.reduce((s, p) => s + (p.current_value_eur ?? 0), 0)
  const debtsTotal = liabilities.filter(l => l.type === 'debt').reduce((s, l) => s + liabilityBalance(l), 0)
  const creditsTotal = liabilities.filter(l => l.type === 'credit').reduce((s, l) => s + liabilityBalance(l), 0)
  const incomesTotal = incomes.reduce((s, i) => s + i.amount, 0)
  const prospectoNet = incomesTotal + creditsTotal - debtsTotal

  const isEmpty = accounts.length === 0 && positionsWithQuotes.length === 0 && manualPositions.length === 0 && liabilities.length === 0 && incomes.length === 0

  if (isEmpty) {
    return (
      <div className="text-center py-8 font-mono text-[12px] text-[#52525b] tracking-[0.4px]">
        Nessun asset ancora.
      </div>
    )
  }

  const rowClass = 'flex items-center py-[14px] md:py-[10px] border-b border-white/[0.04] cursor-pointer md:cursor-default active:bg-white/[0.02] transition-colors group overflow-hidden'

  return (
    <>
      {/* ── CONTI ── */}
      {accounts.length > 0 && (
        <div className="border-b border-white/[0.04]">
          <GroupHeader
            label="Conti"
            count={accounts.length}
            total={formatCurrency(contiTotal)}
            open={openGroups.conti}
            onToggle={() => toggleGroup('conti')}
          />
          {openGroups.conti && sortedAccounts.map((a) => {
            const catKey = ACCOUNT_TYPE_TO_CAT[a.type] ?? 'other'
            return (
              <div key={`acc-${a.id}`} className={rowClass} onClick={() => openSheet({ kind: 'account', data: a })}>
                <LogoAvatar name={a.name} catColor={CAT_DOT[catKey]} customImageUrl={a.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{a.name}</p>
                  <p className="text-[12px] text-[#71717a] mt-0.5">{ACCOUNT_TYPE_CONFIG[a.type].label}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskLink href={`/account/${a.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
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
          })}
        </div>
      )}

      {/* ── POSIZIONI ── */}
      {sortedPositions.length > 0 && (
        <div className="border-b border-white/[0.04]">
          <GroupHeader
            label="Posizioni"
            count={sortedPositions.length}
            total={formatCurrency(posizioniTotal)}
            open={openGroups.posizioni}
            onToggle={() => toggleGroup('posizioni')}
          />
          {openGroups.posizioni && sortedPositions.map((item) => {
            if (item.kind === 'live') {
              const p = item.data
              const label = p.display_name ?? p.isin ?? ''
              const pctColor = p.changePercent !== undefined
                ? (p.changePercent >= 0 ? 'text-[var(--primary)]' : 'text-[#ef4444]')
                : 'text-[#71717a]'
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
                  <div className="hidden md:block text-right shrink-0 ml-4 w-[56px]">
                    <p className={`font-mono text-[12px] tabular-nums ${pctColor}`}>
                      {p.changePercent !== undefined
                        ? `${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}%`
                        : '—'}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                    <DeskLink href={`/position/${p.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
                    <DeskBtn onClick={() => setModal({ kind: 'edit-live', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                    <DeskBtn onClick={() => setModal({ kind: 'delete-live', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                  </div>
                  <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                    <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa]">{formatCurrency(p.value, 'EUR')}</p>
                    <p className={`md:hidden font-mono text-[10.5px] tabular-nums mt-0.5 ${pctColor}`}>
                      {p.changePercent !== undefined
                        ? `${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(2)}%`
                        : '—'}
                    </p>
                  </div>
                </div>
              )
            }

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
                  <DeskLink href={`/position/${p.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
                  <DeskBtn onClick={() => setModal({ kind: 'edit-manual', data: p })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-manual', data: p })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa]">{formatCurrency(p.current_value_eur, 'EUR')}</p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">manuale</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DEBITI & CREDITI ── */}
      {(liabilities.length > 0 || incomes.length > 0) && (
        <div>
          <GroupHeader
            label="Debiti & Crediti"
            count={liabilities.length + incomes.length}
            total={`${prospectoNet >= 0 ? '+' : '−'}${formatCurrency(Math.abs(prospectoNet))}`}
            totalColor={prospectoNet >= 0 ? 'text-[var(--primary)]' : 'text-[#ef4444]'}
            open={openGroups.liabilities}
            onToggle={() => toggleGroup('liabilities')}
          />
          {openGroups.liabilities && (
            <div className="flex items-center gap-2 pb-2">
              {hasDebtWithPayment && (
                <div className="flex items-center gap-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                  {(['totale', 'rata'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDebtView(mode)}
                      className={`px-2.5 py-1 rounded-md font-mono text-[10px] tracking-[0.5px] uppercase transition-colors ${
                        debtView === mode
                          ? 'bg-white/[0.08] text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              )}
              {liabilities.length > 0 && (
                <button
                  onClick={() => setShowLiabilities(v => !v)}
                  className={`px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] font-mono text-[10px] tracking-[0.5px] uppercase transition-colors ${
                    showLiabilities ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {showLiabilities ? 'Nascondi deb/cred' : 'Mostra deb/cred'}
                </button>
              )}
            </div>
          )}
          {openGroups.liabilities && incomes.map((income) => {
            const isToday = income.day_of_month === todayDay
            const isFuture = income.day_of_month > todayDay
            return (
              <div key={`inc-${income.id}`} className={`${rowClass} ${isFuture ? 'opacity-50' : ''}`} onClick={() => openSheet({ kind: 'recurring', data: income })}>
                <LogoAvatar name={income.name} catColor={CAT_DOT.credit} />
                <div className="flex-1 min-w-0 ml-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{income.name}</span>
                    {isToday && <span className="font-mono text-[9px] tracking-[1px] text-[var(--primary)]">OGGI</span>}
                    {isFuture && <span className="font-mono text-[9px] tracking-[0.5px] text-muted-foreground">previsto</span>}
                  </div>
                  <p className="font-mono text-[12px] text-[#71717a] mt-0.5">giorno {income.day_of_month}</p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1">
                  {isToday && (
                    <DeskBtn onClick={() => handleConfirmIncome(income)}>
                      {isPending && confirming === income.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" strokeWidth={1.5} />}
                    </DeskBtn>
                  )}
                  <DeskBtn onClick={() => setEditingIncome(income)}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setDeletingIncome(income)} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <span className="font-mono text-[13.5px] font-medium tabular-nums text-[var(--primary)] shrink-0 ml-2">
                  +{formatCurrency(income.amount, income.currency)}
                </span>
              </div>
            )
          })}
          {openGroups.liabilities && showLiabilities && sortedLiabilities.map((l) => {
            const isDebt = l.type === 'debt'
            const balance = liabilityBalance(l)
            const showRata = isDebt && debtView === 'rata' && !!l.monthly_payment
            const displayValue = showRata ? l.monthly_payment! : balance
            const displayLabel = showRata ? 'rata mensile' : isDebt ? 'debito' : 'credito'
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
                    {l.due_date && ` · scade ${formatDate(l.due_date)}`}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskLink href={`/liability/${l.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
                  <DeskBtn onClick={() => setModal({ kind: 'edit-liability', data: l })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete-liability', data: l })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className={`font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] ${isDebt ? 'text-[#ef4444]' : 'text-[var(--primary)]'}`}>
                    {isDebt ? '−' : '+'}{formatCurrency(displayValue, l.currency)}
                  </p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">{displayLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile action sheet */}
      <ItemActionSheet
        item={sheetItem}
        open={sheetItem !== null}
        onOpenChange={(o) => !o && setSheetItem(null)}
        onAction={onAction}
      />

      {/* Controlled modals */}
      {modal?.kind === 'edit-account' && (
        <EditAccountDialog account={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal?.kind === 'update-value' && (
        <UpdateValueDialog account={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal?.kind === 'edit-live' && (
        <EditPositionDialog position={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal?.kind === 'edit-manual' && (
        <EditPositionDialog position={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal?.kind === 'edit-liability' && (
        <EditLiabilityDialog liability={modal.data} open onOpenChange={(o) => !o && closeModal()} />
      )}
      {modal?.kind === 'delete-account' && (
        <ConfirmDialog
          title="Elimina account"
          description={`Vuoi eliminare "${modal.data.name}" e tutto il suo storico?`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deleteAccount(modal.data.id)}
        />
      )}
      {modal?.kind === 'delete-live' && (
        <ConfirmDialog
          title="Elimina posizione"
          description={`Vuoi eliminare "${modal.data.display_name ?? modal.data.isin}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deletePosition(modal.data.id)}
        />
      )}
      {modal?.kind === 'delete-manual' && (
        <ConfirmDialog
          title="Elimina posizione"
          description={`Vuoi eliminare "${modal.data.display_name ?? 'Asset'}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deletePosition(modal.data.id)}
        />
      )}
      {modal?.kind === 'delete-liability' && (
        <ConfirmDialog
          title={`Elimina ${modal.data.type === 'debt' ? 'debito' : 'credito'}`}
          description={`Vuoi eliminare "${modal.data.name}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && closeModal()}
          onConfirm={() => deleteLiability(modal.data.id)}
        />
      )}
      {editingIncome && (
        <EditRecurringIncomeDialog income={editingIncome} accounts={accounts} open onOpenChange={(o) => !o && setEditingIncome(null)} />
      )}
      {deletingIncome && (
        <ConfirmDialog
          title="Elimina entrata ricorrente"
          description={`Vuoi eliminare "${deletingIncome.name}"?`}
          open
          onOpenChange={(o) => !o && setDeletingIncome(null)}
          onConfirm={() => deleteRecurringIncome(deletingIncome.id)}
        />
      )}
    </>
  )
}
