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
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center px-8">
      <div className="flex-1">
        <span className="text-sm font-semibold tracking-tight text-foreground">Vault</span>
      </div>
      <div className="flex items-center gap-1">
        {navLink('/', 'Portafoglio')}
        {navLink('/analytics', 'Analytics')}
      </div>
      <div className="flex-1 flex justify-end">
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}
