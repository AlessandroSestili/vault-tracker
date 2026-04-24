'use client'

import dynamic from 'next/dynamic'
import type { OrbitRing } from './OrbitChart3D'

const OrbitChart3D = dynamic(
  () => import('./OrbitChart3D').then(m => m.OrbitChart3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] md:h-[640px] flex items-center justify-center">
        <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted-foreground animate-pulse">
          Caricamento orbita…
        </p>
      </div>
    ),
  }
)

export function OrbitChart3DClient({ rings, total }: { rings: OrbitRing[]; total: number }) {
  return <OrbitChart3D rings={rings} total={total} />
}
