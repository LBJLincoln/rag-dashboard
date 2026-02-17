// /api/eval/stream/route.ts
// Server-Sent Events endpoint for real-time eval results streaming.
// Polls the n8n Dashboard Status API every 500ms and emits per-question diffs.
//
// Mode A (VM-local dev): reads /tmp/rag-eval-stream.jsonl if present
// Mode B (Vercel prod): polls the n8n status webhook at 500ms interval

import { NextRequest } from 'next/server'

const STATUS_API_URL =
  process.env.STATUS_API_URL ?? 'http://34.136.180.66:5678/webhook/nomos-status'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionResult {
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

interface IterationSummary {
  id: string
  label: string
  number: number
  timestamp_start: string
  timestamp_end: string | null
  total_tested: number
  overall_accuracy_pct: number
  results_summary: Record<
    string,
    {
      tested: number
      correct: number
      accuracy_pct: number
      avg_latency_ms: number
      avg_f1: number
    }
  >
}

type EventType = 'question' | 'iteration_start' | 'iteration_end' | 'heartbeat'

interface SSEEvent {
  type: EventType
  payload: QuestionResult | IterationSummary | null
  timestamp: string
  seq: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEventPayload(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// Attempt to parse n8n status API response into a normalised shape.
// The n8n webhook returns either an object or a single-element array.
function extractStatus(raw: unknown): {
  questions: QuestionResult[]
  iterationMeta: IterationSummary | null
  isComplete: boolean
} {
  const payload =
    Array.isArray(raw) ? raw[0] : (raw as Record<string, unknown>)

  if (!payload || typeof payload !== 'object') {
    return { questions: [], iterationMeta: null, isComplete: false }
  }

  const p = payload as Record<string, unknown>

  // Questions live under last_iteration.questions (status.json format)
  const lastIter = p['last_iteration'] as Record<string, unknown> | undefined
  const questions: QuestionResult[] = Array.isArray(lastIter?.['questions'])
    ? (lastIter!['questions'] as QuestionResult[])
    : []

  // Build iteration summary from available fields
  const iterationMeta: IterationSummary | null = lastIter
    ? {
        id: String(lastIter['id'] ?? ''),
        label: String(lastIter['label'] ?? ''),
        number: Number(lastIter['number'] ?? 0),
        timestamp_start: String(lastIter['timestamp_start'] ?? ''),
        timestamp_end: (lastIter['timestamp_end'] as string | null) ?? null,
        total_tested: Number(lastIter['total_tested'] ?? questions.length),
        overall_accuracy_pct: Number(lastIter['overall_accuracy_pct'] ?? 0),
        results_summary:
          (lastIter['results_summary'] as IterationSummary['results_summary']) ?? {},
      }
    : null

  const meta = p['meta'] as Record<string, unknown> | undefined
  const isComplete = meta?.['status'] === 'complete'

  return { questions, iterationMeta, isComplete }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  // `since` lets clients resume after reconnect without replaying all events
  const sinceSeq = parseInt(searchParams.get('since') ?? '0', 10)

  const encoder = new TextEncoder()

  // Track state across poll ticks (closed over in the stream)
  let seq = sinceSeq
  let lastIterationId = ''
  let sentQuestionSeqs = new Set<number>()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const enqueue = (event: SSEEvent): boolean => {
        if (closed) return false
        try {
          controller.enqueue(encoder.encode(makeEventPayload(event)))
          return true
        } catch {
          closed = true
          return false
        }
      }

      // ------------------------------------------------------------------
      // Poll tick: fetch status, emit new question events as diffs
      // ------------------------------------------------------------------
      const poll = async () => {
        if (closed) return

        let raw: unknown = null
        try {
          const res = await fetch(STATUS_API_URL, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          })
          if (res.ok) {
            raw = await res.json()
          }
        } catch {
          // Network error — skip tick, client stays connected
          return
        }

        const { questions, iterationMeta, isComplete } = extractStatus(raw)

        // Detect new iteration start
        if (
          iterationMeta &&
          iterationMeta.id &&
          iterationMeta.id !== lastIterationId
        ) {
          lastIterationId = iterationMeta.id
          sentQuestionSeqs = new Set<number>()
          const ok = enqueue({
            type: 'iteration_start',
            payload: iterationMeta,
            timestamp: new Date().toISOString(),
            seq: seq++,
          })
          if (!ok) return
        }

        // Emit new questions (those not yet sent in this session)
        for (const q of questions) {
          const qSeq = q.seq ?? 0
          if (sentQuestionSeqs.has(qSeq)) continue
          sentQuestionSeqs.add(qSeq)

          const ok = enqueue({
            type: 'question',
            payload: q,
            timestamp: new Date().toISOString(),
            seq: seq++,
          })
          if (!ok) return
        }

        // Emit iteration end when status API reports completion
        if (isComplete && iterationMeta) {
          enqueue({
            type: 'iteration_end',
            payload: iterationMeta,
            timestamp: new Date().toISOString(),
            seq: seq++,
          })
        }
      }

      // Initial fetch immediately
      await poll()

      // Poll every 500ms (10x faster than the dashboard stream's 10s interval)
      const pollInterval = setInterval(poll, 500)

      // Heartbeat every 25s — keeps connection alive through proxies/Vercel's 30s timeout
      const heartbeatInterval = setInterval(() => {
        enqueue({
          type: 'heartbeat',
          payload: null,
          timestamp: new Date().toISOString(),
          seq,
        })
      }, 25000)

      // 10-minute max connection lifetime — client auto-reconnects with `since` param
      const maxLifetimeTimeout = setTimeout(() => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }, 600_000)

      // Handle client disconnect (abort signal)
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        clearInterval(heartbeatInterval)
        clearTimeout(maxLifetimeTimeout)
        closed = true
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy/nginx buffering so events reach the client immediately
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
