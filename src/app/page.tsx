import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { VisibilityProvider } from '@/components/accounts/VisibilityContext'
import { MobileFab } from '@/components/ui/mobile-fab'
import { PortfolioHeroTotal } from '@/components/ui/portfolio-hero-total'
import { PortfolioChart } from '@/components/charts/PortfolioChart'
import { TodayIncomeBanner, TodayPaymentBanner } from '@/components/recurring/MonthlyProspect'
import {
  fetchExchangeRates,
  fetchYahooSubdaySeries,
  searchTicker,
  toEur,
  normalizeCommodityPrice,
  type SubdaySeries,
  type ExchangeRates,
} from '@/lib/yahoo-finance'
import {
  fetchAccounts, fetchPositions, fetchRecurringIncomes, fetchLiabilities,
  mapPositionsWithQuotes, computePortfolioTotals,
  fetchAccountSnapshots, fetchPositionSnapshots,
  upsertTodayPositionSnapshots, computeDailyTotals,
  type DailyTotal, type SubdayTotalPoint,
} from '@/lib/queries'
import { backfillMissingHistory } from '@/lib/backfill'
import { getPlanLimits } from '@/lib/plans'
import { syncSubscriptionIfNeeded } from '@/lib/stripe-sync'
import { createClient } from '@/lib/supabase/server'
import { PeriodProvider, type Period } from '@/components/portfolio/PeriodContext'

export type { SubdayTotalPoint } from '@/lib/queries'

type SubdayPositionSeries = { points: { ts: string; value: number }[]; previousClose: number | null }

function toPositionEurSeries(
  series: SubdaySeries | null,
  isin: string,
  units: number,
  rates: ExchangeRates
): SubdayPositionSeries {
  if (!series) return { points: [], previousClose: null }
  const points = series.points
    .map((p) => {
      const raw = normalizeCommodityPrice(p.price, isin)
      return { ts: p.ts, value: toEur(raw, series.currency, rates) * units }
    })
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
  let previousClose: number | null = null
  if (series.previousClose != null) {
    const raw = normalizeCommodityPrice(series.previousClose, isin)
    previousClose = toEur(raw, series.currency, rates) * units
  }
  return { points, previousClose }
}

function aggregateSubday(
  positions: SubdayPositionSeries[],
  staticBase: number,
  fallbackValues?: number[]
): SubdayTotalPoint[] {
  if (positions.every((p) => p.points.length === 0)) return []
  const allTs = [...new Set(positions.flatMap((s) => s.points.map((p) => p.ts)))].sort()
  const posMaps = positions.map((s) => new Map(s.points.map((p) => [p.ts, p.value])))
  const lastValues = fallbackValues ? [...fallbackValues] : new Array(positions.length).fill(0)
  return allTs.map((ts) => {
    for (let i = 0; i < positions.length; i++) {
      const val = posMaps[i].get(ts)
      if (val !== undefined) lastValues[i] = val
    }
    return { ts, total: staticBase + lastValues.reduce((a: number, b: number) => a + b, 0) }
  })
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const sp = await searchParams
  if (sp.upgraded === 'true') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await syncSubscriptionIfNeeded(user.id)
  }

  const [allPositions, rates] = await Promise.all([fetchPositions(), fetchExchangeRates()])

  const [accounts, recurringIncomes, liabilities, accountSnapshots, positionSnapshots, planLimits] = await Promise.all([
    fetchAccounts(), fetchRecurringIncomes(), fetchLiabilities(),
    fetchAccountSnapshots(),
    backfillMissingHistory(allPositions, rates).then(() => fetchPositionSnapshots()),
    getPlanLimits(),
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
  // Positions without intraday data must start at their known value (not 0) so the chart stays accurate
  const intradayFallbacks = intradayPositions.map((p, i) =>
    p.previousClose ?? positionsWithQuotes[i].value
  )
  const subdayFallbacks = subdayPositions.map((p, i) =>
    p.previousClose ?? positionsWithQuotes[i].value
  )
  const portfolioSubday = aggregateSubday(subdayPositions, staticBase, subdayFallbacks)
  const portfolioIntraday = aggregateSubday(intradayPositions, staticBase, intradayFallbacks)
  const hasAnyIntraday = intradayPositions.some((p) => p.points.length > 0)
  const portfolioPreviousClose = hasAnyIntraday
    ? staticBase + intradayPositions.reduce(
        (sum, p, i) => sum + (p.previousClose ?? positionsWithQuotes[i].value),
        0
      )
    : null

  const allItems = [...accounts, ...positionsWithQuotes, ...manualPositions]

  const hasSubdayData = portfolioIntraday.length > 0 || portfolioSubday.length > 0

  // Server-side per-asset deltas (EUR-based) — consistent with portfolio chart and DetailChart
  type AssetDeltaMap = Record<string, Record<Period, number | null>>
  const assetDeltaMap: AssetDeltaMap = {}

  const msPerDay = 86_400_000
  const cutoffStr = (daysBack: number) =>
    new Date(Date.now() - daysBack * msPerDay).toISOString().slice(0, 10)
  const pctChange = (current: number | null, ref: number | null): number | null =>
    current != null && ref != null && ref > 0 ? ((current - ref) / ref) * 100 : null

  // Live positions: EUR-based, same data sources as portfolio chart and DetailChart
  for (let i = 0; i < positionsWithQuotes.length; i++) {
    const pos = positionsWithQuotes[i]
    const intraday = intradayPositions[i]
    const subday = subdayPositions[i]

    const snaps = allPosSnaps
      .filter(s => s.position_id === pos.id)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))

    // 1D: last vs first intraday candle — same reference as DetailChart 1D visual
    const firstIntraday = intraday.points.length > 0 ? intraday.points[0].value : null
    const lastIntraday = intraday.points.length > 0 ? intraday.points[intraday.points.length - 1].value : null
    const delta1D = pctChange(lastIntraday, firstIntraday)

    // 1S/1M: last subday point vs first point in period — same as chart subdayLast/subdayFirst
    const lastSubday = subday.points.length > 0 ? subday.points[subday.points.length - 1].value : null
    const firstSubdayAfter = (cutoff: string): number | null => {
      const pts = subday.points.filter(p => p.ts.slice(0, 10) >= cutoff)
      return pts.length > 0 ? pts[0].value : null
    }
    const delta1S = pctChange(lastSubday, firstSubdayAfter(cutoffStr(7)))
    const delta1M = pctChange(lastSubday, firstSubdayAfter(cutoffStr(30)))

    // 1A/Max: daily snapshots (today's snap = pos.value, consistent with chart)
    const snapBefore = (cutoff: string) => {
      const before = snaps.filter(s => s.recorded_at.slice(0, 10) <= cutoff)
      return before.length > 0 ? before[before.length - 1].value_eur : null
    }
    const delta1A = pctChange(pos.value, snapBefore(cutoffStr(365)))
    const deltaMax = snaps.length > 0 ? pctChange(pos.value, snaps[0].value_eur) : null

    assetDeltaMap[pos.id] = { '1D': delta1D, '1S': delta1S, '1M': delta1M, '1A': delta1A, 'Max': deltaMax }
  }

  // Manual positions: no price history
  for (const pos of manualPositions) {
    assetDeltaMap[pos.id] = { '1D': null, '1S': null, '1M': null, '1A': null, 'Max': null }
  }

  // Accounts: from account snapshots (manual input, no intraday)
  for (const acc of accounts) {
    const snaps = accountSnapshots
      .filter(s => s.account_id === acc.id)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    const cur = acc.latest_value
    const snapRef = (cutoff: string) => {
      const before = snaps.filter(s => s.recorded_at.slice(0, 10) <= cutoff)
      return before.length > 0 ? before[before.length - 1].value : null
    }
    assetDeltaMap[acc.id] = {
      '1D': snaps.length >= 2 ? pctChange(cur ?? 0, snaps[snaps.length - 2].value) : null,
      '1S': pctChange(cur ?? 0, snapRef(cutoffStr(7))),
      '1M': pctChange(cur ?? 0, snapRef(cutoffStr(30))),
      '1A': pctChange(cur ?? 0, snapRef(cutoffStr(365))),
      'Max': snaps.length > 0 ? pctChange(cur ?? 0, snaps[0].value) : null,
    }
  }

  return (
    <VisibilityProvider>
    <PeriodProvider initial={hasSubdayData ? '1D' : '1A'}>
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
            <TodayPaymentBanner liabilities={liabilities} accounts={accounts} />

            {/* Chart */}
            <div className="rounded-3xl glass-card border p-5 md:p-6">
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
                  <AddItemSheet accounts={accounts} planLimits={planLimits} />
                </div>
              </div>
            </div>
            <div className="rounded-3xl glass-card border px-3 py-3 md:py-2">
              <AccountsList
                accounts={accounts}
                positionsWithQuotes={positionsWithQuotes}
                manualPositions={manualPositions}
                incomes={recurringIncomes}
                assetDeltaMap={assetDeltaMap}
              />
            </div>
            {/* Timestamp — mobile only */}
            <p className="md:hidden text-center font-mono text-[10px] tracking-[0.4px] text-muted-foreground pt-2 pb-1">
              ULTIMO AGGIORNAMENTO · {new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} · {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

        </div>
      </div>
      <MobileFab accounts={accounts} planLimits={planLimits} />
    </PeriodProvider>
    </VisibilityProvider>
  )
}
