'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      title="Aggiorna prezzi"
      className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} strokeWidth={1.5} />
    </button>
  )
}
