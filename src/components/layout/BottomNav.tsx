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
      className="md:hidden fixed left-4 right-4 z-50"
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(18,18,20,0.94)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRadius: '9999px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex h-16 items-center px-2 gap-1">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 items-center justify-center"
            >
              <div
                className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all duration-200"
                style={{
                  background: active ? 'oklch(0.82 0.18 130 / 0.13)' : 'transparent',
                  color: active ? 'oklch(0.82 0.18 130)' : '#71717a',
                }}
              >
                <Icon className="w-[19px] h-[19px]" strokeWidth={active ? 1.8 : 1.3} />
                <span className="text-[10px] leading-none" style={{ fontWeight: active ? 500 : 400 }}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
