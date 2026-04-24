import type { AccountType } from '@/types'

// Palette editorial bright — Tailwind 400 scale. 16 hue con salto ~22° per contrasto tra slice adiacenti.
// File lib puro (no 'use client') così può essere importato sia da Server che Client Components
// senza che Next.js lo tratti come client reference opaca.
export const RAINBOW: string[] = [
  '#bef264', // lime-300 (signature primary)
  '#38bdf8', // sky-400
  '#fbbf24', // amber-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#4ade80', // green-400
  '#fb923c', // orange-400
  '#60a5fa', // blue-400
  '#f87171', // red-400
  '#2dd4bf', // teal-400
  '#e879f9', // fuchsia-400
  '#facc15', // yellow-400
  '#22d3ee', // cyan-400
  '#c084fc', // purple-400
  '#fb7185', // rose-400
  '#a3e635', // lime-400
]

export const TYPE_COLORS: Record<AccountType, string> = {
  investment: '#bef264',
  cash:       '#38bdf8',
  pension:    '#a78bfa',
  crypto:     '#fb923c',
  other:      '#a1a1aa',
}
