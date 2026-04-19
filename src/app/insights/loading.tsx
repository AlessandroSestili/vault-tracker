const W = 310
const H = 280
const CX = W / 2
const CY = H / 2
const INCLINE = 0.28

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100svh-56px)] pb-bottom-nav md:pb-0 py-8 px-5">
      <div className="flex flex-col items-center gap-8">
        <div className="relative" style={{ width: W, height: H }}>
          <svg width={W} height={H} className="absolute inset-0" overflow="visible">
            {[52, 78, 104].map((rx) => (
              <ellipse
                key={rx}
                cx={CX} cy={CY}
                rx={rx} ry={rx * INCLINE}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div
            className="absolute rounded-full bg-white/5 animate-pulse"
            style={{ width: 92, height: 92, left: CX - 46, top: CY - 46 }}
          />
        </div>

        <div className="w-full max-w-[310px] border-t border-white/[0.08]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-[2px] bg-white/10" />
                <div className="h-3.5 w-20 rounded bg-white/5 animate-pulse" />
              </div>
              <div className="h-3.5 w-32 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
