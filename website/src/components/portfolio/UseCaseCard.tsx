'use client'

import { motion } from 'framer-motion'
import { Clock, DollarSign, ArrowRight } from 'lucide-react'
import type { UseCase } from '@/types/sector'

interface UseCaseCardProps {
  useCase: UseCase
  index: number
  sectorColor: string
  onTest: (question: string) => void
}

export function UseCaseCard({ useCase, index, sectorColor, onTest }: UseCaseCardProps) {
  return (
    <motion.div
      className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] transition-colors duration-300"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06 * index, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${sectorColor}60, ${sectorColor}10)` }}
      />

      <div className="p-6">
        {/* Label badge */}
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em] mb-4"
          style={{
            backgroundColor: `${sectorColor}10`,
            color: sectorColor,
            border: `1px solid ${sectorColor}20`,
          }}
        >
          {useCase.label}
        </span>

        {/* Problem */}
        {useCase.problem && (
          <p className="text-[13px] text-tx2 leading-relaxed mb-3 line-clamp-2">
            {useCase.problem}
          </p>
        )}

        {/* Description */}
        {useCase.description && (
          <p className="text-[12px] text-tx3 leading-relaxed mb-5">
            {useCase.description}
          </p>
        )}

        {/* ROI chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {useCase.roi && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                backgroundColor: `${sectorColor}08`,
                color: sectorColor,
                border: `1px solid ${sectorColor}18`,
              }}
            >
              {useCase.roi}
            </span>
          )}
          {useCase.timeSaved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-tx3 border border-white/[0.08] bg-white/[0.02]">
              <Clock className="w-3 h-3" />
              {useCase.timeSaved}
            </span>
          )}
          {useCase.moneySaved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-tx3 border border-white/[0.08] bg-white/[0.02]">
              <DollarSign className="w-3 h-3" />
              {useCase.moneySaved}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onTest(useCase.question)}
          className="group/btn inline-flex items-center gap-2 text-[12px] font-semibold transition-all duration-200"
          style={{ color: sectorColor }}
        >
          Tester ce cas
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-300" />
        </button>
      </div>
    </motion.div>
  )
}
