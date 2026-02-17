# Technical Specification: Real-Time RAG Evaluation Dashboard with Gaming UI

**Version:** 1.0
**Date:** 2026-02-17
**Author:** Research Agent (Claude Sonnet 4.5)
**Repo context:** `mon-ipad` — Tour de Controle, `rag-website` (Next.js 14, Vercel)

---

## Executive Summary

This specification defines the architecture and implementation plan for a real-time RAG evaluation dashboard with a gaming-style progression UI. It builds on the existing `rag-website` dashboard (`/dashboard`) and extends it to stream live test results as they arrive from n8n, visualize progression through test scales (1q → 1000q), and display Q&A pairs with terminal-style rendering.

The core design problem: the current dashboard polls `/api/dashboard` every 15 seconds and reads from a static JSON file. This means a 500-question test run appears as a series of snapshot jumps rather than a live, question-by-question stream. The gaming-style spec solves this by introducing:

1. A dedicated SSE stream that proxies the n8n execution feed in real time
2. A sliding-window iteration view backed by `react-window`
3. XP bar progression mapped to the 7-level test scale
4. A terminal-style Q&A feed with per-row scoring animations

---

## Part 1 — Architecture: Streaming Test Results to the Browser

### 1.1 The Data Flow Problem

Current architecture (polling):

```
eval/quick-test.py
  → calls n8n webhook → n8n returns JSON
  → live-writer.py records to docs/data.json
  → generate_status.py regenerates docs/status.json
  → n8n Dashboard Status API webhook reads status.json
  → Next.js /api/dashboard polls n8n webhook every 15s
  → Browser polls /api/dashboard every 15s
```

Latency: 15–30 seconds between a question being answered and appearing in the browser.

Target architecture (SSE streaming):

```
eval/quick-test.py / iterative-eval.py
  → calls n8n webhook (POST /webhook/rag-multi-index-v3)
  → n8n returns JSON answer
  → live-writer.py writes question result to docs/data.json (atomic, ~50ms)
  → ALSO emits to /tmp/rag-eval-stream.jsonl (append-only, new line per result)
  → Next.js /api/eval/stream Route Handler tails /tmp/rag-eval-stream.jsonl
  → Browser EventSource receives SSE events in <100ms
```

Latency: 100–500ms from question answered → visible in browser.

### 1.2 Why SSE over WebSocket

The decision matrix for this infrastructure:

| Criterion | WebSocket | SSE | Long Polling |
|-----------|-----------|-----|--------------|
| Vercel compatibility | No (serverless timeout) | Yes (ReadableStream) | Yes |
| Self-hosted VM (34.136.180.66) | Yes | Yes | Yes |
| Browser native API | No (requires library) | Yes (EventSource) | Yes |
| Auto-reconnect | Manual | Built-in | Manual |
| Directionality | Bidirectional | Server→Client | Client pulls |
| RAM cost on VM | High (WS daemon) | Low (HTTP stream) | Medium |
| HTTP/2 multiplexing | No | Yes | No |
| GCP firewall on port 8080 | Blocked | Not needed | Not needed |

**Decision: SSE via Next.js Route Handler.**

The existing `website/src/app/api/dashboard/stream/route.ts` already implements SSE polling the n8n status webhook. We extend this pattern with a second SSE endpoint dedicated to live eval streaming.

SSE is the correct choice because:
- The VM has only ~100MB free RAM; no WS daemon needed
- The dashboard is hosted on Vercel (serverless, no persistent connections)
- Data flow is one-directional: server pushes results to browser
- Browser EventSource reconnects automatically on disconnect
- The 5-minute connection limit in the existing stream route is appropriate (client auto-reconnects)

### 1.3 The Streaming Bridge: n8n → Browser

The key insight is that n8n's webhook response is synchronous per question. The eval script (Python) is the coordinator. We need a lightweight IPC mechanism between the Python eval process and the Next.js SSE handler.

**Solution: Append-only JSONL file as event bus**

The Python eval scripts already write to JSONL files (`logs/executions/exec-*.jsonl`). We add a second write: a rolling file at `/tmp/rag-eval-stream.jsonl` that the SSE route tails.

```
Python eval script
  → record_question() call in live-writer.py
  → EXISTING: writes to logs/executions/exec-*.jsonl
  → NEW: appends to /tmp/rag-eval-stream.jsonl
```

The Next.js SSE route reads this file using Node.js `fs.watch` or a polling interval, and forwards new lines as SSE events.

**Alternative for when Next.js cannot access the VM filesystem (Vercel deployment):**

Add a lightweight internal HTTP endpoint on the VM (Python `http.server` on port 8080 internal, or use n8n's REST API). The Next.js SSE route polls this endpoint every 500ms and forwards events. Since port 8080 is blocked by GCP firewall to the public internet, this is internal-only — the Next.js server on Vercel would need to connect via the n8n webhook (port 5678, which is open).

**Recommended dual-mode architecture:**

```
Mode A (VM-local, for Codespace or SSH tunnel access):
  Python → /tmp/rag-eval-stream.jsonl → fs.watch → SSE Route → Browser

Mode B (Vercel production):
  Python → live-writer.py → docs/status.json → n8n reads it →
  n8n Dashboard Status API → /api/dashboard/stream polls every 500ms → SSE → Browser
```

For Mode B, the key improvement is reducing the SSE poll interval from 10s to 500ms during active eval runs. The `status.json` is regenerated after every question (via `live-writer._save()` → `_regenerate_status()`), so the data is fresh every ~50ms on disk.

### 1.4 New SSE Endpoint: `/api/eval/stream`

This extends the existing `/api/dashboard/stream/route.ts` pattern.

```typescript
// /api/eval/stream/route.ts
// Streams individual question results as they arrive

const EVAL_STATUS_URL = process.env.STATUS_API_URL
  ?? 'http://34.136.180.66:5678/webhook/nomos-status'

export const dynamic = 'force-dynamic'

interface QuestionEvent {
  type: 'question' | 'iteration_start' | 'iteration_end' | 'heartbeat'
  data: QuestionResult | IterationSummary | null
  timestamp: string
  seq: number
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sinceSeq = parseInt(searchParams.get('since') ?? '0')

  const encoder = new TextEncoder()
  let seq = sinceSeq
  let lastDataHash = ''

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: QuestionEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`
        try {
          controller.enqueue(encoder.encode(payload))
        } catch {
          clearInterval(pollInterval)
        }
      }

      const poll = async () => {
        try {
          const res = await fetch(EVAL_STATUS_URL, {
            signal: AbortSignal.timeout(5000),
            cache: 'no-store',
          })
          if (!res.ok) return
          const json = await res.json()
          const payload = Array.isArray(json) ? json[0] : json

          // Hash to detect changes
          const hash = JSON.stringify(payload?.last_iteration)
          if (hash === lastDataHash) return
          lastDataHash = hash

          // Extract new questions from the latest iteration
          const questions = payload?.last_iteration?.questions ?? []
          const newQuestions = questions.slice(seq)

          for (const q of newQuestions) {
            sendEvent({
              type: 'question',
              data: q,
              timestamp: new Date().toISOString(),
              seq: seq++
            })
          }

          // Detect iteration completion
          if (payload?.meta?.status === 'complete') {
            sendEvent({
              type: 'iteration_end',
              data: payload?.last_iteration,
              timestamp: new Date().toISOString(),
              seq: seq++
            })
          }
        } catch {
          // Continue on fetch failure
        }
      }

      // Poll every 500ms during active eval (10x faster than current)
      const pollInterval = setInterval(poll, 500)
      await poll() // Immediate first fetch

      // Heartbeat every 25s
      const heartbeat = setInterval(() => {
        sendEvent({ type: 'heartbeat', data: null, timestamp: new Date().toISOString(), seq })
      }, 25000)

      // 10-minute max connection (client auto-reconnects with `since` param)
      setTimeout(() => {
        clearInterval(pollInterval)
        clearInterval(heartbeat)
        try { controller.close() } catch { /* already closed */ }
      }, 600000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
```

### 1.5 n8n Side: Adding a Live Broadcast Webhook

The Dashboard Status API workflow (`KcfzvJD6yydxY9Uk`) currently returns `status.json` content on `GET /webhook/nomos-status`. We add a second endpoint to the same workflow: `POST /webhook/nomos-event` that receives individual question events from the Python eval scripts and broadcasts them.

This avoids file polling entirely and provides sub-100ms latency:

```
Python eval script
  → after each question: POST http://34.136.180.66:5678/webhook/nomos-event
    body: { "type": "question", "pipeline": "standard", "q": {...result...} }
  → n8n workflow stores in memory (Code node maintains array)
  → Dashboard SSE endpoint polls GET /webhook/nomos-events?since=42
  → n8n returns only new events since seq 42
  → SSE forwards to browser
```

For immediate implementation (no n8n changes required), use the file-polling approach in 1.4.

---

## Part 2 — React Component Architecture

### 2.1 Component Tree

```
EvalDashboard (page)
├── StreamConnectionIndicator       # SSE status pill (LIVE/OFFLINE/RECONNECTING)
├── SessionHeader                   # Current iteration label, elapsed time, cancel button
├── PipelineProgressGrid            # 4 pipeline cards (existing, extended)
│   └── PipelineProgressCard × 4   # Extended with live question counter
├── XPProgressionBar                # The "level" indicator (1q→1Kq scale)
├── LiveQuestionFeed                # The terminal-style streaming Q&A panel
│   ├── FeedToolbar                 # Filter + search + pipeline selector
│   ├── VirtualizedFeedList         # react-window, sliding window, auto-scroll
│   │   └── QuestionRow × N        # Individual Q&A with score animations
│   └── FeedStatusBar              # "237/500 questions · 84.2% accuracy · 2.3s avg"
├── IterationSlidingWindow          # Horizontal scroll of past iterations
│   └── IterationCard × N          # Compact iteration summary with sparkline
└── MilestoneNotification          # Toast/overlay for PASS events, level-ups
```

### 2.2 State Management: Zustand Store

```typescript
// stores/evalStore.ts

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { subscribeWithSelector } from 'zustand/middleware'

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

interface PipelineLiveStats {
  tested: number
  correct: number
  accuracy: number     // rolling, recomputed per question
  avg_latency_ms: number
  avg_f1: number
  streak: number       // consecutive correct answers
  p95_latency_ms: number
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
  WINDOW_SIZE: 500   // constant

  // Per-pipeline live stats (computed from questions[])
  pipelineStats: Record<string, PipelineLiveStats>

  // Historical iterations (from data.json, last 42)
  iterations: IterationSummary[]

  // Current XP level based on question count
  xpLevel: XPLevel
  prevXpLevel: XPLevel | null   // for level-up detection
  levelUpTriggered: boolean

  // Actions
  setConnectionStatus: (s: EvalStore['connectionStatus']) => void
  appendQuestion: (q: QuestionResult) => void
  setCurrentIteration: (it: IterationSummary) => void
  setIterations: (its: IterationSummary[]) => void
  setIsRunning: (v: boolean) => void
  clearLevelUpTrigger: () => void
  tick: () => void   // called every second to update elapsedMs
}

// XP level system mapped to test scale
interface XPLevel {
  level: number        // 1–7
  label: string        // "1q" | "5q" | "10q" | "50q" | "100q" | "500q" | "1000q"
  min: number          // question count threshold
  max: number
  color: string
  title: string        // "Smoke Test" | "Quick Check" | ... | "Full Scale"
}

const XP_LEVELS: XPLevel[] = [
  { level: 1, label: '1q',    min: 0,    max: 1,    color: '#86868b', title: 'Smoke Test' },
  { level: 2, label: '5q',    min: 2,    max: 5,    color: '#0a84ff', title: 'Quick Check' },
  { level: 3, label: '10q',   min: 6,    max: 10,   color: '#30d158', title: 'Validation' },
  { level: 4, label: '50q',   min: 11,   max: 50,   color: '#ffd60a', title: 'Solid Run' },
  { level: 5, label: '100q',  min: 51,   max: 100,  color: '#ff9f0a', title: 'Phase Test' },
  { level: 6, label: '500q',  min: 101,  max: 500,  color: '#bf5af2', title: 'Codespace Run' },
  { level: 7, label: '1000q', min: 501,  max: 10000, color: '#ff453a', title: 'Full Scale' },
]

function computeXPLevel(questionCount: number): XPLevel {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (questionCount >= XP_LEVELS[i].min) return XP_LEVELS[i]
  }
  return XP_LEVELS[0]
}

function computePipelineStats(questions: QuestionResult[]): Record<string, PipelineLiveStats> {
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

    // Compute streak: count from the end while correct
    let streak = 0
    for (let i = qs.length - 1; i >= 0; i--) {
      if (qs[i].correct) streak++
      else break
    }

    stats[pipeline] = {
      tested,
      correct,
      accuracy: tested > 0 ? Math.round((correct / tested) * 1000) / 10 : 0,
      avg_latency_ms: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p95_latency_ms: latencies.length > 1
        ? latencies[Math.floor(latencies.length * 0.95)]
        : latencies[0] ?? 0,
      avg_f1: f1s.length > 0
        ? Math.round((f1s.reduce((a, b) => a + b, 0) / f1s.length) * 1000) / 1000
        : 0,
      streak,
    }
  }
  return stats
}

export const useEvalStore = create<EvalStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      connectionStatus: 'idle',
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

      setConnectionStatus: (s) => set(state => { state.connectionStatus = s }),

      appendQuestion: (q) => set(state => {
        // Sliding window: discard oldest when over limit
        if (state.questions.length >= state.WINDOW_SIZE) {
          state.questions.shift()
        }
        state.questions.push(q)
        state.sseSeq = q.seq + 1

        // Recompute pipeline stats
        state.pipelineStats = computePipelineStats(state.questions)

        // Recompute XP level
        const totalTested = state.questions.length +
          (state.currentIteration ?
            (state.currentIteration.total_tested - state.questions.length) : 0)
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

      setCurrentIteration: (it) => set(state => {
        state.currentIteration = it
        state.isRunning = true
      }),

      setIterations: (its) => set(state => { state.iterations = its }),

      setIsRunning: (v) => set(state => {
        state.isRunning = v
        if (!v) state.elapsedMs = 0
      }),

      clearLevelUpTrigger: () => set(state => {
        state.levelUpTriggered = false
        state.prevXpLevel = null
      }),

      tick: () => set(state => {
        if (state.isRunning) state.elapsedMs += 1000
      }),
    }))
  )
)
```

### 2.3 SSE Hook: `useEvalStream`

```typescript
// hooks/useEvalStream.ts

import { useEffect, useRef, useCallback } from 'react'
import { useEvalStore } from '@/stores/evalStore'

const SSE_URL = '/api/eval/stream'
const MAX_RECONNECT_DELAY = 30000  // 30s ceiling
const BASE_RECONNECT_DELAY = 1000

export function useEvalStream() {
  const esRef = useRef<EventSource | null>(null)
  const reconnectDelay = useRef(BASE_RECONNECT_DELAY)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    sseSeq,
    setConnectionStatus,
    appendQuestion,
    setCurrentIteration,
    setIsRunning
  } = useEvalStore()

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    setConnectionStatus('connecting')
    const url = `${SSE_URL}?since=${useEvalStore.getState().sseSeq}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      setConnectionStatus('live')
      reconnectDelay.current = BASE_RECONNECT_DELAY
    }

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        switch (msg.type) {
          case 'question':
            appendQuestion(msg.data)
            break
          case 'iteration_start':
            setCurrentIteration(msg.data)
            setIsRunning(true)
            break
          case 'iteration_end':
            setIsRunning(false)
            break
          case 'heartbeat':
            // Just a keep-alive, no action needed
            break
        }
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setConnectionStatus('reconnecting')

      // Exponential backoff
      reconnectTimeout.current = setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          MAX_RECONNECT_DELAY
        )
        connect()
      }, reconnectDelay.current)
    }
  }, [appendQuestion, setConnectionStatus, setCurrentIteration, setIsRunning])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
    }
  }, [connect])
}
```

---

## Part 3 — Data Model: Sliding Window Iteration View

### 3.1 In-Memory Model

The sliding window keeps the last `WINDOW_SIZE = 500` question results in the Zustand store. This is separate from the historical iterations read from `data.json`.

```typescript
// The in-memory window (Zustand, last 500 questions)
interface LiveWindow {
  questions: QuestionResult[]    // ordered by arrival, max 500
  startSeq: number               // seq of oldest question in window
  endSeq: number                 // seq of newest question in window
}

// Historical view (from data.json / API, last N iterations)
interface IterationHistory {
  iterations: IterationSummary[] // ordered oldest→newest, last 42
  totalIterations: number
}
```

### 3.2 Virtualized List Data Shape

The `VirtualizedFeedList` uses `react-window`'s `VariableSizeList` because question rows have variable height (some questions are multi-line; error rows are shorter):

```typescript
interface FeedItem {
  // Discriminated union for different row types
  type: 'question' | 'separator' | 'milestone'
  key: string

  // For type='question'
  question?: QuestionResult

  // For type='separator' (marks pipeline switches or batch boundaries)
  label?: string
  timestamp?: string

  // For type='milestone' (target crossed, level-up)
  milestone?: {
    pipelineName: string
    accuracy: number
    target: number
    direction: 'pass' | 'fail'
  }
}

// Row height estimator (for VariableSizeList)
function estimateItemSize(item: FeedItem): number {
  if (item.type === 'separator') return 32
  if (item.type === 'milestone') return 56
  const q = item.question!
  const questionLines = Math.ceil(q.question.length / 80)
  const hasError = !!q.error_type
  return 72 + (questionLines - 1) * 20 + (hasError ? 24 : 0)
}
```

### 3.3 Flat Feed Construction

The Zustand store's `questions[]` array is transformed into the `FeedItem[]` array by a selector function that inserts separators and milestones:

```typescript
// Selector: derived feed items from questions (memoized)
function buildFeedItems(
  questions: QuestionResult[],
  pipelineTargets: Record<string, number>
): FeedItem[] {
  const items: FeedItem[] = []
  let lastPipeline: string | null = null

  // Rolling accuracy tracker for milestone detection
  const rollingAcc: Record<string, { tested: number; correct: number }> = {}

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]

    // Pipeline separator
    if (q.rag_type !== lastPipeline) {
      if (lastPipeline !== null) {
        items.push({
          type: 'separator',
          key: `sep-${i}`,
          label: `→ ${q.rag_type.toUpperCase()}`,
          timestamp: q.timestamp
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
    const prevAcc = acc.tested > 1
      ? ((acc.correct - (q.correct ? 1 : 0)) / (acc.tested - 1)) * 100
      : 0

    if (acc.tested >= 10) {
      if (prevAcc < target && currentAcc >= target) {
        items.push({
          type: 'milestone',
          key: `milestone-pass-${i}`,
          milestone: {
            pipelineName: q.rag_type,
            accuracy: currentAcc,
            target,
            direction: 'pass'
          }
        })
      } else if (prevAcc >= target && currentAcc < target) {
        items.push({
          type: 'milestone',
          key: `milestone-fail-${i}`,
          milestone: {
            pipelineName: q.rag_type,
            accuracy: currentAcc,
            target,
            direction: 'fail'
          }
        })
      }
    }

    items.push({ type: 'question', key: q.id, question: q })
  }

  return items
}
```

### 3.4 Iteration History Data Flow

```
data.json (iterations[])
  → /api/dashboard GET
  → useEvalStore.setIterations() on mount
  → IterationSlidingWindow component
  → Horizontal scroll of IterationCard components
  → Uses react-window FixedSizeList (horizontal)
```

The iteration cards show:
- Iteration number and label
- Per-pipeline accuracy as small colored pills
- A sparkline (SVG path) of accuracy trend over the iteration
- "PASS"/"FAIL"/"RUNNING" badge
- Question count as XP indicator

---

## Part 4 — Gamification Elements Specification

### 4.1 XP Level System

The 7 test scales become 7 XP levels. Level progression is the primary gamification mechanic.

```typescript
const XP_LEVELS = [
  { level: 1, label: '1q',    title: 'Smoke Test',    color: '#86868b', icon: 'zap' },
  { level: 2, label: '5q',    title: 'Quick Check',   color: '#0a84ff', icon: 'check-circle' },
  { level: 3, label: '10q',   title: 'Validation',    color: '#30d158', icon: 'shield-check' },
  { level: 4, label: '50q',   title: 'Solid Run',     color: '#ffd60a', icon: 'target' },
  { level: 5, label: '100q',  title: 'Phase Test',    color: '#ff9f0a', icon: 'trending-up' },
  { level: 6, label: '500q',  title: 'Codespace Run', color: '#bf5af2', icon: 'server' },
  { level: 7, label: '1000q', title: 'Full Scale',    color: '#ff453a', icon: 'crown' },
]
```

### 4.2 XP Bar Component

The XP bar shows:
1. Progress within the current level (e.g., 237/500 questions in level 6)
2. Animated fill on each question arrival
3. Level-up explosion when the level boundary is crossed

```typescript
// components/dashboard/XPProgressionBar.tsx
'use client'

import { useEffect, useRef } from 'react'
import { motion, useSpring, useMotionValue, animate } from 'framer-motion'
import { useEvalStore } from '@/stores/evalStore'
import { Zap, CheckCircle, ShieldCheck, Target, TrendingUp, Server, Crown } from 'lucide-react'

const LEVEL_ICONS = { 1: Zap, 2: CheckCircle, 3: ShieldCheck, 4: Target, 5: TrendingUp, 6: Server, 7: Crown }

export function XPProgressionBar() {
  const { xpLevel, prevXpLevel, levelUpTriggered, currentIteration, clearLevelUpTrigger } = useEvalStore()
  const totalTested = currentIteration?.total_tested ?? 0

  // Progress within current level (0–1)
  const levelRange = xpLevel.max - xpLevel.min
  const levelProgress = levelRange > 0
    ? Math.min((totalTested - xpLevel.min) / levelRange, 1)
    : 0

  // Spring-animated progress value
  const progressMotion = useMotionValue(0)
  const springProgress = useSpring(progressMotion, { stiffness: 100, damping: 20 })

  useEffect(() => {
    progressMotion.set(levelProgress)
  }, [levelProgress, progressMotion])

  // Level-up animation trigger
  useEffect(() => {
    if (levelUpTriggered) {
      // Brief flash to 100%, then reset to 0 for new level
      animate(progressMotion, 1, { duration: 0.3, ease: 'easeOut' })
        .then(() => {
          progressMotion.set(0)
          clearLevelUpTrigger()
        })
    }
  }, [levelUpTriggered, progressMotion, clearLevelUpTrigger])

  const Icon = LEVEL_ICONS[xpLevel.level as keyof typeof LEVEL_ICONS]

  return (
    <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {/* Level header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            key={xpLevel.level}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon className="w-4 h-4" style={{ color: xpLevel.color }} />
          </motion.div>
          <div>
            <span className="text-[13px] font-semibold text-tx">
              Level {xpLevel.level} — {xpLevel.title}
            </span>
            <div className="text-[10px] text-tx3 mt-0.5">
              {totalTested} / {xpLevel.max} questions
            </div>
          </div>
        </div>

        {/* Level badges: 1–7 */}
        <div className="flex items-center gap-1">
          {[1,2,3,4,5,6,7].map(l => (
            <div
              key={l}
              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all"
              style={{
                backgroundColor: l <= xpLevel.level
                  ? `${XP_LEVELS[l-1].color}20`
                  : 'rgba(255,255,255,0.03)',
                color: l <= xpLevel.level
                  ? XP_LEVELS[l-1].color
                  : 'rgba(255,255,255,0.15)',
                border: l === xpLevel.level
                  ? `1px solid ${xpLevel.color}50`
                  : '1px solid transparent',
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* XP Bar */}
      <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: springProgress.get() * 100 + '%',
            backgroundColor: xpLevel.color,
            boxShadow: `0 0 12px ${xpLevel.color}60`,
          }}
          // Framer Motion style prop allows MotionValue
          // (use `style` not inline style for reactive updates)
          // Real implementation uses: style={{ width: useTransform(springProgress, v => `${v * 100}%`) }}
        />
      </div>

      {/* Level segment markers */}
      <div className="flex justify-between mt-1">
        {XP_LEVELS.map(l => (
          <span
            key={l.level}
            className="text-[8px]"
            style={{ color: l.level <= xpLevel.level ? l.color : 'rgba(255,255,255,0.15)' }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
```

### 4.3 Scoring Visual Feedback

Each `QuestionRow` in the live feed uses enter animations keyed to correctness:

```typescript
// Correct answer: green flash, score ticks up
// Wrong answer: red shake, accuracy dips
// Error: orange pulse, streak reset

const rowVariants = {
  hidden: { opacity: 0, x: -20, height: 0 },
  visible: (correct: boolean) => ({
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.5,
    }
  }),
  error: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.3 }
  }
}

// Score counter animation (F1 score ticking from 0 to value)
// Use Framer Motion's useMotionValue + animate() with a number
// and display via a useTransform that rounds to 2dp
```

### 4.4 Milestone Notifications

When accuracy crosses a target threshold or a new level is reached:

```typescript
// components/dashboard/MilestoneNotification.tsx
// Uses AnimatePresence for enter/exit

// Trigger conditions:
// 1. XP Level up → "LEVEL UP: Solid Run unlocked"
// 2. Pipeline crosses target → "Standard RAG: 85.2% PASS (target: 85%)"
// 3. Phase gate passed → "Phase 1 Complete: All pipelines PASS"
// 4. Streak of 10+ → "10-question streak on Standard RAG"
// 5. Perfect batch → "5/5 perfect batch"

interface Milestone {
  id: string
  type: 'level_up' | 'target_pass' | 'target_fail' | 'phase_gate' | 'streak' | 'perfect'
  title: string
  subtitle: string
  color: string
  icon: string
  duration: number  // ms to show before auto-dismiss
}

// Notification appears as a floating card (bottom-right)
// with a spring animation: scale 0.8 → 1.0, opacity 0 → 1
// Auto-dismisses after `duration` ms
// Multiple milestones queue
```

### 4.5 Pipeline Card Extensions (Gaming Style)

The existing `PipelineCards.tsx` accuracy ring is extended with:

1. **Live counter**: "127 questions · 84.2% · RUNNING" instead of static numbers
2. **Streak indicator**: A small fire icon that lights up for 5+ consecutive correct
3. **Accuracy delta**: "+2.1pp since last iteration" with animated arrow
4. **Target proximity glow**: The ring pulses when accuracy is within 2pp of target
5. **Running animation**: While `isRunning`, the ring border has a subtle rotating shimmer

```typescript
// AccuracyRing extended with running shimmer
// When pipeline is active: add a rotating gradient overlay on the ring track
// When accuracy > target: ring glows with xpLevel.color
// When accuracy < target by <2pp: ring pulses with orange

const ringVariants = {
  idle: { filter: 'none' },
  running: {
    filter: [
      'drop-shadow(0 0 4px rgba(255,255,255,0.1))',
      'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
      'drop-shadow(0 0 4px rgba(255,255,255,0.1))',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  },
  passed: {
    filter: 'drop-shadow(0 0 8px rgba(48,209,88,0.5))',
  }
}
```

### 4.6 Streak System

```typescript
interface StreakState {
  pipeline: string
  count: number          // current consecutive correct
  best: number           // best streak this session
  broken: boolean        // true for one frame when streak breaks (shake animation)
}

// Thresholds for visual feedback:
// 3+  → subtle glow on correct answers
// 5+  → fire icon appears on pipeline card
// 10+ → fire turns gold, notification fires
// 20+ → purple fire, "unstoppable" badge
```

---

## Part 5 — Terminal-Style Q&A Feed Component

### 5.1 Design Language

The feed takes visual inspiration from terminal output but uses React components, not xterm.js. This keeps it lightweight and SSR-friendly. The aesthetic uses:

- Monospace font (`font-mono`) for IDs, scores, latencies
- Color-coded by result: `#30d158` (correct), `#ff453a` (wrong), `#ff9f0a` (error)
- Left border accent per pipeline
- Dense, compact layout with expandable details on click
- Auto-scroll to bottom (with "pause scroll" when user scrolls up)

### 5.2 `QuestionRow` Component

```typescript
// components/dashboard/QuestionRow.tsx
'use client'

import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { Check, X, AlertTriangle, Clock, Brain, ChevronDown, ChevronUp } from 'lucide-react'

const PIPELINE_COLORS: Record<string, string> = {
  standard:     '#0a84ff',
  graph:        '#bf5af2',
  quantitative: '#ffd60a',
  orchestrator: '#30d158',
}

const PIPELINE_ABBREV: Record<string, string> = {
  standard:     'STD',
  graph:        'GRP',
  quantitative: 'QNT',
  orchestrator: 'ORC',
}

interface Props {
  item: QuestionResult
  style: React.CSSProperties  // from react-window
  isNew: boolean              // true for first render (triggers enter animation)
}

export const QuestionRow = memo(function QuestionRow({ item: q, style, isNew }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pipelineColor = PIPELINE_COLORS[q.rag_type] ?? '#86868b'
  const statusColor = q.error_type ? '#ff9f0a' : q.correct ? '#30d158' : '#ff453a'

  return (
    <motion.div
      style={style}
      initial={isNew ? { opacity: 0, x: -8 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      className="px-2 py-1"
    >
      <div
        className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03]
                   transition-colors cursor-pointer overflow-hidden"
        style={{ borderLeft: `3px solid ${pipelineColor}` }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Main row */}
        <div className="flex items-start gap-3 p-3">
          {/* Status icon */}
          <div className="flex-shrink-0 mt-0.5">
            {q.error_type ? (
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#ff9f0a' }} />
            ) : q.correct ? (
              <Check className="w-3.5 h-3.5" style={{ color: '#30d158' }} />
            ) : (
              <X className="w-3.5 h-3.5" style={{ color: '#ff453a' }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Pipeline badge + question */}
            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="text-[9px] font-mono font-bold flex-shrink-0"
                style={{ color: pipelineColor }}
              >
                {PIPELINE_ABBREV[q.rag_type]}
              </span>
              <p className="text-[12px] text-tx leading-snug truncate">
                {q.question}
              </p>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              {/* F1 score with color gradient */}
              <span style={{ color: q.f1 > 0.8 ? '#30d158' : q.f1 > 0.5 ? '#ffd60a' : '#ff453a' }}>
                F1:{q.f1.toFixed(2)}
              </span>
              {/* Latency */}
              <span className="flex items-center gap-0.5 text-tx3">
                <Clock className="w-2.5 h-2.5" />
                {(q.latency_ms / 1000).toFixed(1)}s
              </span>
              {/* Match method */}
              {q.match_type && (
                <span className="text-tx3">{q.match_type}</span>
              )}
              {/* Error type */}
              {q.error_type && (
                <span style={{ color: '#ff9f0a' }}>{q.error_type}</span>
              )}
              {/* Seq number */}
              <span className="text-tx3/50 ml-auto">#{q.seq}</span>
              {/* Expand toggle */}
              {expanded
                ? <ChevronUp className="w-3 h-3 text-tx3" />
                : <ChevronDown className="w-3 h-3 text-tx3" />
              }
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-t border-white/[0.04] px-3 pb-3 pt-2"
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              {q.expected && (
                <div>
                  <span className="text-tx3">Expected: </span>
                  <span className="font-mono text-gn">{q.expected.slice(0, 120)}</span>
                </div>
              )}
              {q.answer && (
                <div>
                  <span className="text-tx3">Got: </span>
                  <span className="font-mono text-tx">{q.answer.slice(0, 120)}</span>
                </div>
              )}
              {q.error_type && (
                <div className="col-span-2">
                  <span className="text-or font-mono text-[10px]">
                    ERROR[{q.error_type}]
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}, (prev, next) => {
  // Only re-render when the question data or expansion state changes
  return prev.item.id === next.item.id && prev.isNew === next.isNew
})
```

### 5.3 `VirtualizedFeedList` with Auto-Scroll

```typescript
// components/dashboard/VirtualizedFeedList.tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { VariableSizeList } from 'react-window'
import { useEvalStore } from '@/stores/evalStore'
import { QuestionRow } from './QuestionRow'
import { SeparatorRow } from './SeparatorRow'
import { MilestoneRow } from './MilestoneRow'

const CONTAINER_HEIGHT = 600  // px, could be dynamic via ResizeObserver

export function VirtualizedFeedList() {
  const listRef = useRef<VariableSizeList>(null)
  const userScrolledUp = useRef(false)
  const lastItemCount = useRef(0)

  const feedItems = useEvalStore(state =>
    buildFeedItems(state.questions, PIPELINE_TARGETS)
  )

  // Auto-scroll to bottom when new items arrive (unless user scrolled up)
  useEffect(() => {
    if (!userScrolledUp.current && feedItems.length !== lastItemCount.current) {
      listRef.current?.scrollToItem(feedItems.length - 1, 'end')
    }
    lastItemCount.current = feedItems.length
  }, [feedItems.length])

  const getItemSize = useCallback((index: number) => {
    return estimateItemSize(feedItems[index])
  }, [feedItems])

  // Detect user scroll
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: {
    scrollOffset: number
    scrollUpdateWasRequested: boolean
  }) => {
    if (!scrollUpdateWasRequested) {
      // User initiated scroll — check if they're at the bottom
      const totalHeight = feedItems.reduce((sum, item) => sum + estimateItemSize(item), 0)
      const atBottom = scrollOffset >= totalHeight - CONTAINER_HEIGHT - 50
      userScrolledUp.current = !atBottom
    }
  }, [feedItems])

  return (
    <div className="relative">
      <VariableSizeList
        ref={listRef}
        height={CONTAINER_HEIGHT}
        itemCount={feedItems.length}
        itemSize={getItemSize}
        width="100%"
        overscanCount={5}
        onScroll={handleScroll}
      >
        {({ index, style }) => {
          const item = feedItems[index]
          const isNew = index >= lastItemCount.current - 3  // Last 3 items are "new"

          if (item.type === 'separator') {
            return <SeparatorRow key={item.key} item={item} style={style} />
          }
          if (item.type === 'milestone') {
            return <MilestoneRow key={item.key} item={item} style={style} />
          }
          return (
            <QuestionRow
              key={item.key}
              item={item.question!}
              style={style}
              isNew={isNew}
            />
          )
        }}
      </VariableSizeList>

      {/* "Jump to bottom" button when user has scrolled up */}
      {userScrolledUp.current && (
        <button
          onClick={() => {
            userScrolledUp.current = false
            listRef.current?.scrollToItem(feedItems.length - 1, 'end')
          }}
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl
                     bg-ac/20 border border-ac/30 text-ac text-[11px]
                     hover:bg-ac/30 transition-all"
        >
          Jump to bottom
        </button>
      )}
    </div>
  )
}
```

### 5.4 `FeedStatusBar` — Live Statistics Line

```typescript
// Positioned below VirtualizedFeedList
// Updates every question arrival

export function FeedStatusBar() {
  const { questions, pipelineStats, isRunning, elapsedMs } = useEvalStore()

  const total = questions.length
  const correct = questions.filter(q => q.correct).length
  const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : '—'
  const avgLatency = Object.values(pipelineStats)
    .map(s => s.avg_latency_ms)
    .filter(Boolean)
    .reduce((a, b) => a + b, 0) / Math.max(Object.keys(pipelineStats).length, 1)

  const elapsed = Math.floor(elapsedMs / 1000)
  const elapsedStr = elapsed >= 60
    ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : `${elapsed}s`

  return (
    <div className="flex items-center gap-4 px-3 py-2 text-[10px] font-mono
                    border-t border-white/[0.04] text-tx3">
      <span>
        <span className="text-tx">{total}</span> questions
      </span>
      <span>·</span>
      <span>
        <span style={{
          color: parseFloat(accuracy) >= 75 ? '#30d158' : '#ff453a'
        }}>{accuracy}%</span> accuracy
      </span>
      <span>·</span>
      <span>
        <span className="text-tx">{(avgLatency / 1000).toFixed(1)}s</span> avg
      </span>
      {isRunning && (
        <>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            {elapsedStr}
          </span>
        </>
      )}
    </div>
  )
}
```

---

## Part 6 — Integration Plan (Incremental)

### Phase A: Faster Polling (No Code Changes to Eval Scripts)
**Effort: 1 hour | Impact: Medium**

1. Change `/api/dashboard/stream/route.ts` poll interval from 10s to 500ms
2. Add `is_running` field to n8n Dashboard Status API response
3. Browser sees updates every ~500ms instead of every 10s

Files: `website/src/app/api/dashboard/stream/route.ts`

### Phase B: XP Bar and Gamified Pipeline Cards
**Effort: 4 hours | Impact: High**

1. Add `evalStore.ts` with Zustand + immer + subscribeWithSelector
2. Replace polling hook in `dashboard/page.tsx` with `useEvalStore` + `useEvalStream`
3. Add `XPProgressionBar.tsx` to dashboard layout
4. Extend `PipelineCards.tsx` with live stats, streak indicator, running animation

Files: `website/src/stores/evalStore.ts` (new), `website/src/hooks/useEvalStream.ts` (new), `website/src/components/dashboard/XPProgressionBar.tsx` (new), `website/src/components/dashboard/PipelineCards.tsx` (extend)

### Phase C: Live Q&A Terminal Feed
**Effort: 6 hours | Impact: High**

1. Add `react-window` dependency
2. Create `VirtualizedFeedList.tsx`, `QuestionRow.tsx`, `FeedStatusBar.tsx`
3. Wire to `evalStore.questions[]` from SSE stream
4. Replace static `QuestionViewer.tsx` in detailed view

Files: New components in `website/src/components/dashboard/live/`

### Phase D: SSE Eval Stream Endpoint
**Effort: 3 hours | Impact: High**

1. Add `/api/eval/stream/route.ts` (polls n8n status at 500ms, emits per-question events)
2. Modify `live-writer.py` to emit events with sequence numbers
3. Connect `useEvalStream` hook to new endpoint

Files: `website/src/app/api/eval/stream/route.ts` (new), `eval/live-writer.py` (minor extend)

### Phase E: Milestone Notifications + Iteration Sliding Window
**Effort: 4 hours | Impact: Medium**

1. Add `MilestoneNotification.tsx` with queue + AnimatePresence
2. Add `IterationSlidingWindow.tsx` using `react-window` FixedSizeList horizontal
3. Wire milestone detection from `buildFeedItems()` to notification store

---

## Part 7 — Technical Dependencies

### New npm Packages (rag-website)

```json
{
  "react-window": "^1.8.10",
  "react-window-infinite-loader": "^1.0.9",
  "zustand": "^5.0.0",
  "react-confetti": "^6.1.0"
}
```

Note: `framer-motion` is already installed (used in existing dashboard components).

### No Changes Required To

- n8n workflows (data available via existing webhooks)
- eval Python scripts (live-writer.py already writes per-question)
- `data.json` format (already has iterations[].questions[])
- Supabase schema
- VM infrastructure

---

## Part 8 — Performance Considerations

### VM RAM Budget

The VM has ~100MB free RAM. The changes here affect only the browser and Vercel, not the VM:

- SSE polling at 500ms uses negligible additional VM CPU (~1 extra HTTP request per 500ms from Vercel to n8n)
- No new processes on the VM
- No WebSocket server needed

### Browser Performance

- `react-window` virtualizes the feed: only ~10–15 DOM nodes at a time regardless of 500 questions in the store
- Zustand `subscribeWithSelector` ensures only components that use a specific slice of state re-render
- `QuestionRow` is memoized with custom comparison (only re-renders when ID or expansion changes)
- `buildFeedItems()` should be memoized with `useMemo` to avoid recomputation on unrelated state changes

### SSE Connection Management

- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s, 30s ceiling)
- `since` parameter allows resuming without replaying all events
- 10-minute connection timeout (server closes, client reconnects automatically)
- Heartbeat every 25s keeps the connection alive through Vercel's 30s timeout

---

## Sources

- [WebSockets vs SSE vs Long-Polling (RxDB)](https://rxdb.info/articles/websockets-sse-polling-webrtc-webtransport.html)
- [SSE in Next.js 15 — HackerNoon](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events)
- [Next.js Real-Time Chat: WebSocket and SSE](https://eastondev.com/blog/en/posts/dev/20260107-nextjs-realtime-chat/)
- [n8n Streaming Responses Docs](https://docs.n8n.io/workflows/streaming/)
- [n8n PR #20499 — Structured SSE Streaming via RespondToWebhook](https://github.com/n8n-io/n8n/pull/20499)
- [n8n PR #18924 — SSE Format for ToolsAgent](https://github.com/n8n-io/n8n/pull/18924)
- [Virtual Scrolling in React — LogRocket](https://blog.logrocket.com/virtual-scrolling-core-principles-and-basic-implementation-in-react/)
- [TanStack Virtual Infinite Scroll Example](https://tanstack.com/virtual/latest/docs/framework/react/examples/infinite-scroll)
- [react-window vs react-virtuoso — Medium](https://medium.com/@stuthineal/infinite-scrolling-made-easy-react-window-vs-react-virtuso-1fd786058a73)
- [Zustand State Management 2025 — Developer Way](https://www.developerway.com/posts/react-state-management-2025)
- [Zustand subscribeWithSelector — GitHub](https://github.com/pmndrs/zustand)
- [Framer Motion Animation Library](https://www.framer.com/motion/animation/)
- [Gamification in React — Conf42](https://www.conf42.com/cmaj_JavaScript_2024_Courtney_Yatteau_15_react_gamification_frontend)
- [xterm.js Terminal UI](https://xtermjs.org/)
- [react-terminal-ui — GitHub](https://github.com/jonmbake/react-terminal-ui)
- [Progress Indicators and UX — UX Collective](https://uxdesign.cc/from-rpgs-to-ux-how-progress-indicators-affect-user-engagement-8748f02d766a)
- [Confetti with Framer Motion — Yeti](https://www.yeti.co/lab-case-studies/framer-motion-confetti-effects)
- [SSE with React — Medium (Sonali Nogja)](https://medium.com/@sonali.nogja.08/server-sent-events-sse-with-react-the-real-time-data-powerhouse-45efbabcc0ab)
- [n8n SSE Community Thread](https://community.n8n.io/t/send-sse-server-side-events-on-the-respond-to-webhook/42660)
