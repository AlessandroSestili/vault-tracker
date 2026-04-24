'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/formats'
import type { AccountType } from '@/types'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import { useVisibility } from '@/components/accounts/VisibilityContext'

type Slice = {
  id: string
  type: AccountType
  label: string
  value: number
  color: string
  pct: number
}

const TYPE_COLORS: Record<AccountType, string> = {
  investment: '#bef264',
  cash:       '#38bdf8',
  pension:    '#a78bfa',
  crypto:     '#fb923c',
  other:      '#a1a1aa',
}

// Palette editorial bright — Tailwind 400 scale. 16 hue con salto ~22° per contrasto tra slice adiacenti.
const RAINBOW: string[] = [
  '#bef264', // lime-300 (signature primary)
  '#38bdf8', // sky-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#4ade80', // green-400
  '#fb923c', // orange-400
  '#60a5fa', // blue-400
  '#f87171', // red-400
  '#2dd4bf', // teal-400
  '#e879f9', // fuchsia-400
  '#facc15', // yellow-400
  '#22d3ee', // cyan-400
  '#c084fc', // purple-400
  '#fb7185', // rose-400
  '#a3e635', // lime-400
]

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

// Lightens a hex color by mixing with white (0–1 amount)
function lighten(hex: string, amount: number): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  const toHex = (c: number) => c.toString(16).padStart(2, '0')
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`
}

function Donut3D({ arcs, size, rOuter, rInner }: { arcs: Arc[]; size: number; rOuter: number; rInner: number }) {
  const cx = size / 2
  const cy = size / 2
  const [hoverId, setHoverId] = useState<string | null>(null)

  return (
    <div
      className="relative"
      style={{ width: size, height: size, perspective: '1200px' }}
    >
      {/* Ground shadow (soft ellipse below) */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: size * 0.1,
          right: size * 0.1,
          bottom: size * 0.02,
          height: size * 0.14,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 50%, transparent 75%)',
          filter: 'blur(8px)',
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotateX(58deg)',
          transformOrigin: '50% 50%',
          filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.35))',
        }}
      >
        <defs>
          {arcs.map((a) => (
            <radialGradient key={`grad-${a.id}`} id={`grad-${a.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={lighten(a.color, 0.18)} />
              <stop offset="100%" stopColor={a.color} />
            </radialGradient>
          ))}
        </defs>

        {/* Side wall — extruded copy under main face, shifted +Y, fill = darker tone */}
        <g transform={`translate(0, ${Math.round(size * 0.035)})`} opacity={0.85}>
          {arcs.map((a) => (
            <path
              key={`wall-${a.id}`}
              d={a.path}
              fill={a.color}
              opacity={0.45}
            />
          ))}
        </g>

        {/* Front face */}
        <g>
          {arcs.map((a) => {
            const dimmed = hoverId !== null && hoverId !== a.id
            return (
              <path
                key={a.id}
                d={a.path}
                fill={`url(#grad-${a.id})`}
                opacity={dimmed ? 0.35 : 1}
                style={{ transition: 'opacity 200ms ease' }}
                onMouseEnter={() => setHoverId(a.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <title>{`${a.label} — ${formatCurrency(a.value)}`}</title>
              </path>
            )
          })}
        </g>

        {/* Inner ring highlight (crisp edge) */}
        <circle
          cx={cx}
          cy={cy}
          r={rInner}
          fill="none"
          stroke="rgba(9,9,11,0.9)"
          strokeWidth={1.5}
        />
        {/* Outer ring subtle shadow */}
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      </svg>
    </div>
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

  // Compute arcs once for each size
  const mobileSize = 240
  const desktopSize = 320
  const mobileArcs = computeArcs(slices, mobileSize / 2, mobileSize / 2, mobileSize * 0.465, mobileSize * 0.34)
  const desktopArcs = computeArcs(slices, desktopSize / 2, desktopSize / 2, desktopSize * 0.465, desktopSize * 0.34)

  return (
    <div className="flex flex-col md:flex-row md:items-start md:gap-10">
      {/* Donut */}
      <div
        className="relative shrink-0 mx-auto md:mx-0"
        style={{ width: 'min(100%, 320px)' }}
      >
        {/* Mobile */}
        <div className="md:hidden flex items-center justify-center">
          <div className="relative">
            <Donut3D arcs={mobileArcs} size={mobileSize} rOuter={mobileSize * 0.465} rInner={mobileSize * 0.34} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[1.5px]">Totale</p>
              <p className="text-[18px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-center">
          <div className="relative">
            <Donut3D arcs={desktopArcs} size={desktopSize} rOuter={desktopSize * 0.465} rInner={desktopSize * 0.34} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[1.5px]">Totale</p>
              <p className="text-[20px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</p>
            </div>
          </div>
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

export { TYPE_COLORS, RAINBOW }
export type { Slice }
