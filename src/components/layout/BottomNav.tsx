'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, BarChart2, CreditCard } from 'lucide-react'

const tabs = [
  { href: '/',            label: 'Portafoglio', Icon: Wallet },
  { href: '/analytics',   label: 'Analytics',   Icon: BarChart2 },
  { href: '/liabilities', label: 'Debiti',      Icon: CreditCard },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/[0.06]"
      style={{
        background: 'rgba(9,9,11,0.86)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex h-[4.5rem] items-stretch">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
              style={{ color: active ? '#fafafa' : '#71717a' }}
            >
              <Icon
                className="w-[19px] h-[19px]"
                strokeWidth={active ? 1.7 : 1.3}
              />
              <span
                className="text-[10.5px] tracking-[0.1px]"
                style={{ fontWeight: active ? 500 : 400 }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
