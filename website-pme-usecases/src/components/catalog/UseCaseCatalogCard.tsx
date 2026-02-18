'use client'

import { motion } from 'framer-motion'
import type { PMEUseCaseDetail } from '@/lib/pme-usecases'
import { PME_CATEGORIES } from '@/lib/pme-usecases'

interface UseCaseCatalogCardProps {
  useCase: PMEUseCaseDetail
  index: number
  onSelect: (useCase: PMEUseCaseDetail) => void
}

const IMPACT_COLORS = {
  critique: { bg: 'rgba(255, 69, 58, 0.1)', text: '#ff453a', label: 'Critique' },
  fort: { bg: 'rgba(48, 209, 88, 0.1)', text: '#30d158', label: 'Fort' },
  moyen: { bg: 'rgba(255, 214, 10, 0.1)', text: '#ffd60a', label: 'Moyen' },
}

export function UseCaseCatalogCard({ useCase, index, onSelect }: UseCaseCatalogCardProps) {
  const category = PME_CATEGORIES.find((c) => c.id === useCase.category)
  const impact = IMPACT_COLORS[useCase.impact]

  return (
    <motion.button
      className="group relative w-full text-left p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.01]"
      onClick={() => onSelect(useCase)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.03 * Math.min(index, 12) }}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{
            backgroundColor: `${category?.color}10`,
            color: category?.color,
            border: `1px solid ${category?.color}20`,
          }}
        >
          {category?.emoji} {category?.label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em]"
          style={{ backgroundColor: impact.bg, color: impact.text }}
        >
          {impact.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-tx mb-2 tracking-[-0.01em] group-hover:text-ac transition-colors">
        {useCase.title}
      </h3>

      {/* Problem (2 lines) */}
      <p className="text-[12px] text-tx2 leading-relaxed mb-4 line-clamp-2">
        {useCase.problem}
      </p>

      {/* Apps */}
      <div className="flex flex-wrap gap-1 mb-3">
        {useCase.apps.map((app) => (
          <span
            key={app}
            className="text-[10px] text-tx3 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
          >
            {app}
          </span>
        ))}
      </div>

      {/* ROI */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold font-mono tabular-nums" style={{ color: category?.color }}>
          {useCase.roiAnnuel}
        </span>
        <span className="text-[11px] text-tx3">{useCase.timeSaved}</span>
      </div>

      {/* Hover accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: category?.color }}
      />
    </motion.button>
  )
}
