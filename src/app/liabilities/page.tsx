import { fetchLiabilities } from '@/lib/queries'
import { liabilityBalance, subscriptionMonthlyAmount } from '@/lib/liability-calc'
import { LiabilitiesList } from '@/components/liabilities/LiabilitiesList'
import { AddLiabilityDialog } from '@/components/liabilities/LiabilityDialog'
import { LiabilitiesFab } from '@/components/liabilities/LiabilitiesFab'

export default async function LiabilitiesPage() {
  const liabilities = await fetchLiabilities()

  const debtsTotal = liabilities
    .filter(l => l.type === 'debt' && l.subtype !== 'subscription')
    .reduce((s, l) => s + liabilityBalance(l), 0)
  const creditsTotal = liabilities
    .filter(l => l.type === 'credit')
    .reduce((s, l) => s + liabilityBalance(l), 0)
  const liabNet = creditsTotal - debtsTotal
  const subscriptionsMonthlyTotal = liabilities
    .filter(l => l.subtype === 'subscription')
    .reduce((s, l) => s + subscriptionMonthlyAmount(l), 0)
  const subscriptionsAnnualTotal = subscriptionsMonthlyTotal * 12

  return (
    <>
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      <div className="max-w-[680px]">

        {/* Header */}
        <div className="pt-2 md:pt-8 pb-6 md:px-0">
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-2">
            Esposizione
          </p>
          <div className="flex items-center justify-between">
            <p className="text-[26px] font-medium text-foreground tracking-[-0.6px] leading-[1.1]">
              Debiti & Crediti
            </p>
            <div className="hidden md:block">
              <AddLiabilityDialog />
            </div>
          </div>
        </div>

        <LiabilitiesList
          liabilities={liabilities}
          debtsTotal={debtsTotal}
          creditsTotal={creditsTotal}
          liabNet={liabNet}
          subscriptionsMonthlyTotal={subscriptionsMonthlyTotal}
          subscriptionsAnnualTotal={subscriptionsAnnualTotal}
        />

      </div>
    </div>
    <LiabilitiesFab />
    </>
  )
}
