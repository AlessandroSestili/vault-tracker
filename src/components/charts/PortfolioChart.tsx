'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/formats'

type DataPoint = { day: string; total: number }

type Period = '1W' | '1M' | '3M' | '1Y' | 'All'

const PERIODS: Period[] = ['1W', '1M', '3M', '1Y', 'All']

const PERIOD_DAYS: Record<Period, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  All: Infinity,
}

function filterByPeriod(data: DataPoint[], period: Period): DataPoint[] {
  if (period === 'All') return data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period])
  return data.filter((d) => new Date(d.day) >= cutoff)
}

function formatAxisDate(day: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(day))
}

export function PortfolioChart({ data }: { data: DataPoint[] }) {
  const [period, setPeriod] = useState<Period>('All')

  const filtered = useMemo(() => filterByPeriod(data, period), [data, period])

  const hasData = filtered.length > 0
  const delta = hasData && filtered.length > 1
    ? filtered[filtered.length - 1].total - filtered[0].total
    : 0
  const deltaPositive = delta >= 0

  return (
    <div className="space-y-4">
      {/* Period pills */}
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              period === p
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Nessun dato disponibile per questo periodo
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.75 0.18 152)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.75 0.18 152)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="oklch(1 0 0 / 5%)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="day"
                tickFormatter={formatAxisDate}
                tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: 'oklch(0.55 0 0)' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as DataPoint
                  return (
                    <div className="bg-card border border-border rounded-xl px-3 py-2 text-sm shadow-xl">
                      <p className="text-muted-foreground text-xs">{formatAxisDate(d.day)}</p>
                      <p className="font-semibold text-foreground tabular-nums">
                        {formatCurrency(d.total)}
                      </p>
                    </div>
                  )
                }}
                cursor={{ stroke: 'oklch(1 0 0 / 15%)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="oklch(0.75 0.18 152)"
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'oklch(0.75 0.18 152)', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Delta */}
      {hasData && filtered.length > 1 && (
        <p className={`text-sm font-medium ${deltaPositive ? 'text-primary' : 'text-destructive'}`}>
          {deltaPositive ? '+' : ''}{formatCurrency(delta)} nel periodo selezionato
        </p>
      )}
    </div>
  )
}
