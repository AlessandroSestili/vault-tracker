import { formatCurrency } from '@/lib/formats'
import { fetchExchangeRates } from '@/lib/yahoo-finance'
import {
  fetchAccounts, fetchPositions, mapPositionsWithQuotes,
  fetchAccountSnapshots, fetchPositionSnapshots,
} from '@/lib/queries'
import { fetchLiabilities } from '@/lib/queries'
import {
  computeCategoryAllocation, computeMonthlyCategoryTotals, computeCategoryPerf,
  computeLiabilityAnalysis,
} from '@/lib/analytics'
import { CategoryDonut } from '@/components/charts/CategoryDonut'
import { AllocationHistoryChart } from '@/components/charts/AllocationHistoryChart'
import { SUBTYPE_LABEL } from '@/lib/account-config'
import type { CategoryPerf, LiabilityAnalysis } from '@/lib/analytics'

function DeltaBadge({ deltaPct, deltaEur }: { deltaPct: number | null; deltaEur: number }) {
  if (deltaPct === null) return <span className="font-mono text-[11px] text-muted-foreground/50">—</span>
  const positive = deltaEur >= 0
  const color = positive ? '#a3e635' : '#f87171'
  const sign = positive ? '+' : ''
  return (
    <span className="font-mono text-[11px] tabular-nums" style={{ color }}>
      {sign}{deltaPct.toFixed(1)}%
    </span>
  )
}

function PerfTable({ perf }: { perf: CategoryPerf[] }) {
  return (
    <div className="border-t border-white/[0.06]">
      {perf.map(p => (
        <div key={p.key} className="flex items-center py-3.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-[13.5px] font-medium text-foreground truncate">{p.label}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:block font-mono text-[12px] tabular-nums text-muted-foreground">
              {p.deltaEur >= 0 ? '+' : ''}{formatCurrency(p.deltaEur)}
            </span>
            <DeltaBadge deltaPct={p.deltaPct} deltaEur={p.deltaEur} />
            <span className="font-mono text-[13px] tabular-nums text-foreground w-24 text-right">
              {formatCurrency(p.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function LiabilitySection({ analysis }: { analysis: LiabilityAnalysis }) {
  const debts = analysis.items.filter(i => i.type === 'debt')
  const credits = analysis.items.filter(i => i.type === 'credit')

  if (analysis.items.length === 0 && analysis.subscriptionsMonthly === 0) return null

  return (
    <section className="mb-10">
      <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-6">Passività</p>

      {/* Debt/asset ratio bar */}
      {analysis.debtToAsset !== null && analysis.debtToAsset > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-mono text-[10px] text-muted-foreground">Debiti / Asset</span>
            <span className="font-mono text-[12px] tabular-nums" style={{ color: analysis.debtToAsset > 50 ? '#f87171' : '#71717a' }}>
              {analysis.debtToAsset.toFixed(1)}%
            </span>
          </div>
          <div className="h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(analysis.debtToAsset, 100)}%`,
                backgroundColor: analysis.debtToAsset > 50 ? '#f87171' : '#a1a1aa',
              }}
            />
          </div>
        </div>
      )}

      {/* Debts */}
      {debts.length > 0 && (
        <div className="border-t border-white/[0.06] mb-4">
          {debts.map(item => (
            <div key={item.id} className="flex items-start py-3.5 border-b border-white/[0.04]">
              <div className="flex-1 min-w-0">
                <span className="text-[13.5px] font-medium text-foreground">{item.name}</span>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {SUBTYPE_LABEL[item.subtype]}
                  {item.monthlyPayment ? ` · ${formatCurrency(item.monthlyPayment, item.currency)}/mese` : ''}
                </p>
              </div>
              <span className="font-mono text-[13px] tabular-nums shrink-0 ml-4" style={{ color: '#f87171' }}>
                −{formatCurrency(item.balance, item.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Credits */}
      {credits.length > 0 && (
        <div className="border-t border-white/[0.06] mb-4">
          {credits.map(item => (
            <div key={item.id} className="flex items-start py-3.5 border-b border-white/[0.04]">
              <div className="flex-1 min-w-0">
                <span className="text-[13.5px] font-medium text-foreground">{item.name}</span>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                  {SUBTYPE_LABEL[item.subtype]}
                </p>
              </div>
              <span className="font-mono text-[13px] tabular-nums shrink-0 ml-4" style={{ color: '#a3e635' }}>
                +{formatCurrency(item.balance, item.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Subscriptions summary */}
      {analysis.subscriptionsMonthly > 0 && (
        <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
          <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[1px]">Abbonamenti</span>
          <span className="font-mono text-[13px] tabular-nums text-foreground">
            {formatCurrency(analysis.subscriptionsMonthly)}<span className="text-muted-foreground text-[11px]">/mese</span>
          </span>
        </div>
      )}
    </section>
  )
}

export default async function AnalyticsPage() {
  const [accounts, allPositions, rates, accountSnapshots, positionSnapshots, liabilities] = await Promise.all([
    fetchAccounts(), fetchPositions(), fetchExchangeRates(),
    fetchAccountSnapshots(), fetchPositionSnapshots(),
    fetchLiabilities(),
  ])

  const livePositions = allPositions.filter(p => !p.is_manual)
  const manualPositions = allPositions.filter(p => p.is_manual)
  const positionsWithQuotes = await mapPositionsWithQuotes(livePositions, rates)

  const allocation = computeCategoryAllocation(accounts, positionsWithQuotes, manualPositions)
  const buckets = computeMonthlyCategoryTotals(accounts, accountSnapshots, positionSnapshots)
  const perf = computeCategoryPerf(buckets, allocation)

  const grossAssets = allocation.reduce((s, c) => s + c.value, 0)
  const liabAnalysis = computeLiabilityAnalysis(liabilities, grossAssets)
  const netWorth = grossAssets - liabAnalysis.netLiability

  const assetCount =
    accounts.filter(a => (a.latest_value ?? 0) > 0).length +
    positionsWithQuotes.length +
    manualPositions.filter(p => (p.current_value_eur ?? 0) > 0).length

  return (
    <div className="max-w-[680px] mx-auto px-5 pb-bottom-nav py-8 md:py-12 md:pb-12">

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-2">Analytics</p>
        <h1 className="text-[26px] font-medium text-foreground tracking-[-0.6px] leading-[1.1]">
          Analisi patrimonio
        </h1>
      </div>

      {/* KPI strip — 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 mb-10 pb-8 border-b border-white/[0.06]">
        <div>
          <p className="font-mono text-[9px] tracking-[1.8px] uppercase text-muted-foreground mb-1.5">Asset lordi</p>
          <p className="font-mono text-[15px] font-medium tabular-nums text-foreground">{formatCurrency(grossAssets)}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-[1.8px] uppercase text-muted-foreground mb-1.5">Debiti</p>
          <p className="font-mono text-[15px] font-medium tabular-nums" style={{ color: liabAnalysis.netLiability > 0 ? '#f87171' : '#a3e635' }}>
            {liabAnalysis.netLiability > 0 ? '−' : '+'}{formatCurrency(Math.abs(liabAnalysis.netLiability))}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-[1.8px] uppercase text-muted-foreground mb-1.5">Patrimonio</p>
          <p className="font-mono text-[15px] font-medium tabular-nums text-foreground">{formatCurrency(netWorth)}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] tracking-[1.8px] uppercase text-muted-foreground mb-1.5">Rate/mese</p>
          <p className="font-mono text-[15px] font-medium tabular-nums text-foreground">
            {liabAnalysis.totalMonthly > 0 ? formatCurrency(liabAnalysis.totalMonthly) : '—'}
          </p>
        </div>
      </div>

      {allocation.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[15px] font-medium text-foreground mb-1">Nessun dato</p>
          <p className="font-mono text-[11px] text-muted-foreground/70 tracking-[0.2px]">
            Aggiungi asset per visualizzare l&apos;analisi
          </p>
        </div>
      ) : (
        <>
          {/* Allocazione */}
          <section className="mb-10">
            <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-6">Allocazione</p>
            <CategoryDonut allocations={allocation} />
          </section>

          {/* Performance */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-1">
              <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground">Performance</p>
              {buckets.length >= 2 && (
                <p className="font-mono text-[9px] text-muted-foreground/50">vs mese precedente</p>
              )}
            </div>
            <PerfTable perf={perf} />
          </section>

          {/* Nel tempo */}
          {buckets.length >= 2 && (
            <section className="mb-10">
              <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-6">Nel tempo</p>
              <AllocationHistoryChart buckets={buckets} />
            </section>
          )}

          {/* Passività */}
          <LiabilitySection analysis={liabAnalysis} />
        </>
      )}
    </div>
  )
}
