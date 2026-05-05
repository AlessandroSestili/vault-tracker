'use client'

import { AddItemSheet } from '@/components/accounts/AddItemSheet'
import type { AccountWithLatestSnapshot } from '@/types'
import type { PlanLimits } from '@/lib/plans'

export function MobileFab({ accounts, planLimits }: { accounts?: AccountWithLatestSnapshot[]; planLimits?: PlanLimits }) {
  return (
    <div
      className="fixed z-40 md:hidden flex justify-center left-0 right-0"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)' }}
    >
      <AddItemSheet variant="fab" accounts={accounts} planLimits={planLimits} />
    </div>
  )
}
