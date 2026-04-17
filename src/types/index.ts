export type AccountType = 'investment' | 'cash' | 'pension' | 'crypto' | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  created_at: string
}

export interface Position {
  id: string
  isin: string
  units: number
  broker: string
  display_name: string | null
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
