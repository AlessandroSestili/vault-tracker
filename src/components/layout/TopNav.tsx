'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

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
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-14 flex items-center px-4 md:px-8">

        {/* Mobile: logo centrato + logout a sinistra */}
        <div className="flex md:hidden items-center w-full">
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold tracking-tight text-foreground">Vault</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Desktop: logo sx, nav center, logout dx */}
        <div className="hidden md:flex flex-1 items-center">
          <span className="text-sm font-semibold tracking-tight text-foreground">Vault</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {navLink('/', 'Portafoglio')}
          {navLink('/analytics', 'Analytics')}
        </div>
        <div className="hidden md:flex flex-1 justify-end">
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </nav>
  )
}
