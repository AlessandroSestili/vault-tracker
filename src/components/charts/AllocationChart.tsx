'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formats'
import type { AccountType } from '@/types'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'

type Slice = {
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

export function AllocationChart({ slices }: { slices: Slice[] }) {
  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-72">
        <div className="text-center">
          <p className="text-[15px] font-medium text-[#fafafa] tracking-[-0.2px] mb-1">Nessuna allocazione</p>
          <p className="font-mono text-[11px] text-[#52525b] tracking-[0.2px]">Aggiungi asset per visualizzare la distribuzione</p>
        </div>
        <AddItemSheet variant="lime-cta" />
      </div>
    )
  }

  const total = slices.reduce((s, x) => s + x.value, 0)
  const maxPct = Math.max(...slices.map(s => s.pct))

  return (
    <div className="flex flex-col md:flex-row md:items-start md:gap-10">
      {/* Donut — 200px mobile, 280px desktop */}
      <div className="relative shrink-0 mx-auto md:mx-0 w-[200px] h-[200px] md:w-[280px] md:h-[280px]">
        <div className="md:hidden absolute inset-0">
          <DonutSvg slices={slices} size={200} thickness={14} total={total} />
        </div>
        <div className="hidden md:block absolute inset-0">
          <DonutSvg slices={slices} size={280} thickness={18} total={total} />
        </div>
      </div>

      {/* Legend con barre proporzionali */}
      <div className="flex-1 mt-5 md:mt-0 border-t border-white/[0.1] pt-1">
        {slices.map((s) => (
          <div key={s.type} className="py-3 border-b border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px]">{s.label}</span>
              </div>
              <div className="text-right">
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

function DonutSvg({ slices, size, thickness, total }: {
  slices: Slice[]
  size: number
  thickness: number
  total: number
}) {
  const r = size / 2 - thickness / 2
  const cx = size / 2
  const cy = size / 2
  const C = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {slices.map((s, i) => {
        const len = (s.pct / 100) * C
        const gap = 2
        const dash = `${Math.max(0, len - gap)} ${C - len + gap}`
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        )
        offset += len
        return el
      })}
      {/* Center label — counter-rotate */}
      <g transform={`rotate(90 ${cx} ${cy})`}>
        <text x={cx} y={cy - (size > 220 ? 8 : 6)} textAnchor="middle"
          style={{ fill: '#71717a', fontSize: size > 220 ? 11 : 10, letterSpacing: 1.5, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
          TOTALE
        </text>
        <text x={cx} y={cy + (size > 220 ? 16 : 14)} textAnchor="middle"
          style={{ fill: '#fafafa', fontSize: size > 220 ? 20 : 18, fontWeight: 500, fontFamily: 'Inter, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(total)}
        </text>
      </g>
    </svg>
  )
}

export { TYPE_COLORS }
export type { Slice }
