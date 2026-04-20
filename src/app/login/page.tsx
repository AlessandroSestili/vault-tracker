'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VaultIcon } from '@/components/ui/vault-icon'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) { setError(error.message); return }
    if (data.url) window.location.href = data.url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError('Email o password errati'); setLoading(false); return }
      router.push('/')
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setInfo('Controlla la tua email per confermare la registrazione.')
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center px-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Logo block */}
      <div className="w-full max-w-[440px] flex flex-col items-center mt-[calc(60px+env(safe-area-inset-top))] mb-auto">
        <div className="mb-7">
          <VaultIcon size={52} />
        </div>
        <h1 className="text-[22px] font-medium tracking-[-0.4px] text-[#fafafa] mb-1.5">
          Vault Tracker
        </h1>
        <p className="font-mono text-[11px] text-[#71717a] tracking-[1px] uppercase">
          Il tuo patrimonio, privato
        </p>
      </div>

      {/* Auth block */}
      <div className="w-full max-w-[440px] pb-10 space-y-4" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full py-4 rounded-xl bg-[#fafafa] text-[#09090b] font-medium text-[15px] tracking-[-0.1px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
        >
          <GoogleIcon />
          Continua con Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="font-mono text-[10px] text-[#52525b] tracking-[1px] uppercase">oppure</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex items-center bg-[#111113] border border-white/[0.06] rounded-xl px-3.5">
            <Mail className="w-4 h-4 text-[#71717a] shrink-0" strokeWidth={1.5} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="flex-1 bg-transparent border-none outline-none px-3 py-4 font-mono text-[15px] text-[#fafafa] placeholder:text-[#52525b]"
              placeholder="email@esempio.com"
            />
          </div>

          <div className="flex items-center bg-[#111113] border border-white/[0.06] rounded-xl px-3.5">
            <Lock className="w-4 h-4 text-[#71717a] shrink-0" strokeWidth={1.5} />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="flex-1 bg-transparent border-none outline-none px-3 py-4 font-mono text-[16px] tracking-[2px] text-[#fafafa] placeholder:text-[#52525b]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="p-1 text-[#71717a]"
            >
              {showPw
                ? <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                : <Eye className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </div>

          {error && <p className="text-[#ef4444] text-sm text-center">{error}</p>}
          {info  && <p className="text-[var(--primary)] text-sm text-center">{info}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-4 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[#fafafa] font-medium text-[15px] tracking-[-0.1px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="text-center font-mono text-[11px] text-[#52525b] tracking-[0.4px]">
          {mode === 'login' ? (
            <>Non hai un account?{' '}
              <button onClick={() => switchMode('register')} className="text-[#a1a1aa] underline underline-offset-2">
                Registrati
              </button>
            </>
          ) : (
            <>Hai già un account?{' '}
              <button onClick={() => switchMode('login')} className="text-[#a1a1aa] underline underline-offset-2">
                Accedi
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.169 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
