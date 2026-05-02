export interface Quote {
  isin: string
  ticker: string
  price: number
  currency: string
  name: string
  changePercent: number | undefined
  change: number | undefined
}

export const TROY_OZ_TO_G = 31.1035

export const COMMODITY_MAP: Record<string, { ticker: string; name: string; pricePerG: boolean }> = {
  // Spot prices (usati come codice custom, non sono ISIN reali)
  XAU: { ticker: 'GC=F', name: 'Oro (spot)', pricePerG: true },
  XAG: { ticker: 'SI=F', name: 'Argento (spot)', pricePerG: true },
  // Physical gold ETCs — prezzo in USD/troy oz, unità in grammi
  IE00B4ND3602: { ticker: 'SGLD.L',  name: 'Invesco Physical Gold ETC',     pricePerG: true },
  GB00B15KXQ89: { ticker: 'PHAU.L',  name: 'WisdomTree Physical Gold ETC',  pricePerG: true },
  DE000A1E0HR8: { ticker: '4GLD.DE', name: 'Xtrackers Physical Gold ETC',   pricePerG: true },
  IE00B579F325: { ticker: 'IGLN.L',  name: 'iShares Physical Gold ETC',     pricePerG: true },
  CH0047533523: { ticker: 'JBGOAM.SW', name: 'Julius Baer Physical Gold',   pricePerG: true },
  // Physical silver ETCs
  IE00B4NCWG09: { ticker: 'PHAG.L',  name: 'WisdomTree Physical Silver ETC', pricePerG: true },
}

export async function searchTicker(isin: string): Promise<string | null> {
  if (COMMODITY_MAP[isin]) return COMMODITY_MAP[isin].ticker
  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json?.quotes?.[0]?.symbol ?? null
}

async function fetchQuote(ticker: string): Promise<Omit<Quote, 'isin' | 'ticker'> | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
    { next: { revalidate: 300 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) return null
  return {
    price: meta.regularMarketPrice ?? meta.previousClose,
    currency: meta.currency,
    name: meta.longName ?? meta.shortName ?? ticker,
    changePercent: meta.regularMarketChangePercent,
    change: meta.regularMarketChange,
  }
}

export async function fetchQuoteByIsin(isin: string): Promise<Quote | null> {
  const commodity = COMMODITY_MAP[isin]
  const ticker = await searchTicker(isin)
  if (!ticker) return null
  const quote = await fetchQuote(ticker)
  if (!quote) return null
  const price = normalizeCommodityPrice(quote.price, isin)
  const name = commodity?.name ?? quote.name
  return { isin, ticker, ...quote, price, name }
}

export async function fetchQuotesByIsins(isins: string[]): Promise<Record<string, Quote>> {
  const results = await Promise.allSettled(isins.map(fetchQuoteByIsin))
  return Object.fromEntries(
    results
      .map((r, i) => [isins[i], r.status === 'fulfilled' ? r.value : null])
      .filter(([, v]) => v !== null)
  ) as Record<string, Quote>
}

export interface ExchangeRates {
  USD: number
  GBP: number
  CHF: number
}

async function fetchPairRate(pair: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${pair}=X?interval=1d&range=1d`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const [usd, gbp, chf] = await Promise.all([
    fetchPairRate('EURUSD'),
    fetchPairRate('EURGBP'),
    fetchPairRate('EURCHF'),
  ])
  return { USD: usd ?? 1, GBP: gbp ?? 1, CHF: chf ?? 1 }
}

export function normalizeCommodityPrice(price: number, isin: string): number {
  const commodity = COMMODITY_MAP[isin]
  return commodity?.pricePerG ? price / TROY_OZ_TO_G : price
}

export function toEur(price: number, currency: string, rates: ExchangeRates): number {
  if (currency === 'EUR') return price
  if (currency === 'USD') return price / rates.USD
  if (currency === 'GBP') return price / rates.GBP
  // Yahoo quota London in pence (GBp / GBX) — convert to GBP first
  if (currency === 'GBp' || currency === 'GBX') return price / 100 / rates.GBP
  if (currency === 'CHF') return price / rates.CHF
  return price
}

// ─── Sub-daily series (intraday / hourly) ────────────────────────────────────

export interface SubdayPoint {
  ts: string // full ISO datetime
  price: number
}

export interface SubdaySeries {
  currency: string
  previousClose: number | null
  points: SubdayPoint[]
}

export async function fetchYahooSubdaySeries(
  ticker: string,
  interval: string,
  range: string
): Promise<SubdaySeries | null> {
  try {
    const revalidate = interval === '2m' ? 120 : 600
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`,
      { next: { revalidate } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null
    const timestamps: number[] = result.timestamp ?? []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
    const points: SubdayPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i]
      if (price == null) continue
      points.push({ ts: new Date(timestamps[i] * 1000).toISOString(), price })
    }
    return {
      currency: result.meta?.currency ?? 'EUR',
      previousClose: result.meta?.previousClose ?? null,
      points,
    }
  } catch {
    return null
  }
}

// ─── Historical data (backfill) ──────────────────────────────────────────────

export interface HistoricalPoint {
  date: string // YYYY-MM-DD
  price: number
}

export interface HistoricalSeries {
  currency: string
  points: HistoricalPoint[]
}

export interface HistoricalRates {
  USD: Map<string, number>
  GBP: Map<string, number>
  CHF: Map<string, number>
}

export async function fetchYahooHistory(
  ticker: string,
  range: string = '1y'
): Promise<HistoricalSeries | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${range}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null
    const timestamps: number[] = result.timestamp ?? []
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
    const points: HistoricalPoint[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const price = closes[i]
      if (price == null) continue
      const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10)
      points.push({ date, price })
    }
    return { currency: result.meta?.currency ?? 'EUR', points }
  } catch {
    return null
  }
}

export async function fetchExchangeRatesHistory(range: string = '1y'): Promise<HistoricalRates> {
  const [usd, gbp, chf] = await Promise.all([
    fetchYahooHistory('EURUSD=X', range),
    fetchYahooHistory('EURGBP=X', range),
    fetchYahooHistory('EURCHF=X', range),
  ])
  return {
    USD: new Map(usd?.points.map((p) => [p.date, p.price]) ?? []),
    GBP: new Map(gbp?.points.map((p) => [p.date, p.price]) ?? []),
    CHF: new Map(chf?.points.map((p) => [p.date, p.price]) ?? []),
  }
}

export function toEurOnDate(
  price: number,
  currency: string,
  date: string,
  history: HistoricalRates,
  fallback: ExchangeRates
): number {
  if (currency === 'EUR') return price
  const pick = (c: 'USD' | 'GBP' | 'CHF') => history[c].get(date) ?? fallback[c]
  if (currency === 'USD') return price / pick('USD')
  if (currency === 'GBP') return price / pick('GBP')
  if (currency === 'GBp' || currency === 'GBX') return price / 100 / pick('GBP')
  if (currency === 'CHF') return price / pick('CHF')
  return price
}
