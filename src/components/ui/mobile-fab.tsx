'use client'

import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import type { AccountWithLatestSnapshot } from '@/types'

export function MobileFab({ accounts }: { accounts?: AccountWithLatestSnapshot[] }) {
  return (
    <div
      className="fixed z-40 md:hidden flex justify-center left-0 right-0"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 10px)' }}
    >
      <AddItemSheet variant="fab" accounts={accounts} />
    </div>
  )
}
