'use client'

import { PieChart, Pie, Cell } from 'recharts'
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

// Rainbow palette — 16 colori vibranti ad alta distinguibilità su sfondo dark.
// Ordinata per salto di hue ~22° per massimizzare il contrasto tra slice adiacenti.
const RAINBOW: string[] = [
  '#bef264', // lime
  '#38bdf8', // sky
  '#fb923c', // orange
  '#a78bfa', // violet
  '#f472b6', // pink
  '#4ade80', // green
  '#facc15', // yellow
  '#60a5fa', // blue
  '#f87171', // red
  '#2dd4bf', // teal
  '#c084fc', // purple
  '#fcd34d', // amber
  '#22d3ee', // cyan
  '#e879f9', // fuchsia
  '#fca5a5', // rose
  '#818cf8', // indigo
]

export function AllocationChart({ slices: allSlices }: { slices: Slice[] }) {
  const { showAccounts, showPositions } = useVisibility()
  const slices = allSlices.filter(s =>
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
  const maxPct = Math.max(...slices.map(s => s.pct))

  return (
    <div className="flex flex-col md:flex-row md:items-start md:gap-10">
      {/* Donut — 200px mobile, 280px desktop */}
      <div className="relative shrink-0 mx-auto md:mx-0 w-[200px] h-[200px] md:w-[280px] md:h-[280px]">
        {/* Mobile */}
        <div className="md:hidden">
          <PieChart width={200} height={200}>
            <Pie data={slices} cx={100} cy={100} innerRadius={72} outerRadius={93}
              dataKey="value" startAngle={90} endAngle={-270} stroke="#09090b" strokeWidth={1.5}>
              {slices.map(s => <Cell key={s.id} fill={s.color} />)}
            </Pie>
          </PieChart>
        </div>
        {/* Desktop */}
        <div className="hidden md:block">
          <PieChart width={280} height={280}>
            <Pie data={slices} cx={140} cy={140} innerRadius={103} outerRadius={131}
              dataKey="value" startAngle={90} endAngle={-270} stroke="#09090b" strokeWidth={1.5}>
              {slices.map(s => <Cell key={s.id} fill={s.color} />)}
            </Pie>
          </PieChart>
        </div>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[1.5px]">Totale</p>
          <p className="text-[18px] md:text-[20px] font-medium text-foreground tabular-nums">{formatCurrency(total)}</p>
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
