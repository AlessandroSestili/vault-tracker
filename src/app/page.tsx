import { createClient } from '@/lib/supabase/server'
import { AccountsTable } from '@/components/accounts/AccountsTable'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'
import type { AccountWithLatestSnapshot } from '@/types'
import { formatCurrency } from '@/lib/formats'

async function getAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_latest')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

function NetWorthCard({ accounts }: { accounts: AccountWithLatestSnapshot[] }) {
  const total = accounts.reduce((sum, a) => sum + (a.latest_value ?? 0), 0)
  const formatted = formatCurrency(total)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
      <p className="text-sm text-zinc-500 uppercase tracking-widest mb-2">Total Net Worth</p>
      <p className="text-5xl font-semibold tracking-tight text-white">{formatted}</p>
      <p className="text-sm text-zinc-500 mt-2">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default async function HomePage() {
  const accounts = await getAccounts()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Your financial overview</p>
          </div>
          <AddAccountDialog />
        </header>

        <NetWorthCard accounts={accounts} />

        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">Accounts</h2>
          </div>
          <AccountsTable accounts={accounts} />
        </div>
      </div>
    </div>
  )
}
