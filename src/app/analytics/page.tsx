import { createClient } from '@/lib/supabase/server'
import { AllocationChart, TYPE_COLORS } from '@/components/charts/AllocationChart'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
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

  const sliceTotal = Object.values(grouped).filter(v => v > 0).reduce((s, v) => s + v, 0)

  const slices: Slice[] = (Object.entries(grouped) as [AccountType, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({
      type,
      label: ACCOUNT_TYPE_CONFIG[type]?.label ?? type,
      value,
      color: TYPE_COLORS[type] ?? '#a1a1aa',
      pct: sliceTotal > 0 ? (value / sliceTotal) * 100 : 0,
    }))

  const allItems = [...accounts, ...positionsWithQuotes, ...manualPositions, ...liabilities]

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 md:items-start">

        {/* Left: header + chart */}
        <div className="w-full md:space-y-8">
          {/* Header */}
          <div className="pt-2 pb-6 md:px-0">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a] mb-2">Analytics</p>
            <p className="text-[26px] font-medium text-[#fafafa] tracking-[-0.6px] leading-[1.1]">
              Allocazione patrimonio
            </p>
          </div>

          {/* Donut + legend */}
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:p-8">
            <AllocationChart slices={slices} />
          </div>
        </div>

        {/* Right: asset list */}
        <div className="w-full space-y-3 md:sticky md:top-20">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a]">
              Dettaglio asset <span className="text-[#52525b] ml-1.5">{allItems.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <RefreshButton />
              <AddItemSheet />
            </div>
          </div>
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2">
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
