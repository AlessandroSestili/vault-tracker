'use client'

import { useState } from 'react'

function guessDomain(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '') + '.com'
  )
}

interface LogoAvatarProps {
  name: string
  fallbackClassName: string
}

export function LogoAvatar({ name, fallbackClassName }: LogoAvatarProps) {
  const [error, setError] = useState(false)
  const initials = name.slice(0, 2).toUpperCase()

  if (!name || error) {
    return (
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${fallbackClassName}`}>
        {initials}
      </div>
    )
  }

  return (
    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
      <img
        src={`https://logo.clearbit.com/${guessDomain(name)}`}
        alt={name}
        className="w-6 h-6 object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}
