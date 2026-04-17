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
  investment: 'oklch(0.75 0.18 152)',   // green
  cash:       'oklch(0.65 0.15 200)',   // teal
  pension:    'oklch(0.70 0.15 280)',   // purple
  crypto:     'oklch(0.75 0.18 50)',    // orange
  other:      'oklch(0.55 0.05 240)',   // muted
}

export function AllocationChart({ slices }: { slices: Slice[] }) {
  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">
        Nessun dato disponibile
      </div>
    )
  }

  return (
    <div className="flex items-center gap-10">
      {/* Donut */}
      <div className="relative w-72 h-72 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius={90}
              outerRadius={130}
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
                  <div className="bg-card border border-border rounded-xl px-3 py-2 text-sm shadow-xl">
                    <p className="text-muted-foreground text-xs">{s.label}</p>
                    <p className="font-semibold text-foreground tabular-nums">{formatCurrency(s.value)}</p>
                    <p className="text-muted-foreground text-xs">{s.pct.toFixed(1)}%</p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground">Totale</p>
          <p className="text-xl font-semibold tabular-nums text-foreground">
            {formatCurrency(slices.reduce((s, x) => s + x.value, 0))}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {slices.map((s) => (
          <div key={s.type} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-sm text-foreground">{s.label}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(s.value)}</p>
              <p className="text-xs text-muted-foreground">{s.pct.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { TYPE_COLORS }
export type { Slice }
