import { createClient } from '@/lib/supabase/server'
import { fetchQuotesByIsins, toEur, type ExchangeRates } from '@/lib/yahoo-finance'
import type { AccountWithLatestSnapshot, Position, Liability, RecurringIncome, PositionWithQuote } from '@/types'

async function getCurrentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')
  return user.id
}

export async function fetchAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const userId = await getCurrentUserId(supabase)
  const { data, error } = await supabase
    .from('accounts_with_latest')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchPositions(): Promise<Position[]> {
  const supabase = await createClient()
  const userId = await getCurrentUserId(supabase)
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchLiabilities(): Promise<Liability[]> {
  const supabase = await createClient()
  const userId = await getCurrentUserId(supabase)
  const { data, error } = await supabase
    .from('liabilities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchRecurringIncomes(): Promise<RecurringIncome[]> {
  const supabase = await createClient()
  const userId = await getCurrentUserId(supabase)
  const { data } = await supabase
    .from('recurring_incomes')
    .select('*')
    .eq('user_id', userId)
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
  manualPositions: Position[]
) {
  const liveTotal = positionsWithQuotes.reduce((s, p) => s + p.value, 0)
  const manualTotal = manualPositions.reduce((s, p) => s + (p.current_value_eur ?? 0), 0)
  const accountsTotal = accounts.reduce((s, a) => s + (a.latest_value ?? 0), 0)
  const total = liveTotal + manualTotal + accountsTotal
  return { liveTotal, manualTotal, accountsTotal, total }
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export type AccountSnapshot = { account_id: string; value: number; recorded_at: string }
export type PositionSnapshot = { position_id: string; value_eur: number; recorded_at: string }
export type DailyTotal = { day: string; total: number; accounts: number; positions: number }
export type SubdayTotalPoint = { ts: string; total: number }

export async function fetchAccountSnapshots(): Promise<AccountSnapshot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('snapshots')
    .select('account_id, value, recorded_at')
    .order('recorded_at', { ascending: true })
  return data ?? []
}

export async function fetchPositionSnapshots(): Promise<PositionSnapshot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('position_snapshots')
    .select('position_id, value_eur, recorded_at')
    .order('recorded_at', { ascending: true })
  return data ?? []
}

export async function upsertTodayPositionSnapshots(values: { id: string; valueEur: number }[]): Promise<void> {
  if (values.length === 0) return
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  await supabase.from('position_snapshots').upsert(
    values.map((v) => ({ position_id: v.id, value_eur: v.valueEur, recorded_at: today })),
    { onConflict: 'position_id,recorded_at' }
  )
}

export function computeDailyTotals(
  accountSnapshots: AccountSnapshot[],
  positionSnapshots: PositionSnapshot[]
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
