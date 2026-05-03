'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { CATEGORY_CONFIG } from '@/lib/analytics'
import type { CategoryKey, MonthlyBucket } from '@/lib/analytics'
import { formatCurrency } from '@/lib/formats'

const CATEGORY_KEYS: CategoryKey[] = ['cash', 'invest', 'pension', 'crypto', 'other']

function formatMonth(month: string) {
  const [y, m] = month.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
}

function formatK(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return `${value}`
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)
  return (
    <div
      className="rounded-xl border border-white/[0.08] px-3 py-3 min-w-[160px]"
      style={{ background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)' }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground mb-2.5">
        {formatMonth(label)}
      </p>
      {[...payload].reverse().map(p => {
        if (!p.value) return null
        return (
          <div key={p.name} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-[2px]" style={{ backgroundColor: p.fill }} />
              <span className="text-[11px] text-muted-foreground">{CATEGORY_CONFIG[p.name as CategoryKey]?.label}</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-foreground">{formatCurrency(p.value)}</span>
          </div>
        )
      })}
      <div className="border-t border-white/[0.06] mt-2 pt-2 flex justify-between">
        <span className="text-[11px] text-muted-foreground">Totale</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground font-medium">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export function AllocationHistoryChart({ buckets }: { buckets: MonthlyBucket[] }) {
  if (buckets.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={buckets}
        barSize={buckets.length > 18 ? 8 : buckets.length > 12 ? 12 : 18}
        barGap={2}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
          tickLine={false}
          axisLine={false}
          interval={buckets.length > 18 ? 5 : buckets.length > 12 ? 2 : 1}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
          tickLine={false}
          axisLine={false}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        {CATEGORY_KEYS.map(key => (
          <Bar
            key={key}
            dataKey={key}
            stackId="s"
            fill={CATEGORY_CONFIG[key].color}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
