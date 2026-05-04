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

    let customerId = profile?.stripe_customer_id ?? null

    // Validate stored customer: deleted customers return { deleted: true } without throwing
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId)
        if ((existing as { deleted?: boolean }).deleted) customerId = null
      } catch {
        customerId = null
      }
      if (!customerId) {
        await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id)
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').upsert({ id: user.id, stripe_customer_id: customerId })
    }

    const origin = req.headers.get('origin') ?? 'https://vault-tracker-eight.vercel.app'

    const sessionParams = {
      mode: 'subscription' as const,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id },
      success_url: `${origin}/?upgraded=true`,
      cancel_url: `${origin}/`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto' as const,
    }

    let session
    try {
      session = await stripe.checkout.sessions.create({ customer: customerId, ...sessionParams })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('No such customer')) {
        // Customer invalid despite our checks — clear and retry without it
        await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id)
        const fresh = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } })
        await supabase.from('profiles').update({ stripe_customer_id: fresh.id }).eq('id', user.id)
        session = await stripe.checkout.sessions.create({ customer: fresh.id, ...sessionParams })
      } else {
        throw err
      }
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
