'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { FREE_LIMITS, type ResourceType } from '@/lib/plan-config'

type BillingInterval = 'monthly' | 'annual'

const RESOURCE_LABEL: Record<ResourceType, string> = {
  accounts: 'account',
  positions: 'posizioni',
  liabilities: 'passività',
}

const FEATURES = [
  'Account illimitati',
  'Posizioni illimitate',
  'Passività illimitate',
]

export function UpgradeModal({
  open,
  onOpenChange,
  resource,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  resource: ResourceType
}) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 bg-popover border-border max-w-[380px]">
        <DialogTitle className="sr-only">Passa a Pro</DialogTitle>

        <div className="px-6 pt-6 pb-5">
          {/* Header */}
          <p className="font-mono text-[9px] tracking-[2px] uppercase text-muted-foreground mb-1">Piano free</p>
          <h2 className="text-[20px] font-medium text-foreground tracking-[-0.4px] mb-1.5">
            Limite raggiunto
          </h2>
          <p className="text-[13px] text-muted-foreground leading-[1.5]">
            Il piano free include max {FREE_LIMITS[resource]} {RESOURCE_LABEL[resource]}.
            Passa a Pro per continuare senza limiti.
          </p>

          {/* Features */}
          <div className="mt-5 mb-5 space-y-2">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#a3e635' }} />
                <span className="text-[13px] text-foreground">{f}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/[0.06] mb-5" />

          {/* Interval toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInterval('monthly')}
              className={`flex-1 py-3 rounded-xl border text-center transition-colors ${
                interval === 'monthly'
                  ? 'border-white/[0.2] bg-white/[0.06]'
                  : 'border-white/[0.06] bg-transparent'
              }`}
            >
              <p className="font-mono text-[15px] font-medium text-foreground">€4</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">/ mese</p>
            </button>
            <button
              onClick={() => setInterval('annual')}
              className={`flex-1 py-3 rounded-xl border text-center transition-colors ${
                interval === 'annual'
                  ? 'border-white/[0.2] bg-white/[0.06]'
                  : 'border-white/[0.06] bg-transparent'
              }`}
            >
              <p className="font-mono text-[15px] font-medium text-foreground">€35</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">/ anno · −2 mesi</p>
            </button>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-3.5 rounded-full text-[14px] font-medium tracking-[-0.1px] transition-opacity disabled:opacity-50"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            {loading ? 'Attendere…' : 'Passa a Pro'}
          </button>

          <p className="text-center font-mono text-[10px] text-muted-foreground/50 mt-3">
            Annulla in qualsiasi momento
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
