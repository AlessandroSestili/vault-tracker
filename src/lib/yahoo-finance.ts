export interface Quote {
  isin: string
  ticker: string
  price: number
  currency: string
  name: string
  changePercent: number | undefined
  change: number | undefined
}

const TROY_OZ_TO_G = 31.1035

const COMMODITY_MAP: Record<string, { ticker: string; name: string; pricePerG: boolean }> = {
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

async function searchTicker(isin: string): Promise<string | null> {
  if (COMMODITY_MAP[isin]) return COMMODITY_MAP[isin].ticker
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
  const commodity = COMMODITY_MAP[isin]
  const ticker = await searchTicker(isin)
  if (!ticker) return null
  const quote = await fetchQuote(ticker)
  if (!quote) return null
  const price = commodity?.pricePerG ? quote.price / TROY_OZ_TO_G : quote.price
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
