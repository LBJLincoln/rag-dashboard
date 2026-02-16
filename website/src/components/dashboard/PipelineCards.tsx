'use client'

import { motion } from 'framer-motion'
import { Database, GitBranch, Calculator, Layers } from 'lucide-react'

interface PipelineData {
  accuracy: number
  target: number
  met: boolean
  tested: number
  correct: number
  errors: number
  gap: number
}

interface Props {
  pipelines: Record<string, PipelineData>
  view: 'overview' | 'detailed'
}

const PIPELINE_META: Record<string, { icon: typeof Database; label: string; color: string; db: string }> = {
  standard: { icon: Database, label: 'Standard RAG', color: '#0a84ff', db: 'Pinecone' },
  graph: { icon: GitBranch, label: 'Graph RAG', color: '#bf5af2', db: 'Neo4j' },
  quantitative: { icon: Calculator, label: 'Quantitative', color: '#ffd60a', db: 'Supabase' },
  orchestrator: { icon: Layers, label: 'Orchestrator', color: '#30d158', db: 'Meta-pipeline' },
}

function AccuracyRing({ accuracy, target, color, size = 80 }: { accuracy: number; target: number; color: string; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(accuracy / 100, 1)
  const targetPct = Math.min(target / 100, 1)

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      {/* Target line */}
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={2}
        strokeDasharray={`${targetPct * c} ${c}`}
        strokeLinecap="round"
      />
      {/* Accuracy ring */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${pct * c} ${c}`}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        animate={{ strokeDasharray: `${pct * c} ${c}` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

export function PipelineCards({ pipelines, view }: Props) {
  const pipelineIds = ['standard', 'graph', 'quantitative', 'orchestrator']

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">Pipelines</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineIds.map((id, i) => {
          const p = pipelines[id]
          const meta = PIPELINE_META[id]
          if (!p || !meta) return null
          const Icon = meta.icon

          return (
            <motion.div
              key={id}
              className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-[13px] font-medium text-tx">{meta.label}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: p.met ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)',
                    color: p.met ? '#30d158' : '#ff453a',
                    border: `1px solid ${p.met ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
                  }}
                >
                  {p.met ? 'PASS' : 'FAIL'}
                </span>
              </div>

              {/* Ring + accuracy */}
              <div className="flex items-center gap-4">
                <AccuracyRing accuracy={p.accuracy} target={p.target} color={meta.color} />
                <div>
                  <div className="text-[24px] font-bold font-mono tabular-nums" style={{ color: meta.color }}>
                    {p.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-tx3">Cible: {p.target}%</div>
                  <div className="text-[11px] text-tx3 mt-0.5">
                    Gap: <span style={{ color: p.gap >= 0 ? '#30d158' : '#ff453a' }}>
                      {p.gap >= 0 ? '+' : ''}{p.gap.toFixed(1)}pp
                    </span>
                  </div>
                </div>
              </div>

              {view === 'detailed' && (
                <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[15px] font-mono font-semibold text-tx">{p.tested}</div>
                    <div className="text-[10px] text-tx3">Testees</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-mono font-semibold text-gn">{p.correct}</div>
                    <div className="text-[10px] text-tx3">Correctes</div>
                  </div>
                  <div>
                    <div className="text-[15px] font-mono font-semibold text-rd">{p.errors}</div>
                    <div className="text-[10px] text-tx3">Erreurs</div>
                  </div>
                </div>
              )}

              <div className="mt-3 text-[10px] text-tx3">{meta.db}</div>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
