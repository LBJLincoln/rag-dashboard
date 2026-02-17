import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

// ---- Types ---------------------------------------------------------------

export interface QuestionResult {
  id: string
  rag_type: 'standard' | 'graph' | 'quantitative' | 'orchestrator'
  question: string
  expected: string
  answer: string
  correct: boolean
  f1: number
  latency_ms: number
  error_type: string | null
  match_type: string
  timestamp: string
  seq: number
}

export interface PipelineLiveStats {
  tested: number
  correct: number
  accuracy: number       // rolling, recomputed per question
  avg_latency_ms: number
  avg_f1: number
  streak: number         // consecutive correct answers
  p95_latency_ms: number
}

export interface IterationSummary {
  id: string
  label: string
  number: number
  timestamp_start: string
  timestamp_end: string | null
  total_tested: number
  overall_accuracy_pct: number
  results_summary: Record<string, {
    tested: number
    correct: number
    accuracy_pct: number
    avg_latency_ms: number
    avg_f1: number
  }>
}

// ---- XP Level System -----------------------------------------------------

export interface XPLevel {
  level: number        // 1–7
  label: string        // "1q" | "5q" | "10q" | "50q" | "100q" | "500q" | "1000q"
  min: number          // question count threshold
  max: number
  color: string
  title: string
  icon: string
}

export const XP_LEVELS: XPLevel[] = [
  { level: 1, label: '1q',    min: 0,    max: 1,     color: '#86868b', title: 'Smoke Test',    icon: 'zap' },
  { level: 2, label: '5q',    min: 2,    max: 5,     color: '#0a84ff', title: 'Quick Check',   icon: 'check-circle' },
  { level: 3, label: '10q',   min: 6,    max: 10,    color: '#30d158', title: 'Validation',    icon: 'shield-check' },
  { level: 4, label: '50q',   min: 11,   max: 50,    color: '#ffd60a', title: 'Solid Run',     icon: 'target' },
  { level: 5, label: '100q',  min: 51,   max: 100,   color: '#ff9f0a', title: 'Phase Test',    icon: 'trending-up' },
  { level: 6, label: '500q',  min: 101,  max: 500,   color: '#bf5af2', title: 'Codespace Run', icon: 'server' },
  { level: 7, label: '1000q', min: 501,  max: 10000, color: '#ff453a', title: 'Full Scale',    icon: 'crown' },
]

export function computeXPLevel(questionCount: number): XPLevel {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (questionCount >= XP_LEVELS[i].min) return XP_LEVELS[i]
  }
  return XP_LEVELS[0]
}

// ---- Pipeline stats computation ------------------------------------------

export function computePipelineStats(
  questions: QuestionResult[]
): Record<string, PipelineLiveStats> {
  const byPipeline: Record<string, QuestionResult[]> = {}
  for (const q of questions) {
    if (!byPipeline[q.rag_type]) byPipeline[q.rag_type] = []
    byPipeline[q.rag_type].push(q)
  }

  const stats: Record<string, PipelineLiveStats> = {}
  for (const [pipeline, qs] of Object.entries(byPipeline)) {
    const tested = qs.length
    const correct = qs.filter(q => q.correct).length
    const latencies = qs.map(q => q.latency_ms).sort((a, b) => a - b)
    const f1s = qs.map(q => q.f1).filter(f => f > 0)

    // Compute streak: count consecutive correct from the end
    let streak = 0
    for (let i = qs.length - 1; i >= 0; i--) {
      if (qs[i].correct) streak++
      else break
    }

    stats[pipeline] = {
      tested,
      correct,
      accuracy: tested > 0 ? Math.round((correct / tested) * 1000) / 10 : 0,
      avg_latency_ms:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0,
      p95_latency_ms:
        latencies.length > 1
          ? latencies[Math.floor(latencies.length * 0.95)]
          : latencies[0] ?? 0,
      avg_f1:
        f1s.length > 0
          ? Math.round((f1s.reduce((a, b) => a + b, 0) / f1s.length) * 1000) / 1000
          : 0,
      streak,
    }
  }
  return stats
}

// ---- Feed item types (for VirtualizedFeedList) ---------------------------

export interface FeedItem {
  type: 'question' | 'separator' | 'milestone'
  key: string
  question?: QuestionResult
  label?: string
  timestamp?: string
  milestone?: {
    pipelineName: string
    accuracy: number
    target: number
    direction: 'pass' | 'fail'
  }
}

export const PIPELINE_TARGETS: Record<string, number> = {
  standard:     85,
  graph:        70,
  quantitative: 85,
  orchestrator: 70,
}

export function buildFeedItems(
  questions: QuestionResult[],
  pipelineTargets: Record<string, number> = PIPELINE_TARGETS
): FeedItem[] {
  const items: FeedItem[] = []
  let lastPipeline: string | null = null
  const rollingAcc: Record<string, { tested: number; correct: number }> = {}

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]

    // Pipeline separator when switching pipeline
    if (q.rag_type !== lastPipeline) {
      if (lastPipeline !== null) {
        items.push({
          type: 'separator',
          key: `sep-${i}`,
          label: `→ ${q.rag_type.toUpperCase()}`,
          timestamp: q.timestamp,
        })
      }
      lastPipeline = q.rag_type
    }

    // Accumulate rolling accuracy
    if (!rollingAcc[q.rag_type]) {
      rollingAcc[q.rag_type] = { tested: 0, correct: 0 }
    }
    rollingAcc[q.rag_type].tested++
    if (q.correct) rollingAcc[q.rag_type].correct++

    // Milestone: accuracy crosses target threshold (only at 10+ tested)
    const acc = rollingAcc[q.rag_type]
    const target = pipelineTargets[q.rag_type] ?? 75
    const currentAcc = (acc.correct / acc.tested) * 100
    const prevCorrect = acc.correct - (q.correct ? 1 : 0)
    const prevTested = acc.tested - 1
    const prevAcc = prevTested > 0 ? (prevCorrect / prevTested) * 100 : 0

    if (acc.tested >= 10) {
      if (prevAcc < target && currentAcc >= target) {
        items.push({
          type: 'milestone',
          key: `milestone-pass-${i}`,
          milestone: {
            pipelineName: q.rag_type,
            accuracy: currentAcc,
            target,
            direction: 'pass',
          },
        })
      } else if (prevAcc >= target && currentAcc < target) {
        items.push({
          type: 'milestone',
          key: `milestone-fail-${i}`,
          milestone: {
            pipelineName: q.rag_type,
            accuracy: currentAcc,
            target,
            direction: 'fail',
          },
        })
      }
    }

    items.push({ type: 'question', key: q.id, question: q })
  }

  return items
}

// ---- Store ---------------------------------------------------------------

interface EvalStore {
  // Connection state
  connectionStatus: 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error'
  sseSeq: number

  // Current session
  currentIteration: IterationSummary | null
  isRunning: boolean
  elapsedMs: number

  // Live question feed (sliding window — max 500 in memory)
  questions: QuestionResult[]
  WINDOW_SIZE: number

  // Per-pipeline live stats (computed from questions[])
  pipelineStats: Record<string, PipelineLiveStats>

  // Historical iterations (from data.json, last 42)
  iterations: IterationSummary[]

  // Current XP level based on question count
  xpLevel: XPLevel
  prevXpLevel: XPLevel | null
  levelUpTriggered: boolean

  // Actions
  setConnectionStatus: (s: EvalStore['connectionStatus']) => void
  appendQuestion: (q: QuestionResult) => void
  setCurrentIteration: (it: IterationSummary) => void
  setIterations: (its: IterationSummary[]) => void
  setIsRunning: (v: boolean) => void
  clearLevelUpTrigger: () => void
  tick: () => void
}

export const useEvalStore = create<EvalStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      connectionStatus: 'idle' as const,
      sseSeq: 0,
      currentIteration: null,
      isRunning: false,
      elapsedMs: 0,
      questions: [],
      WINDOW_SIZE: 500,
      pipelineStats: {},
      iterations: [],
      xpLevel: XP_LEVELS[0],
      prevXpLevel: null,
      levelUpTriggered: false,

      setConnectionStatus: (s) =>
        set(state => {
          state.connectionStatus = s
        }),

      appendQuestion: (q) =>
        set(state => {
          // Sliding window: discard oldest when over limit
          if (state.questions.length >= state.WINDOW_SIZE) {
            state.questions.shift()
          }
          state.questions.push(q)
          state.sseSeq = q.seq + 1

          // Recompute pipeline stats
          state.pipelineStats = computePipelineStats(state.questions)

          // Recompute XP level based on total tested
          const totalTested = state.questions.length
          const newLevel = computeXPLevel(totalTested)
          if (newLevel.level > state.xpLevel.level) {
            state.prevXpLevel = state.xpLevel
            state.levelUpTriggered = true
          }
          state.xpLevel = newLevel

          // Update current iteration optimistically
          if (state.currentIteration) {
            state.currentIteration.total_tested =
              (state.currentIteration.total_tested ?? 0) + 1
          }
        }),

      setCurrentIteration: (it) =>
        set(state => {
          state.currentIteration = it
          state.isRunning = true
        }),

      setIterations: (its) =>
        set(state => {
          state.iterations = its
        }),

      setIsRunning: (v) =>
        set(state => {
          state.isRunning = v
          if (!v) state.elapsedMs = 0
        }),

      clearLevelUpTrigger: () =>
        set(state => {
          state.levelUpTriggered = false
          state.prevXpLevel = null
        }),

      tick: () =>
        set(state => {
          if (state.isRunning) state.elapsedMs += 1000
        }),
    }))
  )
)
