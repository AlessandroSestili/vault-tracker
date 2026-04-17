'use client'

import { useState } from 'react'

function guessDomain(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') + '.com'
}

interface LogoAvatarProps {
  name: string
  fallbackClassName: string
  customImageUrl?: string | null
}

export function LogoAvatar({ name, fallbackClassName, customImageUrl }: LogoAvatarProps) {
  const [clearbitError, setClearbitError] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()

  // 1. Custom image uploaded by user
  if (customImageUrl) {
    return (
      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
        <img src={customImageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    )
  }

  // 2. Clearbit auto-logo
  if (!clearbitError && name) {
    return (
      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
        <img
          src={`https://logo.clearbit.com/${guessDomain(name)}`}
          alt={name}
          className="w-6 h-6 object-contain"
          onError={() => setClearbitError(true)}
        />
      </div>
    )
  }

  // 3. Fallback iniziali colorate
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${fallbackClassName}`}>
      {initials}
    </div>
  )
}
