'use client'

import { createContext, useContext, useState } from 'react'

type Ctx = {
  showAccounts: boolean
  showPositions: boolean
  showLiabilities: boolean
  setShowAccounts: (v: boolean) => void
  setShowPositions: (v: boolean) => void
  setShowLiabilities: (v: boolean) => void
}

const VisibilityCtx = createContext<Ctx>({
  showAccounts: true,
  showPositions: true,
  showLiabilities: true,
  setShowAccounts: () => {},
  setShowPositions: () => {},
  setShowLiabilities: () => {},
})

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [showAccounts, setShowAccounts] = useState(true)
  const [showPositions, setShowPositions] = useState(true)
  const [showLiabilities, setShowLiabilities] = useState(false)
  return (
    <VisibilityCtx.Provider value={{ showAccounts, showPositions, showLiabilities, setShowAccounts, setShowPositions, setShowLiabilities }}>
      {children}
    </VisibilityCtx.Provider>
  )
}

export const useVisibility = () => useContext(VisibilityCtx)
