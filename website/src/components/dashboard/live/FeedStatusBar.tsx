'use client'

import { useEvalStore } from '@/stores/evalStore'

export function FeedStatusBar() {
  const questions = useEvalStore(s => s.questions)
  const pipelineStats = useEvalStore(s => s.pipelineStats)
  const isRunning = useEvalStore(s => s.isRunning)
  const elapsedMs = useEvalStore(s => s.elapsedMs)

  const total = questions.length
  const correct = questions.filter(q => q.correct).length
  const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : null

  // Average latency across all pipelines
  const statValues = Object.values(pipelineStats)
  const avgLatency =
    statValues.length > 0
      ? statValues.reduce((sum, s) => sum + s.avg_latency_ms, 0) /
        statValues.length
      : 0

  // Format elapsed time
  const elapsed = Math.floor(elapsedMs / 1000)
  const elapsedStr =
    elapsed >= 60
      ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
      : `${elapsed}s`

  // Accuracy color
  const accuracyColor =
    accuracy == null
      ? 'var(--tx3)'
      : parseFloat(accuracy) >= 75
      ? '#30d158'
      : '#ff453a'

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-[10px] font-mono border-t border-white/[0.04]"
      style={{ color: 'var(--tx3)' }}
    >
      {/* Question count */}
      <span>
        <span className="text-tx">{total}</span> questions
      </span>

      <span className="text-white/20">·</span>

      {/* Accuracy */}
      <span>
        <span style={{ color: accuracyColor }}>
          {accuracy ?? '—'}%
        </span>{' '}
        accuracy
      </span>

      <span className="text-white/20">·</span>

      {/* Avg latency */}
      <span>
        <span className="text-tx">{(avgLatency / 1000).toFixed(1)}s</span> avg
      </span>

      {/* Per-pipeline mini stats */}
      {Object.entries(pipelineStats).map(([pipeline, stats]) => (
        <span key={pipeline} className="flex items-center gap-1">
          <span className="text-white/20">·</span>
          <span
            className="uppercase text-[8px] font-bold"
            style={{
              color:
                pipeline === 'standard'
                  ? '#0a84ff'
                  : pipeline === 'graph'
                  ? '#bf5af2'
                  : pipeline === 'quantitative'
                  ? '#ffd60a'
                  : '#30d158',
            }}
          >
            {pipeline.slice(0, 3).toUpperCase()}
          </span>
          <span
            style={{
              color: stats.accuracy >= 75 ? '#30d158' : '#ff453a',
            }}
          >
            {stats.accuracy.toFixed(1)}%
          </span>
          {stats.streak >= 5 && (
            <span title={`${stats.streak} streak`}>🔥</span>
          )}
        </span>
      ))}

      {/* Live indicator when running */}
      {isRunning && (
        <>
          <span className="text-white/20">·</span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#30d158' }}
            />
            <span className="text-tx">{elapsedStr}</span>
          </span>
        </>
      )}
    </div>
  )
}
