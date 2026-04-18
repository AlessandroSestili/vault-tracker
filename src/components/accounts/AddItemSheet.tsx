'use client'

import { useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AddAccountDialog } from './AddAccountDialog'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'

type AddKind = 'account' | 'position' | 'liability' | null

const OPTIONS = [
  {
    kind: 'account' as const,
    icon: '⬜',
    label: 'Conto',
    sub: 'Corrente, pensione, crypto wallet',
    iconBg: 'rgba(255,255,255,0.04)',
  },
  {
    kind: 'position' as const,
    icon: '📈',
    label: 'Posizione',
    sub: 'ETF, azione o asset manuale',
    iconBg: 'rgba(255,255,255,0.04)',
  },
  {
    kind: 'liability' as const,
    icon: '⬡',
    label: 'Debito · Credito',
    sub: 'Mutuo, prestito, credito a scadenza',
    iconBg: 'rgba(255,255,255,0.04)',
  },
]

function SheetOption({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <Plus className="w-4 h-4 text-[#a1a1aa]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-medium text-[#fafafa] tracking-[-0.1px]">{label}</p>
        <p className="text-[12px] text-[#71717a] mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-[#52525b] shrink-0" strokeWidth={1.5} />
    </button>
  )
}

export function AddItemSheet({ variant = 'icon' }: { variant?: 'icon' | 'fab' }) {
  const [sheet, setSheet] = useState(false)
  const [adding, setAdding] = useState<AddKind>(null)

  function choose(kind: 'account' | 'position' | 'liability') {
    setSheet(false)
    setTimeout(() => setAdding(kind), 200)
  }

  return (
    <>
      {variant === 'fab' ? (
        <button
          onClick={() => setSheet(true)}
          className="flex items-center gap-1.5 rounded-full px-[18px] py-[11px] text-[13px] font-medium tracking-[-0.1px] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)]"
          style={{ background: '#fafafa', color: '#09090b' }}
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2} />
          Aggiungi
        </button>
      ) : (
        <button
          onClick={() => setSheet(true)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#71717a] hover:text-[#fafafa] transition-colors"
          aria-label="Aggiungi"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent showCloseButton={false} className="p-0 bg-[#0f0f11] border-white/[0.1]">
          <DialogTitle className="sr-only">Aggiungi elemento</DialogTitle>
          {/* Sheet header */}
          <div className="px-6 pt-2 pb-3.5">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-[#71717a] mb-1">Nuovo</p>
            <p className="text-[20px] font-medium text-[#fafafa] tracking-[-0.4px]">Aggiungi al patrimonio</p>
          </div>
          <div className="pb-3">
            {OPTIONS.map(({ kind, label, sub }) => (
              <SheetOption key={kind} label={label} sub={sub} onClick={() => choose(kind)} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AddAccountDialog  open={adding === 'account'}   onOpenChange={(o) => !o && setAdding(null)} />
      <AddPositionDialog open={adding === 'position'}  onOpenChange={(o) => !o && setAdding(null)} />
      <AddLiabilityDialog open={adding === 'liability'} onOpenChange={(o) => !o && setAdding(null)} />
    </>
  )
}
