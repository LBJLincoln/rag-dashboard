'use client'

import { useEffect, useState } from 'react'
import { Bot, Sun, Moon } from 'lucide-react'

export function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('nomos-theme') as 'dark' | 'light' | null
    if (saved === 'light') {
      setTheme('light')
      document.documentElement.classList.add('light')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('nomos-theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ac/30 to-ac/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-ac" />
          </div>
          <span className="font-medium text-tx text-[15px] tracking-tight">
            Nomos AI
          </span>
          <span className="text-[11px] text-tx3 font-mono px-1.5 py-0.5 rounded bg-white/[0.04]">
            PME
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[13px] text-tx2">
          <a href="#connecteurs" className="hover:text-tx transition-colors duration-200">
            Connecteurs
          </a>
          <a href="https://nomos-ai-pied.vercel.app" className="hover:text-tx transition-colors duration-200">
            Version Sectorielle
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-tx2 hover:text-tx hover:bg-white/[0.06] transition-all duration-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gn/10 border border-gn/20">
            <div className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            <span className="text-[11px] text-gn font-medium">Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}
