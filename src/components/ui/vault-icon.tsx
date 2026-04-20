export function VaultIcon({ size = 18 }: { size?: number }) {
  const s = size
  const cx = s / 2
  const r = s * 0.42        // outer ring radius
  const boltR = s * 0.075   // bolt radius
  const dialR = s * 0.13    // center dial radius
  const spokeLen = s * 0.27
  const gold = '#f59e0b'
  const goldDim = 'rgba(245,158,11,0.3)'
  const dark = '#0c0a09'

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx={cx} cy={cx} r={r} stroke={gold} strokeWidth={s * 0.055} fill={dark} />
      {/* Spokes */}
      <line x1={cx - spokeLen / 2} y1={cx} x2={cx + spokeLen / 2} y2={cx} stroke={goldDim} strokeWidth={s * 0.045} strokeLinecap="round" />
      <line x1={cx} y1={cx - spokeLen / 2} x2={cx} y2={cx + spokeLen / 2} stroke={goldDim} strokeWidth={s * 0.045} strokeLinecap="round" />
      {/* Center dial ring */}
      <circle cx={cx} cy={cx} r={dialR} stroke={gold} strokeWidth={s * 0.045} fill={dark} />
      {/* Center dot */}
      <circle cx={cx} cy={cx} r={dialR * 0.45} fill={gold} />
      {/* Bolts N/S/E/W */}
      <circle cx={cx} cy={cx - r} r={boltR} fill={gold} />
      <circle cx={cx} cy={cx + r} r={boltR} fill={gold} />
      <circle cx={cx + r} cy={cx} r={boltR} fill={gold} />
      <circle cx={cx - r} cy={cx} r={boltR} fill={gold} />
    </svg>
  )
}
