import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { BackButton } from '@/components/ui/back-button'
import { CancelButton, PortalButton } from '@/components/billing/BillingActions'
import type Stripe from 'stripe'
import { isPro } from '@/lib/plan-config'
import type { Plan } from '@/lib/plan-config'
import { syncSubscriptionIfNeeded } from '@/lib/stripe-sync'

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active:    { label: 'Attivo',     color: '#a3e635' },
  trialing:  { label: 'Trial',      color: '#a3e635' },
  past_due:  { label: 'Scaduto',    color: '#fbbf24' },
  canceled:  { label: 'Cancellato', color: '#a1a1aa' },
  unpaid:    { label: 'Non pagato', color: '#ef4444' },
  paused:    { label: 'In pausa',   color: '#a1a1aa' },
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  await syncSubscriptionIfNeeded(user.id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_subscription_id, stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single()

  const plan = ((profile?.plan as Plan) ?? 'free')
  const isFree = !isPro(plan)

  let sub: Stripe.Subscription | null = null
  if (profile?.stripe_subscription_id) {
    try {
      sub = await getStripe().subscriptions.retrieve(profile.stripe_subscription_id, {
        expand: ['default_payment_method', 'items.data.price'],
      })
    } catch {
      sub = null
    }
  }

  const item = sub?.items?.data?.[0]
  const price = item?.price
  const interval = price?.recurring?.interval === 'year' ? 'Annuale' : 'Mensile'
  const amount = price ? fmtAmount(price.unit_amount ?? 0, price.currency) : null
  const periodEnd = item?.current_period_end ? fmt(item.current_period_end) : null
  const cancelAtPeriodEnd = sub?.cancel_at_period_end ?? false
  const statusInfo = sub ? (STATUS_LABEL[sub.status] ?? { label: sub.status, color: '#a1a1aa' }) : null

  const pm = sub?.default_payment_method as Stripe.PaymentMethod | null
  const card = pm?.card

  return (
    <div className="max-w-lg mx-auto px-5 md:px-8 py-6 pb-bottom-nav md:pb-10 space-y-8">
      <BackButton />

      {/* Header */}
      <div>
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-1">Abbonamento</p>
        <h1 className="text-[24px] font-medium text-foreground tracking-[-0.5px]">
          {isFree ? 'Vault Free' : 'Vault Pro'}
        </h1>
        {statusInfo && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusInfo.color }} />
            <span className="font-mono text-[11px] text-muted-foreground">{statusInfo.label}</span>
          </div>
        )}
      </div>

      {isFree ? (
        /* Free plan */
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">Piano attuale</p>
            <div className="space-y-2">
              {['3 account', '5 posizioni', '5 passività'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="text-[13px] text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-card p-5 space-y-4">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground">Vault Pro</p>
            <div className="space-y-2">
              {['Account illimitati', 'Posizioni illimitate', 'Passività illimitate'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#a3e635' }} />
                  <span className="text-[13px] text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <div className="flex-1 rounded-xl border border-white/[0.06] p-3 text-center">
                <p className="font-mono text-[15px] font-medium text-foreground">€4</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">/ mese</p>
              </div>
              <div className="flex-1 rounded-xl border border-white/[0.06] p-3 text-center">
                <p className="font-mono text-[15px] font-medium text-foreground">€35</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-0.5">/ anno</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Pro plan */
        <div className="space-y-6">
          {/* Details */}
          <div className="border-t border-white/[0.06]">
            {[
              amount && interval && { label: 'Piano',          value: `${amount} · ${interval}` },
              periodEnd && !cancelAtPeriodEnd && { label: 'Prossimo rinnovo', value: periodEnd },
              cancelAtPeriodEnd && periodEnd && { label: 'Accesso fino a',   value: periodEnd },
              card && { label: 'Carta',          value: `•••• ${card.last4} · ${card.brand?.toUpperCase()}` },
            ].filter(Boolean).map((r) => {
              const row = r as { label: string; value: string }
              return (
                <div key={row.label} className="flex items-center justify-between py-3.5 border-b border-white/[0.04]">
                  <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted-foreground">{row.label}</p>
                  <p className="font-mono text-[12px] text-foreground tabular-nums">{row.value}</p>
                </div>
              )
            })}
            <PortalButton />
          </div>

          {/* Actions */}
          {sub && sub.status !== 'canceled' && (
            <CancelButton cancelAtPeriodEnd={cancelAtPeriodEnd} periodEnd={periodEnd ?? ''} />
          )}
        </div>
      )}
    </div>
  )
}
