import { createClient } from '@/lib/supabase/server'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { VisibilityProvider } from '@/components/accounts/VisibilityContext'
import { MobileFab } from '@/components/ui/mobile-fab'
import { PortfolioHeroTotal } from '@/components/ui/portfolio-hero-total'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { TodayIncomeBanner } from '@/components/recurring/MonthlyProspect'
import {
  fetchExchangeRates,
  fetchYahooSubdaySeries,
  searchTicker,
  toEur,
  COMMODITY_MAP,
  TROY_OZ_TO_G,
  type SubdaySeries,
  type ExchangeRates,
} from '@/lib/yahoo-finance'
import { fetchAccounts, fetchPositions, fetchRecurringIncomes, mapPositionsWithQuotes, computePortfolioTotals } from '@/lib/queries'
import { backfillMissingHistory } from '@/lib/backfill'

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
    { onConflict: 'position_id,recorded_at' }
  )
}

export type DailyTotal = { day: string; total: number; accounts: number; positions: number }
export type SubdayTotalPoint = { ts: string; total: number }

type SubdayPositionSeries = { points: { ts: string; value: number }[]; previousClose: number | null }

function toPositionEurSeries(
  series: SubdaySeries | null,
  isin: string,
  units: number,
  rates: ExchangeRates
): SubdayPositionSeries {
  if (!series) return { points: [], previousClose: null }
  const commodity = COMMODITY_MAP[isin]
  const points = series.points
    .map((p) => {
      const raw = commodity?.pricePerG ? p.price / TROY_OZ_TO_G : p.price
      return { ts: p.ts, value: toEur(raw, series.currency, rates) * units }
    })
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
  let previousClose: number | null = null
  if (series.previousClose != null) {
    const raw = commodity?.pricePerG ? series.previousClose / TROY_OZ_TO_G : series.previousClose
    previousClose = toEur(raw, series.currency, rates) * units
  }
  return { points, previousClose }
}

function aggregateSubday(
  positions: SubdayPositionSeries[],
  staticBase: number
): SubdayTotalPoint[] {
  if (positions.every((p) => p.points.length === 0)) return []
  const allTs = [...new Set(positions.flatMap((s) => s.points.map((p) => p.ts)))].sort()
  const posMaps = positions.map((s) => new Map(s.points.map((p) => [p.ts, p.value])))
  const lastValues = new Array(positions.length).fill(0)
  return allTs.map((ts) => {
    for (let i = 0; i < positions.length; i++) {
      const val = posMaps[i].get(ts)
      if (val !== undefined) lastValues[i] = val
    }
    return { ts, total: staticBase + lastValues.reduce((a: number, b: number) => a + b, 0) }
  })
}

function computeDailyTotals(
  accountSnapshots: { account_id: string; value: number; recorded_at: string }[],
  positionSnapshots: { position_id: string; value_eur: number; recorded_at: string }[]
): DailyTotal[] {
  const latestAccounts: Record<string, number> = {}
  const latestPositions: Record<string, number> = {}
  const byDay: Record<string, { accounts: Record<string, number>; positions: Record<string, number> }> = {}

  for (const s of accountSnapshots) {
    const day = s.recorded_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { accounts: {}, positions: {} }
    byDay[day].accounts[s.account_id] = s.value
  }
  for (const s of positionSnapshots) {
    const day = s.recorded_at.slice(0, 10)
    if (!byDay[day]) byDay[day] = { accounts: {}, positions: {} }
    byDay[day].positions[s.position_id] = s.value_eur
  }

  return Object.keys(byDay).sort().map((day) => {
    Object.assign(latestAccounts, byDay[day].accounts)
    Object.assign(latestPositions, byDay[day].positions)
    const accounts = Object.values(latestAccounts).reduce((a, b) => a + b, 0)
    const positions = Object.values(latestPositions).reduce((a, b) => a + b, 0)
    return { day, total: accounts + positions, accounts, positions }
  })
}

export default async function HomePage() {
  const [allPositions, rates] = await Promise.all([fetchPositions(), fetchExchangeRates()])

  const [accounts, recurringIncomes, accountSnapshots, positionSnapshots] = await Promise.all([
    fetchAccounts(), fetchRecurringIncomes(),
    getAccountSnapshots(),
    backfillMissingHistory(allPositions, rates).then(() => getPositionSnapshots()),
  ])

  const livePositions = allPositions.filter((p) => !p.is_manual)
  const manualPositions = allPositions.filter((p) => p.is_manual)

  const positionsWithQuotes = await mapPositionsWithQuotes(livePositions, rates)

  await upsertTodayPositionSnapshots(positionsWithQuotes.map((p) => ({ id: p.id, valueEur: p.value })))

  const { liveTotal, manualTotal: manualPositionsTotal, accountsTotal } =
    computePortfolioTotals(accounts, positionsWithQuotes, manualPositions)

  const todayPosSnaps = positionsWithQuotes.map((p) => ({ position_id: p.id, value_eur: p.value, recorded_at: new Date().toISOString().slice(0, 10) }))
  const allPosSnaps = Object.values(Object.fromEntries(
    [...positionSnapshots, ...todayPosSnaps].map((s) => [`${s.position_id}_${s.recorded_at.slice(0, 10)}`, s])
  ))
  const chartData = computeDailyTotals(accountSnapshots, allPosSnaps)
  const vaultStart = accountSnapshots[0]?.recorded_at?.slice(0, 10) ?? null

  // Sub-daily portfolio data (only live positions change intraday)
  const staticBase = accountsTotal + manualPositionsTotal
  const tickers = await Promise.all(positionsWithQuotes.map((p) => searchTicker(p.isin!)))
  const [subdayResults, intradayResults] = await Promise.all([
    Promise.all(tickers.map((t) => t ? fetchYahooSubdaySeries(t, '1h', '30d') : Promise.resolve(null))),
    Promise.all(tickers.map((t) => t ? fetchYahooSubdaySeries(t, '2m', '1d') : Promise.resolve(null))),
  ])
  const subdayPositions = subdayResults.map((s, i) =>
    toPositionEurSeries(s, positionsWithQuotes[i].isin!, positionsWithQuotes[i].units ?? 0, rates)
  )
  const intradayPositions = intradayResults.map((s, i) =>
    toPositionEurSeries(s, positionsWithQuotes[i].isin!, positionsWithQuotes[i].units ?? 0, rates)
  )
  const portfolioSubday = aggregateSubday(subdayPositions, staticBase)
  const portfolioIntraday = aggregateSubday(intradayPositions, staticBase)
  const hasAnyIntraday = intradayPositions.some((p) => p.points.length > 0)
  const portfolioPreviousClose = hasAnyIntraday
    ? staticBase + intradayPositions.reduce(
        (sum, p, i) => sum + (p.previousClose ?? positionsWithQuotes[i].value),
        0
      )
    : null

  const allItems = [...accounts, ...positionsWithQuotes, ...manualPositions]

  return (
    <VisibilityProvider>
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
        <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 md:items-start">

          {/* Left: hero + chart */}
          <div className="w-full md:space-y-8">

            {/* Hero */}
            <div className="pt-2 md:pt-8 pb-5 md:px-0">
              <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-[18px] flex items-center justify-between">
                <span>Portafoglio netto</span>
              </p>

              {/* Total */}
              <PortfolioHeroTotal
                contiTotal={accountsTotal}
                posizioniTotal={liveTotal + manualPositionsTotal}
              />

              {/* Stats row */}
              <div className="flex items-center gap-5 mt-[18px] font-mono text-[10.5px] tracking-[0.4px] flex-wrap">
                {positionsWithQuotes.length > 0 && (
                  <span className="text-muted-foreground">
                    <span className="text-[var(--primary)] mr-1">●</span>
                    {positionsWithQuotes.length} live
                  </span>
                )}
                <span className="text-muted-foreground">
                  EUR/USD <span className="text-foreground/60 tabular-nums">{rates.USD.toFixed(4)}</span>
                </span>
              </div>
            </div>

            {/* Today income banner */}
            <TodayIncomeBanner incomes={recurringIncomes} accounts={accounts} />

            {/* Chart */}
            <div className="md:rounded-2xl md:bg-card md:border md:border-border md:p-6">
              <PortfolioChart
                data={chartData}
                vaultStart={vaultStart}
                portfolioIntraday={portfolioIntraday}
                portfolioSubday={portfolioSubday}
                portfolioPreviousClose={portfolioPreviousClose}
              />
            </div>


          </div>

          {/* Right: asset list */}
          <div className="w-full space-y-3 md:sticky md:top-20">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">
                Asset <span className="ml-1.5">{allItems.length}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <RefreshButton />
                <div className="hidden md:block">
                  <AddItemSheet accounts={accounts} />
                </div>
              </div>
            </div>
            <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2">
              <AccountsList
                accounts={accounts}
                positionsWithQuotes={positionsWithQuotes}
                manualPositions={manualPositions}
                incomes={recurringIncomes}
              />
            </div>
            {/* Timestamp — mobile only */}
            <p className="md:hidden text-center font-mono text-[10px] tracking-[0.4px] text-muted-foreground pt-2 pb-1">
              ULTIMO AGGIORNAMENTO · {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

        </div>
      </div>
      <MobileFab accounts={accounts} />
    </VisibilityProvider>
  )
}
