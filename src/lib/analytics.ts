import type { AccountType } from '@/types'
import type { AccountWithLatestSnapshot, Position, PositionWithQuote } from '@/types'
import type { AccountSnapshot, PositionSnapshot } from './queries'

export type CategoryKey = 'cash' | 'invest' | 'pension' | 'crypto' | 'other'

export const CATEGORY_CONFIG: Record<CategoryKey, { label: string; color: string }> = {
  cash:    { label: 'Cash',         color: '#38bdf8' },
  invest:  { label: 'Investimenti', color: '#a3e635' },
  pension: { label: 'Pensione',     color: '#a78bfa' },
  crypto:  { label: 'Crypto',       color: '#fbbf24' },
  other:   { label: 'Altro',        color: '#a1a1aa' },
}

const TYPE_TO_CATEGORY: Record<AccountType, CategoryKey> = {
  cash:       'cash',
  investment: 'invest',
  pension:    'pension',
  crypto:     'crypto',
  other:      'other',
}

export type CategoryAllocation = {
  key: CategoryKey
  label: string
  color: string
  value: number
  pct: number
}

export type CategoryPerf = {
  key: CategoryKey
  label: string
  color: string
  value: number
  prevValue: number
  deltaEur: number
  deltaPct: number | null
}

export type MonthlyBucket = {
  month: string
  cash: number
  invest: number
  pension: number
  crypto: number
  other: number
  total: number
}

export function computeCategoryAllocation(
  accounts: AccountWithLatestSnapshot[],
  positionsWithQuotes: PositionWithQuote[],
  manualPositions: Position[]
): CategoryAllocation[] {
  const totals: Record<CategoryKey, number> = { cash: 0, invest: 0, pension: 0, crypto: 0, other: 0 }

  for (const a of accounts) {
    const v = a.latest_value ?? 0
    if (v > 0) totals[TYPE_TO_CATEGORY[a.type as AccountType]] += v
  }
  for (const p of positionsWithQuotes) {
    if (p.value > 0) totals.invest += p.value
  }
  for (const p of manualPositions) {
    const v = p.current_value_eur ?? 0
    if (v > 0) totals.invest += v
  }

  const total = Object.values(totals).reduce((a, b) => a + b, 0)

  return (Object.keys(CATEGORY_CONFIG) as CategoryKey[])
    .filter(k => totals[k] > 0)
    .sort((a, b) => totals[b] - totals[a])
    .map(k => ({
      key: k,
      ...CATEGORY_CONFIG[k],
      value: totals[k],
      pct: total > 0 ? (totals[k] / total) * 100 : 0,
    }))
}

export function computeMonthlyCategoryTotals(
  accounts: AccountWithLatestSnapshot[],
  accountSnapshots: AccountSnapshot[],
  positionSnapshots: PositionSnapshot[]
): MonthlyBucket[] {
  const accountCategory = new Map<string, CategoryKey>()
  for (const a of accounts) {
    accountCategory.set(a.id, TYPE_TO_CATEGORY[a.type as AccountType])
  }

  const accountByMonth: Record<string, Record<string, number>> = {}
  const positionByMonth: Record<string, Record<string, number>> = {}

  for (const s of accountSnapshots) {
    const month = s.recorded_at.slice(0, 7)
    if (!accountByMonth[month]) accountByMonth[month] = {}
    accountByMonth[month][s.account_id] = s.value
  }
  for (const s of positionSnapshots) {
    const month = s.recorded_at.slice(0, 7)
    if (!positionByMonth[month]) positionByMonth[month] = {}
    positionByMonth[month][s.position_id] = s.value_eur
  }

  const months = [...new Set([
    ...Object.keys(accountByMonth),
    ...Object.keys(positionByMonth),
  ])].sort()

  if (months.length === 0) return []

  const latestAccounts: Record<string, number> = {}
  const latestPositions: Record<string, number> = {}

  return months.map(month => {
    Object.assign(latestAccounts, accountByMonth[month] ?? {})
    Object.assign(latestPositions, positionByMonth[month] ?? {})

    const t: Record<CategoryKey, number> = { cash: 0, invest: 0, pension: 0, crypto: 0, other: 0 }

    for (const [id, value] of Object.entries(latestAccounts)) {
      const cat = accountCategory.get(id) ?? 'other'
      t[cat] += value
    }
    for (const value of Object.values(latestPositions)) {
      t.invest += value
    }

    return { month, ...t, total: t.cash + t.invest + t.pension + t.crypto + t.other }
  })
}

export function computeCategoryPerf(
  buckets: MonthlyBucket[],
  currentAllocation: CategoryAllocation[]
): CategoryPerf[] {
  const prevBucket = buckets.length >= 2 ? buckets[buckets.length - 2] : null

  return currentAllocation.map(cat => {
    const prevValue = prevBucket ? prevBucket[cat.key] : 0
    const deltaEur = cat.value - prevValue
    const deltaPct = prevValue > 0 ? (deltaEur / prevValue) * 100 : null
    return {
      key: cat.key,
      label: cat.label,
      color: cat.color,
      value: cat.value,
      prevValue,
      deltaEur,
      deltaPct,
    }
  })
}
