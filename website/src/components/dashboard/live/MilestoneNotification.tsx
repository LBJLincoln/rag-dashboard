'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEvalStore } from '@/stores/evalStore'
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Flame,
  Star,
  Zap,
} from 'lucide-react'

// ---- Milestone types -----------------------------------------------------

type MilestoneType =
  | 'level_up'
  | 'target_pass'
  | 'target_fail'
  | 'phase_gate'
  | 'streak'
  | 'perfect'

interface Milestone {
  id: string
  type: MilestoneType
  title: string
  subtitle: string
  color: string
  icon: MilestoneType
  duration: number // ms before auto-dismiss
}

const MILESTONE_ICONS: Record<MilestoneType, React.ComponentType<{ className?: string }>> = {
  level_up:    Crown,
  target_pass: TrendingUp,
  target_fail: TrendingDown,
  phase_gate:  Star,
  streak:      Flame,
  perfect:     Zap,
}

// ---- Single notification card --------------------------------------------

function NotificationCard({
  milestone,
  onDismiss,
}: {
  milestone: Milestone
  onDismiss: () => void
}) {
  const Icon = MILESTONE_ICONS[milestone.icon]

  useEffect(() => {
    const timer = setTimeout(onDismiss, milestone.duration)
    return () => clearTimeout(timer)
  }, [milestone.duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 16 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="relative flex items-start gap-3 px-4 py-3 rounded-2xl border cursor-pointer select-none"
      style={{
        backgroundColor: `${milestone.color}12`,
        borderColor: `${milestone.color}35`,
        boxShadow: `0 4px 24px ${milestone.color}20`,
        minWidth: '260px',
        maxWidth: '340px',
      }}
      onClick={onDismiss}
    >
      {/* Colored icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${milestone.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: milestone.color } as React.CSSProperties} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-semibold leading-tight"
          style={{ color: milestone.color }}
        >
          {milestone.title}
        </p>
        <p className="text-[11px] text-tx2 mt-0.5 leading-snug">
          {milestone.subtitle}
        </p>
      </div>

      {/* Progress bar (auto-dismiss timer) */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 rounded-b-2xl"
        style={{ backgroundColor: milestone.color }}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: milestone.duration / 1000, ease: 'linear' }}
      />
    </motion.div>
  )
}

// ---- Main overlay component ----------------------------------------------

export function MilestoneNotification() {
  const [notifications, setNotifications] = useState<Milestone[]>([])
  const queueRef = useRef<Milestone[]>([])

  const addNotification = useCallback((m: Milestone) => {
    setNotifications(prev => {
      // Max 3 visible at once
      const next = [...prev, m]
      return next.slice(-3)
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // Subscribe to XP level-up events
  const xpLevel = useEvalStore(s => s.xpLevel)
  const levelUpTriggered = useEvalStore(s => s.levelUpTriggered)
  const prevXpLevel = useEvalStore(s => s.prevXpLevel)
  const prevXpLevelRef = useRef(xpLevel.level)

  useEffect(() => {
    if (levelUpTriggered && prevXpLevel) {
      addNotification({
        id: `level-up-${xpLevel.level}-${Date.now()}`,
        type: 'level_up',
        title: `LEVEL UP — ${xpLevel.title}`,
        subtitle: `Reached level ${xpLevel.level}: ${xpLevel.label}`,
        color: xpLevel.color,
        icon: 'level_up',
        duration: 4000,
      })
    }
  }, [levelUpTriggered, xpLevel, prevXpLevel, addNotification])

  // Subscribe to pipeline streak events
  const pipelineStats = useEvalStore(s => s.pipelineStats)
  const streakNotifiedRef = useRef<Record<string, number>>({})

  useEffect(() => {
    for (const [pipeline, stats] of Object.entries(pipelineStats)) {
      const prev = streakNotifiedRef.current[pipeline] ?? 0
      // Fire at 5, 10, 20 streak milestones
      const thresholds = [20, 10, 5]
      for (const threshold of thresholds) {
        if (stats.streak >= threshold && prev < threshold) {
          streakNotifiedRef.current[pipeline] = stats.streak
          const pipelineColors: Record<string, string> = {
            standard:     '#0a84ff',
            graph:        '#bf5af2',
            quantitative: '#ffd60a',
            orchestrator: '#30d158',
          }
          addNotification({
            id: `streak-${pipeline}-${threshold}-${Date.now()}`,
            type: 'streak',
            title: `${threshold}-QUESTION STREAK`,
            subtitle: `${pipeline.charAt(0).toUpperCase() + pipeline.slice(1)} RAG — ${stats.streak} consecutive correct`,
            color: pipelineColors[pipeline] ?? '#86868b',
            icon: 'streak',
            duration: 3500,
          })
          break
        }
      }

      // Reset if streak broke
      if (stats.streak < prev) {
        streakNotifiedRef.current[pipeline] = 0
      }
    }
  }, [pipelineStats, addNotification])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationCard
              milestone={n}
              onDismiss={() => dismiss(n.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
