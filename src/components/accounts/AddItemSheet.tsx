'use client'

import { useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AddAccountDialog } from './AddAccountDialog'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { AddRecurringIncomeDialog } from '@/components/recurring/RecurringIncomeDialog'
import type { AccountWithLatestSnapshot } from '@/types'

type AddKind = 'account' | 'position' | 'recurring' | null

const BASE_OPTIONS = [
  {
    kind: 'account' as const,
    label: 'Conto',
    sub: 'Corrente, pensione, crypto wallet',
  },
  {
    kind: 'position' as const,
    label: 'Posizione',
    sub: 'ETF, azione o asset manuale',
  },
]

const RECURRING_OPTION = {
  kind: 'recurring' as const,
  label: 'Entrata ricorrente',
  sub: 'Stipendio, affitto, abbonamento',
}

function SheetOption({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
    >
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border border-border bg-muted/40">
        <Plus className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-medium text-foreground tracking-[-0.1px]">{label}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
    </button>
  )
}

export function AddItemSheet({
  variant = 'icon',
  accounts,
}: {
  variant?: 'icon' | 'fab' | 'lime-cta'
  accounts?: AccountWithLatestSnapshot[]
}) {
  const [sheet, setSheet] = useState(false)
  const [adding, setAdding] = useState<AddKind>(null)

  const options = accounts ? [...BASE_OPTIONS, RECURRING_OPTION] : BASE_OPTIONS

  function choose(kind: AddKind) {
    setSheet(false)
    setTimeout(() => setAdding(kind), 200)
  }

  return (
    <>
      {variant === 'fab' ? (
        <button
          onClick={() => setSheet(true)}
          className="flex items-center gap-1.5 rounded-full px-[18px] py-[11px] text-[13px] font-medium tracking-[-0.1px] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)]"
          style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2} />
          Aggiungi
        </button>
      ) : variant === 'lime-cta' ? (
        <button
          onClick={() => setSheet(true)}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium tracking-[-0.1px] transition-opacity hover:opacity-90"
          style={{ background: '#bef264', color: '#09090b' }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Aggiungi il primo asset
        </button>
      ) : (
        <button
          onClick={() => setSheet(true)}
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Aggiungi"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent showCloseButton={false} className="p-0 bg-popover border-border">
          <DialogTitle className="sr-only">Aggiungi elemento</DialogTitle>
          {/* Sheet header */}
          <div className="px-6 pt-2 pb-3.5">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-1">Nuovo</p>
            <p className="text-[20px] font-medium text-foreground tracking-[-0.4px]">Aggiungi al patrimonio</p>
          </div>
          <div className="pb-3">
            {options.map(({ kind, label, sub }) => (
              <SheetOption key={kind} label={label} sub={sub} onClick={() => choose(kind)} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AddAccountDialog  open={adding === 'account'}   onOpenChange={(o) => !o && setAdding(null)} />
      <AddPositionDialog open={adding === 'position'}  onOpenChange={(o) => !o && setAdding(null)} />
      {accounts && (
        <AddRecurringIncomeDialog accounts={accounts} open={adding === 'recurring'} onOpenChange={(o) => !o && setAdding(null)} />
      )}
    </>
  )
}
