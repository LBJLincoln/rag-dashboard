'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, DollarSign, ArrowRight, Zap } from 'lucide-react'
import type { PMEUseCaseDetail } from '@/lib/pme-usecases'
import { PME_CATEGORIES } from '@/lib/pme-usecases'

interface UseCaseDetailModalProps {
  useCase: PMEUseCaseDetail | null
  onClose: () => void
  onTest: (query: string) => void
}

const IMPACT_COLORS = {
  critique: { bg: 'rgba(255, 69, 58, 0.1)', text: '#ff453a', label: 'Impact critique' },
  fort: { bg: 'rgba(48, 209, 88, 0.1)', text: '#30d158', label: 'Impact fort' },
  moyen: { bg: 'rgba(255, 214, 10, 0.1)', text: '#ffd60a', label: 'Impact moyen' },
}

export function UseCaseDetailModal({ useCase, onClose, onTest }: UseCaseDetailModalProps) {
  useEffect(() => {
    if (!useCase) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [useCase, onClose])

  useEffect(() => {
    if (useCase) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [useCase])

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  if (!useCase) return null

  const category = PME_CATEGORIES.find((c) => c.id === useCase.category)
  const impact = IMPACT_COLORS[useCase.impact]

  return (
    <AnimatePresence>
      {useCase && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdrop}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(20, 20, 22, 0.96)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(32px)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            }}
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-6 py-5 border-b border-white/[0.07]"
              style={{ borderTop: `3px solid ${category?.color}` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
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
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                      style={{ backgroundColor: impact.bg, color: impact.text }}
                    >
                      {impact.label}
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold text-tx tracking-[-0.02em]">
                    {useCase.title}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-tx3 hover:text-tx hover:bg-white/[0.06] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Problem */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-tx3 mb-2 font-semibold">Probleme</p>
                <p className="text-[14px] text-tx2 leading-relaxed">{useCase.problem}</p>
              </div>

              {/* Solution */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-tx3 mb-2 font-semibold">Solution</p>
                <p className="text-[14px] text-tx2 leading-relaxed">{useCase.description}</p>
              </div>

              {/* Apps */}
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-tx3 mb-2 font-semibold">Apps connectees</p>
                <div className="flex flex-wrap gap-2">
                  {useCase.apps.map((app) => (
                    <span
                      key={app}
                      className="px-3 py-1 rounded-full text-[12px] font-medium text-tx2 border border-white/[0.08] bg-white/[0.03]"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>

              {/* ROI metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                  <DollarSign className="w-4 h-4 mx-auto mb-1" style={{ color: category?.color }} />
                  <div className="text-[14px] font-bold font-mono" style={{ color: category?.color }}>
                    {useCase.roiAnnuel}
                  </div>
                  <div className="text-[10px] text-tx3">ROI annuel</div>
                </div>
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-gn" />
                  <div className="text-[14px] font-bold font-mono text-gn">{useCase.timeSaved}</div>
                  <div className="text-[10px] text-tx3">Temps gagne</div>
                </div>
                <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center">
                  <Zap className="w-4 h-4 mx-auto mb-1 text-yl" />
                  <div className="text-[14px] font-bold font-mono text-yl">Auto</div>
                  <div className="text-[10px] text-tx3">Execution</div>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-4 border-t border-white/[0.07]">
              <button
                onClick={() => onTest(useCase.chatbotQuery)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.01]"
                style={{
                  background: `linear-gradient(135deg, ${category?.color}, ${category?.color}cc)`,
                  boxShadow: `0 4px 20px ${category?.color}30`,
                }}
              >
                Tester maintenant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
