// Server-only: uses next/headers via createClient
import { createClient } from '@/lib/supabase/server'
import { FREE_LIMITS, isPro } from '@/lib/plan-config'
import type { Plan, ResourceType, PlanLimits } from '@/lib/plan-config'

export type { Plan, ResourceType, PlanLimits }
export { FREE_LIMITS, isPro, isAtLimit } from '@/lib/plan-config'

export async function getUserPlan(): Promise<Plan> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  return (data?.plan as Plan) ?? 'free'
}

export async function getResourceCounts(): Promise<{ accounts: number; positions: number; liabilities: number }> {
  const supabase = await createClient()

  const [{ count: accounts }, { count: positions }, { count: liabilities }] = await Promise.all([
    supabase.from('accounts').select('*', { count: 'exact', head: true }),
    supabase.from('positions').select('*', { count: 'exact', head: true }),
    supabase.from('liabilities').select('*', { count: 'exact', head: true }),
  ])

  return {
    accounts: accounts ?? 0,
    positions: positions ?? 0,
    liabilities: liabilities ?? 0,
  }
}

export async function getPlanLimits(): Promise<PlanLimits> {
  const [plan, counts] = await Promise.all([getUserPlan(), getResourceCounts()])
  return { plan, counts }
}

export async function assertNotAtLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  resource: ResourceType
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  if (isPro(plan)) return

  const table = resource === 'liabilities' ? 'liabilities'
    : resource === 'accounts' ? 'accounts'
    : 'positions'

  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) >= FREE_LIMITS[resource]) {
    throw new Error(`LIMIT_REACHED:${resource}`)
  }
}
