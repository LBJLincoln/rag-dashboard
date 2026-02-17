'use client'

// Note: react-window is not yet installed.
// This component uses a simple overflow-y-auto scrollable div (max-height: 600px).
// Auto-scroll to bottom is implemented with a ref and MutationObserver.
// Replace with react-window VariableSizeList when it is added to package.json.

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEvalStore, buildFeedItems, PIPELINE_TARGETS } from '@/stores/evalStore'
import { QuestionRow } from './QuestionRow'

const CONTAINER_HEIGHT = 600 // px

const PIPELINE_COLORS: Record<string, string> = {
  standard:     '#0a84ff',
  graph:        '#bf5af2',
  quantitative: '#ffd60a',
  orchestrator: '#30d158',
}

// ---- Separator row -------------------------------------------------------

function SeparatorRow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[10px] font-mono text-tx3 flex items-center gap-1">
        <Minus className="w-2.5 h-2.5" />
        {label}
      </span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

// ---- Milestone row -------------------------------------------------------

function MilestoneRow({
  pipelineName,
  accuracy,
  target,
  direction,
}: {
  pipelineName: string
  accuracy: number
  target: number
  direction: 'pass' | 'fail'
}) {
  const color = direction === 'pass' ? '#30d158' : '#ff453a'
  const pipelineColor = PIPELINE_COLORS[pipelineName] ?? '#86868b'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 my-1 px-3 py-2 rounded-xl border flex items-center gap-3"
      style={{
        borderColor: `${color}30`,
        backgroundColor: `${color}08`,
      }}
    >
      {direction === 'pass' ? (
        <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color }} />
      ) : (
        <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color }} />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-medium" style={{ color }}>
          {direction === 'pass' ? 'TARGET REACHED' : 'BELOW TARGET'}
        </span>
        <span className="text-[10px] text-tx3 ml-2 font-mono">
          <span style={{ color: pipelineColor }}>{pipelineName}</span>
          {' '}→{' '}
          <span style={{ color }}>{accuracy.toFixed(1)}%</span>
          {' '}(target: {target}%)
        </span>
      </div>
    </motion.div>
  )
}

// ---- Main component ------------------------------------------------------

export function VirtualizedFeedList() {
  const questions = useEvalStore(s => s.questions)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)
  const prevLengthRef = useRef(0)

  const feedItems = useMemo(
    () => buildFeedItems(questions, PIPELINE_TARGETS),
    [questions]
  )

  // Auto-scroll: when new items arrive and user has not scrolled up
  useEffect(() => {
    if (!containerRef.current) return
    if (feedItems.length === prevLengthRef.current) return
    prevLengthRef.current = feedItems.length

    if (!userScrolledUp.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [feedItems.length])

  // Detect user scroll direction
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    userScrolledUp.current = !atBottom
  }, [])

  const jumpToBottom = useCallback(() => {
    if (!containerRef.current) return
    userScrolledUp.current = false
    containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [])

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto pr-0.5"
        style={{ maxHeight: `${CONTAINER_HEIGHT}px` }}
      >
        <AnimatePresence initial={false}>
          {feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-tx3 text-[13px]">
              <span className="text-2xl mb-2">⏳</span>
              En attente de donnees en temps reel...
            </div>
          ) : (
            feedItems.map((item, idx) => {
              if (item.type === 'separator') {
                return (
                  <SeparatorRow key={item.key} label={item.label} />
                )
              }
              if (item.type === 'milestone' && item.milestone) {
                return (
                  <MilestoneRow
                    key={item.key}
                    pipelineName={item.milestone.pipelineName}
                    accuracy={item.milestone.accuracy}
                    target={item.milestone.target}
                    direction={item.milestone.direction}
                  />
                )
              }
              if (item.type === 'question' && item.question) {
                const isNew = idx >= feedItems.length - 3
                return (
                  <QuestionRow
                    key={item.key}
                    item={item.question}
                    isNew={isNew}
                  />
                )
              }
              return null
            })
          )}
        </AnimatePresence>
      </div>

      {/* Jump to bottom button (appears when user has scrolled up) */}
      <AnimatePresence>
        {userScrolledUp.current && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={jumpToBottom}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all"
            style={{
              backgroundColor: 'rgba(10,132,255,0.2)',
              border: '1px solid rgba(10,132,255,0.3)',
              color: '#0a84ff',
            }}
          >
            <ArrowDown className="w-3 h-3" />
            Jump to bottom
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
