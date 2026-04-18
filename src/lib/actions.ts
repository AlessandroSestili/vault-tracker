'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType, LiabilitySubtype } from '@/types'

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/analytics')
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export async function createAccount(data: {
  name: string
  type: AccountType
  currency: string
  initialValue: number
  imageUrl?: string | null
}) {
  const supabase = await createClient()
  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ name: data.name, type: data.type, currency: data.currency, image_url: data.imageUrl ?? null })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const { error: snapshotError } = await supabase
    .from('snapshots')
    .insert({ account_id: account.id, value: data.initialValue })
  if (snapshotError) throw new Error(snapshotError.message)

  revalidateAll()
}

export async function addSnapshot(data: {
  accountId: string
  value: number
  note?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('snapshots')
    .insert({ account_id: data.accountId, value: data.value, note: data.note })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

// ── Live positions ────────────────────────────────────────────────────────────

export async function createPosition(data: {
  isin: string
  units: number
  broker: string
  displayName?: string
  imageUrl?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('positions').insert({
    isin: data.isin,
    units: data.units,
    broker: data.broker,
    display_name: data.displayName || null,
    is_manual: false,
    image_url: data.imageUrl ?? null,
  })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function updatePosition(id: string, data: {
  isin: string
  units: number
  broker: string
  displayName?: string
  imageUrl?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('positions').update({
    isin: data.isin,
    units: data.units,
    broker: data.broker,
    display_name: data.displayName || null,
    image_url: data.imageUrl ?? null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deletePosition(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('positions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

// ── Manual positions ──────────────────────────────────────────────────────────

export async function createManualPosition(data: {
  displayName: string
  broker: string
  initialValueEur: number
  imageUrl?: string | null
}) {
  const supabase = await createClient()
  const { data: pos, error } = await supabase
    .from('positions')
    .insert({
      isin: null,
      units: null,
      broker: data.broker,
      display_name: data.displayName,
      is_manual: true,
      current_value_eur: data.initialValueEur,
      image_url: data.imageUrl ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const today = new Date().toISOString().slice(0, 10)
  await supabase.from('position_snapshots').insert({
    position_id: pos.id,
    value_eur: data.initialValueEur,
    recorded_at: today,
  })

  revalidateAll()
}

export async function updateManualPosition(id: string, data: {
  displayName: string
  broker: string
  newValueEur: number
  imageUrl?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('positions').update({
    display_name: data.displayName,
    broker: data.broker,
    current_value_eur: data.newValueEur,
    image_url: data.imageUrl ?? null,
  }).eq('id', id)
  if (error) throw new Error(error.message)

  const today = new Date().toISOString().slice(0, 10)
  await supabase.from('position_snapshots').upsert({
    position_id: id,
    value_eur: data.newValueEur,
    recorded_at: today,
  }, { onConflict: 'position_id,recorded_at' })

  revalidateAll()
}

// ── Liabilities ───────────────────────────────────────────────────────────────

const DEBT_SUBTYPES: LiabilitySubtype[] = ['mortgage', 'installment', 'informal_debt']

export async function createLiability(data: {
  name: string
  subtype: LiabilitySubtype
  currency: string
  counterparty?: string
  note?: string
  imageUrl?: string | null
  amount?: number
  currentBalance?: number
  monthlyPayment?: number
  interestRate?: number
  nextPaymentDate?: string
  dueDate?: string
}) {
  const type: 'debt' | 'credit' = DEBT_SUBTYPES.includes(data.subtype) ? 'debt' : 'credit'
  const supabase = await createClient()
  const { error } = await supabase.from('liabilities').insert({
    name: data.name,
    type,
    subtype: data.subtype,
    amount: data.amount ?? data.currentBalance ?? 0,
    currency: data.currency,
    counterparty: data.counterparty || null,
    note: data.note || null,
    image_url: data.imageUrl ?? null,
    current_balance: data.currentBalance ?? null,
    monthly_payment: data.monthlyPayment ?? null,
    interest_rate: data.interestRate ?? null,
    next_payment_date: data.nextPaymentDate ?? null,
    due_date: data.dueDate ?? null,
  })
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function updateLiability(id: string, data: {
  name: string
  subtype: LiabilitySubtype
  currency: string
  counterparty?: string
  note?: string
  imageUrl?: string | null
  amount?: number
  currentBalance?: number
  monthlyPayment?: number
  interestRate?: number
  nextPaymentDate?: string
  dueDate?: string
}) {
  const type: 'debt' | 'credit' = DEBT_SUBTYPES.includes(data.subtype) ? 'debt' : 'credit'
  const supabase = await createClient()
  const { error } = await supabase.from('liabilities').update({
    name: data.name,
    type,
    subtype: data.subtype,
    amount: data.amount ?? data.currentBalance ?? 0,
    currency: data.currency,
    counterparty: data.counterparty || null,
    note: data.note || null,
    image_url: data.imageUrl ?? null,
    current_balance: data.currentBalance ?? null,
    monthly_payment: data.monthlyPayment ?? null,
    interest_rate: data.interestRate ?? null,
    next_payment_date: data.nextPaymentDate ?? null,
    due_date: data.dueDate ?? null,
  }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteLiability(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('liabilities').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}
