'use client'

import dynamic from 'next/dynamic'
import type { OrbitCategory } from './OrbitChart3D'

const OrbitChart3D = dynamic(
  () => import('./OrbitChart3D').then(m => m.OrbitChart3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] md:h-[620px] flex items-center justify-center">
        <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted-foreground animate-pulse">
          Caricamento orbita…
        </p>
      </div>
    ),
  }
)

export function OrbitChart3DClient({ categories, total }: { categories: OrbitCategory[]; total: number }) {
  return <OrbitChart3D categories={categories} total={total} />
}
