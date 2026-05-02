import type { BillingCycle, Liability, LiabilitySubtype } from '@/types'

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}

export function isStructuredDebt(subtype: LiabilitySubtype): boolean {
  return subtype === 'mortgage' || subtype === 'installment'
}

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
}

export function subscriptionMonthlyAmount(l: Liability): number {
  if (l.subtype !== 'subscription' || !l.billing_cycle) return 0
  return l.amount / CYCLE_MONTHS[l.billing_cycle]
}

export function liabilityBalance(l: Liability): number {
  if (l.subtype === 'subscription') return 0

  const today = new Date()

  if (l.subtype === 'mortgage') {
    if (!l.current_balance || !l.monthly_payment || !l.next_payment_date) return l.amount
    const r = (l.interest_rate ?? 0) / 1200
    const n = Math.max(0, monthsBetween(new Date(l.next_payment_date), today))
    if (r === 0) return Math.max(0, l.current_balance - n * l.monthly_payment)
    const balance =
      l.current_balance * Math.pow(1 + r, n) -
      l.monthly_payment * (Math.pow(1 + r, n) - 1) / r
    return Math.max(0, balance)
  }

  if (l.subtype === 'installment') {
    if (!l.current_balance || !l.monthly_payment || !l.next_payment_date) return l.amount
    const n = Math.max(0, monthsBetween(new Date(l.next_payment_date), today))
    return Math.max(0, l.current_balance - n * l.monthly_payment)
  }

  return l.amount
}
