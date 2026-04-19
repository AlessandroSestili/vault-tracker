'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/formats'

type Point = { date: string; value: number }

export function DetailChart({ data, color = 'var(--primary)' }: { data: Point[]; color?: string }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[160px] text-muted-foreground font-mono text-[11px] tracking-[0.5px]">
        Dati insufficienti
      </div>
    )
  }

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                  <p className="font-mono text-[10px] text-muted-foreground mb-0.5">{payload[0].payload.date}</p>
                  <p className="font-mono text-[13px] font-medium text-foreground tabular-nums">
                    {formatCurrency(payload[0].value as number)}
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#dg)"
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
