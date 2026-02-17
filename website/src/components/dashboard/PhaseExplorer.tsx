'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Check, X, Lock } from 'lucide-react'

// ---- Types ---------------------------------------------------------------

interface PipelineData {
  accuracy: number
  tested: number
  correct: number
  errors: number
  target: number
  met: boolean
  gap: number
}

interface DashboardData {
  generated_at?: string
  phase?: { current: number; name: string; gates_passed: boolean }
  pipelines?: Record<string, PipelineData>
  overall?: { accuracy: number; target: number; met: boolean }
  blockers?: string[]
  last_iteration?: { id: string; label: string; timestamp: string }
  totals?: { unique_questions: number; test_runs: number; iterations: number }
  // Legacy shape (page.tsx wraps it under status/meta)
  status?: {
    pipelines?: Record<string, PipelineData>
    overall?: { accuracy: number; target: number; met: boolean }
    phase?: { current: number; name: string }
  }
}

interface Props {
  data: DashboardData
}

// ---- Phase definitions ---------------------------------------------------

interface PhaseGate {
  pipeline: string
  label: string
  target: number
}

interface PhaseDefinition {
  id: number
  name: string
  questions: string
  color: string
  gates: PhaseGate[]
}

const PHASES: PhaseDefinition[] = [
  {
    id: 1,
    name: 'Baseline',
    questions: '200q',
    color: '#0a84ff',
    gates: [
      { pipeline: 'standard',     label: 'Standard',     target: 85 },
      { pipeline: 'graph',        label: 'Graph',        target: 70 },
      { pipeline: 'quantitative', label: 'Quantitative', target: 85 },
      { pipeline: 'overall',      label: 'Overall',      target: 75 },
    ],
  },
  {
    id: 2,
    name: 'Intermediate',
    questions: '500q',
    color: '#bf5af2',
    gates: [
      { pipeline: 'standard',     label: 'Standard',     target: 88 },
      { pipeline: 'graph',        label: 'Graph',        target: 75 },
      { pipeline: 'quantitative', label: 'Quantitative', target: 88 },
      { pipeline: 'overall',      label: 'Overall',      target: 80 },
    ],
  },
  {
    id: 3,
    name: 'Extended',
    questions: '1 000q',
    color: '#30d158',
    gates: [
      { pipeline: 'standard',     label: 'Standard',     target: 90 },
      { pipeline: 'graph',        label: 'Graph',        target: 80 },
      { pipeline: 'quantitative', label: 'Quantitative', target: 90 },
      { pipeline: 'overall',      label: 'Overall',      target: 85 },
    ],
  },
  {
    id: 4,
    name: 'Stress Test',
    questions: '10 000q',
    color: '#ffd60a',
    gates: [
      { pipeline: 'standard',     label: 'Standard',     target: 92 },
      { pipeline: 'graph',        label: 'Graph',        target: 83 },
      { pipeline: 'quantitative', label: 'Quantitative', target: 92 },
      { pipeline: 'overall',      label: 'Overall',      target: 88 },
    ],
  },
  {
    id: 5,
    name: 'Production',
    questions: '1M+',
    color: '#ff9f0a',
    gates: [
      { pipeline: 'standard',     label: 'Standard',     target: 95 },
      { pipeline: 'graph',        label: 'Graph',        target: 88 },
      { pipeline: 'quantitative', label: 'Quantitative', target: 95 },
      { pipeline: 'overall',      label: 'Overall',      target: 92 },
    ],
  },
]

// ---- Animated bar --------------------------------------------------------

function AnimatedBar({
  pct,
  color,
  locked,
}: {
  pct: number
  color: string
  locked: boolean
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (locked) return
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), 80)
    return () => clearTimeout(t)
  }, [pct, locked])

  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div
        ref={barRef}
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          backgroundColor: locked ? 'rgba(255,255,255,0.06)' : color,
          transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: locked ? 'none' : `0 0 8px ${color}60`,
        }}
      />
    </div>
  )
}

// ---- Gate row ------------------------------------------------------------

function GateRow({
  gate,
  accuracy,
  locked,
  phaseColor,
}: {
  gate: PhaseGate
  accuracy: number | null
  locked: boolean
  phaseColor: string
}) {
  const met = accuracy !== null && accuracy >= gate.target
  const gap = accuracy !== null ? accuracy - gate.target : null
  const barColor = locked ? 'rgba(255,255,255,0.08)' : met ? '#30d158' : '#ff453a'
  const pct = accuracy !== null ? (accuracy / 100) * 100 : 0

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Status icon */}
      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {locked ? (
          <Lock className="w-3 h-3 text-white/20" />
        ) : met ? (
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(48,209,88,0.15)', border: '1px solid rgba(48,209,88,0.3)' }}>
            <Check className="w-2.5 h-2.5 text-gn" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)' }}>
            <X className="w-2.5 h-2.5 text-rd" />
          </div>
        )}
      </div>

      {/* Label + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-tx2">{gate.label} ≥{gate.target}%</span>
          <div className="flex items-center gap-2">
            {!locked && accuracy !== null && (
              <span
                className="text-[10px] font-mono font-medium"
                style={{ color: met ? '#30d158' : '#ff453a' }}
              >
                {accuracy.toFixed(1)}%
                {gap !== null && (
                  <span className="ml-1 opacity-70">
                    ({gap >= 0 ? '+' : ''}{gap.toFixed(1)}pp)
                  </span>
                )}
              </span>
            )}
            {locked && <span className="text-[10px] text-white/20 font-mono">—</span>}
          </div>
        </div>
        <AnimatedBar pct={pct} color={barColor} locked={locked} />
      </div>
    </div>
  )
}

// ---- Phase row -----------------------------------------------------------

function PhaseRow({
  phase,
  currentPhase,
  pipelines,
  overall,
  isExpanded,
  onToggle,
}: {
  phase: PhaseDefinition
  currentPhase: number
  pipelines: Record<string, PipelineData>
  overall: { accuracy: number; target: number; met: boolean } | undefined
  isExpanded: boolean
  onToggle: () => void
}) {
  const isActive = phase.id === currentPhase
  const isLocked = phase.id > currentPhase
  const isPast = phase.id < currentPhase

  // Compute per-gate accuracy
  function getAccuracy(pipeline: string): number | null {
    if (isLocked) return null
    if (pipeline === 'overall') return overall?.accuracy ?? null
    return pipelines[pipeline]?.accuracy ?? null
  }

  // Overall completion pct for phase header bar
  let headerPct = 0
  let passedGates = 0
  if (!isLocked) {
    phase.gates.forEach(g => {
      const acc = getAccuracy(g.pipeline)
      if (acc !== null && acc >= g.target) passedGates++
    })
    headerPct = isPast ? 100 : (passedGates / phase.gates.length) * 100
  }

  const statusLabel = isLocked
    ? 'Locked'
    : isPast
    ? 'COMPLETE'
    : passedGates === phase.gates.length
    ? 'PASS'
    : 'IN PROGRESS'

  const statusColor = isLocked
    ? 'rgba(255,255,255,0.15)'
    : isPast
    ? '#30d158'
    : passedGates === phase.gates.length
    ? '#30d158'
    : passedGates > 0
    ? phase.color
    : '#ff453a'

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-colors"
      style={{
        borderColor: isActive
          ? `${phase.color}30`
          : 'rgba(255,255,255,0.06)',
        backgroundColor: isActive
          ? `${phase.color}08`
          : 'rgba(255,255,255,0.01)',
      }}
    >
      {/* Phase header — clickable */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Phase number dot */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{
            backgroundColor: isLocked ? 'rgba(255,255,255,0.04)' : `${phase.color}20`,
            border: `1px solid ${isLocked ? 'rgba(255,255,255,0.08)' : `${phase.color}40`}`,
            color: isLocked ? 'rgba(255,255,255,0.2)' : phase.color,
          }}
        >
          {phase.id}
        </div>

        {/* Name + questions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[13px] font-medium"
              style={{ color: isLocked ? 'rgba(255,255,255,0.2)' : 'var(--tx)' }}
            >
              Phase {phase.id}: {phase.name}
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md"
              style={{
                backgroundColor: isLocked ? 'rgba(255,255,255,0.04)' : `${phase.color}15`,
                color: isLocked ? 'rgba(255,255,255,0.2)' : phase.color,
              }}
            >
              {phase.questions}
            </span>
          </div>
          {/* Header progress bar */}
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isLocked ? 'rgba(255,255,255,0.04)' : phase.color }}
              initial={{ width: 0 }}
              animate={{ width: `${headerPct}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.1 * phase.id }}
            />
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full"
            style={{
              color: statusColor,
              backgroundColor: `${statusColor}15`,
              border: `1px solid ${statusColor}30`,
            }}
          >
            {statusLabel}
          </span>
          {isLocked ? (
            <Lock className="w-3.5 h-3.5 text-white/20" />
          ) : isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/40" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          )}
        </div>
      </button>

      {/* Expanded gate list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/[0.04]">
              <div className="pt-3 space-y-0.5">
                {phase.gates.map(gate => (
                  <GateRow
                    key={gate.pipeline}
                    gate={gate}
                    accuracy={getAccuracy(gate.pipeline)}
                    locked={isLocked}
                    phaseColor={phase.color}
                  />
                ))}
              </div>
              {!isLocked && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] text-white/30">
                    {passedGates}/{phase.gates.length} gates validees
                  </span>
                  {isActive && passedGates < phase.gates.length && (
                    <span className="text-[10px]" style={{ color: phase.color }}>
                      {phase.gates.length - passedGates} gate{phase.gates.length - passedGates > 1 ? 's' : ''} restante{phase.gates.length - passedGates > 1 ? 's' : ''}
                    </span>
                  )}
                  {isActive && passedGates === phase.gates.length && (
                    <span className="text-[10px] text-gn">Toutes les gates passees ✓</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Main component ------------------------------------------------------

export function PhaseExplorer({ data }: Props) {
  // Support both flat shape (status.json) and wrapped shape (page.tsx DashboardData)
  const pipelines: Record<string, PipelineData> =
    (data.pipelines ?? data.status?.pipelines ?? {}) as Record<string, PipelineData>

  const overall = data.overall ?? data.status?.overall

  const currentPhase =
    data.phase?.current ?? data.status?.phase?.current ?? 1

  // Default: expand the active phase
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(
    new Set([currentPhase])
  )

  function togglePhase(id: number) {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="space-y-2">
        {PHASES.map(phase => (
          <PhaseRow
            key={phase.id}
            phase={phase}
            currentPhase={currentPhase}
            pipelines={pipelines}
            overall={overall}
            isExpanded={expandedPhases.has(phase.id)}
            onToggle={() => togglePhase(phase.id)}
          />
        ))}
      </div>
    </motion.section>
  )
}
