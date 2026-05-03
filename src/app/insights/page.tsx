import { fetchExchangeRates } from '@/lib/yahoo-finance'
import { liabilityBalance } from '@/lib/liability-calc'
import { fetchAccounts, fetchPositions, fetchLiabilities, mapPositionsWithQuotes, computePortfolioTotals } from '@/lib/queries'
import type { OrbitRing } from '@/components/charts/OrbitChart3D'
import { OrbitChart3DClient } from '@/components/charts/OrbitChart3DClient'

// Palette per ring: shade della famiglia cromatica del ring. Ogni asset dello stesso ring
// prende una tonalità diversa dalla palette per massimizzare la distinguibilità.
const SKY_PALETTE = ['#38bdf8', '#0ea5e9', '#7dd3fc', '#0284c7', '#bae6fd', '#0369a1']
const LIME_PALETTE = ['#bef264', '#a3e635', '#d9f99d', '#84cc16', '#ecfccb', '#65a30d']
const ROSE_PALETTE = ['#fb7185', '#f43f5e', '#fda4af', '#e11d48', '#be123c']
const GREEN_PALETTE = ['#4ade80', '#22c55e', '#86efac', '#16a34a', '#bbf7d0']

export default async function InsightsPage() {
  const [accounts, allPositions, liabilities, rates] = await Promise.all([
    fetchAccounts(), fetchPositions(), fetchLiabilities(), fetchExchangeRates(),
  ])

  const livePositions = allPositions.filter((p) => !p.is_manual)
  const manualPositions = allPositions.filter((p) => p.is_manual)

  const positionsWithQuotes = await mapPositionsWithQuotes(livePositions, rates)

  const { total } = computePortfolioTotals(
    accounts, positionsWithQuotes, manualPositions
  )

  const rings: OrbitRing[] = []

  // Ring 1: Conti (sky family, inner ring)
  const sortedAccounts = accounts
    .filter(a => (a.latest_value ?? 0) > 0)
    .sort((a, b) => (b.latest_value ?? 0) - (a.latest_value ?? 0))
  if (sortedAccounts.length > 0) {
    rings.push({
      id: 'accounts',
      label: 'Conti',
      radius: 2.8,
      accentColor: '#38bdf8',
      assets: sortedAccounts.map((a, i) => ({
        id: `account-${a.id}`,
        label: a.name,
        value: a.latest_value ?? 0,
        color: SKY_PALETTE[i % SKY_PALETTE.length],
      })),
    })
  }

  // Ring 2: Posizioni (lime family, middle ring)
  const livePos = positionsWithQuotes
    .filter(p => p.value > 0)
    .map(p => ({
      id: `position-${p.id}`,
      label: p.display_name ?? p.isin ?? 'Posizione',
      value: p.value,
    }))
  const manualPos = manualPositions
    .filter(p => (p.current_value_eur ?? 0) > 0)
    .map(p => ({
      id: `manual-${p.id}`,
      label: p.display_name ?? 'Asset',
      value: p.current_value_eur ?? 0,
    }))
  const allPos = [...livePos, ...manualPos].sort((a, b) => b.value - a.value)
  if (allPos.length > 0) {
    rings.push({
      id: 'positions',
      label: 'Posizioni',
      radius: 4.4,
      accentColor: '#bef264',
      assets: allPos.map((p, i) => ({
        ...p,
        color: LIME_PALETTE[i % LIME_PALETTE.length],
      })),
    })
  }

  // Ring 3: Debiti & Crediti (rose + green, outer ring)
  if (liabilities.length > 0) {
    const sortedLiabs = [...liabilities].sort((a, b) => Math.abs(liabilityBalance(b)) - Math.abs(liabilityBalance(a)))
    let debtIdx = 0
    let creditIdx = 0
    rings.push({
      id: 'liabilities',
      label: 'Debiti & Crediti',
      radius: 6.0,
      accentColor: '#fb7185',
      assets: sortedLiabs.map(l => {
        const isDebt = l.type === 'debt'
        const palette = isDebt ? ROSE_PALETTE : GREEN_PALETTE
        const idx = isDebt ? debtIdx++ : creditIdx++
        return {
          id: `liability-${l.id}`,
          label: l.name,
          value: isDebt ? -Math.abs(liabilityBalance(l)) : Math.abs(liabilityBalance(l)),
          color: palette[idx % palette.length],
        }
      }),
    })
  }

  const assetCount = rings.reduce((s, r) => s + r.assets.length, 0)

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      {/* Header */}
      <div className="pt-2 md:pt-8 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">Orbit</p>
          <span className="font-mono text-[9px] tracking-[1px] uppercase px-1.5 py-0.5 rounded border border-white/[0.10] text-muted-foreground bg-white/[0.03]">
            Beta
          </span>
        </div>
        <p className="text-[22px] md:text-[26px] font-medium text-foreground tracking-[-0.5px]">
          Patrimonio in orbita
        </p>
        <p className="font-mono text-[11px] text-muted-foreground mt-1">
          {assetCount} asset · 3 ring concentrici · trascina per ruotare
        </p>
      </div>

      <OrbitChart3DClient rings={rings} total={total} />
    </div>
  )
}
