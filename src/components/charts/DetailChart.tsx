'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { formatCurrency, formatChartDate } from '@/lib/formats'

type Point = { date: string; value: number }
type MergedPoint = { date: string; yahoo: number | null; vault: number | null }
type Period = '1S' | '1M' | '3M' | '1A' | 'Tutto'

const PERIODS: Period[] = ['1S', '1M', '3M', '1A', 'Tutto']
const PERIOD_DAYS: Record<Period, number> = {
  '1S': 7, '1M': 30, '3M': 90, '1A': 365, 'Tutto': Infinity,
}
const PERIOD_LABEL: Record<Period, string> = {
  '1S': 'ultimi 7g', '1M': 'ultimo mese', '3M': 'ultimi 3 mesi', '1A': 'ultimo anno', 'Tutto': 'storico',
}

const YAHOO_COLOR = 'oklch(0.72 0.08 230)'
const RED = '#ef4444'

function mergeSeries(vault: Point[], yahoo: Point[]): MergedPoint[] {
  const byDate = new Map<string, MergedPoint>()
  for (const p of yahoo) byDate.set(p.date, { date: p.date, yahoo: p.value, vault: null })
  for (const p of vault) {
    const existing = byDate.get(p.date)
    if (existing) existing.vault = p.value
    else byDate.set(p.date, { date: p.date, yahoo: null, vault: p.value })
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function filterByPeriod<T extends { date: string }>(data: T[], period: Period): T[] {
  if (period === 'Tutto') return data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period])
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter((d) => d.date >= cutoffStr)
}

export function DetailChart({
  data,
  color = 'var(--primary)',
  yahoo,
  vaultStart,
}: {
  data: Point[]
  color?: string
  yahoo?: Point[]
  vaultStart?: string | null
}) {
  const overlay = !!yahoo && yahoo.length > 0
  const [period, setPeriod] = useState<Period>(overlay ? '1A' : 'Tutto')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const merged = useMemo(
    () => (overlay ? mergeSeries(data, yahoo!) : data.map((p) => ({ date: p.date, yahoo: null, vault: p.value } as MergedPoint))),
    [data, yahoo, overlay]
  )

  const filtered = useMemo(() => filterByPeriod(merged, period), [merged, period])

  if (data.length < 2 && !overlay) {
    return (
      <div className="flex items-center justify-center h-[160px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
        Dati insufficienti
      </div>
    )
  }

  if (filtered.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center h-[140px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
          Nessun dato per questo periodo
        </div>
        {overlay && <PeriodSelector period={period} onChange={setPeriod} />}
      </div>
    )
  }

  const vaultPoints = filtered.filter((d) => d.vault != null) as Array<MergedPoint & { vault: number }>
  const yahooPoints = filtered.filter((d) => d.yahoo != null) as Array<MergedPoint & { yahoo: number }>
  const ath = vaultPoints.length > 0
    ? Math.max(...vaultPoints.map((d) => d.vault))
    : yahooPoints.length > 0 ? Math.max(...yahooPoints.map((d) => d.yahoo)) : null

  const showSeparator =
    overlay &&
    vaultStart != null &&
    filtered.some((d) => d.date >= vaultStart) &&
    filtered.some((d) => d.date < vaultStart)

  const deltaSeries = vaultPoints.length > 1 ? vaultPoints.map((d) => d.vault) : yahooPoints.map((d) => d.yahoo)
  const deltaFirst = deltaSeries[0] ?? 0
  const deltaLast = deltaSeries[deltaSeries.length - 1] ?? 0
  const delta = deltaLast - deltaFirst
  const deltaPct = deltaFirst !== 0 ? (delta / deltaFirst) * 100 : 0
  const positive = delta >= 0
  const deltaColor = positive ? color : RED
  const showDelta = overlay && deltaSeries.length > 1

  return (
    <div className="flex flex-col gap-4">
      {showDelta && (
        <div className="flex items-center gap-2 px-1">
          <svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
            {positive
              ? <path d="M1 7l4-4 4 4" stroke={deltaColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M1 3l4 4 4-4" stroke={deltaColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
          <span className="font-mono text-[12.5px] tabular-nums tracking-[-0.2px]" style={{ color: deltaColor }}>
            {positive ? '+' : '−'}{formatCurrency(Math.abs(delta))} · {positive ? '+' : '−'}{Math.abs(deltaPct).toFixed(2)}%
          </span>
          <span className="font-mono text-[10.5px] text-[#71717a] tracking-[0.3px]">
            · {PERIOD_LABEL[period]}{vaultPoints.length < 2 ? ' · Yahoo' : ''}
          </span>
        </div>
      )}
      <div className={overlay ? 'h-[180px] md:h-[220px] w-full' : 'h-[160px] w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filtered}
            margin={overlay ? { top: 10, right: 4, bottom: 4, left: 0 } : { top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="detailVaultGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="date"
              hide={!overlay || !isDesktop}
              tick={overlay && isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
              tickFormatter={(d) => formatChartDate(d, period === '1S' || period === '1M')}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              hide={!overlay || !isDesktop}
              tick={overlay && isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              width={overlay && isDesktop ? 36 : 0}
              domain={['auto', 'auto']}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as MergedPoint
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="font-mono text-[10px] text-muted-foreground mb-1">
                      {overlay ? formatChartDate(d.date, period === '1S' || period === '1M') : d.date}
                    </p>
                    {d.vault != null && (
                      <p className="font-mono text-[13px] font-medium tabular-nums" style={{ color }}>
                        {formatCurrency(d.vault)}
                      </p>
                    )}
                    {overlay && d.yahoo != null && (
                      <p className="font-mono text-[11px] tabular-nums mt-0.5" style={{ color: YAHOO_COLOR }}>
                        Yahoo {formatCurrency(d.yahoo)}
                      </p>
                    )}
                  </div>
                )
              }}
              cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
            />

            {overlay && ath != null && (
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

            {overlay && (
              <Line
                type="monotone"
                dataKey="yahoo"
                stroke={YAHOO_COLOR}
                strokeWidth={1}
                strokeOpacity={0.55}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            <Area
              type="monotone"
              dataKey="vault"
              stroke={color}
              strokeWidth={1.5}
              fill="url(#detailVaultGrad)"
              dot={false}
              activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {overlay && <PeriodSelector period={period} onChange={setPeriod} />}
    </div>
  )
}

function PeriodSelector({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex justify-center">
      <div
        className="flex gap-0.5 items-center p-0.5 rounded-full border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {PERIODS.map((p) => {
          const active = period === p
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
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
  )
}
