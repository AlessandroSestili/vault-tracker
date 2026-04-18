'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, BarChart2 } from 'lucide-react'

const tabs = [
  { href: '/',          label: 'Portafoglio', Icon: Wallet },
  { href: '/analytics', label: 'Analytics',   Icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-[4.5rem] items-stretch">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              }`}
            >
              <Icon
                className="w-[1.375rem] h-[1.375rem]"
                strokeWidth={active ? 2.5 : 1.5}
              />
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-primary' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
