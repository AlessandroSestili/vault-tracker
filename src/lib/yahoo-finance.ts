export interface Quote {
  isin: string
  ticker: string
  price: number
  currency: string
  name: string
}

async function searchTicker(isin: string): Promise<string | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${isin}&quotesCount=1&newsCount=0`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json?.quotes?.[0]?.symbol ?? null
}

async function fetchQuote(ticker: string): Promise<{ price: number; currency: string; name: string } | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) return null
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta) return null
  return {
    price: meta.regularMarketPrice ?? meta.previousClose,
    currency: meta.currency,
    name: meta.longName ?? meta.shortName ?? ticker,
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
