'use client'

import { useEffect } from 'react'
import { motion, useSpring, useMotionValue, animate, useTransform } from 'framer-motion'
import { useEvalStore, XP_LEVELS } from '@/stores/evalStore'
import {
  Zap,
  CheckCircle,
  ShieldCheck,
  Target,
  TrendingUp,
  Server,
  Crown,
} from 'lucide-react'

const LEVEL_ICONS = {
  1: Zap,
  2: CheckCircle,
  3: ShieldCheck,
  4: Target,
  5: TrendingUp,
  6: Server,
  7: Crown,
} as const

export function XPProgressionBar() {
  const xpLevel = useEvalStore(s => s.xpLevel)
  const levelUpTriggered = useEvalStore(s => s.levelUpTriggered)
  const clearLevelUpTrigger = useEvalStore(s => s.clearLevelUpTrigger)
  const currentIteration = useEvalStore(s => s.currentIteration)
  const questions = useEvalStore(s => s.questions)

  const totalTested = currentIteration?.total_tested ?? questions.length

  // Progress within current level (0–1)
  const levelRange = xpLevel.max - xpLevel.min
  const levelProgress =
    levelRange > 0
      ? Math.min((totalTested - xpLevel.min) / levelRange, 1)
      : 0

  // Spring-animated progress value
  const progressMotion = useMotionValue(0)
  const springProgress = useSpring(progressMotion, { stiffness: 100, damping: 20 })
  const widthPct = useTransform(springProgress, v => `${v * 100}%`)

  useEffect(() => {
    progressMotion.set(levelProgress)
  }, [levelProgress, progressMotion])

  // Level-up: flash to 100%, then reset for new level
  useEffect(() => {
    if (levelUpTriggered) {
      animate(progressMotion, 1, { duration: 0.3, ease: 'easeOut' }).then(() => {
        progressMotion.set(0)
        clearLevelUpTrigger()
      })
    }
  }, [levelUpTriggered, progressMotion, clearLevelUpTrigger])

  const Icon = LEVEL_ICONS[xpLevel.level as keyof typeof LEVEL_ICONS]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
    >
      {/* Level header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <motion.div
            key={xpLevel.level}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Icon className="w-4 h-4" style={{ color: xpLevel.color }} />
          </motion.div>

          <div>
            <motion.span
              key={`title-${xpLevel.level}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[13px] font-semibold text-tx"
            >
              Level {xpLevel.level} — {xpLevel.title}
            </motion.span>
            <div className="text-[10px] text-tx3 mt-0.5">
              {totalTested} / {xpLevel.max} questions
            </div>
          </div>
        </div>

        {/* Level badge track: 1–7 */}
        <div className="flex items-center gap-1">
          {XP_LEVELS.map(l => (
            <motion.div
              key={l.level}
              animate={{
                backgroundColor:
                  l.level <= xpLevel.level
                    ? `${l.color}20`
                    : 'rgba(255,255,255,0.03)',
                color:
                  l.level <= xpLevel.level
                    ? l.color
                    : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.3 }}
              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
              style={{
                border:
                  l.level === xpLevel.level
                    ? `1px solid ${xpLevel.color}50`
                    : '1px solid transparent',
              }}
            >
              {l.level}
            </motion.div>
          ))}
        </div>
      </div>

      {/* XP bar track */}
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: widthPct,
            backgroundColor: xpLevel.color,
            boxShadow: `0 0 12px ${xpLevel.color}60`,
          }}
        />
      </div>

      {/* Segment labels */}
      <div className="flex justify-between mt-1.5">
        {XP_LEVELS.map(l => (
          <span
            key={l.level}
            className="text-[8px] font-mono transition-colors duration-300"
            style={{
              color:
                l.level <= xpLevel.level
                  ? l.color
                  : 'rgba(255,255,255,0.15)',
            }}
          >
            {l.label}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
