import { TYPE_COLORS } from '@/components/charts/AllocationChart'
import type { AccountType } from '@/types'
import { fetchExchangeRates } from '@/lib/yahoo-finance'
import { liabilityBalance } from '@/lib/liability-calc'
import { fetchAccounts, fetchPositions, fetchLiabilities, mapPositionsWithQuotes, computePortfolioTotals } from '@/lib/queries'
import type { OrbitCategory } from '@/components/charts/OrbitChart3D'
import { OrbitChart3DClient } from '@/components/charts/OrbitChart3DClient'

export default async function InsightsPage() {
  const [accounts, allPositions, liabilities, rates] = await Promise.all([
    fetchAccounts(), fetchPositions(), fetchLiabilities(), fetchExchangeRates(),
  ])

  const livePositions = allPositions.filter((p) => !p.is_manual)
  const manualPositions = allPositions.filter((p) => p.is_manual)

  const positionsWithQuotes = await mapPositionsWithQuotes(livePositions, rates)

  const { liveTotal, manualTotal, accountsTotal, liabNet, total } = computePortfolioTotals(
    accounts, positionsWithQuotes, manualPositions, liabilities
  )

  const categories: OrbitCategory[] = []

  if (accountsTotal > 0) {
    categories.push({
      id: 'conti',
      label: 'Conti',
      value: accountsTotal,
      color: '#38bdf8',
      children: accounts
        .filter(a => (a.latest_value ?? 0) > 0)
        .map(a => ({
          id: a.id,
          label: a.name,
          value: a.latest_value ?? 0,
          color: TYPE_COLORS[a.type as AccountType] ?? '#a1a1aa',
        })),
    })
  }

  if (liveTotal + manualTotal > 0) {
    categories.push({
      id: 'posizioni',
      label: 'Posizioni',
      value: liveTotal + manualTotal,
      color: '#bef264',
      children: [
        ...positionsWithQuotes.map(p => ({
          id: p.id,
          label: p.display_name ?? p.isin ?? 'Posizione',
          value: p.value,
          color: '#bef264',
        })),
        ...manualPositions.filter(p => (p.current_value_eur ?? 0) > 0).map(p => ({
          id: p.id,
          label: p.display_name ?? 'Asset',
          value: p.current_value_eur ?? 0,
          color: '#a78bfa',
        })),
      ],
    })
  }

  if (liabilities.length > 0) {
    categories.push({
      id: 'liabilities',
      label: 'Debiti & Crediti',
      value: liabNet,
      color: liabNet >= 0 ? '#bef264' : '#ef4444',
      children: liabilities.map(l => ({
        id: l.id,
        label: l.name,
        value: liabilityBalance(l),
        color: l.type === 'debt' ? '#ef4444' : '#bef264',
      })),
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      {/* Header */}
      <div className="pt-2 md:pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">Orbit</p>
          <span className="font-mono text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 rounded border border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/08">
            Beta
          </span>
        </div>
        <p className="text-[22px] md:text-[26px] font-medium text-foreground tracking-[-0.5px]">
          Patrimonio in orbita
        </p>
        <p className="font-mono text-[11px] text-muted-foreground mt-1">
          Trascina per ruotare · Clicca un satellite per esplorare
        </p>
      </div>

      <OrbitChart3DClient categories={categories} total={total} />
    </div>
  )
}
