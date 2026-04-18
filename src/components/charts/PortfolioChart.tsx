'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formats'

type DataPoint = { day: string; total: number }
type Period = '1S' | '1M' | '3M' | '1A' | 'Tutto'

const PERIODS: Period[] = ['1S', '1M', '3M', '1A', 'Tutto']
const PERIOD_DAYS: Record<Period, number> = {
  '1S': 7, '1M': 30, '3M': 90, '1A': 365, 'Tutto': Infinity,
}

const LIME = 'oklch(0.82 0.18 130)'

function filterByPeriod(data: DataPoint[], period: Period): DataPoint[] {
  if (period === 'Tutto') return data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period])
  return data.filter((d) => new Date(d.day) >= cutoff)
}

function formatAxisDate(day: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(day))
}

export function PortfolioChart({ data }: { data: DataPoint[] }) {
  const [period, setPeriod] = useState<Period>('1A')

  const filtered = useMemo(() => filterByPeriod(data, period), [data, period])

  const hasData = filtered.length > 0
  const delta = hasData && filtered.length > 1
    ? filtered[filtered.length - 1].total - filtered[0].total
    : 0
  const deltaPct = hasData && filtered.length > 1 && filtered[0].total !== 0
    ? (delta / filtered[0].total) * 100
    : 0
  const positive = delta >= 0

  return (
    <div>
      {/* Delta row — shown above chart */}
      {hasData && filtered.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
            {positive
              ? <path d="M1 7l4-4 4 4" stroke={LIME} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M1 3l4 4 4-4" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
          <span
            className="font-mono text-[12.5px] tabular-nums tracking-[-0.2px]"
            style={{ color: positive ? LIME : '#ef4444' }}
          >
            {positive ? '+' : '−'}{formatCurrency(Math.abs(delta))} · {positive ? '+' : '−'}{Math.abs(deltaPct).toFixed(2)}%
          </span>
        </div>
      )}

      {/* Chart */}
      {!hasData ? (
        <div className="h-[100px] flex items-center justify-center text-[#71717a] text-sm font-mono">
          Nessun dato per questo periodo
        </div>
      ) : (
        <div className="h-[100px] md:h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 8, right: 2, left: 2, bottom: 8 }}>
              <defs>
                <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIME} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as DataPoint
                  return (
                    <div className="bg-[#111113] border border-white/[0.1] rounded-xl px-3 py-2 text-sm shadow-xl">
                      <p className="font-mono text-[10px] text-[#71717a]">{formatAxisDate(d.day)}</p>
                      <p className="font-mono font-medium text-[#fafafa] tabular-nums">{formatCurrency(d.total)}</p>
                    </div>
                  )
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={LIME}
                strokeWidth={1.25}
                fill="url(#limeGrad)"
                dot={false}
                activeDot={{ r: 2.5, fill: LIME, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Period selector */}
      <div className="flex justify-center mt-4">
        <div
          className="flex gap-0.5 items-center p-0.5 rounded-full border border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {PERIODS.map((p) => {
            const active = period === p
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="rounded-full font-mono text-[11px] tracking-[0.4px] transition-all"
                style={{
                  padding: '6px 12px',
                  background: active ? '#fafafa' : 'transparent',
                  color: active ? '#09090b' : '#a1a1aa',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
