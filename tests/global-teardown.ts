import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { getTestUserId } from './global-setup'

config({ path: '.env.local' })

export default async function globalTeardown() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const userId = await getTestUserId()
  if (!userId) return

  await Promise.all([
    supabase.from('recurring_incomes').delete().eq('user_id', userId),
    supabase.from('liabilities').delete().eq('user_id', userId),
    supabase.from('positions').delete().eq('user_id', userId),
    supabase.from('accounts').delete().eq('user_id', userId),
  ])

  console.log('[e2e] dati test rimossi')
}
