'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formats'
import type { AccountType } from '@/types'

type Slice = {
  type: AccountType
  label: string
  value: number
  color: string
  pct: number
}

const TYPE_COLORS: Record<AccountType, string> = {
  investment: 'oklch(0.82 0.18 130)',  // lime
  cash:       'oklch(0.78 0.14 220)',  // sky
  pension:    'oklch(0.72 0.18 300)',  // violet
  crypto:     'oklch(0.75 0.16 50)',   // amber
  other:      'oklch(0.72 0.02 260)',  // gray
}

export function AllocationChart({ slices }: { slices: Slice[] }) {
  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    )
  }

  const total = slices.reduce((s, x) => s + x.value, 0)

  return (
    <div className="flex flex-col md:flex-row md:items-center md:gap-10">
      {/* Donut */}
      <div className="relative w-[200px] h-[200px] shrink-0 mx-auto md:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius="64%"
              outerRadius="86%"
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {slices.map((s) => (
                <Cell key={s.type} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const s = payload[0].payload as Slice
                return (
                  <div className="bg-[#111113] border border-white/[0.1] rounded-xl px-3 py-2 text-sm shadow-xl">
                    <p className="font-mono text-[10px] text-[#71717a] tracking-[1.5px] uppercase mb-0.5">{s.label}</p>
                    <p className="font-mono font-medium text-[#fafafa] tabular-nums">{formatCurrency(s.value)}</p>
                    <p className="font-mono text-[11px] text-[#71717a] mt-0.5">{s.pct.toFixed(1)}%</p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-[#71717a] tracking-[1.5px] uppercase mb-1">Totale</p>
          <p className="font-mono text-[18px] font-medium tabular-nums text-[#fafafa] tracking-[-0.3px]">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 mt-6 md:mt-0 border-t border-white/[0.1] pt-1">
        {slices.map((s) => (
          <div key={s.type} className="flex items-center py-3.5 border-b border-white/[0.04]">
            <div
              className="w-2 h-2 rounded-[2px] shrink-0 mr-3"
              style={{ backgroundColor: s.color }}
            />
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#fafafa] tracking-[-0.1px]">{s.label}</p>
              <p className="font-mono text-[11px] text-[#71717a] mt-0.5 tracking-[0.3px] tabular-nums">
                {s.pct.toFixed(1)}% del totale
              </p>
            </div>
            <p className="font-mono text-[13.5px] font-medium text-[#fafafa] tabular-nums tracking-[-0.2px] whitespace-nowrap ml-2">
              {formatCurrency(s.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export { TYPE_COLORS }
export type { Slice }
