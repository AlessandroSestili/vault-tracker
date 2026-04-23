import { createClient } from '@/lib/supabase/server'
import { fetchQuotesByIsins, toEur, type ExchangeRates } from '@/lib/yahoo-finance'
import { liabilityBalance } from '@/lib/liability-calc'
import type { AccountWithLatestSnapshot, Position, Liability, RecurringIncome, PositionWithQuote } from '@/types'

export async function fetchAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_latest')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchPositions(): Promise<Position[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchLiabilities(): Promise<Liability[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchRecurringIncomes(): Promise<RecurringIncome[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recurring_incomes')
    .select('*')
    .order('day_of_month', { ascending: true })
  return data ?? []
}

export async function mapPositionsWithQuotes(
  livePositions: Position[],
  rates: ExchangeRates
): Promise<PositionWithQuote[]> {
  if (livePositions.length === 0) return []
  const isins = livePositions.map((p) => p.isin!)
  const quotes = await fetchQuotesByIsins(isins)
  return livePositions
    .filter((p) => p.isin && quotes[p.isin])
    .map((p) => {
      const q = quotes[p.isin!]
      const priceEur = toEur(q.price, q.currency, rates)
      return {
        ...p,
        price: priceEur,
        value: priceEur * p.units!,
        currency: 'EUR',
        quoteName: q.name,
        changePercent: q.changePercent,
      }
    })
}

export function computePortfolioTotals(
  accounts: AccountWithLatestSnapshot[],
  positionsWithQuotes: PositionWithQuote[],
  manualPositions: Position[],
  liabilities: Liability[]
) {
  const liveTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
  const manualTotal = manualPositions.reduce((s, p) => s + (p.current_value_eur ?? 0), 0)
  const accountsTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const debtsTotal = liabilities
    .filter((l) => l.type === 'debt')
    .reduce((s, l) => s + liabilityBalance(l), 0)
  const creditsTotal = liabilities
    .filter((l) => l.type === 'credit')
    .reduce((s, l) => s + liabilityBalance(l), 0)
  const liabNet = creditsTotal - debtsTotal
  const total = liveTotal + manualTotal + accountsTotal + liabNet
  return { liveTotal, manualTotal, accountsTotal, debtsTotal, creditsTotal, liabNet, total }
}
