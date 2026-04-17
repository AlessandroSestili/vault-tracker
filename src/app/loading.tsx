export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-8 py-10">
      <div className="grid grid-cols-[1fr_360px] gap-10 items-start">
        {/* Sinistra */}
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="h-4 w-20 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-12 w-64 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-3 w-40 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="rounded-2xl bg-card border border-border p-6 h-64 animate-pulse" />
        </div>
        {/* Destra */}
        <div className="space-y-3">
          <div className="h-4 w-16 rounded-lg bg-white/5 animate-pulse" />
          <div className="rounded-2xl bg-card border border-border p-3 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
                </div>
                <div className="text-right space-y-1.5">
                  <div className="h-3.5 w-20 rounded bg-white/5 animate-pulse" />
                  <div className="h-3 w-12 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
