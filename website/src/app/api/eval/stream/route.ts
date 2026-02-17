// /api/eval/stream/route.ts
// Server-Sent Events — live eval feed connected to all repos.
//
// Data sources (in priority order):
//   1. docs/data.json via GitHub raw (iterations + questions from all pipelines)
//   2. n8n /webhook/nomos-status (aggregate status fallback)
//
// Polling: 3s for new questions, 25s heartbeat
// On connect: replay last 100 questions as "history" burst, then stream diffs

import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// eval-data.json is bundled in /public — served as static asset on same origin
// Fallback: n8n status API on the VM (aggregate data only)
const N8N_STATUS_URL =
  process.env.STATUS_API_URL ?? 'http://34.136.180.66:5678/webhook/nomos-status'

const POLL_INTERVAL_MS = 3000
const HEARTBEAT_INTERVAL_MS = 25000
const MAX_LIFETIME_MS = 600_000   // 10 min — client auto-reconnects
const HISTORY_BURST_COUNT = 100   // questions replayed on connect
const FETCH_TIMEOUT_MS = 8000

// ---------------------------------------------------------------------------
// Types (mirroring evalStore.ts)
// ---------------------------------------------------------------------------

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
  source?: string  // e.g. 'mon-ipad', 'rag-tests', 'rag-data-ingestion'
}

interface DataJsonQuestion {
  id: string
  rag_type: string
  correct: boolean
  f1: number
  latency_ms: number
  answer: string
  expected: string
  match_type: string
  error_type?: string | null
  timestamp: string
  question?: string  // may be in question_registry
}

interface DataJsonIteration {
  id: string
  number: number
  timestamp_start: string
  timestamp_end: string | null
  label: string
  total_tested: number
  overall_accuracy_pct: number
  results_summary?: Record<string, { tested: number; correct: number; accuracy: number }>
  questions: DataJsonQuestion[]
}

interface DataJson {
  iterations?: DataJsonIteration[]
  question_registry?: Record<string, { question: string }>
}

interface IterationSummary {
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

type EventType = 'question' | 'iteration_start' | 'iteration_end' | 'heartbeat' | 'source_update'

interface SSEEvent {
  type: EventType
  payload: QuestionResult | IterationSummary | null
  timestamp: string
  seq: number
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Parse data.json → flat sorted QuestionResult list
// ---------------------------------------------------------------------------

function parseDataJson(data: DataJson, registry: Record<string, { question: string }>): QuestionResult[] {
  const iterations = data.iterations ?? []
  const results: QuestionResult[] = []
  let globalSeq = 0

  for (const iter of iterations) {
    for (const q of iter.questions ?? []) {
      const questionText =
        q.question ??
        registry[q.id]?.question ??
        q.id

      results.push({
        id: `${iter.id}::${q.id}`,
        rag_type: (q.rag_type as QuestionResult['rag_type']) ?? 'standard',
        question: questionText,
        expected: q.expected ?? '',
        answer: q.answer ?? '',
        correct: Boolean(q.correct),
        f1: typeof q.f1 === 'number' ? q.f1 : 0,
        latency_ms: typeof q.latency_ms === 'number' ? q.latency_ms : 0,
        error_type: q.error_type ?? null,
        match_type: q.match_type ?? 'UNKNOWN',
        timestamp: q.timestamp ?? iter.timestamp_start,
        seq: globalSeq++,
        source: 'mon-ipad',
      })
    }
  }

  // Sort by timestamp ascending
  results.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  // Re-number seqs after sort
  results.forEach((r, i) => { r.seq = i })

  return results
}

// ---------------------------------------------------------------------------
// Build IterationSummary from DataJsonIteration
// ---------------------------------------------------------------------------

function toIterSummary(iter: DataJsonIteration): IterationSummary {
  const rs: IterationSummary['results_summary'] = {}
  for (const [pipe, stats] of Object.entries(iter.results_summary ?? {})) {
    const questions = (iter.questions ?? []).filter(q => q.rag_type === pipe)
    const avgF1 = questions.length
      ? questions.reduce((s, q) => s + (q.f1 ?? 0), 0) / questions.length
      : 0
    const avgLat = questions.length
      ? questions.reduce((s, q) => s + (q.latency_ms ?? 0), 0) / questions.length
      : 0
    rs[pipe] = {
      tested: stats.tested,
      correct: stats.correct,
      accuracy_pct: stats.accuracy ?? 0,
      avg_latency_ms: Math.round(avgLat),
      avg_f1: Number(avgF1.toFixed(3)),
    }
  }
  return {
    id: iter.id,
    label: iter.label,
    number: iter.number,
    timestamp_start: iter.timestamp_start,
    timestamp_end: iter.timestamp_end ?? null,
    total_tested: iter.total_tested ?? (iter.questions ?? []).length,
    overall_accuracy_pct: iter.overall_accuracy_pct ?? 0,
    results_summary: rs,
  }
}

// ---------------------------------------------------------------------------
// GET handler — SSE stream
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sinceSeq = parseInt(searchParams.get('since') ?? '0', 10)

  // Derive the data URL from the request origin (works on any Vercel deployment/preview)
  const origin = new URL(request.url).origin
  const EVAL_DATA_URL = `${origin}/eval-data.json`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      let sseSeq = sinceSeq
      let sentIds = new Set<string>()      // composite iter::question IDs
      let lastIterationId = ''

      const enqueue = (event: SSEEvent): boolean => {
        if (closed) return false
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          return true
        } catch {
          closed = true
          return false
        }
      }

      // ----------------------------------------------------------------
      // Initial data load — emit HISTORY_BURST_COUNT recent questions
      // ----------------------------------------------------------------
      const initialData = await fetchJSON<DataJson>(EVAL_DATA_URL)
      let allQuestions: QuestionResult[] = []
      let registry: Record<string, { question: string }> = {}

      if (initialData) {
        registry = initialData.question_registry ?? {}
        allQuestions = parseDataJson(initialData, registry)

        // Replay last HISTORY_BURST_COUNT questions as history burst
        const historyStart = Math.max(0, allQuestions.length - HISTORY_BURST_COUNT)
        const historySlice = allQuestions.slice(historyStart)

        // Emit iteration_start for the last iteration
        const iters = initialData.iterations ?? []
        if (iters.length > 0) {
          const lastIter = iters[iters.length - 1]
          lastIterationId = lastIter.id
          if (!enqueue({
            type: 'iteration_start',
            payload: toIterSummary(lastIter),
            timestamp: new Date().toISOString(),
            seq: sseSeq++,
          })) return
        }

        // Emit history questions
        for (const q of historySlice) {
          sentIds.add(q.id)
          if (!enqueue({
            type: 'question',
            payload: { ...q, seq: sseSeq++ },
            timestamp: new Date().toISOString(),
            seq: sseSeq,
          })) return
        }
      }

      // ----------------------------------------------------------------
      // Poll tick — fetch data.json, emit NEW questions as diffs
      // ----------------------------------------------------------------
      const poll = async () => {
        if (closed) return

        // Try GitHub raw data.json first
        const data = await fetchJSON<DataJson>(EVAL_DATA_URL)

        if (data) {
          registry = data.question_registry ?? {}
          const questions = parseDataJson(data, registry)
          const iters = data.iterations ?? []

          // Check for new iteration
          if (iters.length > 0) {
            const lastIter = iters[iters.length - 1]
            if (lastIter.id !== lastIterationId) {
              lastIterationId = lastIter.id
              const ok = enqueue({
                type: 'iteration_start',
                payload: toIterSummary(lastIter),
                timestamp: new Date().toISOString(),
                seq: sseSeq++,
              })
              if (!ok) return
            }
          }

          // Emit questions not yet sent
          for (const q of questions) {
            if (sentIds.has(q.id)) continue
            sentIds.add(q.id)

            const ok = enqueue({
              type: 'question',
              payload: { ...q, seq: sseSeq++ },
              timestamp: new Date().toISOString(),
              seq: sseSeq,
            })
            if (!ok) return
          }
        } else {
          // Fallback: poll n8n status (no individual questions, just signals)
          await fetchJSON(N8N_STATUS_URL)
        }
      }

      // Initial poll after history burst
      await poll()

      // Regular polling
      const pollInterval = setInterval(poll, POLL_INTERVAL_MS)

      // Heartbeat keeps connection alive through 30s proxy timeouts
      const heartbeatInterval = setInterval(() => {
        enqueue({
          type: 'heartbeat',
          payload: null,
          timestamp: new Date().toISOString(),
          seq: sseSeq,
        })
      }, HEARTBEAT_INTERVAL_MS)

      // 10-minute max lifetime — client auto-reconnects with `since`
      const maxLifetime = setTimeout(() => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        closed = true
        try { controller.close() } catch { /* already closed */ }
      }, MAX_LIFETIME_MS)

      // Client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        clearTimeout(maxLifetime)
        closed = true
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
