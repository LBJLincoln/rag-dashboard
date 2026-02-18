'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, MessageSquare, Briefcase } from 'lucide-react'
import type { Sector } from '@/types/sector'
import { VideoModal } from './VideoModal'

interface SectorCardProps {
  sector: Sector
  index: number
  onOpenChatbot: (sector: Sector) => void
  onOpenPortfolio: (sector: Sector) => void
}

export function SectorCard({ sector, index, onOpenChatbot, onOpenPortfolio }: SectorCardProps) {
  const Icon = sector.icon
  const [videoOpen, setVideoOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Close overlay on click outside
  useEffect(() => {
    if (!expanded) return
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [expanded])

  const handleCardClick = useCallback(() => {
    if (!expanded) setExpanded(true)
  }, [expanded])

  const handleChatbot = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(false)
    onOpenChatbot(sector)
  }, [sector, onOpenChatbot])

  const handlePortfolio = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(false)
    onOpenPortfolio(sector)
  }, [sector, onOpenPortfolio])

  const handleVideo = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setVideoOpen(true)
  }, [])

  return (
    <>
      <motion.div
        ref={cardRef}
        className="group relative w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
        onClick={handleCardClick}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.6,
          delay: 0.08 * index,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {/* Top border accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${sector.color}90, ${sector.color}20)` }}
        />

        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at 50% 0%, ${sector.color}05, transparent 65%)`,
          }}
        />

        <div className="relative z-10 p-8">
          {/* Header row: icon + sector name + video button */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${sector.color}12` }}
              >
                <Icon className="w-5 h-5" style={{ color: sector.color }} />
              </div>
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: sector.color }}
              >
                {sector.name}
              </span>
            </div>

            {/* Video play button */}
            {sector.videoScript && sector.videoScript.length > 0 && (
              <button
                onClick={handleVideo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.1] text-tx3 text-[11px] font-medium hover:border-white/[0.2] hover:text-tx2 transition-all duration-200"
                aria-label={`Voir le script video ${sector.name}`}
              >
                <Play className="w-3 h-3" />
                Script video
              </button>
            )}
          </div>

          {/* Pain point — LARGE, central */}
          <div className="mb-5">
            <p
              className="text-[28px] md:text-[32px] font-bold tracking-[-0.03em] leading-[1.1] mb-2"
              style={{ color: sector.color }}
            >
              {sector.painPoint ?? sector.metrics[0].value}
            </p>
            <p className="text-[14px] text-tx3 leading-snug">
              {sector.painPointSub ?? sector.description}
            </p>
          </div>

          {/* ROI metrics row */}
          {sector.roiPrimary && (
            <div className="flex flex-wrap gap-2 mb-6">
              {[sector.roiPrimary, sector.roiSecondary, sector.roiThird].filter(Boolean).map((roi) => (
                <span
                  key={roi}
                  className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold"
                  style={{
                    backgroundColor: `${sector.color}10`,
                    color: sector.color,
                    border: `1px solid ${sector.color}22`,
                  }}
                >
                  {roi}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div
            className="w-full h-[1px] mb-5"
            style={{ background: `linear-gradient(90deg, ${sector.color}20, transparent)` }}
          />

          {/* CTA row */}
          <span
            className="group/btn inline-flex items-center gap-2 text-[13px] font-semibold transition-all duration-200"
            style={{ color: sector.color }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Cliquez pour decouvrir</span>
          </span>
        </div>

        {/* Expanded overlay — 2 options */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center gap-4 p-6"
              style={{
                background: `rgba(0, 0, 0, 0.75)`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Option 1: Chatbot */}
              <motion.button
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-white/[0.12] max-w-[200px] w-full transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
                onClick={handleChatbot}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.25, delay: 0.05 }}
                whileHover={{
                  borderColor: `${sector.color}40`,
                  boxShadow: `0 4px 24px ${sector.color}15`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${sector.color}15` }}
                >
                  <MessageSquare className="w-5 h-5" style={{ color: sector.color }} />
                </div>
                <span className="text-[14px] font-semibold text-tx text-center">
                  Utiliser le chatbot
                </span>
                <span className="text-[11px] text-tx3 text-center leading-snug">
                  Posez vos questions en temps reel
                </span>
              </motion.button>

              {/* Option 2: Portfolio */}
              <motion.button
                className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-white/[0.12] max-w-[200px] w-full transition-all duration-200 hover:scale-[1.03]"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
                onClick={handlePortfolio}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                whileHover={{
                  borderColor: `${sector.color}40`,
                  boxShadow: `0 4px 24px ${sector.color}15`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${sector.color}15` }}
                >
                  <Briefcase className="w-5 h-5" style={{ color: sector.color }} />
                </div>
                <span className="text-[14px] font-semibold text-tx text-center">
                  Explorer les cas d&apos;usage
                </span>
                <span className="text-[11px] text-tx3 text-center leading-snug">
                  {sector.useCases.length} cas detailles avec ROI
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Video modal */}
      {videoOpen && sector.videoScript && (
        <VideoModal
          sector={sector}
          onClose={() => setVideoOpen(false)}
        />
      )}
    </>
  )
}
