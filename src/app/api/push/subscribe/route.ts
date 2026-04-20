import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const subscription = await request.json()
  const supabase = await createClient()
  await supabase.from('push_subscriptions').insert({ subscription })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { endpoint } = await request.json()
  const supabase = await createClient()
  await supabase
    .from('push_subscriptions')
    .delete()
    .filter('subscription->>endpoint', 'eq', endpoint)
  return NextResponse.json({ ok: true })
}
