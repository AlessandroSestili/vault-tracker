'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType } from '@/types'

export async function createAccount(data: {
  name: string
  type: AccountType
  currency: string
  initialValue: number
  isin?: string
  units?: number
}) {
  const supabase = await createClient()

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      name: data.name,
      type: data.type,
      currency: data.currency,
      isin: data.isin || null,
      units: data.units || null,
    })
    .select()
    .single()

  if (accountError) throw new Error(accountError.message)

  const { error: snapshotError } = await supabase
    .from('snapshots')
    .insert({ account_id: account.id, value: data.initialValue })

  if (snapshotError) throw new Error(snapshotError.message)

  revalidatePath('/')
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

  revalidatePath('/')
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('accounts').delete().eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
}
