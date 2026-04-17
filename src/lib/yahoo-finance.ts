export interface Quote {
  isin: string
  ticker: string
  price: number
  currency: string
  name: string
  changePercent: number | undefined
  change: number | undefined
}

async function searchTicker(isin: string): Promise<string | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
    { next: { revalidate: 300 } }
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
  const ticker = await searchTicker(isin)
  if (!ticker) return null
  const quote = await fetchQuote(ticker)
  if (!quote) return null
  return { isin, ticker, ...quote }
}

export async function fetchQuotesByIsins(isins: string[]): Promise<Record<string, Quote>> {
  const results = await Promise.allSettled(isins.map(fetchQuoteByIsin))
  return Object.fromEntries(
    results
      .map((r, i) => [isins[i], r.status === 'fulfilled' ? r.value : null])
      .filter(([, v]) => v !== null)
  ) as Record<string, Quote>
}

export async function fetchEurUsdRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d',
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return 1.0
    const json = await res.json()
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice
    return price ?? 1.0
  } catch {
    return 1.0
  }
}

export function toEur(price: number, currency: string, eurUsdRate: number): number {
  if (currency === 'EUR') return price
  if (currency === 'USD') return price / eurUsdRate
  return price
}
