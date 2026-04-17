import { createClient } from '@/lib/supabase/server'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import type { AccountWithLatestSnapshot, Position, Liability } from '@/types'
import type { PositionWithQuote } from '@/components/accounts/AccountsList'
import { formatCurrency } from '@/lib/formats'
import { fetchQuotesByIsins, fetchEurUsdRate, toEur } from '@/lib/yahoo-finance'

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

async function getAccountSnapshots() {
  const supabase = await createClient()
  const { data } = await supabase.from('snapshots').select('account_id, value, recorded_at').order('recorded_at', { ascending: true })
  return data ?? []
}

async function getPositionSnapshots() {
  const supabase = await createClient()
  const { data } = await supabase.from('position_snapshots').select('position_id, value_eur, recorded_at').order('recorded_at', { ascending: true })
  return data ?? []
}

async function upsertTodayPositionSnapshots(values: { id: string; valueEur: number }[]) {
  if (values.length === 0) return
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  await supabase.from('position_snapshots').upsert(
    values.map((v) => ({ position_id: v.id, value_eur: v.valueEur, recorded_at: today })),
    { onConflict: 'position_id,recorded_at', ignoreDuplicates: true }
  )
}

function computeDailyTotals(
  accountSnapshots: { account_id: string; value: number; recorded_at: string }[],
  positionSnapshots: { position_id: string; value_eur: number; recorded_at: string }[]
) {
  const latestPerItem: Record<string, number> = {}
  const byDay: Record<string, Record<string, number>> = {}

  for (const s of accountSnapshots) {
    const day = s.recorded_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = {}
    byDay[day][`a_${s.account_id}`] = s.value
  }
  for (const s of positionSnapshots) {
    const day = s.recorded_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = {}
    byDay[day][`p_${s.position_id}`] = s.value_eur
  }

  return Object.keys(byDay).sort().map((day) => {
    Object.assign(latestPerItem, byDay[day])
    return { day, total: Object.values(latestPerItem).reduce((a, b) => a + b, 0) }
  })
}

export default async function HomePage() {
  const [accounts, allPositions, liabilities, accountSnapshots, positionSnapshots, eurUsdRate] = await Promise.all([
    getAccounts(), getPositions(), getLiabilities(),
    getAccountSnapshots(), getPositionSnapshots(), fetchEurUsdRate(),
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

  await upsertTodayPositionSnapshots(positionsWithQuotes.map((p) => ({ id: p.id, valueEur: p.value })))

  const liveTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
  const manualPositionsTotal = manualPositions.reduce((s, p) => s + (p.current_value_eur ?? 0), 0)
  const accountsTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const debtsTotal = liabilities.filter((l) => l.type === 'debt').reduce((s, l) => s + l.amount, 0)
  const creditsTotal = liabilities.filter((l) => l.type === 'credit').reduce((s, l) => s + l.amount, 0)
  const total = liveTotal + manualPositionsTotal + accountsTotal + creditsTotal - debtsTotal

  const todayPosSnaps = positionsWithQuotes.map((p) => ({ position_id: p.id, value_eur: p.value, recorded_at: new Date().toISOString().slice(0, 10) }))
  const allPosSnaps = Object.values(Object.fromEntries(
    [...positionSnapshots, ...todayPosSnaps].map((s) => [`${s.position_id}_${s.recorded_at.slice(0, 10)}`, s])
  ))
  const chartData = computeDailyTotals(accountSnapshots, allPosSnaps)

  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="grid grid-cols-[1fr_360px] gap-10 items-start">
        <div className="space-y-8">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Portafoglio</p>
            <p className="text-5xl font-semibold tracking-tight tabular-nums text-foreground">{formatCurrency(total)}</p>
            {(positionsWithQuotes.length > 0 || debtsTotal > 0) && (
              <p className="text-xs text-muted-foreground">
                {positionsWithQuotes.length > 0 && <span className="text-primary/70">{positionsWithQuotes.length} live · EUR/USD {eurUsdRate.toFixed(4)}</span>}
                {debtsTotal > 0 && <span className="text-destructive/70 ml-2">−{formatCurrency(debtsTotal)} debiti</span>}
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-card border border-border p-6">
            <PortfolioChart data={chartData} />
          </div>
        </div>

        <div className="space-y-3 sticky top-20">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Asset</span>
            <div className="flex items-center gap-1">
              <RefreshButton />
              <AddLiabilityDialog />
              <AddPositionDialog />
              <AddAccountDialog />
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-3">
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
