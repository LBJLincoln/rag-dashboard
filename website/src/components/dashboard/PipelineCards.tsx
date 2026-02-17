'use client'

import { motion } from 'framer-motion'
import { Database, GitBranch, Calculator, Layers, Flame } from 'lucide-react'
import { useEvalStore } from '@/stores/evalStore'

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

const PIPELINE_META: Record<
  string,
  { icon: typeof Database; label: string; color: string; db: string }
> = {
  standard:     { icon: Database,    label: 'Standard RAG', color: '#0a84ff', db: 'Pinecone' },
  graph:        { icon: GitBranch,   label: 'Graph RAG',    color: '#bf5af2', db: 'Neo4j' },
  quantitative: { icon: Calculator,  label: 'Quantitative', color: '#ffd60a', db: 'Supabase' },
  orchestrator: { icon: Layers,      label: 'Orchestrator', color: '#30d158', db: 'Meta-pipeline' },
}

// ---- Accuracy ring -------------------------------------------------------

function AccuracyRing({
  accuracy,
  target,
  color,
  size = 80,
  isRunning = false,
}: {
  accuracy: number
  target: number
  color: string
  size?: number
  isRunning?: boolean
}) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(accuracy / 100, 1)
  const targetPct = Math.min(target / 100, 1)
  const nearTarget = accuracy >= target - 2 && accuracy < target
  const passed = accuracy >= target

  return (
    <motion.svg
      width={size}
      height={size}
      className="transform -rotate-90"
      animate={
        isRunning
          ? {
              filter: [
                'drop-shadow(0 0 4px rgba(255,255,255,0.1))',
                'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                'drop-shadow(0 0 4px rgba(255,255,255,0.1))',
              ],
            }
          : passed
          ? { filter: `drop-shadow(0 0 8px ${color}80)` }
          : nearTarget
          ? {
              filter: [
                `drop-shadow(0 0 4px rgba(255,159,10,0.2))`,
                `drop-shadow(0 0 10px rgba(255,159,10,0.5))`,
                `drop-shadow(0 0 4px rgba(255,159,10,0.2))`,
              ],
            }
          : { filter: 'none' }
      }
      transition={
        isRunning || nearTarget
          ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.4 }
      }
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={6}
      />
      {/* Target line */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={2}
        strokeDasharray={`${targetPct * c} ${c}`}
        strokeLinecap="round"
      />
      {/* Accuracy fill */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        animate={{ strokeDasharray: `${pct * c} ${c}` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

// ---- Pipeline card -------------------------------------------------------

function PipelineCard({
  id,
  p,
  i,
  view,
}: {
  id: string
  p: PipelineData
  i: number
  view: 'overview' | 'detailed'
}) {
  const meta = PIPELINE_META[id]
  const liveStats = useEvalStore(s => s.pipelineStats[id])
  const isRunning = useEvalStore(s => s.isRunning)
  const isLiveActive = isRunning && !!liveStats

  if (!meta) return null
  const Icon = meta.icon

  // Use live stats if available, otherwise fall back to static data
  const displayAccuracy = isLiveActive ? liveStats.accuracy : p.accuracy
  const displayTested = isLiveActive ? liveStats.tested : p.tested
  const displayCorrect = isLiveActive ? liveStats.correct : p.correct
  const displayErrors = p.errors  // not tracked live
  const displayMet = displayAccuracy >= p.target
  const displayGap = displayAccuracy - p.target
  const streak = liveStats?.streak ?? 0

  return (
    <motion.div
      key={id}
      className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
          <span className="text-[13px] font-medium text-tx">{meta.label}</span>
          {/* Streak fire icon */}
          {streak >= 5 && (
            <motion.span
              key={`streak-${streak}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
              title={`${streak} correct streak`}
            >
              <Flame
                className="w-3.5 h-3.5"
                style={{ color: streak >= 20 ? '#bf5af2' : streak >= 10 ? '#ffd60a' : '#ff9f0a' }}
              />
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* LIVE badge when streaming */}
          {isLiveActive && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(48,209,88,0.12)',
                color: '#30d158',
                border: '1px solid rgba(48,209,88,0.25)',
              }}
            >
              <span className="w-1 h-1 rounded-full bg-gn animate-pulse" />
              LIVE
            </motion.span>
          )}

          {/* PASS / FAIL badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: displayMet
                ? 'rgba(48,209,88,0.1)'
                : 'rgba(255,69,58,0.1)',
              color: displayMet ? '#30d158' : '#ff453a',
              border: `1px solid ${displayMet ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
            }}
          >
            {displayMet ? 'PASS' : 'FAIL'}
          </span>
        </div>
      </div>

      {/* Ring + accuracy number */}
      <div className="flex items-center gap-4">
        <AccuracyRing
          accuracy={displayAccuracy}
          target={p.target}
          color={meta.color}
          isRunning={isLiveActive}
        />
        <div>
          <motion.div
            key={displayAccuracy.toFixed(1)}
            className="text-[24px] font-bold font-mono tabular-nums"
            style={{ color: meta.color }}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {displayAccuracy.toFixed(1)}%
          </motion.div>
          <div className="text-[11px] text-tx3">Cible: {p.target}%</div>
          <div className="text-[11px] text-tx3 mt-0.5">
            Gap:{' '}
            <span style={{ color: displayGap >= 0 ? '#30d158' : '#ff453a' }}>
              {displayGap >= 0 ? '+' : ''}
              {displayGap.toFixed(1)}pp
            </span>
          </div>
          {/* Live streak count */}
          {streak > 0 && (
            <div className="text-[10px] text-tx3 mt-0.5">
              Serie:{' '}
              <span
                style={{
                  color:
                    streak >= 10 ? '#ffd60a' : streak >= 5 ? '#ff9f0a' : '#30d158',
                  fontFamily: 'monospace',
                }}
              >
                {streak}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed stats */}
      {view === 'detailed' && (
        <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[15px] font-mono font-semibold text-tx">
              {displayTested}
            </div>
            <div className="text-[10px] text-tx3">Testees</div>
          </div>
          <div>
            <div className="text-[15px] font-mono font-semibold" style={{ color: '#30d158' }}>
              {displayCorrect}
            </div>
            <div className="text-[10px] text-tx3">Correctes</div>
          </div>
          <div>
            <div className="text-[15px] font-mono font-semibold" style={{ color: '#ff453a' }}>
              {displayErrors}
            </div>
            <div className="text-[10px] text-tx3">Erreurs</div>
          </div>
        </div>
      )}

      {/* Live avg latency */}
      {isLiveActive && liveStats.avg_latency_ms > 0 && (
        <div className="mt-2 text-[10px] text-tx3 font-mono">
          Latence moy:{' '}
          <span className="text-tx">{(liveStats.avg_latency_ms / 1000).toFixed(1)}s</span>
        </div>
      )}

      <div className="mt-1 text-[10px] text-tx3">{meta.db}</div>
    </motion.div>
  )
}

// ---- Main export ---------------------------------------------------------

export function PipelineCards({ pipelines, view }: Props) {
  const pipelineIds = ['standard', 'graph', 'quantitative', 'orchestrator']

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
        Pipelines
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {pipelineIds.map((id, i) => {
          const p = pipelines[id]
          if (!p) return null
          return (
            <PipelineCard key={id} id={id} p={p} i={i} view={view} />
          )
        })}
      </div>
    </motion.section>
  )
}
