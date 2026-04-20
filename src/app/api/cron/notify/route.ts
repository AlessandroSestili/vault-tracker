import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  })
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const today = new Date().getDate()

  const { data: incomes, error } = await supabase
    .from('recurring_incomes')
    .select('name, amount, currency')
    .eq('day_of_month', today)

  if (error || !incomes || incomes.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const lines = incomes.map(
    (i) => `• <b>${i.name}</b>  +${i.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${i.currency}`
  )

  const message = `💰 <b>Entrate di oggi</b>\n\n${lines.join('\n')}`

  await sendTelegram(message)

  return NextResponse.json({ sent: incomes.length })
}
