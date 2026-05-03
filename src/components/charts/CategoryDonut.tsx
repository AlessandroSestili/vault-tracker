'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/formats'
import type { CategoryAllocation } from '@/lib/analytics'

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategoryAllocation }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-xl border border-white/[0.08] px-3 py-2.5"
      style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: d.color }} />
        <span className="text-[12px] font-medium text-foreground">{d.label}</span>
      </div>
      <p className="font-mono text-[13px] tabular-nums text-foreground">{formatCurrency(d.value)}</p>
      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">{d.pct.toFixed(1)}%</p>
    </div>
  )
}

export function CategoryDonut({ allocations }: { allocations: CategoryAllocation[] }) {
  const total = allocations.reduce((s, c) => s + c.value, 0)

  if (allocations.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocations}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {allocations.map(entry => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[9px] uppercase tracking-[1.8px] text-muted-foreground mb-1">Totale</p>
          <p className="font-mono text-[18px] font-medium tabular-nums text-foreground">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="w-full border-t border-white/[0.06]">
        {allocations.map(s => (
          <div key={s.key} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[13.5px] font-medium text-foreground">{s.label}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[13px] tabular-nums text-foreground">{formatCurrency(s.value)}</span>
              <span className="font-mono text-[11px] text-muted-foreground ml-2 tabular-nums">{s.pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
