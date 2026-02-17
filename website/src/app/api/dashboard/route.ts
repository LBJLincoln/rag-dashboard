import { NextResponse } from 'next/server'

const STATUS_API_URL = process.env.STATUS_API_URL ?? 'http://localhost:3001'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [statusRes, dataRes] = await Promise.all([
      fetch(`${STATUS_API_URL}/status.json`, { signal: AbortSignal.timeout(5000) }).catch(() => null),
      fetch(`${STATUS_API_URL}/data.json`, { signal: AbortSignal.timeout(5000) }).catch(() => null),
    ])

    const status = statusRes?.ok ? await statusRes.json() : {}
    const data = dataRes?.ok ? await dataRes.json() : {}

    const iterations = (data.iterations ?? []).slice(-20)
    const registry = data.question_registry ?? {}

    const recentQuestions = iterations
      .flatMap((it: Record<string, unknown>) => {
        const qs = (it as { questions?: unknown[] }).questions ?? []
        return qs.map((q: unknown) => ({
          ...(q as Record<string, unknown>),
          iteration_id: (it as { id?: string }).id,
          iteration_label: (it as { label?: string }).label,
        }))
      })
      .slice(-200)

    return NextResponse.json({
      status,
      meta: data.meta ?? {},
      iterations: iterations.map((it: Record<string, unknown>) => ({
        id: (it as { id?: string }).id,
        label: (it as { label?: string }).label,
        timestamp: (it as { timestamp?: string }).timestamp,
        results_summary: (it as { results_summary?: unknown }).results_summary,
      })),
      recentQuestions,
      registrySize: Object.keys(registry).length,
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
