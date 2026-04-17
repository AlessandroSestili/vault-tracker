'use client'

import { useTransition } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteAccount } from '@/lib/actions'
import type { AccountWithLatestSnapshot } from '@/types'
import { Trash2 } from 'lucide-react'
import { UpdateValueDialog } from './UpdateValueDialog'
import { ACCOUNT_TYPE_CONFIG } from '@/lib/account-config'
import { formatCurrency, formatDate } from '@/lib/formats'

export function AccountsTable({ accounts }: { accounts: AccountWithLatestSnapshot[] }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(() => deleteAccount(id))
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        No accounts yet. Add your first one.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800">
          <TableHead className="text-zinc-400">Account</TableHead>
          <TableHead className="text-zinc-400">Type</TableHead>
          <TableHead className="text-zinc-400 text-right">Value</TableHead>
          <TableHead className="text-zinc-400">Last Updated</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id} className="border-zinc-800 hover:bg-zinc-900/50">
            <TableCell className="font-medium text-white">{account.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className={ACCOUNT_TYPE_CONFIG[account.type].badgeClass}>
                {ACCOUNT_TYPE_CONFIG[account.type].label}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono text-white">
              {formatCurrency(account.latest_value, account.currency)}
            </TableCell>
            <TableCell className="text-zinc-500 text-sm">
              {formatDate(account.latest_recorded_at)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <UpdateValueDialog account={account} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10"
                  onClick={() => handleDelete(account.id)}
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
