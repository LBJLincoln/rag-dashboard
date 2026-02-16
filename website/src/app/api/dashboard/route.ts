import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const ROOT = join(process.cwd(), '..')

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [statusRaw, dataRaw] = await Promise.all([
      readFile(join(ROOT, 'docs/status.json'), 'utf-8').catch(() => '{}'),
      readFile(join(ROOT, 'docs/data.json'), 'utf-8').catch(() => '{}'),
    ])

    const status = JSON.parse(statusRaw)
    const data = JSON.parse(dataRaw)

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
