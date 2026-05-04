'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, BarChart2, CreditCard } from 'lucide-react'

const tabs = [
  { href: '/',            label: 'Portafoglio', Icon: Wallet },
  { href: '/liabilities', label: 'Debiti',      Icon: CreditCard },
  { href: '/analytics',   label: 'Analytics',   Icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <nav
      className="bottom-nav w-full shrink-0 md:hidden border-t border-white/[0.06] rounded-t-2xl"
      style={{
        background: 'rgba(9,9,11,0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex h-[4.5rem] items-stretch">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div
                className="flex items-center justify-center w-11 h-7 rounded-full transition-colors"
                style={{ background: active ? 'oklch(0.82 0.18 130 / 0.12)' : 'transparent' }}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 1.8 : 1.3} />
              </div>
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
