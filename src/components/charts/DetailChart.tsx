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
type SubdayPoint = { ts: string; value: number }
type Period = '1D' | '1S' | '1M' | '1A' | 'Max'

const ALL_PERIODS: Period[] = ['1D', '1S', '1M', '1A', 'Max']
const DAILY_PERIODS: Period[] = ['1A', 'Max']

const PERIOD_LABEL: Record<Period, string> = {
  '1D': 'oggi',
  '1S': 'ultimi 7g',
  '1M': 'ultimo mese',
  '1A': 'ultimo anno',
  'Max': 'storico',
}

const YAHOO_COLOR = 'oklch(0.72 0.08 230)'
const RED = '#ef4444'
const LOCALE = 'it-IT'

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

function filterByPeriod<T extends { date: string }>(data: T[], days: number): T[] {
  if (days === Infinity) return data
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter((d) => d.date >= cutoffStr)
}

function downsampleTo4h(points: SubdayPoint[]): SubdayPoint[] {
  const buckets = new Map<string, SubdayPoint>()
  for (const p of points) {
    const d = new Date(p.ts)
    const h4 = Math.floor(d.getUTCHours() / 4) * 4
    const key = `${d.toISOString().slice(0, 10)}-${h4}`
    buckets.set(key, p)
  }
  return [...buckets.values()].sort((a, b) => a.ts.localeCompare(b.ts))
}

function downsampleToWeekly(points: MergedPoint[]): MergedPoint[] {
  const buckets = new Map<string, MergedPoint>()
  for (const p of points) {
    const d = new Date(p.date + 'T00:00:00Z')
    const weekStart = new Date(d)
    weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay())
    buckets.set(weekStart.toISOString().slice(0, 10), p)
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function formatSubdayTs(ts: string, period: '1D' | '1S' | '1M'): string {
  const d = new Date(ts)
  if (period === '1D') {
    return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(d)
  }
  if (period === '1S') {
    return new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
  }
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
}

export function DetailChart({
  data,
  color = 'var(--primary)',
  yahoo,
  vaultStart,
  yahooIntraday,
  yahooSubday,
  previousClose,
}: {
  data: Point[]
  color?: string
  yahoo?: Point[]
  vaultStart?: string | null
  yahooIntraday?: SubdayPoint[]
  yahooSubday?: SubdayPoint[]
  previousClose?: number | null
}) {
  const overlay = !!yahoo && yahoo.length > 0
  const hasSubdayData = !!(yahooIntraday?.length || yahooSubday?.length)
  const [period, setPeriod] = useState<Period>(hasSubdayData ? '1D' : '1A')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isSubday = period === '1D' || period === '1S' || period === '1M'

  const subdayPoints = useMemo((): SubdayPoint[] => {
    if (!isSubday) return []
    if (period === '1D') return yahooIntraday ?? []
    if (!yahooSubday || yahooSubday.length === 0) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (period === '1S' ? 7 : 30))
    const filtered = yahooSubday.filter((p) => new Date(p.ts) >= cutoff)
    return period === '1M' ? downsampleTo4h(filtered) : filtered
  }, [period, isSubday, yahooIntraday, yahooSubday])

  const merged = useMemo(
    () =>
      overlay
        ? mergeSeries(data, yahoo!)
        : data.map((p) => ({ date: p.date, yahoo: null, vault: p.value } as MergedPoint)),
    [data, yahoo, overlay]
  )

  const filtered = useMemo(() => {
    if (isSubday) return []
    const base = filterByPeriod(merged, period === '1A' ? 365 : Infinity)
    return period === 'Max' ? downsampleToWeekly(base) : base
  }, [merged, period, isSubday])

  if (data.length < 2 && !overlay) {
    return (
      <div className="flex items-center justify-center h-[160px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
        Dati insufficienti
      </div>
    )
  }

  const availablePeriods = hasSubdayData ? ALL_PERIODS : DAILY_PERIODS

  if (isSubday && subdayPoints.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center h-[140px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
          {period === '1D' ? 'Nessun dato per oggi' : 'Nessun dato per questo periodo'}
        </div>
        {overlay && <PeriodSelector period={period} onChange={setPeriod} available={availablePeriods} />}
      </div>
    )
  }

  if (!isSubday && filtered.length < 2) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center h-[140px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
          Nessun dato per questo periodo
        </div>
        {overlay && <PeriodSelector period={period} onChange={setPeriod} available={availablePeriods} />}
      </div>
    )
  }

  // ── Sub-daily delta ───────────────────────────────────────────────────────
  const subdayFirst =
    isSubday && period === '1D' && previousClose != null
      ? previousClose
      : (subdayPoints[0]?.value ?? 0)
  const subdayLast = subdayPoints[subdayPoints.length - 1]?.value ?? 0
  const subdayDelta = subdayLast - subdayFirst
  const subdayDeltaPct = subdayFirst !== 0 ? (subdayDelta / subdayFirst) * 100 : 0
  const subdayPositive = subdayDelta >= 0

  // ── Daily delta ───────────────────────────────────────────────────────────
  const vaultPoints = filtered.filter((d) => d.vault != null) as Array<MergedPoint & { vault: number }>
  const yahooPoints = filtered.filter((d) => d.yahoo != null) as Array<MergedPoint & { yahoo: number }>
  const ath =
    !isSubday
      ? vaultPoints.length > 0
        ? Math.max(...vaultPoints.map((d) => d.vault))
        : yahooPoints.length > 0
          ? Math.max(...yahooPoints.map((d) => d.yahoo))
          : null
      : null

  const firstHasVault = !isSubday && filtered[0]?.vault != null
  const useVault = firstHasVault && vaultPoints.length > 1
  const dailySeries = useVault ? vaultPoints.map((d) => d.vault) : yahooPoints.map((d) => d.yahoo)
  const dailyFirst = dailySeries[0] ?? 0
  const dailyLast = dailySeries[dailySeries.length - 1] ?? 0
  const dailyDelta = dailyLast - dailyFirst
  const dailyDeltaPct = dailyFirst !== 0 ? (dailyDelta / dailyFirst) * 100 : 0
  const dailyPositive = dailyDelta >= 0

  const positive = isSubday ? subdayPositive : dailyPositive
  const delta = isSubday ? subdayDelta : dailyDelta
  const deltaPct = isSubday ? subdayDeltaPct : dailyDeltaPct
  const deltaColor = positive ? color : RED

  const showDelta = overlay && (isSubday ? subdayPoints.length > 1 : dailySeries.length > 1)

  const showSeparator =
    !isSubday &&
    overlay &&
    vaultStart != null &&
    filtered.some((d) => d.date >= vaultStart) &&
    filtered.some((d) => d.date < vaultStart)

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
          <span className="font-mono text-[10.5px] text-muted-foreground tracking-[0.3px]">
            · {PERIOD_LABEL[period]}{!isSubday && !useVault ? ' · Yahoo' : ''}
          </span>
        </div>
      )}

      {isSubday ? (
        <div className="h-[180px] md:h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={subdayPoints} margin={{ top: 10, right: 4, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="detailSubdayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="ts"
                hide={!isDesktop}
                tick={isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
                tickFormatter={(ts) => formatSubdayTs(ts, period as '1D' | '1S' | '1M')}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                hide={!isDesktop}
                tick={isDesktop ? { fontSize: 11, fill: '#52525b', fontFamily: 'JetBrains Mono, monospace' } : false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
                width={isDesktop ? 36 : 0}
                domain={['auto', 'auto']}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as SubdayPoint
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                      <p className="font-mono text-[10px] text-muted-foreground mb-1">
                        {formatSubdayTs(d.ts, period as '1D' | '1S' | '1M')}
                      </p>
                      <p className="font-mono text-[13px] font-medium tabular-nums" style={{ color }}>
                        {formatCurrency(d.value)}
                      </p>
                    </div>
                  )
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }}
              />

              {period === '1D' && previousClose != null && (
                <ReferenceLine
                  y={previousClose}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="3 3"
                  label={isDesktop ? {
                    value: 'chius.',
                    position: 'insideTopRight',
                    fill: '#71717a',
                    fontSize: 9,
                    fontFamily: 'JetBrains Mono, monospace',
                  } : undefined}
                />
              )}

              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                fill="url(#detailSubdayGrad)"
                dot={false}
                activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
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
                tickFormatter={(d) => formatChartDate(d, period === '1A')}
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
                        {overlay ? formatChartDate(d.date, period === '1A') : d.date}
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
      )}

      {overlay && <PeriodSelector period={period} onChange={setPeriod} available={availablePeriods} />}
    </div>
  )
}

function PeriodSelector({
  period,
  onChange,
  available,
}: {
  period: Period
  onChange: (p: Period) => void
  available: Period[]
}) {
  return (
    <div className="flex justify-center">
      <div
        className="flex gap-0.5 items-center p-0.5 rounded-full border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {available.map((p) => {
          const active = period === p
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className="rounded-full font-mono text-[11px] tracking-[0.4px] transition-all"
              style={{
                padding: '6px 12px',
                background: active ? 'var(--foreground)' : 'transparent',
                color: active ? 'var(--background)' : 'var(--secondary-foreground)',
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
