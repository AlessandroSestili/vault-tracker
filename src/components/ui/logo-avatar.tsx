'use client'

interface LogoAvatarProps {
  name: string
  catColor?: string
  size?: number
  customImageUrl?: string | null
  /** @deprecated use catColor instead */
  fallbackClassName?: string
}

export function LogoAvatar({ name, catColor, size = 38, customImageUrl }: LogoAvatarProps) {
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const px = `${size}px`
  const dotSize = `${Math.round(size * 0.29)}px`

  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      {customImageUrl ? (
        <img
          src={customImageUrl}
          alt={name}
          className="rounded-full object-cover border border-white/[0.06]"
          style={{ width: px, height: px }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center border border-white/[0.06] bg-[#1a1a1d] text-[#d4d4d8] font-medium"
          style={{ width: px, height: px, fontSize: `${Math.round(size * 0.36)}px` }}
        >
          {initials}
        </div>
      )}
      {catColor && (
        <div
          className="absolute rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            right: '-1px',
            bottom: '-1px',
            backgroundColor: catColor,
            boxShadow: '0 0 0 2px #09090b',
          }}
        />
      )}
    </div>
  )
}
