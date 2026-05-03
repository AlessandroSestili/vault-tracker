'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

async function getSubscriptionId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) throw new Error('Nessun abbonamento attivo')
  return profile.stripe_subscription_id
}

export async function cancelSubscription(): Promise<void> {
  const subscriptionId = await getSubscriptionId()
  const stripe = getStripe()
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
  revalidatePath('/billing')
}

export async function reactivateSubscription(): Promise<void> {
  const subscriptionId = await getSubscriptionId()
  const stripe = getStripe()
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })
  revalidatePath('/billing')
}
