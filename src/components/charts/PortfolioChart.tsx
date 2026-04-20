'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatCurrency, formatChartDate } from '@/lib/formats'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'

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

function formatAxisDate(day: string, period: Period): string {
  return formatChartDate(day, period === '1S' || period === '1M')
}

export function PortfolioChart({ data }: { data: DataPoint[] }) {
  const [period, setPeriod] = useState<Period>('1A')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      {/* Delta row */}
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
      {data.length === 0 ? (
        <div className="h-[160px] md:h-[220px] flex flex-col items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-[15px] font-medium text-[#fafafa] tracking-[-0.2px] mb-1">Nessun asset ancora</p>
            <p className="font-mono text-[11px] text-[#52525b] tracking-[0.2px]">Aggiungi un conto, posizione o debito per iniziare</p>
          </div>
          <div className="hidden md:flex">
            <AddItemSheet variant="lime-cta" />
          </div>
        </div>
      ) : !hasData ? (
        <div className="h-[100px] md:h-[200px] flex items-center justify-center text-[#71717a] text-sm font-mono">
          Nessun dato per questo periodo
        </div>
      ) : (
        <div className="h-[100px] md:h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filtered}
              margin={isDesktop
                ? { top: 8, right: 4, left: 0, bottom: 4 }
                : { top: 8, right: 2, left: 2, bottom: 8 }
              }
            >
              <defs>
                <linearGradient id="limeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIME} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                </linearGradient>
              </defs>

              {isDesktop && (
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="0"
                />
              )}

              <XAxis
                dataKey="day"
                tickFormatter={(day) => formatAxisDate(day, period)}
                tick={isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                hide={!isDesktop}
              />

              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
                axisLine={false}
                tickLine={false}
                width={isDesktop ? 36 : 0}
                hide={!isDesktop}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as DataPoint
                  return (
                    <div className="bg-[#111113] border border-white/[0.1] rounded-xl px-3 py-2 shadow-xl">
                      <p className="font-mono text-[10px] text-[#71717a] mb-0.5">{formatAxisDate(d.day, period)}</p>
                      <p className="font-mono font-medium text-[#fafafa] tabular-nums text-[13px]">{formatCurrency(d.total)}</p>
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
