import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
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
  let changePercent: number | undefined
  let pricePerUnit: number | undefined
  let yahooData: { date: string; value: number }[] | undefined
  let yahooSubdayData: { ts: string; value: number }[] | undefined
  let yahooIntradayData: { ts: string; value: number }[] | undefined
  let previousCloseEur: number | undefined

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
      changePercent = q.changePercent
    }
    if (ticker) {
      const [dailySeries, subdaySeries, intradaySeries] = await Promise.all([
        fetchYahooHistory(ticker, 'max'),
        fetchYahooSubdaySeries(ticker, '1h', '30d'),
        fetchYahooSubdaySeries(ticker, '2m', '1d'),
      ])

      const units = position.units ?? 0
      const currency = dailySeries?.currency ?? subdaySeries?.currency ?? intradaySeries?.currency ?? 'EUR'

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

      if (intradaySeries?.previousClose != null) {
        const rawPrev = normalizeCommodityPrice(intradaySeries.previousClose, position.isin!)
        previousCloseEur = toEur(rawPrev, currency, rates) * units
      }
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

      <div>
        <p className="font-mono text-[36px] font-medium tabular-nums tracking-[-1.5px] text-foreground leading-none">
          {formatCurrency(currentValue)}
        </p>
        {changePercent !== undefined && (
          <p className={`font-mono text-[13px] mt-1.5 tabular-nums ${changePercent >= 0 ? 'text-[var(--primary)]' : 'text-destructive'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% oggi
          </p>
        )}
        {changePercent === undefined && first > 0 && (
          <p className={`font-mono text-[13px] mt-1.5 tabular-nums ${isPositive ? 'text-[var(--primary)]' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{formatCurrency(change)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%) da inizio
          </p>
        )}
      </div>

      {hasChart && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <DetailChart
            data={vaultData}
            yahoo={yahooData}
            vaultStart={vaultStart}
            yahooIntraday={yahooIntradayData}
            yahooSubday={yahooSubdayData}
            previousClose={previousCloseEur}
          />
        </div>
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
