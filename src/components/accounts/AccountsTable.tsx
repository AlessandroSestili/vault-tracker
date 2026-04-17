'use client'

import { useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteAccount } from '@/lib/actions'
import type { AccountWithLatestSnapshot } from '@/types'
import type { Quote } from '@/lib/yahoo-finance'
import { Trash2, Zap } from 'lucide-react'
import { UpdateValueDialog } from './UpdateValueDialog'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { formatCurrency, formatDate } from '@/lib/formats'

export function AccountsTable({
  accounts,
  quotes,
}: {
  accounts: AccountWithLatestSnapshot[]
  quotes: Record<string, Quote>
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(() => deleteAccount(id))
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No accounts yet. Add your first one.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Account</TableHead>
          <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Type</TableHead>
          <TableHead className="text-muted-foreground text-xs uppercase tracking-wider text-right">Value</TableHead>
          <TableHead className="text-muted-foreground text-xs uppercase tracking-wider">Updated</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => {
          const isLive = !!(account.isin && quotes[account.isin])
          const quote = account.isin ? quotes[account.isin] : null

          return (
            <TableRow
              key={account.id}
              className="border-border hover:bg-white/[0.03] transition-colors group"
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{account.name}</span>
                  {isLive && (
                    <span className="flex items-center gap-1 text-[10px] text-primary/80 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" />
                      live
                    </span>
                  )}
                </div>
                {quote && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {account.units} units × {formatCurrency(quote.price, quote.currency)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${ACCOUNT_TYPE_CONFIG[account.type].badgeClass}`}>
                  {ACCOUNT_TYPE_CONFIG[account.type].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono font-medium text-foreground tabular-nums">
                {formatCurrency(account.latest_value, account.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {isLive ? (
                  <span className="text-primary/70 text-xs">real-time</span>
                ) : (
                  formatDate(account.latest_recorded_at)
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isLive && <UpdateValueDialog account={account} />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => handleDelete(account.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
