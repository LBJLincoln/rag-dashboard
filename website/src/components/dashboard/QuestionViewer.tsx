'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  AlertTriangle,
  Clock,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutGrid,
  LayoutList,
  Filter,
  SlidersHorizontal,
  ExternalLink,
  TrendingUp,
  Zap,
  Hash,
} from 'lucide-react'

// ---- Types ---------------------------------------------------------------

interface QuestionData {
  id?: string
  question_id?: string
  question?: string
  expected?: string
  got?: string
  answer?: string
  correct?: boolean
  f1?: number
  latency_ms?: number
  rag_type?: string
  match_type?: string
  match_method?: string
  error_type?: string
  iteration_label?: string
  iteration_number?: number
}

interface IterationData {
  id?: string | null
  number: number
  label: string
  timestamp_start?: string
  total_tested: number
  total_correct: number
  overall_accuracy_pct: number
  results_summary: Record<string, {
    tested: number
    correct: number
    accuracy_pct: number
    avg_latency_ms?: number
    avg_f1?: number
  }>
  questions: QuestionData[]
}

interface Props {
  questions: Record<string, unknown>[]
}

// ---- Pipeline config -----------------------------------------------------

const PIPELINE_META: Record<string, { label: string; color: string; icon: string }> = {
  standard:     { label: 'Standard',     color: '#0a84ff', icon: '◆' },
  graph:        { label: 'Graph',        color: '#bf5af2', icon: '◈' },
  quantitative: { label: 'Quantitative', color: '#ffd60a', icon: '◇' },
  orchestrator: { label: 'Orchestrator', color: '#30d158', icon: '◉' },
}

const PIPELINES = ['standard', 'graph', 'quantitative', 'orchestrator'] as const
type PipelineName = (typeof PIPELINES)[number]

const PAGE_SIZES = [10, 25, 50, 100] as const

// ---- Data loader ---------------------------------------------------------

function useDataJson() {
  const [iterations, setIterations] = useState<IterationData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/data.json')
        if (!res.ok) throw new Error('fetch failed')
        const json = await res.json()
        const iters: IterationData[] = (json.iterations ?? [])
          .filter((it: IterationData) => it.questions && it.questions.length > 0)
          .map((it: IterationData, idx: number) => ({
            ...it,
            number: it.number ?? idx + 1,
            questions: it.questions.map((q: QuestionData) => ({
              ...q,
              iteration_number: it.number ?? idx + 1,
              iteration_label: it.label,
            })),
          }))
        setIterations(iters)
      } catch {
        // Fallback: empty
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { iterations, loading }
}

// ---- Stats badge ---------------------------------------------------------

function StatBadge({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3">
      <span
        className="text-[22px] font-bold font-mono tabular-nums leading-none"
        style={{ color: color ?? 'var(--tx)' }}
      >
        {value}
      </span>
      <span className="text-[10px] text-white/40 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  )
}

// ---- Question card (grid mode) ------------------------------------------

function QuestionCardGrid({ q }: { q: QuestionData }) {
  const meta = q.rag_type ? PIPELINE_META[q.rag_type] : null
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-all duration-200 overflow-hidden cursor-pointer"
      style={{ minHeight: expanded ? 'auto' : '160px' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-5">
        {/* Top: pipeline + status */}
        <div className="flex items-center justify-between mb-3">
          {meta && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${meta.color}12`,
                color: meta.color,
                border: `1px solid ${meta.color}20`,
              }}
            >
              {meta.label}
            </span>
          )}
          <div className="flex items-center gap-2">
            {q.f1 != null && (
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                style={{
                  backgroundColor: q.correct ? 'rgba(48,209,88,0.08)' : 'rgba(255,69,58,0.08)',
                  color: q.correct ? '#30d158' : '#ff453a',
                }}
              >
                {(q.f1 * 100).toFixed(0)}%
              </span>
            )}
            {q.correct ? (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)' }}
              >
                <Check className="w-3 h-3" style={{ color: '#30d158' }} />
              </div>
            ) : q.error_type ? (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ff9f0a' }} />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)' }}
              >
                <X className="w-3 h-3" style={{ color: '#ff453a' }} />
              </div>
            )}
          </div>
        </div>

        {/* Question text */}
        <p
          className="text-[13px] text-tx leading-relaxed mb-3"
          style={{
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
          }}
        >
          {q.question ?? q.id ?? q.question_id ?? '—'}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          {q.latency_ms != null && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-mono text-tx3">{(q.latency_ms / 1000).toFixed(1)}s</span>
            </span>
          )}
          {q.match_type && (
            <span className="font-mono text-tx3">{q.match_type.replace(/_/g, ' ').toLowerCase()}</span>
          )}
          {q.iteration_number && (
            <span className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span className="font-mono text-tx3">{q.iteration_number}</span>
            </span>
          )}
        </div>

        {/* Expanded: expected vs got */}
        {expanded && (q.expected || q.answer || q.got) && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
            {q.expected && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/30">Attendu</span>
                <p className="text-[12px] text-tx2 mt-0.5 font-mono">{q.expected}</p>
              </div>
            )}
            {(q.answer || q.got) && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/30">Obtenu</span>
                <p className="text-[12px] text-tx2 mt-0.5 font-mono line-clamp-4">{q.answer ?? q.got}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---- Question row (list mode) -------------------------------------------

function QuestionCardList({ q }: { q: QuestionData }) {
  const meta = q.rag_type ? PIPELINE_META[q.rag_type] : null
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.025] transition-colors overflow-hidden"
    >
      <button className="w-full text-left px-4 py-3" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          {/* Status */}
          {q.correct ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)' }}
            >
              <Check className="w-3 h-3" style={{ color: '#30d158' }} />
            </div>
          ) : q.error_type ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#ff9f0a' }} />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)' }}
            >
              <X className="w-3 h-3" style={{ color: '#ff453a' }} />
            </div>
          )}

          {/* Question */}
          <p className="flex-1 min-w-0 text-[13px] text-tx leading-snug truncate">
            {q.question ?? q.id ?? q.question_id ?? '—'}
          </p>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {meta && (
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full hidden sm:inline-flex"
                style={{ backgroundColor: `${meta.color}10`, color: meta.color }}
              >
                {meta.label}
              </span>
            )}
            {q.f1 != null && (
              <span
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg"
                style={{
                  backgroundColor: q.correct ? 'rgba(48,209,88,0.06)' : 'rgba(255,69,58,0.06)',
                  color: q.correct ? '#30d158' : '#ff453a',
                }}
              >
                {(q.f1 * 100).toFixed(0)}%
              </span>
            )}
            {q.latency_ms != null && (
              <span className="text-[10px] font-mono text-tx3 hidden md:inline">
                {(q.latency_ms / 1000).toFixed(1)}s
              </span>
            )}
            <ChevronDown
              className="w-3.5 h-3.5 text-white/20 transition-transform"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-white/[0.04] space-y-2">
              <div className="flex items-center gap-3 text-[10px] text-white/30">
                {meta && (
                  <span className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <span style={{ color: meta.color }}>{meta.label}</span>
                  </span>
                )}
                {q.match_type && <span className="font-mono">{q.match_type}</span>}
                {q.iteration_number && <span className="font-mono">iter #{q.iteration_number}</span>}
              </div>
              {q.expected && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/25">Attendu</span>
                  <p className="text-[12px] text-tx2 font-mono mt-0.5">{q.expected}</p>
                </div>
              )}
              {(q.answer || q.got) && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-white/25">Obtenu</span>
                  <p className="text-[12px] text-tx2 font-mono mt-0.5 line-clamp-3">{q.answer ?? q.got}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ---- Pagination ----------------------------------------------------------

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-20 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-tx3" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-[11px] text-white/20">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="min-w-[32px] h-8 rounded-lg text-[12px] font-mono transition-all"
            style={{
              backgroundColor: p === page ? 'rgba(10,132,255,0.15)' : 'transparent',
              color: p === page ? '#0a84ff' : 'rgba(255,255,255,0.35)',
              border: p === page ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
            }}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg hover:bg-white/[0.06] disabled:opacity-20 transition-colors"
      >
        <ChevronRight className="w-4 h-4 text-tx3" />
      </button>
    </div>
  )
}

// ---- Main component ------------------------------------------------------

export function QuestionViewer({ questions }: Props) {
  const { iterations, loading } = useDataJson()

  // All questions flattened
  const allQuestions = useMemo(() => {
    if (iterations.length > 0) {
      return iterations.flatMap(it => it.questions)
    }
    // Fallback to props
    return (questions as unknown as QuestionData[]) ?? []
  }, [iterations, questions])

  // Available iterations (desc)
  const availableIterations = useMemo(
    () => iterations.map(it => ({ number: it.number, label: it.label, count: it.questions.length })).reverse(),
    [iterations]
  )

  // State
  const [selectedPipeline, setSelectedPipeline] = useState<'all' | PipelineName>('all')
  const [selectedIteration, setSelectedIteration] = useState<'all' | number>('all')
  const [selectedResult, setSelectedResult] = useState<'all' | 'correct' | 'wrong'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [pageSize, setPageSize] = useState<number>(25)
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // Filter logic
  const filtered = useMemo(() => {
    let result = allQuestions
    if (selectedPipeline !== 'all') result = result.filter(q => q.rag_type === selectedPipeline)
    if (selectedIteration !== 'all') result = result.filter(q => q.iteration_number === selectedIteration)
    if (selectedResult === 'correct') result = result.filter(q => q.correct === true)
    if (selectedResult === 'wrong') result = result.filter(q => q.correct === false)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(q =>
        (q.question ?? q.id ?? '').toLowerCase().includes(query) ||
        (q.expected ?? '').toLowerCase().includes(query) ||
        (q.answer ?? q.got ?? '').toLowerCase().includes(query)
      )
    }
    return result
  }, [allQuestions, selectedPipeline, selectedIteration, selectedResult, searchQuery])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [selectedPipeline, selectedIteration, selectedResult, searchQuery, pageSize])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length
    const correct = filtered.filter(q => q.correct).length
    const accuracy = total > 0 ? (correct / total) * 100 : 0
    const avgF1 = total > 0
      ? filtered.reduce((sum, q) => sum + (q.f1 ?? 0), 0) / total
      : 0
    const avgLatency = total > 0
      ? filtered.filter(q => q.latency_ms != null).reduce((sum, q) => sum + (q.latency_ms ?? 0), 0) / Math.max(1, filtered.filter(q => q.latency_ms != null).length)
      : 0
    return { total, correct, accuracy, avgF1, avgLatency }
  }, [filtered])

  // Pipeline counts
  const pipelineCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allQuestions.length }
    for (const p of PIPELINES) counts[p] = allQuestions.filter(q => q.rag_type === p).length
    return counts
  }, [allQuestions])

  const handlePageChange = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
    // Scroll to top of viewer
    document.getElementById('question-viewer-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [totalPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-ac/30 border-t-ac rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.section
      id="question-viewer-top"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* ---- Stats bar ---- */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] mb-5 overflow-hidden">
        <div className="flex items-center justify-between divide-x divide-white/[0.06]">
          <StatBadge label="Questions" value={stats.total} />
          <StatBadge
            label="Accuracy"
            value={`${stats.accuracy.toFixed(1)}%`}
            color={stats.accuracy >= 75 ? '#30d158' : stats.accuracy >= 50 ? '#ffd60a' : '#ff453a'}
          />
          <StatBadge label="Correctes" value={stats.correct} color="#30d158" />
          <StatBadge
            label="F1 moyen"
            value={stats.avgF1.toFixed(2)}
            color={stats.avgF1 >= 0.7 ? '#0a84ff' : '#ff9f0a'}
          />
          <div className="hidden md:flex">
            <StatBadge
              label="Latence moy."
              value={`${(stats.avgLatency / 1000).toFixed(1)}s`}
              color={stats.avgLatency <= 5000 ? '#30d158' : '#ff9f0a'}
            />
          </div>
        </div>

        {/* Progression bar: scale 1q → 1000q */}
        <div className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-between text-[9px] text-white/25 mb-1">
            {[1, 5, 10, 50, 100, 500, 1000].map(milestone => (
              <span
                key={milestone}
                className="font-mono"
                style={{ color: allQuestions.length >= milestone ? '#0a84ff' : undefined }}
              >
                {milestone}q
              </span>
            ))}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: '#0a84ff' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (allQuestions.length / 1000) * 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une question..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-white/[0.08] bg-white/[0.03] text-tx placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
          />
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 transition-colors"
            style={{ backgroundColor: viewMode === 'grid' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
          >
            <LayoutGrid className="w-4 h-4" style={{ color: viewMode === 'grid' ? '#0a84ff' : 'rgba(255,255,255,0.3)' }} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-2 transition-colors"
            style={{ backgroundColor: viewMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent' }}
          >
            <LayoutList className="w-4 h-4" style={{ color: viewMode === 'list' ? '#0a84ff' : 'rgba(255,255,255,0.3)' }} />
          </button>
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-[11px] font-medium transition-colors hover:bg-white/[0.04]"
          style={{
            backgroundColor: showFilters ? 'rgba(10,132,255,0.1)' : 'transparent',
            color: showFilters ? '#0a84ff' : 'rgba(255,255,255,0.4)',
            borderColor: showFilters ? 'rgba(10,132,255,0.25)' : undefined,
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtres
        </button>

        {/* Page size */}
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="appearance-none text-[11px] font-mono bg-white/[0.03] border border-white/[0.08] text-tx3 rounded-xl px-3 py-2 pr-7 focus:outline-none cursor-pointer"
        >
          {PAGE_SIZES.map(size => (
            <option key={size} value={size}>{size}/page</option>
          ))}
        </select>
      </div>

      {/* ---- Filters panel ---- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] space-y-4">
              {/* Pipeline filter */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/30 mb-2 block">Pipeline</span>
                <div className="flex gap-1.5 flex-wrap">
                  {(['all', ...PIPELINES] as const).map(p => {
                    const meta = p === 'all' ? null : PIPELINE_META[p]
                    const isActive = selectedPipeline === p
                    const count = pipelineCounts[p] ?? 0
                    return (
                      <button
                        key={p}
                        onClick={() => setSelectedPipeline(p)}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-xl border transition-all"
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
                        <span className="ml-1.5 text-[9px] opacity-60">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Iteration filter */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/30 mb-2 block">Itération</span>
                <select
                  value={selectedIteration === 'all' ? 'all' : String(selectedIteration)}
                  onChange={e => setSelectedIteration(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="appearance-none text-[12px] font-mono bg-white/[0.04] border border-white/[0.08] text-tx rounded-xl px-3 py-2 focus:outline-none cursor-pointer max-w-xs"
                >
                  <option value="all">Toutes les itérations ({iterations.length})</option>
                  {availableIterations.map(it => (
                    <option key={it.number} value={it.number}>
                      #{it.number} — {it.label} ({it.count}q)
                    </option>
                  ))}
                </select>
              </div>

              {/* Result filter */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/30 mb-2 block">Résultat</span>
                <div className="flex gap-1.5">
                  {[
                    { key: 'all', label: 'Tous', color: undefined },
                    { key: 'correct', label: 'Correctes', color: '#30d158' },
                    { key: 'wrong', label: 'Incorrectes', color: '#ff453a' },
                  ].map(opt => {
                    const isActive = selectedResult === opt.key
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setSelectedResult(opt.key as 'all' | 'correct' | 'wrong')}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-xl border transition-all"
                        style={{
                          borderColor: isActive ? (opt.color ? `${opt.color}40` : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)',
                          backgroundColor: isActive ? (opt.color ? `${opt.color}10` : 'rgba(255,255,255,0.06)') : 'transparent',
                          color: isActive ? (opt.color ?? 'var(--tx)') : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Question count + info ---- */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-white/30">
          {filtered.length} question{filtered.length !== 1 ? 's' : ''} —
          page {page}/{totalPages}
        </span>
        <a
          href="/docs/executive-summary"
          className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Executive Summary
        </a>
      </div>

      {/* ---- Questions ---- */}
      {paged.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-[13px] text-white/30">Aucune question trouvée pour ces filtres.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paged.map((q, i) => (
            <QuestionCardGrid key={`${q.id ?? q.question_id ?? i}-${q.iteration_number}`} q={q} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {paged.map((q, i) => (
            <QuestionCardList key={`${q.id ?? q.question_id ?? i}-${q.iteration_number}`} q={q} />
          ))}
        </div>
      )}

      {/* ---- Pagination ---- */}
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </motion.section>
  )
}
