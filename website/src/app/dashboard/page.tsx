'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary'
import { PipelineCards } from '@/components/dashboard/PipelineCards'
import { DataSources } from '@/components/dashboard/DataSources'
import { AccuracyTrend } from '@/components/dashboard/AccuracyTrend'
import { PhaseExplorer } from '@/components/dashboard/PhaseExplorer'
import { QuestionViewer } from '@/components/dashboard/QuestionViewer'

interface SourceInfo {
  label: string
  description: string
  status: 'connected' | 'offline' | 'pending'
  last_update: string | null
  datasets: string
}

interface PipelineData {
  accuracy: number
  target: number
  met: boolean
  tested: number
  correct: number
  errors: number
  gap: number
}

interface DashboardData {
  status: {
    pipelines?: Record<string, PipelineData>
    overall?: { accuracy: number; target: number; met: boolean }
    phase?: { current: number; name: string }
    blockers?: string[]
  }
  meta: { total_unique_questions?: number; total_test_runs?: number; total_iterations?: number; source?: string }
  sources: Record<string, SourceInfo>
  phase: { current: number; name: string; gates_passed: boolean }
  lastIteration: { id: string; label: string; timestamp: string } | null
  iterations: { id: string; label: string; timestamp: string; results_summary: Record<string, { tested: number; correct: number; accuracy: number }> }[]
  recentQuestions: Record<string, unknown>[]
  registrySize: number
}

// Shape adapter: convert DashboardData (page's wrapped format) into the flat
// shape expected by PhaseExplorer which also accepts the status.json format.
function toPhaseExplorerData(data: DashboardData) {
  return {
    phase: data.phase ?? data.status.phase,
    pipelines: data.status.pipelines,
    overall: data.status.overall,
    status: data.status,
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [bottomExpanded, setBottomExpanded] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) setData(await res.json())
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-bold tracking-[-0.03em] text-tx">
              Quality Dashboard
            </h1>
            <p className="text-[14px] text-tx2 mt-1">
              Transparence totale sur les performances de Nomos AI
            </p>
          </div>
          {/* Collapse/expand button for bottom sections */}
          <button
            onClick={() => setBottomExpanded(e => !e)}
            className="flex items-center gap-2 px-4 py-1.5 text-[12px] font-medium rounded-xl border border-white/[0.06] bg-white/[0.04] text-tx2 hover:bg-white/[0.06] transition-all"
          >
            {bottomExpanded ? 'Reduire' : 'Developper'}
            <span
              className="text-white/30 transition-transform duration-200"
              style={{ display: 'inline-block', transform: bottomExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
              ↓
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-ac/30 border-t-ac rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-8">
            {/* 1 — Executive KPIs */}
            <ExecutiveSummary
              status={data.status}
              meta={data.meta}
            />

            {/* 2 — Pipeline cards */}
            <PipelineCards
              pipelines={data.status.pipelines ?? {}}
              view="detailed"
            />

            {/* 3 — Accuracy trend chart */}
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                Tendance de precision — 42 iterations
              </h2>
              <AccuracyTrend />
            </div>

            {/* 4 — Data sources section */}
            {data.sources && (
              <DataSources sources={data.sources} />
            )}

            {/* 5 — Last iteration info */}
            {data.lastIteration && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-2">Derniere iteration</div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-mono text-tx">{data.lastIteration.label}</span>
                  <span className="text-[11px] text-tx3">
                    {new Date(data.lastIteration.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            )}

            {/* 6 — Bottom sections (collapsible) */}
            {bottomExpanded && (
              <>
                {/* Phase gate progress */}
                <div>
                  <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                    Progression par phase
                  </h2>
                  <PhaseExplorer data={toPhaseExplorerData(data)} />
                </div>

                {/* Q&A history */}
                <div>
                  <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                    Historique des questions
                  </h2>
                  <QuestionViewer questions={data.recentQuestions} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-tx2 py-20">
            Impossible de charger les donnees. Verifiez que le serveur de status est accessible.
          </div>
        )}
      </main>
    </>
  )
}
