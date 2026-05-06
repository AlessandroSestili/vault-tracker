'use client'

import { useState } from 'react'
import { DetailChart } from './DetailChart'
import { formatCurrency } from '@/lib/formats'

type Period = '1D' | '1S' | '1M' | '1A' | 'Max'
type DailyPoint = { date: string; value: number }
type SubdayPoint = { ts: string; value: number }

const PERIOD_LABEL: Record<Period, string> = {
  '1D': 'oggi',
  '1S': 'ultimi 7g',
  '1M': 'ultimo mese',
  '1A': 'ultimo anno',
  'Max': 'storico',
}

export function PositionValuePanel({
  currentValue,
  periodDeltas,
  hasSubdayData,
  vaultData,
  yahooData,
  vaultStart,
  yahooIntraday,
  yahooSubday,
  previousClose,
}: {
  currentValue: number
  periodDeltas: Record<Period, number | null>
  hasSubdayData: boolean
  vaultData: DailyPoint[]
  yahooData?: DailyPoint[]
  vaultStart?: string | null
  yahooIntraday?: SubdayPoint[]
  yahooSubday?: SubdayPoint[]
  previousClose?: number | null
}) {
  const [period, setPeriod] = useState<Period>(hasSubdayData ? '1D' : '1A')
  const delta = periodDeltas[period]

  const hasChart = vaultData.length >= 2 || (yahooData && yahooData.length >= 2)

  return (
    <>
      <div>
        <p className="font-mono text-[36px] font-medium tabular-nums tracking-[-1.5px] text-foreground leading-none">
          {formatCurrency(currentValue)}
        </p>
        {delta != null && (
          <p className={`font-mono text-[13px] mt-1.5 tabular-nums ${delta >= 0 ? 'text-[var(--primary)]' : 'text-destructive'}`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% {PERIOD_LABEL[period]}
          </p>
        )}
      </div>

      {hasChart && (
        <div className="rounded-2xl glass-card border p-4">
          <DetailChart
            data={vaultData}
            yahoo={yahooData}
            vaultStart={vaultStart}
            yahooIntraday={yahooIntraday}
            yahooSubday={yahooSubday}
            previousClose={previousClose}
            period={period}
            onPeriodChange={setPeriod}
          />
        </div>
      )}
    </>
  )
}
