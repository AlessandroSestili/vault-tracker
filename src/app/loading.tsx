export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-2 md:py-10 pb-bottom-nav md:pb-10">
      <div className="flex flex-col md:grid md:grid-cols-[1fr_380px] gap-6 md:gap-10 md:items-start">
        {/* Sinistra */}
        <div className="w-full md:space-y-8">
          <div className="pt-2 pb-5 space-y-3">
            <div className="h-3 w-24 rounded-lg bg-white/5 animate-pulse" />
            <div className="h-12 w-48 rounded-xl bg-white/5 animate-pulse" />
            <div className="h-3 w-36 rounded-lg bg-white/5 animate-pulse" />
          </div>
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:p-6 h-52 animate-pulse rounded-2xl bg-card border border-border p-6" />
        </div>
        {/* Destra */}
        <div className="w-full space-y-3">
          <div className="h-3 w-16 rounded-lg bg-white/5 animate-pulse" />
          <div className="md:rounded-2xl md:bg-card md:border md:border-border md:px-3 md:py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-white/[0.04] last:border-0">
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
