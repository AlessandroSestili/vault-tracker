'use client'

import { useVisibility } from '@/components/accounts/VisibilityContext'
import { formatCurrency } from '@/lib/formats'

interface Props {
  contiTotal: number
  posizioniTotal: number
}

export function PortfolioHeroTotal({ contiTotal, posizioniTotal }: Props) {
  const { showAccounts, showPositions } = useVisibility()
  const total =
    (showAccounts ? contiTotal : 0) +
    (showPositions ? posizioniTotal : 0)
  const formatted = formatCurrency(total)
  const totalNumber = formatted.replace(/\s*€$/, '')
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-mono text-[44px] md:text-[56px] font-medium tracking-[-1.8px] md:tracking-[-2px] tabular-nums text-foreground leading-none">
        {totalNumber}
      </span>
      <span className="text-[20px] md:text-[24px] font-normal text-muted-foreground leading-none">€</span>
    </div>
  )
}
