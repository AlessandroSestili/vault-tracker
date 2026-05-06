import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { PositionValuePanel } from '@/components/charts/PositionValuePanel'
import { DetailChart } from '@/components/charts/DetailChart'
import { formatCurrency } from '@/lib/formats'
import {
  fetchQuotesByIsins,
  fetchExchangeRates,
  fetchExchangeRatesHistory,
  fetchYahooHistory,
  fetchYahooSubdaySeries,
  searchTicker,
  toEur,
  toEurOnDate,
  normalizeCommodityPrice,
} from '@/lib/yahoo-finance'

type Period = '1D' | '1S' | '1M' | '1A' | 'Max'

const pctChange = (cur: number | null, ref: number | null): number | null =>
  cur != null && ref != null && ref > 0 ? ((cur - ref) / ref) * 100 : null

const dateCutoff = (daysBack: number) =>
  new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10)

export default async function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: position }, { data: posSnapshots }] = await Promise.all([
    supabase.from('positions').select('*').eq('id', id).single(),
    supabase.from('position_snapshots').select('value_eur, recorded_at').eq('position_id', id).order('recorded_at', { ascending: true }),
  ])

  if (!position) notFound()

  const snaps = posSnapshots ?? []
  const vaultData = snaps.map(s => ({ date: s.recorded_at.slice(0, 10), value: s.value_eur }))

  let currentValue = position.current_value_eur ?? snaps[snaps.length - 1]?.value_eur ?? 0
  let pricePerUnit: number | undefined
  let yahooData: { date: string; value: number }[] | undefined
  let yahooSubdayData: { ts: string; value: number }[] | undefined
  let yahooIntradayData: { ts: string; value: number }[] | undefined
  let previousCloseEur: number | undefined
  let periodDeltas: Record<Period, number | null> | undefined

  if (!position.is_manual && position.isin) {
    const [quotes, rates, fxHistory, ticker] = await Promise.all([
      fetchQuotesByIsins([position.isin]),
      fetchExchangeRates(),
      fetchExchangeRatesHistory('1y'),
      searchTicker(position.isin),
    ])
    const q = quotes[position.isin]
    if (q) {
      pricePerUnit = toEur(q.price, q.currency, rates)
      currentValue = pricePerUnit * (position.units ?? 0)
    }
    if (ticker) {
      const [dailySeries, subdaySeries, intradaySeries] = await Promise.all([
        fetchYahooHistory(ticker, 'max'),
        fetchYahooSubdaySeries(ticker, '1h', '30d'),
        fetchYahooSubdaySeries(ticker, '2m', '1d'),
      ])

      const units = position.units ?? 0

      if (dailySeries && dailySeries.points.length > 0) {
        yahooData = dailySeries.points
          .map((p) => {
            const rawPrice = normalizeCommodityPrice(p.price, position.isin!)
            const priceEur = toEurOnDate(rawPrice, dailySeries.currency, p.date, fxHistory, rates)
            return { date: p.date, value: priceEur * units }
          })
          .filter((p) => Number.isFinite(p.value) && p.value > 0)
      }

      const toSubdayEurPoints = (series: typeof subdaySeries) => {
        if (!series || series.points.length === 0) return undefined
        return series.points
          .map((p) => {
            const rawPrice = normalizeCommodityPrice(p.price, position.isin!)
            const priceEur = toEur(rawPrice, series.currency, rates)
            return { ts: p.ts, value: priceEur * units }
          })
          .filter((p) => Number.isFinite(p.value) && p.value > 0)
      }

      yahooSubdayData = toSubdayEurPoints(subdaySeries)
      yahooIntradayData = toSubdayEurPoints(intradaySeries)

      // Use intradaySeries.currency specifically (not the dailySeries priority chain)
      if (intradaySeries?.previousClose != null) {
        const rawPrev = normalizeCommodityPrice(intradaySeries.previousClose, position.isin!)
        previousCloseEur = toEur(rawPrev, intradaySeries.currency, rates) * units
      }

      // ── Period deltas — same reference points as DetailChart ──────────────────
      // 1D: last intraday vs previousClose; fallback to first intraday candle when
      // previousClose is unavailable (matches chart's subdayFirst fallback)
      const lastIntraday = yahooIntradayData && yahooIntradayData.length > 0
        ? yahooIntradayData[yahooIntradayData.length - 1].value : null
      const intradayRef = (previousCloseEur != null && previousCloseEur > 0)
        ? previousCloseEur
        : yahooIntradayData?.[0]?.value ?? null
      const delta1D = pctChange(lastIntraday, intradayRef)

      // 1S/1M: last subday point vs first subday point after cutoff date
      // Uses date-string comparison (same as chart's updated filtering)
      const lastSubday = yahooSubdayData && yahooSubdayData.length > 0
        ? yahooSubdayData[yahooSubdayData.length - 1].value : null
      const firstSubdayAfter = (cutoff: string): number | null => {
        const pts = (yahooSubdayData ?? []).filter(p => p.ts.slice(0, 10) >= cutoff)
        return pts.length > 0 ? pts[0].value : null
      }
      const delta1S = pctChange(lastSubday, firstSubdayAfter(dateCutoff(7)))
      const delta1M = pctChange(lastSubday, firstSubdayAfter(dateCutoff(30)))

      // 1A/Max: yahoo daily series — same data the chart renders
      const yahooLast = yahooData && yahooData.length > 0
        ? yahooData[yahooData.length - 1].value : null
      const yahooFirst365 = yahooData?.find(p => p.date >= dateCutoff(365))?.value ?? null
      const yahooFirstAll = yahooData?.[0]?.value ?? null
      const delta1A = pctChange(yahooLast, yahooFirst365)
      const deltaMax = pctChange(yahooLast, yahooFirstAll)

      periodDeltas = { '1D': delta1D, '1S': delta1S, '1M': delta1M, '1A': delta1A, 'Max': deltaMax }
    }
  }

  const first = snaps[0]?.value_eur ?? 0
  const change = currentValue - first
  const changePct = first > 0 ? (change / first) * 100 : 0
  const isPositive = change >= 0
  const label = position.display_name ?? position.isin ?? 'Posizione'
  const vaultStart = snaps[0]?.recorded_at?.slice(0, 10) ?? null

  const rows: { label: string; value: string }[] = []
  if (position.units !== null) rows.push({ label: 'Quantità', value: String(position.units) })
  if (pricePerUnit !== undefined) rows.push({ label: 'Prezzo unitario', value: formatCurrency(pricePerUnit) })
  if (position.isin) rows.push({ label: 'ISIN', value: position.isin })
  if (position.broker) rows.push({ label: 'Broker', value: position.broker })
  rows.push({ label: 'Tipo', value: position.is_manual ? 'Manuale' : 'Live' })

  const hasSubdayData = !!(yahooIntradayData?.length || yahooSubdayData?.length)
  const hasChart = vaultData.length >= 2 || (yahooData && yahooData.length >= 2)

  return (
    <div className="max-w-lg mx-auto px-5 md:px-8 py-6 pb-bottom-nav md:pb-10 space-y-6">
      <BackButton />

      <div>
        {position.isin && (
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-1">{position.isin}</p>
        )}
        <h1 className="text-[24px] font-medium text-foreground tracking-[-0.5px]">{label}</h1>
        {position.broker && <p className="text-[13px] text-muted-foreground mt-0.5">{position.broker}</p>}
      </div>

      {periodDeltas ? (
        // Live position with market data — period-aware value + chart in sync
        <PositionValuePanel
          currentValue={currentValue}
          periodDeltas={periodDeltas}
          hasSubdayData={hasSubdayData}
          vaultData={vaultData}
          yahooData={yahooData}
          vaultStart={vaultStart}
          yahooIntraday={yahooIntradayData}
          yahooSubday={yahooSubdayData}
          previousClose={previousCloseEur}
        />
      ) : (
        // Manual position or no market data — static display
        <>
          <div>
            <p className="font-mono text-[36px] font-medium tabular-nums tracking-[-1.5px] text-foreground leading-none">
              {formatCurrency(currentValue)}
            </p>
            {first > 0 && (
              <p className={`font-mono text-[13px] mt-1.5 tabular-nums ${isPositive ? 'text-[var(--primary)]' : 'text-destructive'}`}>
                {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%) da inizio
              </p>
            )}
          </div>

          {hasChart && (
            <div className="rounded-2xl glass-card border p-4">
              <DetailChart
                data={vaultData}
                vaultStart={vaultStart}
              />
            </div>
          )}
        </>
      )}

      <div className="border-t border-white/[0.06]">
        {rows.map(r => (
          <div key={r.label} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
            <p className="font-mono text-[12px] text-muted-foreground uppercase tracking-[0.5px]">{r.label}</p>
            <p className="font-mono text-[13px] text-foreground tabular-nums">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
