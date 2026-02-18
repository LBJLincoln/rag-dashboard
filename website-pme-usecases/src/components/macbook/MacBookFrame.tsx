'use client'

import { ReactNode } from 'react'

interface MacBookFrameProps {
  children: ReactNode
  className?: string
}

export function MacBookFrame({ children, className = '' }: MacBookFrameProps) {
  return (
    <div className={`macbook-wrapper ${className}`}>
      {/* Screen */}
      <div className="macbook-screen">
        {/* Notch */}
        <div className="macbook-notch" />

        {/* Screen content */}
        <div className="macbook-content">
          {/* macOS top bar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.06]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            {children}
          </div>
        </div>
      </div>

      {/* Keyboard base */}
      <div className="macbook-base" />
    </div>
  )
}
