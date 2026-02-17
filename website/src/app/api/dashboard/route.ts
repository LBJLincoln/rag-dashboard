import { NextResponse } from 'next/server'

const STATUS_API_URL = process.env.STATUS_API_URL ?? 'http://34.136.180.66:8080/status.json'
const DATA_API_URL = process.env.DATA_API_URL ?? 'http://34.136.180.66:8080/data.json'

export const dynamic = 'force-dynamic'

interface SourceStatus {
  pipelines?: Record<string, { accuracy: number; target: number; met: boolean; tested: number; correct: number; errors: number; gap: number }>
  overall?: { accuracy: number; target: number; met: boolean }
  phase?: { current: number; name: string; gates_passed: boolean }
  blockers?: string[]
  totals?: { unique_questions: number; test_runs: number; iterations: number }
  generated_at?: string
  last_iteration?: { id: string; label: string; timestamp: string }
}

async function fetchJSON<T>(url: string, timeoutMs = 10000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const raw = await res.json()
    return Array.isArray(raw) ? raw[0] : raw
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // Fetch all sources in parallel
    const [ragStatus, webhookStatus] = await Promise.all([
      fetchJSON<SourceStatus>(STATUS_API_URL),
      fetchJSON<SourceStatus>(STATUS_API_URL.replace('status.json', '') + '../webhook/nomos-status'),
    ])

    // Primary source: status.json served by Python HTTP on VM port 8080
    const status = ragStatus ?? webhookStatus ?? {}

    // Build multi-source response
    return NextResponse.json({
      // Core RAG pipeline data (mon-ipad tests)
      status,
      // Metadata
      meta: {
        source: ragStatus ? 'status-file' : webhookStatus ? 'n8n-webhook' : 'unavailable',
        fetched_at: new Date().toISOString(),
        total_unique_questions: status.totals?.unique_questions ?? 0,
        total_test_runs: status.totals?.test_runs ?? 0,
        total_iterations: status.totals?.iterations ?? 0,
      },
      // Data sources for UI differentiation
      sources: {
        'mon-ipad': {
          label: 'RAG Pipeline Tests',
          description: 'Tests globaux des 4 pipelines RAG sur benchmarks academiques',
          status: ragStatus ? 'connected' : 'offline',
          last_update: status.generated_at ?? null,
          datasets: '14 benchmarks (SQuAD, HotpotQA, FinQA...)',
        },
        'rag-website': {
          label: 'Sector-Specific Tests',
          description: 'Tests sectoriels (20 datasets/secteur: BTP, Industrie, Finance, Juridique)',
          status: 'pending', // Will be connected when Codespace runs
          last_update: null,
          datasets: '80 datasets (20 x 4 secteurs)',
        },
        'rag-data-ingestion': {
          label: 'Ingestion & Enrichment',
          description: 'Pipeline d\'ingestion documentaire et enrichissement BDD',
          status: 'pending', // Will be connected when Codespace runs
          last_update: null,
          datasets: 'Documents metier (Pinecone, Neo4j, Supabase)',
        },
      },
      // Phase tracking
      phase: status.phase ?? { current: 1, name: 'Baseline (200q)', gates_passed: false },
      // Last iteration info
      lastIteration: status.last_iteration ?? null,
      // Iterations history (empty until data.json is loaded)
      iterations: [],
      recentQuestions: [],
      registrySize: status.totals?.unique_questions ?? 0,
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
