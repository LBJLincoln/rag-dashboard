import { Bot, Layers, Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ac/30 to-ac/10 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-ac" />
            </div>
            <span className="text-[13px] text-tx2">
              Nomos AI — 200 Use Cases
            </span>
            <span className="text-[11px] text-tx3 font-mono">v1.0</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-tx3">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              10 categories
            </span>
            <span className="w-[3px] h-[3px] rounded-full bg-tx3/50" />
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              200 automatisations
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
