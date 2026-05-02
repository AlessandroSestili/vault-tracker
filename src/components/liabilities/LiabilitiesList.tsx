'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Trash2, Info, ChevronDown } from 'lucide-react'
import { LogoAvatar } from '@/components/ui/logo-avatar'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EditLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { ItemActionSheet } from '@/components/accounts/ItemActionSheet'
import type { SheetItem, SheetAction } from '@/components/accounts/ItemActionSheet'
import { deleteLiability } from '@/lib/actions'
import type { Liability } from '@/types'
import { SUBTYPE_LABEL } from '@/lib/account-config'
import { formatCurrency, formatDate } from '@/lib/formats'
import { liabilityBalance, isStructuredDebt, subscriptionMonthlyAmount } from '@/lib/liability-calc'

const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: 'mensile', quarterly: 'trimestrale', semiannual: 'semestrale', annual: 'annuale',
}

type Modal =
  | { kind: 'edit'; data: Liability }
  | { kind: 'delete'; data: Liability }
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
}: {
  label: string
  count: number
  total: string
  totalColor?: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 group"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[1.5px] uppercase text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-muted-foreground/50">{count}</span>
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

function extraInfo(l: Liability): string | null {
  if (isStructuredDebt(l.subtype) && l.monthly_payment) {
    return `rata ${formatCurrency(l.monthly_payment, l.currency)}/mese`
  }
  if (l.subtype === 'dated_credit' && l.due_date) {
    return `scade ${formatDate(l.due_date)}`
  }
  return null
}

export function LiabilitiesList({
  liabilities,
  debtsTotal,
  creditsTotal,
  liabNet,
  subscriptionsMonthlyTotal,
  subscriptionsAnnualTotal,
}: {
  liabilities: Liability[]
  debtsTotal: number
  creditsTotal: number
  liabNet: number
  subscriptionsMonthlyTotal: number
  subscriptionsAnnualTotal: number
}) {
  const [sheetItem, setSheetItem] = useState<SheetItem | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [openGroups, setOpenGroups] = useState({ debts: true, credits: true, subscriptions: true })

  const debts = [...liabilities]
    .filter(l => l.type === 'debt' && l.subtype !== 'subscription')
    .sort((a, b) => liabilityBalance(b) - liabilityBalance(a))
  const credits = [...liabilities]
    .filter(l => l.type === 'credit')
    .sort((a, b) => liabilityBalance(b) - liabilityBalance(a))
  const subscriptions = [...liabilities]
    .filter(l => l.subtype === 'subscription')
    .sort((a, b) => subscriptionMonthlyAmount(b) - subscriptionMonthlyAmount(a))

  function openSheet(item: SheetItem) {
    if (window.innerWidth >= 768) return
    setSheetItem(item)
  }

  function onAction(action: SheetAction) {
    if (action.kind === 'edit-liability') setModal({ kind: 'edit', data: action.data })
    if (action.kind === 'delete-liability') setModal({ kind: 'delete', data: action.data })
  }

  if (liabilities.length === 0) {
    return (
      <div className="text-center py-12 font-mono text-[12px] text-[#52525b] tracking-[0.4px]">
        Nessun debito, credito o abbonamento.
      </div>
    )
  }

  const rowClass = 'flex items-center py-[14px] md:py-[10px] border-b border-white/[0.04] cursor-pointer md:cursor-default active:bg-white/[0.02] transition-colors group overflow-hidden'

  return (
    <>
      {/* KPI strip */}
      <div className="flex items-start gap-6 md:gap-10 mb-6 md:mb-8 font-mono flex-wrap">
        {debtsTotal > 0 && (
          <div>
            <p className="text-[10px] tracking-[1.5px] uppercase text-muted-foreground mb-1.5">Debiti</p>
            <p className="text-[18px] font-medium tabular-nums tracking-[-0.5px] text-[#ef4444]">
              {formatCurrency(debtsTotal)}
            </p>
          </div>
        )}
        {creditsTotal > 0 && (
          <div>
            <p className="text-[10px] tracking-[1.5px] uppercase text-muted-foreground mb-1.5">Crediti</p>
            <p className="text-[18px] font-medium tabular-nums tracking-[-0.5px] text-[var(--primary)]">
              {formatCurrency(creditsTotal)}
            </p>
          </div>
        )}
        {debtsTotal > 0 && creditsTotal > 0 && (
          <div>
            <p className="text-[10px] tracking-[1.5px] uppercase text-muted-foreground mb-1.5">Netto</p>
            <p className={`text-[18px] font-medium tabular-nums tracking-[-0.5px] ${liabNet >= 0 ? 'text-[var(--primary)]' : 'text-[#ef4444]'}`}>
              {liabNet >= 0 ? '+' : '−'}{formatCurrency(Math.abs(liabNet))}
            </p>
          </div>
        )}
        {subscriptionsMonthlyTotal > 0 && (
          <div>
            <p className="text-[10px] tracking-[1.5px] uppercase text-muted-foreground mb-1.5">Abbonamenti</p>
            <p className="text-[18px] font-medium tabular-nums tracking-[-0.5px] text-foreground">
              {formatCurrency(subscriptionsMonthlyTotal)}<span className="text-[12px] text-muted-foreground font-normal">/mese</span>
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              {formatCurrency(subscriptionsAnnualTotal)}/anno
            </p>
          </div>
        )}
      </div>

      {/* Debts group */}
      {debts.length > 0 && (
        <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2 mb-4">
          <GroupHeader
            label="Debiti"
            count={debts.length}
            total={`−${formatCurrency(debtsTotal)}`}
            totalColor="text-[#ef4444]"
            open={openGroups.debts}
            onToggle={() => setOpenGroups(p => ({ ...p, debts: !p.debts }))}
          />
          {openGroups.debts && debts.map((l) => {
            const balance = liabilityBalance(l)
            const info = extraInfo(l)
            return (
              <div key={l.id} className={rowClass} onClick={() => openSheet({ kind: 'liability', data: l })}>
                <LogoAvatar name={l.name} catColor="#ef4444" customImageUrl={l.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{l.name}</p>
                  <p className="text-[12px] text-[#71717a] mt-0.5 truncate">
                    {SUBTYPE_LABEL[l.subtype]}
                    {l.counterparty && ` · ${l.counterparty}`}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskLink href={`/liability/${l.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
                  <DeskBtn onClick={() => setModal({ kind: 'edit', data: l })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete', data: l })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#ef4444]">
                    −{formatCurrency(balance, l.currency)}
                  </p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
                    {info ?? 'debito'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Credits group */}
      {credits.length > 0 && (
        <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2">
          <GroupHeader
            label="Crediti"
            count={credits.length}
            total={`+${formatCurrency(creditsTotal)}`}
            totalColor="text-[var(--primary)]"
            open={openGroups.credits}
            onToggle={() => setOpenGroups(p => ({ ...p, credits: !p.credits }))}
          />
          {openGroups.credits && credits.map((l) => {
            const balance = liabilityBalance(l)
            const info = extraInfo(l)
            return (
              <div key={l.id} className={rowClass} onClick={() => openSheet({ kind: 'liability', data: l })}>
                <LogoAvatar name={l.name} catColor="oklch(0.82 0.18 130)" customImageUrl={l.image_url} />
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
                  <DeskBtn onClick={() => setModal({ kind: 'edit', data: l })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete', data: l })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[var(--primary)]">
                    +{formatCurrency(balance, l.currency)}
                  </p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
                    {info ?? 'credito'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Subscriptions group */}
      {subscriptions.length > 0 && (
        <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2 mt-4">
          <GroupHeader
            label="Abbonamenti"
            count={subscriptions.length}
            total={`${formatCurrency(subscriptionsMonthlyTotal)}/mese`}
            totalColor="text-foreground/70"
            open={openGroups.subscriptions}
            onToggle={() => setOpenGroups(p => ({ ...p, subscriptions: !p.subscriptions }))}
          />
          {openGroups.subscriptions && subscriptions.map((l) => {
            const monthlyAmt = subscriptionMonthlyAmount(l)
            const cycleLabel = l.billing_cycle ? BILLING_CYCLE_LABEL[l.billing_cycle] : ''
            return (
              <div key={l.id} className={rowClass} onClick={() => openSheet({ kind: 'liability', data: l })}>
                <LogoAvatar name={l.name} catColor="oklch(0.72 0.02 260)" customImageUrl={l.image_url} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{l.name}</p>
                  <p className="text-[12px] text-[#71717a] mt-0.5 truncate">
                    {cycleLabel}
                    {l.counterparty && ` · ${l.counterparty}`}
                    {l.day_of_month && ` · giorno ${l.day_of_month}`}
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <DeskLink href={`/liability/${l.id}`}><Info className="w-3.5 h-3.5" /></DeskLink>
                  <DeskBtn onClick={() => setModal({ kind: 'edit', data: l })}><Pencil className="w-3.5 h-3.5" /></DeskBtn>
                  <DeskBtn onClick={() => setModal({ kind: 'delete', data: l })} danger><Trash2 className="w-3.5 h-3.5" /></DeskBtn>
                </div>
                <div className="text-right shrink-0 ml-2 md:group-hover:opacity-30 transition-opacity">
                  <p className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-foreground">
                    {formatCurrency(l.amount, l.currency)}
                  </p>
                  <p className="font-mono text-[10.5px] text-[#71717a] mt-0.5">
                    {formatCurrency(monthlyAmt)}/mese
                  </p>
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

      {/* Modals */}
      {modal?.kind === 'edit' && (
        <EditLiabilityDialog
          liability={modal.data}
          open
          onOpenChange={(o) => !o && setModal(null)}
        />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmDialog
          title={`Elimina ${modal.data.type === 'debt' ? 'debito' : 'credito'}`}
          description={`Vuoi eliminare "${modal.data.name}"? Questa azione non può essere annullata.`}
          open
          onOpenChange={(o) => !o && setModal(null)}
          onConfirm={() => deleteLiability(modal.data.id)}
        />
      )}
    </>
  )
}
