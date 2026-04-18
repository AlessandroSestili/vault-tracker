'use client'

import { AddItemSheet } from '@/components/accounts/AddItemSheet'

export function MobileFab() {
  return (
    <div
      className="fixed z-40 md:hidden flex justify-center left-0 right-0"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 10px)' }}
    >
      <AddItemSheet variant="fab" />
    </div>
  )
}
