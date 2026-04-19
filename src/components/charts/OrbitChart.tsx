'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/formats'
import type { Slice } from './AllocationChart'

const INCLINE = 0.28
const PLANET_R = 46
const BASE_ORBIT = 52
const ORBIT_GAP = 26
const SPEEDS = [0.36, 0.27, 0.20, 0.15, 0.11]

const W = 310
const H = 280
const CX = W / 2
const CY = H / 2

export function OrbitChart({ slices, total }: { slices: Slice[]; total: number }) {
  const [angles, setAngles] = useState<number[]>(
    () => slices.map((_, i) => (i / slices.length) * Math.PI * 2)
  )

  useEffect(() => {
    let raf: number
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = (now - prev) / 1000
      prev = now
      setAngles(a => a.map((ang, i) => ang + SPEEDS[i % SPEEDS.length] * dt))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const maxPct = Math.max(...slices.map(s => s.pct), 1)

  if (slices.length === 0) return null

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative" style={{ width: W, height: H, overflow: 'visible' }}>
        {/* Ambient glow behind planet */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 240, height: 240,
            left: CX - 120, top: CY - 120,
            background: 'radial-gradient(circle, oklch(0.82 0.18 130 / 0.07) 0%, transparent 68%)',
            borderRadius: '50%',
          }}
        />

        {/* Orbital rings */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={W} height={H}
          overflow="visible"
        >
          {slices.map((s, i) => {
            const rx = BASE_ORBIT + i * ORBIT_GAP
            const ry = rx * INCLINE
            return (
              <ellipse
                key={s.type}
                cx={CX} cy={CY}
                rx={rx} ry={ry}
                fill="none"
                stroke={s.color}
                strokeWidth={0.75}
                opacity={0.22}
              />
            )
          })}
        </svg>

        {/* Back satellites (behind planet) */}
        {slices.map((s, i) => {
          const ang = angles[i] ?? 0
          const sinAng = Math.sin(ang)
          if (sinAng >= 0) return null
          const rx = BASE_ORBIT + i * ORBIT_GAP
          const ry = rx * INCLINE
          const x = CX + Math.cos(ang) * rx
          const y = CY + sinAng * ry
          const sz = 10 + (s.pct / maxPct) * 14
          return (
            <div
              key={`${s.type}-b`}
              className="absolute rounded-full"
              style={{
                width: sz, height: sz,
                left: x - sz / 2, top: y - sz / 2,
                backgroundColor: s.color,
                opacity: 0.28,
              }}
            />
          )
        })}

        {/* Planet */}
        <div
          className="absolute rounded-full flex flex-col items-center justify-center"
          style={{
            width: PLANET_R * 2,
            height: PLANET_R * 2,
            left: CX - PLANET_R,
            top: CY - PLANET_R,
            background: 'radial-gradient(circle at 36% 30%, oklch(0.96 0.22 132), oklch(0.78 0.20 130), oklch(0.48 0.16 130), oklch(0.22 0.08 130))',
            boxShadow: '0 0 28px 6px oklch(0.82 0.18 130 / 0.30), 0 0 60px 18px oklch(0.82 0.18 130 / 0.10)',
            zIndex: 10,
          }}
        >
          <p
            className="font-mono text-[8px] uppercase tracking-[1.2px] leading-none mb-[3px]"
            style={{ color: 'rgba(0,0,0,0.5)' }}
          >
            totale
          </p>
          <p
            className="font-semibold text-[13px] leading-none tabular-nums"
            style={{ color: 'rgba(0,0,0,0.75)' }}
          >
            {formatCurrency(total)}
          </p>
        </div>

        {/* Front satellites (in front of planet) */}
        {slices.map((s, i) => {
          const ang = angles[i] ?? 0
          const sinAng = Math.sin(ang)
          if (sinAng < 0) return null
          const rx = BASE_ORBIT + i * ORBIT_GAP
          const ry = rx * INCLINE
          const x = CX + Math.cos(ang) * rx
          const y = CY + sinAng * ry
          const sz = 10 + (s.pct / maxPct) * 14
          return (
            <div
              key={`${s.type}-f`}
              className="absolute rounded-full"
              style={{
                width: sz, height: sz,
                left: x - sz / 2, top: y - sz / 2,
                backgroundColor: s.color,
                boxShadow: `0 0 8px 2px ${s.color}88`,
                zIndex: 20,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="w-full max-w-[310px] border-t border-white/[0.08]">
        {slices.map(s => (
          <div key={s.type} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[13.5px] font-medium text-[#fafafa] tracking-[-0.1px]">{s.label}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-[13px] tabular-nums text-[#fafafa]">{formatCurrency(s.value)}</span>
              <span className="font-mono text-[11px] text-[#71717a] ml-2">{s.pct.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
