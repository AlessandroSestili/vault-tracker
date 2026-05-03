'use client'

import { useState, useEffect } from 'react'
import { LogOut, Moon, Sun, User, Mail, Bell, BellOff, CreditCard, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { UpgradeModal } from '@/components/ui/upgrade-modal'
import type { Plan } from '@/lib/plan-config'
import { isPro } from '@/lib/plan-config'

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

const THEMES: { value: Theme; label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { value: 'dark', label: 'Scuro', Icon: Moon },
  { value: 'light', label: 'Chiaro', Icon: Sun },
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

  const [plan, setPlan] = useState<Plan>('free')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    createClient()
      .from('profiles')
      .select('plan')
      .single()
      .then(({ data }) => {
        if (data?.plan) setPlan(data.plan as Plan)
      })
  }, [open])

  const [notifStatus, setNotifStatus] = useState<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'>('unsupported')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') { setNotifStatus('denied'); return }
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setNotifStatus(sub ? 'subscribed' : 'unsubscribed')
    })
  }, [])

  async function handleNotifToggle() {
    const reg = await navigator.serviceWorker.ready
    if (notifStatus === 'subscribed') {
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
      }
      setNotifStatus('unsubscribed')
    } else {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      setNotifStatus('subscribed')
    }
  }

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

          {/* Piano */}
          <div className="px-6 py-4 border-b border-border">
            <p className="font-mono text-[10px] tracking-[2px] uppercase text-muted-foreground mb-3">Piano</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-muted/40 border border-border flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {isPro(plan) ? 'Vault Pro' : 'Vault Free'}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {isPro(plan) ? 'Illimitato' : '3 account · 5 posizioni · 5 passività'}
                  </p>
                </div>
              </div>
              {isPro(plan) ? (
                <button
                  onClick={() => { setOpen(false); setTimeout(() => router.push('/billing'), 150) }}
                  className="font-mono text-[10px] tracking-[1px] uppercase text-muted-foreground border border-border rounded px-2.5 py-1.5 hover:border-white/20 hover:text-foreground transition-colors"
                >
                  Gestisci
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); setTimeout(() => router.push('/billing'), 150) }}
                  className="flex items-center gap-1 font-mono text-[10px] tracking-[1px] uppercase rounded px-2.5 py-1.5 transition-colors"
                  style={{ background: '#a3e635', color: '#09090b' }}
                >
                  <Zap className="w-3 h-3" strokeWidth={2} />
                  Pro
                </button>
              )}
            </div>
          </div>

          {/* Notifiche */}
          {notifStatus !== 'unsupported' && (
            <div className="px-4 pt-1 pb-1">
              <button
                onClick={handleNotifToggle}
                disabled={notifStatus === 'denied'}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {notifStatus === 'subscribed'
                  ? <BellOff className="w-4 h-4" strokeWidth={1.5} />
                  : <Bell className="w-4 h-4" strokeWidth={1.5} />}
                {notifStatus === 'subscribed' ? 'Disattiva notifiche' : notifStatus === 'denied' ? 'Notifiche bloccate' : 'Attiva notifiche'}
              </button>
            </div>
          )}

          {/* Support + Logout */}
          <div className="px-4 pb-4 pt-1 space-y-0.5">
            <a
              href="mailto:sestilialessandro@gmail.com?subject=Vault%20Tracker%20%E2%80%94%20Segnalazione"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <Mail className="w-4 h-4" strokeWidth={1.5} />
              Segnala un problema
            </a>
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

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} resource="accounts" />
    </>
  )
}
