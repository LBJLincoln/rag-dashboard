'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Iteration {
  id: string
  label: string
  timestamp: string
  results_summary: Record<string, { tested: number; correct: number; accuracy: number }>
}

interface Props {
  iterations: Iteration[]
}

const PHASES = [
  { id: 1, name: 'Phase 1 — Baseline', questions: '200q', steps: '1/1 → 5/5 → 10/10 → 200q', color: '#0a84ff' },
  { id: 2, name: 'Phase 2 — Expand', questions: '1,200q', steps: '5/5 → 50/50 → 500/500', color: '#bf5af2' },
  { id: 3, name: 'Phase 3 — Scale', questions: '~11Kq', steps: '100/100 → 1K/1K → 10K/10K', color: '#30d158' },
  { id: 4, name: 'Phase 4 — Full HF', questions: '~100Kq', steps: '10K → 100K', color: '#ffd60a' },
  { id: 5, name: 'Phase 5 — Production', questions: '1M+', steps: 'Full scale', color: '#ff9f0a' },
]

function getTrend(iterations: Iteration[], pipeline: string): 'up' | 'down' | 'stable' {
  const accs = iterations
    .filter(it => it.results_summary?.[pipeline])
    .map(it => it.results_summary[pipeline].accuracy)
    .slice(-5)
  if (accs.length < 2) return 'stable'
  const last = accs[accs.length - 1]
  const prev = accs[accs.length - 2]
  if (last > prev + 2) return 'up'
  if (last < prev - 2) return 'down'
  return 'stable'
}

export function PhaseExplorer({ iterations }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number>(1)

  const phaseIterations = iterations.filter(it => {
    const label = (it.label ?? '').toLowerCase()
    if (expandedPhase === 1) return !label.includes('phase2') && !label.includes('phase3')
    if (expandedPhase === 2) return label.includes('phase2')
    return false
  })

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">Phases de test</h2>

      {/* Phase progress bar */}
      <div className="flex items-center gap-1 mb-6 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {PHASES.map((phase, i) => {
          const isActive = phase.id === 1
          const isCurrent = phase.id === 1
          return (
            <button
              key={phase.id}
              onClick={() => setExpandedPhase(phase.id)}
              className={`flex-1 relative px-3 py-2 rounded-xl text-center transition-all ${
                expandedPhase === phase.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: isActive ? phase.color : 'rgba(255,255,255,0.1)',
                    boxShadow: isCurrent ? `0 0 8px ${phase.color}40` : 'none',
                  }}
                />
                <span className="text-[10px] font-medium" style={{ color: isActive ? phase.color : 'var(--tx3)' }}>
                  P{phase.id}
                </span>
              </div>
              <div className="text-[9px] text-tx3">{phase.questions}</div>
              {i < PHASES.length - 1 && (
                <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 text-tx3/30" />
              )}
            </button>
          )
        })}
      </div>

      {/* Iteration list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={expandedPhase}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2"
        >
          {phaseIterations.length === 0 ? (
            <div className="text-center text-tx3 text-[13px] py-8">
              Aucune iteration pour cette phase.
            </div>
          ) : (
            phaseIterations.slice(-10).map((it) => (
              <div
                key={it.id}
                className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-medium text-tx truncate max-w-[60%]">{it.label}</span>
                  <span className="text-[10px] text-tx3 font-mono">
                    {it.timestamp ? new Date(it.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex gap-3">
                  {Object.entries(it.results_summary ?? {}).map(([pipeline, r]) => {
                    const trend = getTrend(iterations, pipeline)
                    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
                    const trendColor = trend === 'up' ? '#30d158' : trend === 'down' ? '#ff453a' : '#86868b'
                    return (
                      <div key={pipeline} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-tx3 capitalize">{pipeline.slice(0, 4)}</span>
                        <span className="text-[12px] font-mono font-medium text-tx">{r.accuracy.toFixed(0)}%</span>
                        <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                        <span className="text-[10px] text-tx3">{r.tested}q</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}
