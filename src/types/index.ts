export type AccountType = 'investment' | 'cash' | 'pension' | 'crypto' | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  image_url: string | null
  created_at: string
}

export interface Position {
  id: string
  isin: string | null
  units: number | null
  broker: string
  display_name: string | null
  is_manual: boolean
  current_value_eur: number | null
  image_url: string | null
  created_at: string
}

export interface Snapshot {
  id: string
  account_id: string
  value: number
  recorded_at: string
  note?: string
}

export interface AccountWithLatestSnapshot extends Account {
  latest_value: number | null
  latest_recorded_at: string | null
}

export type LiabilitySubtype =
  | 'mortgage'
  | 'installment'
  | 'informal_debt'
  | 'dated_credit'
  | 'informal_credit'

export type PositionWithQuote = Position & {
  price: number
  value: number
  currency: string
  quoteName: string
  changePercent: number | undefined
}

export interface Liability {
  id: string
  name: string
  type: 'debt' | 'credit'
  subtype: LiabilitySubtype
  amount: number
  currency: string
  counterparty: string | null
  note: string | null
  image_url: string | null
  current_balance: number | null
  monthly_payment: number | null
  interest_rate: number | null
  next_payment_date: string | null
  due_date: string | null
  created_at: string
}
