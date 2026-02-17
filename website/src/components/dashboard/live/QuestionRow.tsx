'use client'

import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { QuestionResult } from '@/stores/evalStore'

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
  style?: React.CSSProperties
  isNew?: boolean
}

export const QuestionRow = memo(
  function QuestionRow({ item: q, style, isNew }: Props) {
    const [expanded, setExpanded] = useState(false)
    const pipelineColor = PIPELINE_COLORS[q.rag_type] ?? '#86868b'
    const isError = !!q.error_type
    const statusColor = isError ? '#ff9f0a' : q.correct ? '#30d158' : '#ff453a'

    return (
      <div style={style} className="px-2 py-1">
        <motion.div
          initial={isNew ? { opacity: 0, x: -8 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 35 }}
          className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer overflow-hidden"
          style={{
            borderLeft: `3px solid ${pipelineColor}`,
          }}
          onClick={() => setExpanded(e => !e)}
        >
          {/* Main row */}
          <div className="flex items-start gap-3 p-3">
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {isError ? (
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
                  {PIPELINE_ABBREV[q.rag_type] ?? q.rag_type.toUpperCase().slice(0, 3)}
                </span>
                <p className="text-[12px] text-tx leading-snug truncate">
                  {q.question}
                </p>
              </div>

              {/* Metrics row */}
              <div className="flex items-center gap-3 text-[10px] font-mono">
                {/* F1 score */}
                <span
                  style={{
                    color:
                      q.f1 > 0.8
                        ? '#30d158'
                        : q.f1 > 0.5
                        ? '#ffd60a'
                        : '#ff453a',
                  }}
                >
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

                {/* Sequence number */}
                <span className="text-tx3/50 ml-auto font-mono text-[9px]">
                  #{q.seq}
                </span>

                {/* Expand toggle */}
                {expanded ? (
                  <ChevronUp className="w-3 h-3 text-tx3" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-tx3" />
                )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                {q.expected && (
                  <div>
                    <span className="text-tx3">Expected: </span>
                    <span className="font-mono" style={{ color: '#30d158' }}>
                      {q.expected.slice(0, 120)}
                      {q.expected.length > 120 ? '...' : ''}
                    </span>
                  </div>
                )}
                {q.answer && (
                  <div>
                    <span className="text-tx3">Got: </span>
                    <span className="font-mono text-tx">
                      {q.answer.slice(0, 120)}
                      {q.answer.length > 120 ? '...' : ''}
                    </span>
                  </div>
                )}
                {q.error_type && (
                  <div className="col-span-2">
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: '#ff9f0a' }}
                    >
                      ERROR[{q.error_type}]
                    </span>
                  </div>
                )}
              </div>

              {/* Score bar */}
              <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(q.f1 * 100, 100)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    )
  },
  (prev, next) => {
    // Only re-render when question data or new flag changes
    return prev.item.id === next.item.id && prev.isNew === next.isNew
  }
)
