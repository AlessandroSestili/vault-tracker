'use client'

import { useState, useEffect } from 'react'
import { LogOut, Moon, Sun, Monitor, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

type Theme = 'dark' | 'light' | 'system'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (theme === 'system') {
    root.classList.add(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  } else {
    root.classList.add(theme)
  }
  localStorage.setItem('vault-theme', theme)
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('vault-theme') as Theme) ?? 'dark'
}

const THEMES: { value: Theme; label: string; Icon: React.ElementType }[] = [
  { value: 'dark', label: 'Scuro', Icon: Moon },
  { value: 'light', label: 'Chiaro', Icon: Sun },
  { value: 'system', label: 'Sistema', Icon: Monitor },
]

export function ProfileSheet({ variant = 'mobile' }: { variant?: 'mobile' | 'desktop' }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('dark')
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  useEffect(() => {
    if (open && !email) {
      createClient().auth.getUser().then(({ data }) => {
        setEmail(data.user?.email ?? '')
      })
    }
  }, [open, email])

  function handleTheme(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  async function handleLogout() {
    setOpen(false)
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : 'V'

  return (
    <>
      {variant === 'mobile' ? (
        <button
          onClick={() => setOpen(true)}
          className="w-[34px] h-[34px] rounded-full bg-muted/40 border border-border flex items-center justify-center text-muted-foreground"
          aria-label="Profilo"
        >
          <User className="w-[15px] h-[15px]" strokeWidth={1.5} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Profilo"
        >
          <User className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="p-0 bg-popover border-border">
          <DialogTitle className="sr-only">Profilo</DialogTitle>

          {/* Avatar + email */}
          <div className="px-6 pt-2 pb-5 border-b border-border">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                <span className="font-mono text-[14px] font-bold text-primary-foreground">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground tracking-[-0.1px] truncate">{email || '—'}</p>
                <p className="font-mono text-[10px] text-muted-foreground tracking-[1px] mt-0.5 uppercase">Account personale</p>
              </div>
            </div>
          </div>

          {/* Theme selector */}
          <div className="px-6 py-4 border-b border-border">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-3">Tema</p>
            <div className="flex gap-2">
              {THEMES.map(({ value, label, Icon }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    onClick={() => handleTheme(value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium transition-all border"
                    style={{
                      background: active ? 'var(--primary)' : 'var(--muted)',
                      color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                      borderColor: active ? 'transparent' : 'var(--border)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Logout */}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-muted-foreground hover:text-destructive hover:bg-muted/30 transition-colors"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Esci
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
