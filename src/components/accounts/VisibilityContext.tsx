'use client'

import { createContext, useContext, useState } from 'react'

type Ctx = {
  showAccounts: boolean
  showPositions: boolean
  setShowAccounts: (v: boolean) => void
  setShowPositions: (v: boolean) => void
}

const VisibilityCtx = createContext<Ctx>({
  showAccounts: true,
  showPositions: true,
  setShowAccounts: () => {},
  setShowPositions: () => {},
})

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [showAccounts, setShowAccounts] = useState(true)
  const [showPositions, setShowPositions] = useState(true)
  return (
    <VisibilityCtx.Provider value={{ showAccounts, showPositions, setShowAccounts, setShowPositions }}>
      {children}
    </VisibilityCtx.Provider>
  )
}

export const useVisibility = () => useContext(VisibilityCtx)
