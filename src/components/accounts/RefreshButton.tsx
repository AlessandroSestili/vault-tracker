'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      title="Refresh prices"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
    </Button>
  )
}
