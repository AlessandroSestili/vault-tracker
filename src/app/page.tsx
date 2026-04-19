import { createClient } from '@/lib/supabase/server'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { MobileFab } from '@/components/ui/mobile-fab'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import type { AccountWithLatestSnapshot, Position, Liability, PositionWithQuote } from '@/types'
import { formatCurrency } from '@/lib/formats'
import { fetchQuotesByIsins, fetchEurUsdRate, toEur } from '@/lib/yahoo-finance'
import { liabilityBalance } from '@/lib/liability-calc'

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
  const debtsTotal = liabilities.filter((l) => l.type === 'debt').reduce((s, l) => s + liabilityBalance(l), 0)
  const creditsTotal = liabilities.filter((l) => l.type === 'credit').reduce((s, l) => s + liabilityBalance(l), 0)
  const total = liveTotal + manualPositionsTotal + accountsTotal + creditsTotal - debtsTotal

  const todayPosSnaps = positionsWithQuotes.map((p) => ({ position_id: p.id, value_eur: p.value, recorded_at: new Date().toISOString().slice(0, 10) }))
  const allPosSnaps = Object.values(Object.fromEntries(
    [...positionSnapshots, ...todayPosSnaps].map((s) => [`${s.position_id}_${s.recorded_at.slice(0, 10)}`, s])
  ))
  const chartData = computeDailyTotals(accountSnapshots, allPosSnaps)

  // Format total: split number from € symbol
  const totalFormatted = formatCurrency(total)
  const totalNumber = totalFormatted.replace(/\s*€$/, '')

  const allItems = [...accounts, ...positionsWithQuotes, ...manualPositions, ...liabilities]

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
        <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 md:items-start">

          {/* Left: hero + chart */}
          <div className="w-full md:space-y-8">

            {/* Hero */}
            <div className="pt-2 md:pt-8 pb-5 md:px-0">
              <p className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a] mb-[18px] flex items-center justify-between">
                <span>Portafoglio netto</span>
              </p>

              {/* Total */}
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[44px] md:text-[56px] font-medium tracking-[-1.8px] md:tracking-[-2px] tabular-nums text-[#fafafa] leading-none">
                  {totalNumber}
                </span>
                <span className="text-[20px] md:text-[24px] font-normal text-[#a1a1aa] leading-none">€</span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-5 mt-[18px] font-mono text-[10.5px] tracking-[0.4px] flex-wrap">
                {positionsWithQuotes.length > 0 && (
                  <span className="text-[#71717a]">
                    <span className="text-[var(--primary)] mr-1">●</span>
                    {positionsWithQuotes.length} live
                  </span>
                )}
                <span className="text-[#71717a]">
                  EUR/USD <span className="text-[#a1a1aa] tabular-nums">{eurUsdRate.toFixed(4)}</span>
                </span>
                {debtsTotal > 0 && (
                  <span className="text-[#ef4444] tabular-nums">
                    Debiti {formatCurrency(debtsTotal)}
                  </span>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="md:rounded-2xl md:bg-card md:border md:border-border md:p-6">
              <PortfolioChart data={chartData} />
            </div>
          </div>

          {/* Right: asset list */}
          <div className="w-full space-y-3 md:sticky md:top-20">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a]">
                Asset <span className="text-[#52525b] ml-1.5">{allItems.length}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <RefreshButton />
                <div className="hidden md:block">
                  <AddItemSheet />
                </div>
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
            {/* Timestamp — mobile only */}
            <p className="md:hidden text-center font-mono text-[10px] tracking-[0.4px] text-[#52525b] pt-2 pb-1">
              ULTIMO AGGIORNAMENTO · {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

        </div>
      </div>
      <MobileFab />
    </>
  )
}
