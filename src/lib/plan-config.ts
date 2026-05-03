// Client-safe: no server imports, no next/headers
export type Plan = 'free' | 'pro' | 'gifted'

export const FREE_LIMITS = {
  accounts: 3,
  positions: 5,
  liabilities: 5,
} as const

export type ResourceType = keyof typeof FREE_LIMITS

export type PlanLimits = {
  plan: Plan
  counts: { accounts: number; positions: number; liabilities: number }
}

export function isPro(plan: Plan): boolean {
  return plan === 'pro' || plan === 'gifted'
}

export function isAtLimit(plan: Plan, resource: ResourceType, current: number): boolean {
  if (isPro(plan)) return false
  return current >= FREE_LIMITS[resource]
}
