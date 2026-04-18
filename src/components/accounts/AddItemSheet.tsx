'use client'

import { useState } from 'react'
import { Plus, Wallet, TrendingUp, ArrowDownLeft } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AddAccountDialog } from './AddAccountDialog'
import { AddPositionDialog } from '@/components/positions/AddPositionDialog'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'

type AddKind = 'account' | 'position' | 'liability' | null

const OPTIONS = [
  { kind: 'account' as const,   icon: <Wallet className="w-4 h-4" />,         label: 'Aggiungi conto' },
  { kind: 'position' as const,  icon: <TrendingUp className="w-4 h-4" />,      label: 'Aggiungi posizione' },
  { kind: 'liability' as const, icon: <ArrowDownLeft className="w-4 h-4" />,   label: 'Aggiungi debito / credito' },
]

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
          className="flex items-center gap-2 bg-white text-black rounded-full px-7 py-3.5 text-sm font-semibold shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          Aggiungi
        </button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
          onClick={() => setSheet(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent showCloseButton={false} className="bg-card border-border">
          <DialogTitle className="sr-only">Aggiungi elemento</DialogTitle>
          <div className="-mx-1 -mb-1 space-y-0.5">
            {OPTIONS.map(({ kind, icon, label }) => (
              <button
                key={kind}
                onClick={() => choose(kind)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-medium text-foreground hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors active:scale-[0.98]"
              >
                <span className="text-muted-foreground">{icon}</span>
                {label}
              </button>
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
