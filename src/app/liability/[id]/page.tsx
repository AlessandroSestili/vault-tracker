import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { DetailChart } from '@/components/charts/DetailChart'
import { formatCurrency, formatDate } from '@/lib/formats'
import { liabilityBalance, isStructuredDebt } from '@/lib/liability-calc'
import { SUBTYPE_LABEL } from '@/lib/account-config'

function computeSchedule(balance: number, monthlyPayment: number, interestRate: number, maxMonths = 120) {
  const r = interestRate / 1200
  const rows: { date: string; balance: number }[] = []
  const now = new Date()

  let b = balance
  for (let i = 1; i <= maxMonths && b > 0.01; i++) {
    const interest = r > 0 ? b * r : 0
    b = Math.max(0, b - Math.max(0, monthlyPayment - interest))
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    rows.push({ date: d.toISOString().slice(0, 7), balance: Math.round(b * 100) / 100 })
  }
  return rows
}

export default async function LiabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: liability } = await supabase.from('liabilities').select('*').eq('id', id).single()

  if (!liability) notFound()

  const balance = liabilityBalance(liability)
  const isDebt = liability.type === 'debt'
  const structured = isStructuredDebt(liability.subtype)

  const schedule = structured && liability.monthly_payment
    ? computeSchedule(balance, liability.monthly_payment, liability.interest_rate ?? 0)
    : []

  const chartData = [
    { date: 'Oggi', value: balance },
    ...schedule.map(s => ({ date: s.date, value: s.balance })),
  ]

  const monthsLeft = schedule.length
  const payoffDate = schedule.length > 0
    ? new Date(schedule[schedule.length - 1].date + '-01').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="max-w-lg mx-auto px-5 md:px-8 py-6 pb-bottom-nav md:pb-10 space-y-6">
      <BackButton />

      <div>
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-1">
          {SUBTYPE_LABEL[liability.subtype as keyof typeof SUBTYPE_LABEL] ?? liability.subtype}
        </p>
        <h1 className="text-[24px] font-medium text-foreground tracking-[-0.5px]">{liability.name}</h1>
        {liability.counterparty && (
          <p className="text-[13px] text-muted-foreground mt-0.5">{liability.counterparty}</p>
        )}
      </div>

      <div>
        <p className={`text-[36px] font-medium tabular-nums tracking-[-1.5px] leading-none ${isDebt ? 'text-destructive' : 'text-[var(--primary)]'}`}>
          {isDebt ? '−' : '+'}{formatCurrency(balance, liability.currency)}
        </p>
        {liability.monthly_payment && (
          <p className="font-mono text-[13px] mt-1.5 text-muted-foreground tabular-nums">
            {formatCurrency(liability.monthly_payment, liability.currency)} / mese
          </p>
        )}
      </div>

      {chartData.length >= 2 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="font-mono text-[10px] tracking-[1.5px] uppercase text-muted-foreground mb-3">
            {structured ? 'Proiezione ammortamento' : 'Saldo'}
          </p>
          <DetailChart data={chartData} color={isDebt ? '#ef4444' : 'var(--primary)'} />
        </div>
      )}

      <div className="border-t border-white/[0.06]">
        {[
          liability.monthly_payment && { label: 'Rata mensile', value: formatCurrency(liability.monthly_payment, liability.currency) },
          liability.interest_rate && { label: 'Tasso interesse', value: `${liability.interest_rate}%` },
          monthsLeft > 0 && { label: 'Mesi rimanenti', value: String(monthsLeft) },
          payoffDate && { label: 'Estinzione prevista', value: payoffDate },
          liability.due_date && { label: 'Scadenza', value: formatDate(liability.due_date) },
          liability.note && { label: 'Note', value: liability.note },
        ].filter(Boolean).map((r) => {
          const row = r as { label: string; value: string }
          return (
            <div key={row.label} className="flex items-start justify-between py-3 border-b border-white/[0.04] gap-4">
              <p className="font-mono text-[12px] text-muted-foreground uppercase tracking-[0.5px] shrink-0">{row.label}</p>
              <p className="font-mono text-[13px] text-foreground tabular-nums text-right">{row.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
