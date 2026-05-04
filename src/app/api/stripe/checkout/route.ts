import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { interval } = await req.json()
    if (!interval) return NextResponse.json({ error: 'Missing interval' }, { status: 400 })

    const priceId = interval === 'annual'
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY

    if (!priceId) return NextResponse.json({ error: 'Price not configured', interval }, { status: 500 })

    const stripe = getStripe()

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (customerId) {
      // Verify the customer still exists in the current Stripe environment
      try {
        await stripe.customers.retrieve(customerId)
      } catch {
        customerId = null
        await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id)
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId })
    }

    const origin = req.headers.get('origin') ?? 'https://vault-tracker-eight.vercel.app'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id },
      success_url: `${origin}/?upgraded=true`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
