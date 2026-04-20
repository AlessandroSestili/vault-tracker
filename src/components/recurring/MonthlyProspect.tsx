'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/formats'
import { confirmRecurringIncome, deleteRecurringIncome } from '@/lib/actions'
import { liabilityBalance } from '@/lib/liability-calc'
import { EditRecurringIncomeDialog } from './RecurringIncomeDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { RecurringIncome, Liability, AccountWithLatestSnapshot } from '@/types'

function todayDay(): number {
  return new Date().getDate()
}

function currentMonthName(): string {
  return new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
}

type IncomeStatus = 'past' | 'today' | 'future'

function incomeStatus(day: number): IncomeStatus {
  const today = todayDay()
  if (day < today) return 'past'
  if (day === today) return 'today'
  return 'future'
}

function statusLabel(day: number) {
  const status = incomeStatus(day)
  if (status === 'today') return <span className="text-[var(--primary)] font-medium text-[10px] font-mono ml-1.5">OGGI</span>
  if (status === 'future') return <span className="text-muted-foreground text-[10px] font-mono ml-1.5">previsto</span>
  return null
}

function liabilitySubLabel(l: Liability): string {
  if (l.monthly_payment && l.monthly_payment > 0) {
    return l.next_payment_date ? `rata · scade ${formatDate(l.next_payment_date)}` : 'rata mensile'
  }
  if (l.due_date) return `scade ${formatDate(l.due_date)}`
  if (l.counterparty) return l.counterparty
  return l.subtype === 'informal_debt' ? 'debito' : l.subtype === 'informal_credit' ? 'credito' : 'totale'
}

export function MonthlyProspect({
  incomes,
  liabilities,
  accounts,
}: {
  incomes: RecurringIncome[]
  liabilities: Liability[]
  accounts: AccountWithLatestSnapshot[]
}) {
  const [editing, setEditing] = useState<RecurringIncome | null>(null)
  const [deleting, setDeleting] = useState<RecurringIncome | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const credits = liabilities.filter(l => l.type === 'credit')
  const debts = liabilities.filter(l => l.type === 'debt')

  const totalIn = incomes.reduce((s, i) => s + i.amount, 0)
    + credits.reduce((s, l) => s + liabilityBalance(l), 0)
  const totalOut = debts.reduce((s, l) => s + (l.monthly_payment ?? liabilityBalance(l)), 0)
  const net = totalIn - totalOut

  if (incomes.length === 0 && liabilities.length === 0) return null

  function handleConfirm(income: RecurringIncome) {
    setConfirming(income.id)
    startTransition(async () => {
      await confirmRecurringIncome(income.id, income.account_id, income.amount, income.currency)
      setConfirming(null)
    })
  }

  return (
    <>
      <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-5 md:py-4 space-y-3">
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">
          Prospetto · {currentMonthName()}
        </p>

        <div className="space-y-0">
          {/* Entrate ricorrenti */}
          {incomes.map((income) => {
            const status = incomeStatus(income.day_of_month)
            const dim = status === 'future'
            return (
              <div
                key={income.id}
                className={`flex items-center py-[11px] border-b border-border group ${dim ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className={`text-[13.5px] font-medium tracking-[-0.1px] ${dim ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {income.name}
                    </span>
                    {statusLabel(income.day_of_month)}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    giorno {income.day_of_month} · {accounts.find(a => a.id === income.account_id)?.name ?? '—'}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-2">
                  {status === 'today' && (
                    <button
                      onClick={() => handleConfirm(income)}
                      disabled={isPending && confirming === income.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                      title="Conferma entrata"
                    >
                      {isPending && confirming === income.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(income)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setDeleting(income)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <span className="font-mono text-[13.5px] font-medium tabular-nums text-[var(--primary)] shrink-0">
                  +{formatCurrency(income.amount, income.currency)}
                </span>
              </div>
            )
          })}

          {/* Crediti */}
          {credits.map((l) => {
            const balance = liabilityBalance(l)
            return (
              <div key={`credit-${l.id}`} className="flex items-center py-[11px] border-b border-border">
                <div className="flex-1 min-w-0">
                  <span className="text-[13.5px] font-medium text-foreground tracking-[-0.1px]">{l.name}</span>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{liabilitySubLabel(l)}</p>
                </div>
                <span className="font-mono text-[13.5px] font-medium tabular-nums text-[var(--primary)] shrink-0">
                  +{formatCurrency(balance, l.currency)}
                </span>
              </div>
            )
          })}

          {/* Debiti */}
          {debts.map((l) => {
            const hasRata = l.monthly_payment && l.monthly_payment > 0
            const displayValue = hasRata ? l.monthly_payment! : liabilityBalance(l)
            return (
              <div key={`debt-${l.id}`} className="flex items-center py-[11px] border-b border-border">
                <div className="flex-1 min-w-0">
                  <span className="text-[13.5px] font-medium text-foreground tracking-[-0.1px]">{l.name}</span>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{liabilitySubLabel(l)}</p>
                </div>
                <span className="font-mono text-[13.5px] font-medium tabular-nums text-destructive shrink-0">
                  −{formatCurrency(displayValue, l.currency)}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[10px] tracking-[1px] uppercase text-muted-foreground">Netto</span>
          <span className={`font-mono text-[14px] font-semibold tabular-nums ${net >= 0 ? 'text-[var(--primary)]' : 'text-destructive'}`}>
            {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
          </span>
        </div>
      </div>

      {editing && (
        <EditRecurringIncomeDialog
          income={editing}
          accounts={accounts}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Elimina entrata ricorrente"
          description={`Vuoi eliminare "${deleting.name}"?`}
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          onConfirm={() => deleteRecurringIncome(deleting.id)}
        />
      )}
    </>
  )
}

export function TodayIncomeBanner({
  incomes,
  accounts,
}: {
  incomes: RecurringIncome[]
  accounts: AccountWithLatestSnapshot[]
}) {
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const today = todayDay()
  const todayIncomes = incomes.filter((i) => i.day_of_month === today && !confirmed.has(i.id))

  if (todayIncomes.length === 0) return null

  function handleConfirm(income: RecurringIncome) {
    startTransition(async () => {
      await confirmRecurringIncome(income.id, income.account_id, income.amount, income.currency)
      setConfirmed((prev) => new Set([...prev, income.id]))
    })
  }

  return (
    <div className="space-y-2 mb-4">
      {todayIncomes.map((income) => (
        <div
          key={income.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              Oggi entra: <span className="text-[var(--primary)]">{income.name}</span>
            </p>
            <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
              +{formatCurrency(income.amount, income.currency)} → {accounts.find(a => a.id === income.account_id)?.name ?? '—'}
            </p>
          </div>
          <button
            onClick={() => handleConfirm(income)}
            disabled={isPending}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-primary-foreground text-[12px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" strokeWidth={2} />}
            Conferma
          </button>
        </div>
      ))}
    </div>
  )
}
