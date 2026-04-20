import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  webpush.setVapidDetails(
    'mailto:sestilialessandro@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().getDate()

  const [{ data: incomes }, { data: subscriptions }] = await Promise.all([
    supabase.from('recurring_incomes').select('name, amount, currency').eq('day_of_month', today),
    supabase.from('push_subscriptions').select('subscription'),
  ])

  if (!incomes || incomes.length === 0 || !subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const title = incomes.length === 1
    ? `Oggi entra: ${incomes[0].name}`
    : `${incomes.length} entrate oggi`

  const body = incomes
    .map((i) => `+${i.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${i.currency} — ${i.name}`)
    .join('\n')

  const payload = JSON.stringify({ title, body, url: '/' })

  await Promise.allSettled(
    subscriptions.map((row) =>
      webpush.sendNotification(row.subscription, payload)
    )
  )

  return NextResponse.json({ sent: subscriptions.length })
}
