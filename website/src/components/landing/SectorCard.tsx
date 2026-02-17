'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import type { Sector } from '@/types/sector'
import { VideoModal } from './VideoModal'

interface SectorCardProps {
  sector: Sector
  index: number
  onSelect: (sector: Sector) => void
}

export function SectorCard({ sector, index, onSelect }: SectorCardProps) {
  const Icon = sector.icon
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <>
      <motion.div
        className="group relative w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
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
                onClick={() => setVideoOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.1] text-tx3 text-[11px] font-medium hover:border-white/[0.2] hover:text-tx2 transition-all duration-200"
                aria-label={`Voir le script vidéo ${sector.name}`}
              >
                <Play className="w-3 h-3" />
                Script vidéo
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
          <button
            onClick={() => onSelect(sector)}
            className="group/btn flex items-center gap-2 text-[13px] font-semibold transition-all duration-200"
            style={{ color: sector.color }}
          >
            <span>Démo interactive</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1.5 transition-transform duration-300" />
          </button>
        </div>
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
