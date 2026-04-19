'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ProfileSheet } from './ProfileSheet'

export function TopNav() {
  const pathname = usePathname()

  if (pathname === '/login') return null

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
          active
            ? 'text-foreground bg-white/8'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[rgba(9,9,11,0.86)] backdrop-blur-xl border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 flex items-center px-5 md:px-8">

        {/* Mobile: V badge + Vault left, search + user right */}
        <div className="flex md:hidden items-center w-full">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-[18px] h-[18px] rounded-[4px] bg-[var(--primary)] flex items-center justify-center">
              <span className="font-mono text-[11px] font-bold text-[#09090b] leading-none">V</span>
            </div>
            <span className="text-[15px] font-medium tracking-[-0.2px] text-[#fafafa]">Vault</span>
          </div>
          <div className="flex items-center gap-2">
            <ProfileSheet variant="mobile" />
          </div>
        </div>

        {/* Desktop: logo left, nav center, logout right */}
        <div className="hidden md:flex flex-1 items-center">
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] rounded-[4px] bg-[var(--primary)] flex items-center justify-center">
              <span className="font-mono text-[11px] font-bold text-[#09090b] leading-none">V</span>
            </div>
            <span className="text-[15px] font-medium tracking-[-0.2px] text-[#fafafa]">Vault</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {navLink('/', 'Portafoglio')}
          {navLink('/analytics', 'Analytics')}
        </div>
        <div className="hidden md:flex flex-1 justify-end">
          <ProfileSheet variant="desktop" />
        </div>

      </div>
    </nav>
  )
}
