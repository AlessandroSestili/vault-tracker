import { createClient } from '@/lib/supabase/server'
import { AccountsTable } from '@/components/accounts/AccountsTable'
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog'
import { RefreshButton } from '@/components/accounts/RefreshButton'
import type { AccountWithLatestSnapshot } from '@/types'
import { formatCurrency } from '@/lib/formats'
import { fetchQuotesByIsins } from '@/lib/yahoo-finance'
import type { Quote } from '@/lib/yahoo-finance'

async function getAccounts(): Promise<AccountWithLatestSnapshot[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts_with_latest')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export default async function HomePage() {
  const accounts = await getAccounts()

  const isins = accounts
    .filter((a) => a.isin && a.units)
    .map((a) => a.isin!)

  const quotes: Record<string, Quote> = isins.length > 0
    ? await fetchQuotesByIsins(isins)
    : {}

  const accountsWithPrices = accounts.map((a) => {
    if (a.isin && a.units && quotes[a.isin]) {
      return { ...a, latest_value: quotes[a.isin].price * a.units }
    }
    return a
  })

  const total = accountsWithPrices.reduce((sum, a) => sum + (a.latest_value ?? 0), 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Vault</h1>
            <p className="text-muted-foreground text-xs mt-0.5 tracking-wide uppercase">Portfolio Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <AddAccountDialog />
          </div>
        </header>

        {/* Net Worth Card */}
        <div className="relative rounded-2xl border border-border bg-card p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Total Net Worth</p>
          <p className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatCurrency(total)}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-muted-foreground">
              {accountsWithPrices.length} account{accountsWithPrices.length !== 1 ? 's' : ''}
            </span>
            {isins.length > 0 && (
              <span className="text-xs text-primary/80 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                {isins.length} live price{isins.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Accounts</h2>
          </div>
          <AccountsTable accounts={accountsWithPrices} quotes={quotes} />
        </div>

      </div>
    </div>
  )
}
