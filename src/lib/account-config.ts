import type { AccountType } from '@/types'

interface AccountTypeConfig {
  label: string
  badgeClass: string
}

export const ACCOUNT_TYPE_CONFIG: Record<AccountType, AccountTypeConfig> = {
  investment: { label: 'Investment', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  cash:       { label: 'Cash',       badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20' },
  pension:    { label: 'Pension',    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  crypto:     { label: 'Crypto',     badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  other:      { label: 'Other',      badgeClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
}

export const ACCOUNT_TYPE_OPTIONS = (Object.entries(ACCOUNT_TYPE_CONFIG) as [AccountType, AccountTypeConfig][])
  .map(([value, { label }]) => ({ value, label }))
