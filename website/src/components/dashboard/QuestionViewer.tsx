'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, AlertTriangle, Clock, Brain, ChevronDown, Flame } from 'lucide-react'

// TODO: Replace MOCK_QUESTIONS with real API data from /api/dashboard/questions

// ---- Types ---------------------------------------------------------------

interface MockQuestion {
  id: number
  question: string
  correct: boolean
  pipeline: 'standard' | 'graph' | 'quantitative' | 'orchestrator'
  score: number
  duration_ms: number
  iteration: number
}

interface Question {
  question_id?: string
  question?: string
  expected?: string
  got?: string
  correct?: boolean
  f1?: number
  latency_ms?: number
  rag_type?: string
  match_method?: string
  error_type?: string
  iteration_label?: string
}

interface Props {
  questions: Record<string, unknown>[]
}

// ---- Mock data -----------------------------------------------------------

const MOCK_QUESTIONS: MockQuestion[] = [
  { id: 1,  question: "Quelles sont les normes DTU pour les fondations en zone sismique?",          correct: true,  pipeline: "standard",     score: 0.91, duration_ms: 3200,  iteration: 42 },
  { id: 2,  question: "Calculer le LCR (Liquidity Coverage Ratio) selon Basel III?",               correct: false, pipeline: "quantitative", score: 0.43, duration_ms: 4800,  iteration: 42 },
  { id: 3,  question: "Quelle relation lie la societe Renault a ses fournisseurs tier-1?",         correct: true,  pipeline: "graph",        score: 0.87, duration_ms: 5100,  iteration: 42 },
  { id: 4,  question: "Comment calculer le ratio de solvabilite Tier 1 selon CRR2?",               correct: true,  pipeline: "quantitative", score: 0.79, duration_ms: 3900,  iteration: 42 },
  { id: 5,  question: "Quelle est la procedure de recouvrement d'une creance commerciale?",        correct: true,  pipeline: "standard",     score: 0.93, duration_ms: 2700,  iteration: 42 },
  { id: 6,  question: "Quel pipeline choisir pour une question sur les brevets d'entreprise?",     correct: true,  pipeline: "orchestrator", score: 0.88, duration_ms: 6200,  iteration: 42 },
  { id: 7,  question: "Decrire le processus de certification CE pour equipements industriels.",    correct: false, pipeline: "standard",     score: 0.51, duration_ms: 3100,  iteration: 42 },
  { id: 8,  question: "Quels liens existent entre Total Energies et ses filiales offshore?",       correct: true,  pipeline: "graph",        score: 0.82, duration_ms: 4700,  iteration: 42 },
  { id: 9,  question: "Calculer l'amortissement lineaire d'un actif de 50 000 EUR sur 5 ans.",    correct: true,  pipeline: "quantitative", score: 0.96, duration_ms: 2100,  iteration: 42 },
  { id: 10, question: "Quelles sont les obligations RGPD pour un sous-traitant de donnees?",      correct: false, pipeline: "standard",     score: 0.38, duration_ms: 3400,  iteration: 42 },
  { id: 11, question: "Identifier les parties prenantes liees a un contrat de maintenance.",       correct: true,  pipeline: "graph",        score: 0.76, duration_ms: 5500,  iteration: 42 },
  { id: 12, question: "Quel est le delai legal de prescription pour un contrat commercial?",       correct: true,  pipeline: "orchestrator", score: 0.90, duration_ms: 4100,  iteration: 41 },
  { id: 13, question: "Norme ISO 9001 : quelles exigences pour la revue de direction?",           correct: true,  pipeline: "standard",     score: 0.85, duration_ms: 2900,  iteration: 41 },
  { id: 14, question: "Calculer le taux de rendement interne (TRI) d'un investissement.",        correct: false, pipeline: "quantitative", score: 0.47, duration_ms: 5300,  iteration: 41 },
  { id: 15, question: "Quels sont les actionnaires majoritaires de BNP Paribas en 2024?",         correct: true,  pipeline: "graph",        score: 0.78, duration_ms: 4600,  iteration: 41 },
]

// ---- Pipeline config -----------------------------------------------------

const PIPELINE_META: Record<string, { label: string; color: string }> = {
  standard:     { label: 'Standard',     color: '#0a84ff' },
  graph:        { label: 'Graph',        color: '#bf5af2' },
  quantitative: { label: 'Quantitative', color: '#ffd60a' },
  orchestrator: { label: 'Orchestrator', color: '#30d158' },
}

const PIPELINES = ['standard', 'graph', 'quantitative', 'orchestrator'] as const
type PipelineName = typeof PIPELINES[number]

// ---- Animated counter ----------------------------------------------------

function AnimatedCounter({ value, decimals = 1, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  const frameRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    const duration = 1200
    startRef.current = null

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(eased * value)
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }

    frameRef.current = requestAnimationFrame(step)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [value])

  return (
    <span className="font-mono tabular-nums">
      {displayed.toFixed(decimals)}{suffix}
    </span>
  )
}

// ---- Streak computation --------------------------------------------------

function computeStreak(questions: MockQuestion[]): number {
  let streak = 0
  for (let i = questions.length - 1; i >= 0; i--) {
    if (questions[i].correct) streak++
    else break
  }
  return streak
}

// ---- Question card -------------------------------------------------------

function QuestionCard({ q, index }: { q: MockQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const meta = PIPELINE_META[q.pipeline]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.035] transition-colors overflow-hidden"
    >
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="mt-0.5 flex-shrink-0">
            {q.correct ? (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)' }}
              >
                <Check className="w-3 h-3" style={{ color: '#30d158' }} />
              </div>
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)' }}
              >
                <X className="w-3 h-3" style={{ color: '#ff453a' }} />
              </div>
            )}
          </div>

          {/* Question text */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] text-tx leading-snug"
              style={{ WebkitLineClamp: expanded ? undefined : 1, overflow: 'hidden', display: expanded ? 'block' : '-webkit-box', WebkitBoxOrient: 'vertical' }}
            >
              {q.question}
            </p>
          </div>

          {/* Right side metrics */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {/* Score badge */}
            <span
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg"
              style={{
                backgroundColor: q.correct ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.08)',
                color: q.correct ? '#30d158' : '#ff453a',
              }}
            >
              {(q.score * 100).toFixed(0)}%
            </span>
            <ChevronDown
              className="w-3.5 h-3.5 text-white/30 transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2.5 ml-8">
          {/* Pipeline dot + label */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="text-[10px]" style={{ color: meta.color }}>{meta.label}</span>
          </div>
          {/* Score */}
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Brain className="w-3 h-3" />
            <span className="font-mono text-tx3">F1: {q.score.toFixed(2)}</span>
          </span>
          {/* Duration */}
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Clock className="w-3 h-3" />
            <span className="font-mono text-tx3">{(q.duration_ms / 1000).toFixed(1)}s</span>
          </span>
          {/* Iter */}
          <span className="text-[10px] text-white/20 font-mono">iter #{q.iteration}</span>
        </div>
      </button>
    </motion.div>
  )
}

// ---- Real-question card (from API prop) ----------------------------------

function RealQuestionCard({ q, index }: { q: Question; index: number }) {
  const meta = q.rag_type ? PIPELINE_META[q.rag_type] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {q.error_type ? (
            <AlertTriangle className="w-4 h-4 text-or" />
          ) : q.correct ? (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)' }}>
              <Check className="w-3 h-3" style={{ color: '#30d158' }} />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)' }}>
              <X className="w-3 h-3" style={{ color: '#ff453a' }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-tx leading-snug mb-2 line-clamp-2">
            {q.question ?? q.question_id}
          </p>
          <div className="flex items-center gap-3 text-[10px]">
            {meta && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                <span style={{ color: meta.color }}>{meta.label}</span>
              </div>
            )}
            {q.f1 != null && (
              <span className="flex items-center gap-1 text-tx3">
                <Brain className="w-3 h-3" />
                F1: <span className="font-mono text-tx">{q.f1.toFixed(2)}</span>
              </span>
            )}
            {q.latency_ms != null && (
              <span className="flex items-center gap-1 text-tx3">
                <Clock className="w-3 h-3" />
                <span className="font-mono text-tx">{(q.latency_ms / 1000).toFixed(1)}s</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---- Main component ------------------------------------------------------

export function QuestionViewer({ questions }: Props) {
  const typedQuestions = questions as unknown as Question[]

  // Choose data source: prefer real API data if available, else mock
  const hasRealData = typedQuestions.length > 0

  // State
  const [selectedPipeline, setSelectedPipeline] = useState<'all' | PipelineName>('all')
  const [selectedIteration, setSelectedIteration] = useState<'all' | number>('all')

  // Derived mock data
  const mockIterations = [...new Set(MOCK_QUESTIONS.map(q => q.iteration))].sort((a, b) => b - a)

  const filteredMock = MOCK_QUESTIONS.filter(q => {
    if (selectedPipeline !== 'all' && q.pipeline !== selectedPipeline) return false
    if (selectedIteration !== 'all' && q.iteration !== selectedIteration) return false
    return true
  })

  // Accuracy for selected iteration's mocks
  const iterationMock = selectedIteration === 'all'
    ? MOCK_QUESTIONS.filter(q => q.iteration === mockIterations[0])
    : MOCK_QUESTIONS.filter(q => q.iteration === selectedIteration)

  const correctCount = iterationMock.filter(q => q.correct).length
  const totalCount = iterationMock.length
  const accuracyPct = totalCount > 0 ? (correctCount / totalCount) * 100 : 0
  const streak = computeStreak(MOCK_QUESTIONS.filter(q => q.iteration === (selectedIteration === 'all' ? mockIterations[0] : selectedIteration)))

  // Real questions filter
  const filteredReal = typedQuestions.filter(q => {
    if (selectedPipeline !== 'all' && q.rag_type !== selectedPipeline) return false
    return true
  })

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      {/* Gaming header */}
      <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Accuracy counter */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">Precision cette iteration</div>
            <div className="flex items-end gap-1">
              <span className="text-[32px] font-bold font-mono tabular-nums" style={{ color: accuracyPct >= 75 ? '#30d158' : '#ff453a', lineHeight: 1 }}>
                <AnimatedCounter value={accuracyPct} decimals={1} suffix="%" />
              </span>
            </div>
            <div className="mt-1 text-[11px] text-white/40">
              {correctCount}/{totalCount} questions correctes
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 h-1.5 w-40 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: accuracyPct >= 75 ? '#30d158' : '#ff453a' }}
                initial={{ width: 0 }}
                animate={{ width: `${accuracyPct}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
          </div>

          {/* Streak counter */}
          <div className="flex flex-col items-end gap-1">
            <div className="text-[11px] uppercase tracking-[0.1em] text-white/40">Serie en cours</div>
            <div className="flex items-center gap-2">
              {streak > 0 && <Flame className="w-5 h-5" style={{ color: streak >= 4 ? '#ff9f0a' : '#ff6b35' }} />}
              <span
                className="text-[28px] font-bold font-mono tabular-nums"
                style={{
                  color: streak >= 4 ? '#ff9f0a' : streak > 0 ? '#30d158' : 'rgba(255,255,255,0.2)',
                  lineHeight: 1,
                }}
              >
                {streak}
              </span>
            </div>
            <div className="text-[10px] text-white/30">correctes d'affile</div>
          </div>

          {/* Iteration selector */}
          <div className="flex flex-col gap-1">
            <div className="text-[11px] uppercase tracking-[0.1em] text-white/40 mb-0.5">Iteration</div>
            <div className="relative">
              <select
                value={selectedIteration === 'all' ? 'all' : String(selectedIteration)}
                onChange={e => setSelectedIteration(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="appearance-none text-[12px] font-mono bg-white/[0.06] border border-white/[0.08] text-tx rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:border-white/20 cursor-pointer"
              >
                <option value="all">Toutes</option>
                {mockIterations.map(it => (
                  <option key={it} value={it}>Iteration #{it}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline filter tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(['all', ...PIPELINES] as const).map(p => {
          const meta = p === 'all' ? null : PIPELINE_META[p]
          const isActive = selectedPipeline === p
          return (
            <button
              key={p}
              onClick={() => setSelectedPipeline(p)}
              className="px-3 py-1 text-[11px] font-medium rounded-lg border transition-all"
              style={{
                borderColor: isActive
                  ? meta ? `${meta.color}40` : 'rgba(255,255,255,0.2)'
                  : 'rgba(255,255,255,0.06)',
                backgroundColor: isActive
                  ? meta ? `${meta.color}12` : 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: isActive
                  ? meta ? meta.color : 'var(--tx)'
                  : 'rgba(255,255,255,0.35)',
              }}
            >
              {p === 'all' ? 'Tous' : meta!.label}
            </button>
          )
        })}
      </div>

      {/* Question list */}
      {hasRealData ? (
        /* Real API data */
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filteredReal.length === 0 ? (
              <div className="text-center text-tx3 text-[13px] py-8">Aucune question trouvee.</div>
            ) : (
              filteredReal.slice(-50).map((q, i) => (
                <RealQuestionCard key={q.question_id ?? i} q={q} index={i} />
              ))
            )}
          </AnimatePresence>
          <div className="mt-3 text-center text-[10px] text-white/25">
            {filteredReal.length} questions affichees sur {typedQuestions.length}
          </div>
        </div>
      ) : (
        /* Mock data */
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout">
            {filteredMock.length === 0 ? (
              <div className="text-center text-tx3 text-[13px] py-8">Aucune question pour ce filtre.</div>
            ) : (
              filteredMock.map((q, i) => (
                <QuestionCard key={q.id} q={q} index={i} />
              ))
            )}
          </AnimatePresence>
          <div className="mt-3 pb-1 text-center text-[10px] text-white/25">
            {filteredMock.length} questions affichees — donnees de demonstration
          </div>
        </div>
      )}
    </motion.section>
  )
}
