import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function syncSubscriptionIfNeeded(userId: string): Promise<void> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!profile?.stripe_customer_id || profile.plan === 'pro') return

  let subscriptions
  try {
    subscriptions = await getStripe().subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    })
  } catch {
    return
  }

  if (subscriptions.data.length === 0) return

  const sub = subscriptions.data[0]
  await supabase.from('profiles').update({
    plan: 'pro',
    stripe_subscription_id: sub.id,
    stripe_price_id: sub.items.data[0]?.price.id ?? null,
    subscription_status: sub.status,
  }).eq('id', userId)
}
