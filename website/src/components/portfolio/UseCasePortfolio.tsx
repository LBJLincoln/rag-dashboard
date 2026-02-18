'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft } from 'lucide-react'
import type { Sector } from '@/types/sector'
import { UseCaseCard } from './UseCaseCard'

interface UseCasePortfolioProps {
  sector: Sector | null
  onClose: () => void
  onTestUseCase: (sector: Sector, question: string) => void
}

export function UseCasePortfolio({ sector, onClose, onTestUseCase }: UseCasePortfolioProps) {
  useEffect(() => {
    if (!sector) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sector, onClose])

  useEffect(() => {
    if (sector) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sector])

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleTest = useCallback((question: string) => {
    if (sector) {
      onTestUseCase(sector, question)
    }
  }, [sector, onTestUseCase])

  const Icon = sector?.icon

  return (
    <AnimatePresence>
      {sector && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleBackdrop}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Portfolio panel */}
          <motion.div
            className="relative w-[92vw] max-w-[1100px] h-[88vh] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col"
            style={{ background: '#0a0a0a' }}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="shrink-0 px-6 py-5 border-b border-white/[0.06] flex items-center justify-between"
              style={{ borderTop: `3px solid ${sector.color}` }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-tx3 hover:text-tx2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {Icon && (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${sector.color}12` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: sector.color }} />
                  </div>
                )}
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: sector.color }}
                  >
                    {sector.name}
                  </p>
                  <p className="text-[15px] font-semibold text-tx tracking-[-0.01em]">
                    {sector.useCases.length} cas d&apos;usage
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-tx3 hover:text-tx2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Intro */}
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <p className="text-[14px] text-tx2 max-w-lg mx-auto leading-relaxed">
                  Chaque cas est issu de retours clients reels.
                  Cliquez sur &laquo; Tester ce cas &raquo; pour l&apos;essayer dans le chatbot.
                </p>
              </motion.div>

              {/* 2-column grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sector.useCases.map((uc, i) => (
                  <UseCaseCard
                    key={uc.label}
                    useCase={uc}
                    index={i}
                    sectorColor={sector.color}
                    onTest={handleTest}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
