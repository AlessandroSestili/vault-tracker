import { createClient } from '@/lib/supabase/server'
import { AllocationChart, TYPE_COLORS } from '@/components/charts/AllocationChart'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import type { AccountWithLatestSnapshot, Position, AccountType, Liability } from '@/types'
import type { PositionWithQuote } from '@/components/accounts/AccountsList'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { fetchQuotesByIsins, fetchEurUsdRate, toEur } from '@/lib/yahoo-finance'
import { liabilityBalance } from '@/lib/liability-calc'
import type { Slice } from '@/components/charts/AllocationChart'

async function getAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('accounts_with_latest').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

async function getPositions(): Promise<Position[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('positions').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

async function getLiabilities(): Promise<Liability[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('liabilities').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export default async function AnalyticsPage() {
  const [accounts, allPositions, liabilities, eurUsdRate] = await Promise.all([
    getAccounts(), getPositions(), getLiabilities(), fetchEurUsdRate(),
  ])

  const livePositions = allPositions.filter((p) => !p.is_manual)
  const manualPositions = allPositions.filter((p) => p.is_manual)

  const isins = livePositions.map((p) => p.isin!)
  const quotes = isins.length > 0 ? await fetchQuotesByIsins(isins) : {}

  const positionsWithQuotes: PositionWithQuote[] = livePositions
    .filter((p) => p.isin && quotes[p.isin])
    .map((p) => {
      const q = quotes[p.isin!]
      const priceEur = toEur(q.price, q.currency, eurUsdRate)
      return { ...p, price: priceEur, value: priceEur * p.units!, currency: 'EUR', quoteName: q.name, changePercent: q.changePercent }
    })

  const liveTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
  const manualTotal = manualPositions.reduce((s, p) => s + (p.current_value_eur ?? 0), 0)
  const accountsTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const debtsTotal = liabilities.filter((l) => l.type === 'debt').reduce((s, l) => s + liabilityBalance(l), 0)
  const creditsTotal = liabilities.filter((l) => l.type === 'credit').reduce((s, l) => s + liabilityBalance(l), 0)
  const total = liveTotal + manualTotal + accountsTotal + creditsTotal - debtsTotal

  const grouped: Partial<Record<AccountType | 'liability', number>> = {}
  if (liveTotal + manualTotal > 0) grouped['investment'] = liveTotal + manualTotal
  for (const a of accounts) {
    if (a.latest_value) grouped[a.type] = (grouped[a.type] ?? 0) + a.latest_value
  }

  const slices: Slice[] = (Object.entries(grouped) as [AccountType, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({
      type,
      label: ACCOUNT_TYPE_CONFIG[type]?.label ?? type,
      value,
      color: TYPE_COLORS[type] ?? 'oklch(0.55 0.05 240)',
      pct: total > 0 ? (value / total) * 100 : 0,
    }))

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 pb-bottom-nav md:pb-10">
      <div className="flex flex-col md:grid md:grid-cols-[1fr_360px] gap-6 md:gap-10 items-start">

        {/* Left: chart */}
        <div className="space-y-4 md:space-y-8">
          <div className="space-y-1 px-1 md:px-0">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Analytics</p>
            <p className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Allocazione patrimonio</p>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-8">
            <AllocationChart slices={slices} />
          </div>
        </div>

        {/* Right: asset list */}
        <div className="space-y-3 md:sticky md:top-20">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Asset</span>
            <div className="flex items-center gap-1">
              <RefreshButton />
              <AddLiabilityDialog />
              <AddPositionDialog />
              <AddAccountDialog />
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-2 md:p-3">
            <AccountsList
              accounts={accounts}
              positionsWithQuotes={positionsWithQuotes}
              manualPositions={manualPositions}
              liabilities={liabilities}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
