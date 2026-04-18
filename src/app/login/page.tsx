'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col px-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Logo block */}
      <div className="flex flex-col items-center mt-[calc(60px+env(safe-area-inset-top))] mb-auto">
        <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center mb-7">
          <span className="font-mono text-[22px] font-bold text-[#09090b]">V</span>
        </div>
        <h1 className="text-[22px] font-medium tracking-[-0.4px] text-[#fafafa] mb-1.5">
          Vault Tracker
        </h1>
        <p className="font-mono text-[11px] text-[#71717a] tracking-[1px] uppercase">
          Il tuo patrimonio, privato
        </p>
      </div>

      {/* Form */}
      <div className="pb-10" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
        <label className="block font-mono text-[10px] tracking-[2px] uppercase text-[#71717a] mb-2.5">
          Password
        </label>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="flex items-center bg-[#111113] border border-white/[0.06] rounded-xl px-3.5">
            <Lock className="w-4 h-4 text-[#71717a] shrink-0" strokeWidth={1.5} />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent border-none outline-none px-3 py-4 font-mono text-[16px] tracking-[2px] text-[#fafafa] placeholder:text-[#52525b]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="p-1 text-[#71717a]"
              aria-label={showPw ? 'Nascondi' : 'Mostra'}
            >
              {showPw ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          </div>

          {error && (
            <p className="text-[#ef4444] text-sm text-center">Password errata</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 rounded-xl bg-[#fafafa] text-[#09090b] font-medium text-[15px] tracking-[-0.1px] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Accesso in corso…' : 'Accedi'}
          </button>

          <p className="text-center font-mono text-[11px] text-[#71717a] tracking-[0.4px]">
            Accesso biometrico disponibile
          </p>
        </form>
      </div>
    </div>
  )
}
