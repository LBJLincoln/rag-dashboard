'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, MessageSquare, Briefcase, ArrowRight } from 'lucide-react'
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
        className="group relative w-full text-left rounded-3xl overflow-hidden cursor-pointer"
        onClick={handleCardClick}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.7,
          delay: 0.1 * index,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
        whileHover={{ scale: 1.015, transition: { duration: 0.3 } }}
      >
        {/* Subtle top gradient line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${sector.color}50, transparent)`,
          }}
        />

        {/* Ambient glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: `radial-gradient(800px circle at 50% -20%, ${sector.color}04, transparent 70%)`,
          }}
        />

        <div className="relative z-10 p-8 md:p-10">
          {/* Header: sector name + video */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${sector.color}15, ${sector.color}08)`,
                  border: `1px solid ${sector.color}15`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: sector.color }} />
              </div>
              <span
                className="text-[12px] font-semibold uppercase tracking-[0.12em] leading-none"
                style={{ color: sector.color }}
              >
                {sector.name}
              </span>
            </div>

            {sector.videoScript && sector.videoScript.length > 0 && (
              <button
                onClick={handleVideo}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
                aria-label={`Voir le script video ${sector.name}`}
              >
                <Play className="w-3.5 h-3.5" />
                Voir le demo
              </button>
            )}
          </div>

          {/* Pain point — large, clean */}
          <div className="mb-8">
            <h3
              className="text-[26px] md:text-[30px] font-bold tracking-[-0.035em] leading-[1.15] mb-3"
              style={{ color: sector.color }}
            >
              {sector.painPoint ?? sector.metrics[0].value}
            </h3>
            <p className="text-[14px] text-white/50 leading-[1.6] max-w-[90%]">
              {sector.painPointSub ?? sector.description}
            </p>
          </div>

          {/* ROI metrics — clean inline tags */}
          {sector.roiPrimary && (
            <div className="flex flex-wrap gap-2.5 mb-8">
              {[sector.roiPrimary, sector.roiSecondary, sector.roiThird].filter(Boolean).map((roi) => (
                <span
                  key={roi}
                  className="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-medium tracking-[-0.01em]"
                  style={{
                    background: `linear-gradient(135deg, ${sector.color}08, ${sector.color}04)`,
                    color: sector.color,
                    border: `1px solid ${sector.color}18`,
                  }}
                >
                  {roi}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-2 group/cta">
            <span
              className="text-[13px] font-medium transition-all duration-200 group-hover/cta:tracking-wide"
              style={{ color: `${sector.color}cc` }}
            >
              Explorer
            </span>
            <ArrowRight
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: sector.color }}
            />
          </div>
        </div>

        {/* Expanded overlay — clean MacBook-style */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center gap-6 p-8"
              style={{
                background: 'rgba(0, 0, 0, 0.82)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Option 1: Chatbot */}
              <motion.button
                className="flex flex-col items-center gap-4 px-8 py-7 rounded-3xl max-w-[220px] w-full transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                onClick={handleChatbot}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                whileHover={{
                  scale: 1.04,
                  borderColor: `${sector.color}35`,
                  boxShadow: `0 8px 40px ${sector.color}10`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${sector.color}12, ${sector.color}06)`,
                    border: `1px solid ${sector.color}15`,
                  }}
                >
                  <MessageSquare className="w-6 h-6" style={{ color: sector.color }} />
                </div>
                <div className="text-center">
                  <span className="block text-[15px] font-semibold text-tx mb-1">
                    Chatbot
                  </span>
                  <span className="block text-[12px] text-white/40 leading-snug">
                    Questions en temps reel
                  </span>
                </div>
              </motion.button>

              {/* Option 2: Portfolio */}
              <motion.button
                className="flex flex-col items-center gap-4 px-8 py-7 rounded-3xl max-w-[220px] w-full transition-all duration-300"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                onClick={handlePortfolio}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                whileHover={{
                  scale: 1.04,
                  borderColor: `${sector.color}35`,
                  boxShadow: `0 8px 40px ${sector.color}10`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${sector.color}12, ${sector.color}06)`,
                    border: `1px solid ${sector.color}15`,
                  }}
                >
                  <Briefcase className="w-6 h-6" style={{ color: sector.color }} />
                </div>
                <div className="text-center">
                  <span className="block text-[15px] font-semibold text-tx mb-1">
                    Cas d&apos;usage
                  </span>
                  <span className="block text-[12px] text-white/40 leading-snug">
                    {sector.useCases.length} cas avec ROI
                  </span>
                </div>
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
