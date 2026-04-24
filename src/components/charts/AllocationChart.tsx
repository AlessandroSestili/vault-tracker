'use client'

import { formatCurrency } from '@/lib/formats'
import type { AccountType } from '@/types'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { useVisibility } from '@/components/accounts/VisibilityContext'
import { TYPE_COLORS, RAINBOW } from '@/lib/chart-palette'

type Slice = {
  id: string
  type: AccountType
  label: string
  value: number
  color: string
  pct: number
}

// ─── SVG donut primitives ─────────────────────────────────────────────
function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  // Evita degenerazione quando sweep ~360°
  const sweep = endAngle - startAngle
  const effectiveEnd = sweep >= 359.999 ? startAngle + 359.999 : endAngle
  const largeArc = effectiveEnd - startAngle > 180 ? 1 : 0
  const p1 = polarToCart(cx, cy, rOuter, startAngle)
  const p2 = polarToCart(cx, cy, rOuter, effectiveEnd)
  const p3 = polarToCart(cx, cy, rInner, effectiveEnd)
  const p4 = polarToCart(cx, cy, rInner, startAngle)
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

type Arc = {
  id: string
  label: string
  value: number
  color: string
  path: string
  start: number
  end: number
}

function computeArcs(slices: Slice[], cx: number, cy: number, rOuter: number, rInner: number, gapDeg = 1.5): Arc[] {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total <= 0) return []
  const gapTotal = slices.length > 1 ? slices.length * gapDeg : 0
  const available = 360 - gapTotal

  let cursor = 0
  return slices.map((s) => {
    const sweep = (s.value / total) * available
    const start = cursor
    const end = cursor + sweep
    cursor = end + gapDeg
    return {
      id: s.id,
      label: s.label,
      value: s.value,
      color: s.color,
      path: arcPath(cx, cy, rOuter, rInner, start, end),
      start,
      end,
    }
  })
}

function Donut({ arcs, size, rOuter, rInner }: { arcs: Arc[]; size: number; rOuter: number; rInner: number }) {
  if (arcs.length === 0) return null
  const cx = size / 2
  const cy = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a) => (
        <path key={a.id} d={a.path} fill={a.color}>
          <title>{`${a.label} — ${formatCurrency(a.value)}`}</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="rgba(9,9,11,0.9)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────
export function AllocationChart({ slices: allSlices }: { slices: Slice[] }) {
  const { showAccounts, showPositions } = useVisibility()
  const slices = allSlices.filter((s) =>
    s.type === 'investment' ? showPositions : showAccounts
  )

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72">
        <div className="text-center">
          <p className="text-[15px] font-medium text-[#fafafa] tracking-[-0.2px] mb-1">Nessuna allocazione</p>
          <p className="font-mono text-[11px] text-[#52525b] tracking-[0.2px]">Aggiungi asset per visualizzare la distribuzione</p>
        </div>
        <div className="hidden md:flex">
          <AddItemSheet variant="lime-cta" />
        </div>
      </div>
    )
  }

  const total = slices.reduce((s, x) => s + x.value, 0)
  const maxPct = Math.max(...slices.map((s) => s.pct))

  const size = 240
  const rOuter = size * 0.465
  const rInner = size * 0.34
  const arcs = computeArcs(slices, size / 2, size / 2, rOuter, rInner)

  return (
    <div className="flex flex-col md:flex-row md:items-start md:gap-10">
      <div className="relative shrink-0 mx-auto md:mx-0">
        <Donut arcs={arcs} size={size} rOuter={rOuter} rInner={rInner} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[1.5px]">Totale</p>
          <p className="text-[18px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Legend con barre proporzionali */}
      <div className="flex-1 mt-5 md:mt-0 border-t border-white/[0.1] pt-1">
        {slices.map((s) => (
          <div key={s.id} className="py-3 border-b border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px] truncate">{s.label}</span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="font-mono text-[13.5px] font-medium tabular-nums tracking-[-0.2px] text-[#fafafa] whitespace-nowrap">
                  {formatCurrency(s.value)}
                </span>
                <span className="font-mono text-[11px] text-[#71717a] ml-2 tabular-nums">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            </div>
            {/* Barra proporzionale */}
            <div className="h-[2px] rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(s.pct / maxPct) * 100}%`,
                  backgroundColor: s.color,
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { Slice }
