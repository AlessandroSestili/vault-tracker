import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { DetailChart } from '@/components/charts/DetailChart'
import { formatCurrency, formatDate } from '@/lib/formats'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import type { AccountType } from '@/types'

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: account }, { data: snapshots }] = await Promise.all([
    supabase.from('accounts_with_latest').select('*').eq('id', id).single(),
    supabase.from('snapshots').select('value, recorded_at').eq('account_id', id).order('recorded_at', { ascending: true }),
  ])

  if (!account) notFound()

  const snaps = snapshots ?? []
  const chartData = snaps.map(s => ({ date: s.recorded_at.slice(0, 10), value: s.value }))

  const first = snaps[0]?.value ?? 0
  const current = account.latest_value ?? 0
  const change = current - first
  const changePct = first > 0 ? (change / first) * 100 : 0
  const isPositive = change >= 0

  return (
    <div className="max-w-lg mx-auto px-5 md:px-8 py-6 pb-bottom-nav md:pb-10 space-y-6">
      <BackButton />

      <div>
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-1">
          {ACCOUNT_TYPE_CONFIG[account.type as AccountType]?.label ?? account.type}
        </p>
        <h1 className="text-[24px] font-medium text-foreground tracking-[-0.5px]">{account.name}</h1>
      </div>

      <div>
        <p className="text-[36px] font-medium tabular-nums tracking-[-1.5px] text-foreground leading-none">
          {formatCurrency(current, account.currency)}
        </p>
        {first > 0 && (
          <p className={`font-mono text-[13px] mt-1.5 tabular-nums ${isPositive ? 'text-[var(--primary)]' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{formatCurrency(change, account.currency)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%) da inizio
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <DetailChart data={chartData} />
      </div>

      {snaps.length > 0 && (
        <div>
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-3">
            Storico · {snaps.length} {snaps.length === 1 ? 'voce' : 'voci'}
          </p>
          <div className="border-t border-white/[0.06]">
            {[...snaps].reverse().slice(0, 24).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
                <p className="font-mono text-[12px] text-muted-foreground">{formatDate(s.recorded_at)}</p>
                <p className="font-mono text-[13.5px] font-medium text-foreground tabular-nums">
                  {formatCurrency(s.value, account.currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
