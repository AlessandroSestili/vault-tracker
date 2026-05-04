import type { BillingCycle, Liability, LiabilitySubtype } from '@/types'

const CYCLE_MONTHS_MAP: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
}

function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  )
}

export function isStructuredDebt(subtype: LiabilitySubtype): boolean {
  return subtype === 'mortgage' || subtype === 'installment'
}

export function subscriptionMonthlyAmount(l: Liability): number {
  if (l.subtype !== 'subscription' || !l.billing_cycle) return 0
  return l.amount / CYCLE_MONTHS_MAP[l.billing_cycle]
}

export function isDueToday(l: Liability): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const todayDay = new Date().getDate()
  if (l.subtype === 'mortgage' || l.subtype === 'installment') {
    return !!l.next_payment_date && l.next_payment_date.slice(0, 10) === today
  }
  if (l.subtype === 'subscription') {
    if (!l.billing_cycle || l.billing_cycle === 'monthly') {
      return l.day_of_month === todayDay
    }
    return !!l.next_payment_date && l.next_payment_date.slice(0, 10) === today
  }
  return false
}

export function recurringPaymentAmount(l: Liability): number {
  if (l.subtype === 'mortgage' || l.subtype === 'installment') return l.monthly_payment ?? 0
  if (l.subtype === 'subscription') return l.amount
  return 0
}

export function advanceNextPaymentDate(l: Liability): string | null {
  if (l.subtype === 'mortgage' || l.subtype === 'installment') {
    if (!l.next_payment_date) return null
    const d = new Date(l.next_payment_date)
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  }
  if (l.subtype === 'subscription' && l.billing_cycle && l.billing_cycle !== 'monthly') {
    if (!l.next_payment_date) return null
    const d = new Date(l.next_payment_date)
    d.setMonth(d.getMonth() + CYCLE_MONTHS_MAP[l.billing_cycle])
    return d.toISOString().slice(0, 10)
  }
  return null
}

export function liabilityBalance(l: Liability, referenceDate: Date = new Date()): number {
  if (l.subtype === 'subscription') return 0

  if (l.subtype === 'mortgage') {
    if (!l.current_balance || !l.monthly_payment || !l.next_payment_date) return l.amount
    const r = (l.interest_rate ?? 0) / 1200
    const n = Math.max(0, monthsBetween(new Date(l.next_payment_date), referenceDate))
    if (r === 0) return Math.max(0, l.current_balance - n * l.monthly_payment)
    const balance =
      l.current_balance * Math.pow(1 + r, n) -
      l.monthly_payment * (Math.pow(1 + r, n) - 1) / r
    return Math.max(0, balance)
  }

  if (l.subtype === 'installment') {
    if (!l.current_balance || !l.monthly_payment || !l.next_payment_date) return l.amount
    const n = Math.max(0, monthsBetween(new Date(l.next_payment_date), referenceDate))
    return Math.max(0, l.current_balance - n * l.monthly_payment)
  }

  return l.amount
}
