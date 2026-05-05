'use client'

import { createContext, useContext, useState } from 'react'

export type Period = '1D' | '1S' | '1M' | '1A' | 'Max'

type PeriodContextValue = {
  period: Period
  setPeriod: (p: Period) => void
}

const PeriodContext = createContext<PeriodContextValue>({ period: '1D', setPeriod: () => {} })

export function PeriodProvider({ children, initial = '1D' }: { children: React.ReactNode; initial?: Period }) {
  const [period, setPeriod] = useState<Period>(initial)
  return <PeriodContext.Provider value={{ period, setPeriod }}>{children}</PeriodContext.Provider>
}

export const usePeriod = () => useContext(PeriodContext)
