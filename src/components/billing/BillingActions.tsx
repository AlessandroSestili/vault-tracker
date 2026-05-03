'use client'

import { useState } from 'react'
import { cancelSubscription, reactivateSubscription } from '@/lib/billing-actions'

export function CancelButton({ cancelAtPeriodEnd, periodEnd }: { cancelAtPeriodEnd: boolean; periodEnd: string }) {
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)

  async function handleCancel() {
    if (!confirm) { setConfirm(true); return }
    setLoading(true)
    try { await cancelSubscription() } finally { setLoading(false); setConfirm(false) }
  }

  async function handleReactivate() {
    setLoading(true)
    try { await reactivateSubscription() } finally { setLoading(false) }
  }

  if (cancelAtPeriodEnd) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
          <p className="text-[12px] text-yellow-400 leading-relaxed">
            Il piano Pro è attivo fino al <span className="font-mono font-medium">{periodEnd}</span>. Dopo quella data tornerai al piano Free.
          </p>
        </div>
        <button
          onClick={handleReactivate}
          disabled={loading}
          className="w-full py-3 rounded-full text-[13px] font-medium tracking-[-0.1px] transition-opacity disabled:opacity-40"
          style={{ background: 'var(--foreground)', color: 'var(--background)' }}
        >
          {loading ? 'Attendere…' : 'Riattiva abbonamento'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {confirm && (
        <p className="text-[12px] text-muted-foreground text-center">
          L'accesso Pro termina il <span className="font-mono">{periodEnd}</span>. Confermi?
        </p>
      )}
      <button
        onClick={handleCancel}
        disabled={loading}
        className={`w-full py-3 rounded-full text-[13px] font-medium tracking-[-0.1px] transition-all disabled:opacity-40 border ${
          confirm
            ? 'border-destructive/40 text-destructive bg-destructive/5'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-white/20'
        }`}
      >
        {loading ? 'Attendere…' : confirm ? 'Sì, cancella abbonamento' : 'Cancella abbonamento'}
      </button>
      {confirm && (
        <button
          onClick={() => setConfirm(false)}
          className="w-full py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Annulla
        </button>
      )}
    </div>
  )
}

export function PortalButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Errore sconosciuto')
      }
    } catch {
      setError('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handlePortal}
        disabled={loading}
        className="w-full flex items-center justify-between px-0 py-3.5 border-b border-white/[0.04] text-left group disabled:opacity-40"
      >
        <span className="font-mono text-[11px] tracking-[1px] uppercase text-muted-foreground group-hover:text-foreground transition-colors">
          Metodo di pagamento
        </span>
        <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
          {loading ? '…' : 'Gestisci →'}
        </span>
      </button>
      {error && (
        <p className="mt-2 text-[11px] text-destructive font-mono">{error}</p>
      )}
    </div>
  )
}
