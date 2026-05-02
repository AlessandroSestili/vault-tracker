'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'

export function LiabilitiesFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="fixed z-40 md:hidden flex justify-center left-0 right-0"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom) + 10px)' }}
      >
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full px-[18px] py-[11px] text-[13px] font-medium tracking-[-0.1px] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)]"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2} />
          Aggiungi
        </button>
      </div>
      <AddLiabilityDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
