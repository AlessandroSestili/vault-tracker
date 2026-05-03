import { AllocationChart } from '@/components/charts/AllocationChart'
import { RAINBOW } from '@/lib/chart-palette'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import { AccountsList } from '@/components/accounts/AccountsList'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { VisibilityProvider } from '@/components/accounts/VisibilityContext'
import type { AccountType } from '@/types'
import { fetchExchangeRates } from '@/lib/yahoo-finance'
import { fetchAccounts, fetchPositions, mapPositionsWithQuotes } from '@/lib/queries'
import type { Slice } from '@/components/charts/AllocationChart'

export default async function AnalyticsPage() {
  const [accounts, allPositions, rates] = await Promise.all([
    fetchAccounts(), fetchPositions(), fetchExchangeRates(),
  ])

  const livePositions = allPositions.filter((p) => !p.is_manual)
  const manualPositions = allPositions.filter((p) => p.is_manual)

  const positionsWithQuotes = await mapPositionsWithQuotes(livePositions, rates)

  // Build one slice per individual asset (not grouped by type) for richer colors.
  type RawAsset = { id: string; type: AccountType; label: string; value: number }
  const raw: RawAsset[] = []

  for (const a of accounts) {
    const v = a.latest_value ?? 0
    if (v > 0) raw.push({ id: `a-${a.id}`, type: a.type as AccountType, label: a.name, value: v })
  }
  for (const p of positionsWithQuotes) {
    if (p.value > 0) raw.push({
      id: `p-${p.id}`,
      type: 'investment',
      label: p.display_name ?? p.isin ?? 'Posizione',
      value: p.value,
    })
  }
  for (const p of manualPositions) {
    const v = p.current_value_eur ?? 0
    if (v > 0) raw.push({
      id: `m-${p.id}`,
      type: 'investment',
      label: p.display_name ?? 'Asset',
      value: v,
    })
  }

  const sliceTotal = raw.reduce((s, x) => s + x.value, 0)

  // Sort by value desc so dominant slices get most saturated colors first.
  const sorted = [...raw].sort((a, b) => b.value - a.value)

  const slices: Slice[] = sorted.map((asset, i) => ({
    id: asset.id,
    type: asset.type,
    label: asset.label,
    value: asset.value,
    color: RAINBOW[i % RAINBOW.length],
    pct: sliceTotal > 0 ? (asset.value / sliceTotal) * 100 : 0,
  }))

  const allItems = [...accounts, ...positionsWithQuotes, ...manualPositions]

  return (
    <VisibilityProvider>
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 md:items-start">

        {/* Left: header + chart */}
        <div className="w-full md:space-y-8">
          {/* Header */}
          <div className="pt-2 pb-6 md:px-0">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-2">Analytics</p>
            <p className="text-[26px] font-medium text-foreground tracking-[-0.6px] leading-[1.1]">
              Allocazione patrimonio
            </p>
          </div>

          {/* Donut + legend */}
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:p-8">
            <AllocationChart slices={slices} />
          </div>
        </div>

        {/* Right: asset list */}
        <div className="w-full space-y-3 md:sticky md:top-20">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">
              Dettaglio asset <span className="text-muted-foreground/70 ml-1.5">{allItems.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <RefreshButton />
              <AddItemSheet />
            </div>
          </div>
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2">
            <AccountsList
              accounts={accounts}
              positionsWithQuotes={positionsWithQuotes}
              manualPositions={manualPositions}
            />
          </div>
        </div>

      </div>
    </div>
    </VisibilityProvider>
  )
}
