'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'
import { formatCurrency, formatChartDate } from '@/lib/formats'
import { AddItemSheet } from '@/components/accounts/AddItemSheet'

type DataPoint = { day: string; total: number; accounts: number; positions: number }
type EnrichedPoint = { day: string; total: number | null; accounts: number | null; positions: number }
type Period = '1S' | '1M' | '3M' | '1A' | 'Tutto'

const PERIODS: Period[] = ['1S', '1M', '3M', '1A', 'Tutto']
const PERIOD_DAYS: Record<Period, number> = {
  '1S': 7, '1M': 30, '3M': 90, '1A': 365, 'Tutto': Infinity,
}
const PERIOD_LABEL: Record<Period, string> = {
  '1S': 'ultimi 7g', '1M': 'ultimo mese', '3M': 'ultimi 3 mesi', '1A': 'ultimo anno', 'Tutto': 'storico',
}

const LIME = 'oklch(0.82 0.18 130)'
const RED = '#ef4444'
const ACCOUNTS_COLOR = 'oklch(0.72 0.08 230)'
const POSITIONS_COLOR = 'oklch(0.78 0.09 60)'

function filterByPeriod(data: EnrichedPoint[], period: Period): EnrichedPoint[] {
  if (period === 'Tutto') return data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period])
  return data.filter((d) => new Date(d.day) >= cutoff)
}

function formatAxisDate(day: string, period: Period): string {
  return formatChartDate(day, period === '1S' || period === '1M')
}

export function PortfolioChart({ data, vaultStart }: { data: DataPoint[]; vaultStart: string | null }) {
  const [period, setPeriod] = useState<Period>('1A')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const enriched: EnrichedPoint[] = useMemo(() => {
    return data.map((d) => {
      const preVault = vaultStart !== null && d.day < vaultStart
      return {
        day: d.day,
        total: preVault ? null : d.total,
        accounts: preVault ? null : d.accounts,
        positions: d.positions,
      }
    })
  }, [data, vaultStart])

  const filtered = useMemo(() => filterByPeriod(enriched, period), [enriched, period])

  const hasData = filtered.length > 0
  const postVault = filtered.filter((d) => d.total != null) as Array<EnrichedPoint & { total: number; accounts: number }>
  const hasTotal = postVault.length > 0

  const delta = hasTotal && postVault.length > 1 ? postVault[postVault.length - 1].total - postVault[0].total : 0
  const deltaPct = hasTotal && postVault.length > 1 && postVault[0].total !== 0 ? (delta / postVault[0].total) * 100 : 0
  const positive = delta >= 0

  const ath = hasTotal ? Math.max(...postVault.map((d) => d.total)) : null
  const entryValue = hasTotal ? postVault[0].total : null
  const entryDay = hasTotal ? postVault[0].day : null
  const totalColor = positive ? LIME : RED

  const showSeparator =
    vaultStart != null &&
    filtered.some((d) => d.day >= vaultStart) &&
    filtered.some((d) => d.day < vaultStart)

  return (
    <div>
      {hasTotal && postVault.length > 1 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
            {positive
              ? <path d="M1 7l4-4 4 4" stroke={totalColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M1 3l4 4 4-4" stroke={totalColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <span
            className="font-mono text-[12.5px] tabular-nums tracking-[-0.2px]"
            style={{ color: totalColor }}
          >
            {positive ? '+' : '−'}{formatCurrency(Math.abs(delta))} · {positive ? '+' : '−'}{Math.abs(deltaPct).toFixed(2)}%
          </span>
          <span className="font-mono text-[10.5px] text-[#71717a] tracking-[0.3px]">
            · {PERIOD_LABEL[period]}
          </span>
        </div>
      )}

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
        <div className="h-[140px] md:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filtered}
              margin={isDesktop
                ? { top: 18, right: 4, left: 0, bottom: 4 }
                : { top: 14, right: 2, left: 2, bottom: 8 }
              }
            >
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={totalColor} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={totalColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              {isDesktop && (
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
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
                  const d = payload[0].payload as EnrichedPoint
                  return (
                    <div className="bg-[#111113] border border-white/[0.1] rounded-xl px-3 py-2 shadow-xl">
                      <p className="font-mono text-[10px] text-[#71717a] mb-1">{formatAxisDate(d.day, period)}</p>
                      {d.total != null ? (
                        <p className="font-mono font-medium text-[#fafafa] tabular-nums text-[13px] mb-1">
                          {formatCurrency(d.total)}
                        </p>
                      ) : (
                        <p className="font-mono text-[10px] text-[#52525b] italic mb-1">Pre-Vault · solo posizioni</p>
                      )}
                      <div className="flex flex-col gap-0.5">
                        {d.accounts != null && (
                          <p className="font-mono text-[10.5px] tabular-nums" style={{ color: ACCOUNTS_COLOR }}>
                            ● Conti {formatCurrency(d.accounts)}
                          </p>
                        )}
                        <p className="font-mono text-[10.5px] tabular-nums" style={{ color: POSITIONS_COLOR }}>
                          ● Posizioni {formatCurrency(d.positions)}
                        </p>
                      </div>
                    </div>
                  )
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
              />

              {ath != null && (
                <ReferenceLine
                  y={ath}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="3 3"
                  label={isDesktop ? {
                    value: 'ATH',
                    position: 'insideTopRight',
                    fill: '#71717a',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                  } : undefined}
                />
              )}

              {showSeparator && (
                <ReferenceLine
                  x={vaultStart!}
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 3"
                  label={isDesktop ? {
                    value: 'Vault',
                    position: 'top',
                    fill: '#a1a1aa',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                  } : undefined}
                />
              )}

              <Line
                type="monotone"
                dataKey="positions"
                stroke={POSITIONS_COLOR}
                strokeWidth={1}
                strokeOpacity={0.7}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="accounts"
                stroke={ACCOUNTS_COLOR}
                strokeWidth={1}
                strokeOpacity={0.7}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />

              <Area
                type="monotone"
                dataKey="total"
                stroke={totalColor}
                strokeWidth={1.5}
                fill="url(#totalGrad)"
                dot={false}
                activeDot={{ r: 2.5, fill: totalColor, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />

              {entryDay != null && entryValue != null && showSeparator && (
                <ReferenceDot
                  x={entryDay}
                  y={entryValue}
                  r={3}
                  fill={totalColor}
                  stroke="#09090b"
                  strokeWidth={1.5}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

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
