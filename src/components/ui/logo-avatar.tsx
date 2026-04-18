'use client'

interface LogoAvatarProps {
  name: string
  fallbackClassName: string
  customImageUrl?: string | null
}

export function LogoAvatar({ name, fallbackClassName, customImageUrl }: LogoAvatarProps) {
  const initials = name.slice(0, 2).toUpperCase()

  if (customImageUrl) {
    return (
      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
        <img src={customImageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${fallbackClassName}`}>
      {initials}
    </div>
  )
}
