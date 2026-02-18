'use client'

import { Search, Command } from 'lucide-react'

interface SpotlightBarProps {
  placeholder?: string
  onClick: () => void
}

export function SpotlightBar({ placeholder = 'Posez votre question...', onClick }: SpotlightBarProps) {
  return (
    <button
      onClick={onClick}
      className="spotlight-bar group"
      aria-label="Ouvrir le chatbot"
    >
      {/* Search icon */}
      <Search className="w-4 h-4 text-tx3 group-hover:text-tx2 transition-colors shrink-0" />

      {/* Placeholder text */}
      <span className="flex-1 text-left text-[14px] text-tx3 group-hover:text-tx2 transition-colors truncate">
        {placeholder}
      </span>

      {/* Keyboard shortcut */}
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] text-tx3 font-mono shrink-0">
        <Command className="w-3 h-3" />
        K
      </span>
    </button>
  )
}
