import { createClient } from '@/lib/supabase/server'
import { AllocationChart, TYPE_COLORS } from '@/components/charts/AllocationChart'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import type { AccountWithLatestSnapshot, Position, AccountType } from '@/types'
import type { PositionWithQuote } from '@/components/accounts/AccountsList'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { fetchQuotesByIsins, fetchEurUsdRate, toEur } from '@/lib/yahoo-finance'
import type { Slice } from '@/components/charts/AllocationChart'

async function getAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_latest')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

async function getPositions(): Promise<Position[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export default async function AnalyticsPage() {
  const [accounts, positions, eurUsdRate] = await Promise.all([
    getAccounts(),
    getPositions(),
    fetchEurUsdRate(),
  ])

  const isins = positions.map((p) => p.isin)
  const quotes = isins.length > 0 ? await fetchQuotesByIsins(isins) : {}

  const positionsWithQuotes: PositionWithQuote[] = positions
    .filter((p) => quotes[p.isin])
    .map((p) => {
      const q = quotes[p.isin]
      const priceEur = toEur(q.price, q.currency, eurUsdRate)
      return {
        ...p,
        price: priceEur,
        value: priceEur * p.units,
        currency: 'EUR',
        quoteName: q.name,
        changePercent: q.changePercent,
      }
    })

  const positionsTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
  const accountsTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const total = positionsTotal + accountsTotal

  const grouped: Partial<Record<AccountType, number>> = {}
  if (positionsTotal > 0) grouped['investment'] = positionsTotal
  for (const a of accounts) {
    if (a.latest_value) grouped[a.type] = (grouped[a.type] ?? 0) + a.latest_value
  }

  const slices: Slice[] = (Object.entries(grouped) as [AccountType, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({
      type,
      label: ACCOUNT_TYPE_CONFIG[type]?.label ?? type,
      value,
      color: TYPE_COLORS[type] ?? 'oklch(0.55 0.05 240)',
      pct: total > 0 ? (value / total) * 100 : 0,
    }))

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="grid grid-cols-[1fr_360px] gap-10 items-start">

        {/* Colonna sinistra */}
        <div className="space-y-8">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Analytics</p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              Allocazione patrimonio
            </p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-8">
            <AllocationChart slices={slices} />
          </div>
        </div>

        {/* Sidebar destra */}
        <div className="space-y-3 sticky top-20">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Asset</span>
            <div className="flex items-center gap-1">
              <RefreshButton />
              <AddPositionDialog />
              <AddAccountDialog />
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3">
            <AccountsList accounts={accounts} positionsWithQuotes={positionsWithQuotes} />
          </div>
        </div>

      </div>
    </div>
  )
}
