'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import type { PlanLimits } from '@/lib/plan-config'
import type { AccountWithLatestSnapshot } from '@/types'
import { isAtLimit } from '@/lib/plan-config'

export function LiabilitiesFab({ planLimits, accounts = [] }: { planLimits?: PlanLimits; accounts?: AccountWithLatestSnapshot[] }) {
  const [open, setOpen] = useState(false)
  const [upgrade, setUpgrade] = useState(false)

  function handleClick() {
    if (planLimits && isAtLimit(planLimits.plan, 'liabilities', planLimits.counts.liabilities)) {
      setUpgrade(true)
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <div
        className="fixed z-40 md:hidden flex justify-center left-0 right-0"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}
      >
        <button
          onClick={handleClick}
          className="flex items-center gap-1.5 rounded-full px-[18px] py-[11px] text-[13px] font-medium tracking-[-0.1px]"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            color: 'oklch(0.82 0.18 130)',
          }}
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2} />
          Aggiungi
        </button>
      </div>
      <AddLiabilityDialog open={open} onOpenChange={setOpen} accounts={accounts} />
      <UpgradeModal open={upgrade} onOpenChange={setUpgrade} resource="liabilities" />
    </>
  )
}
