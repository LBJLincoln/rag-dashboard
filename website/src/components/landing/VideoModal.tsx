'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, Monitor } from 'lucide-react'
import type { Sector } from '@/types/sector'

interface VideoModalProps {
  sector: Sector
  onClose: () => void
}

export function VideoModal({ sector, onClose }: VideoModalProps) {
  const [visibleRows, setVisibleRows] = useState(0)
  const script = sector.videoScript ?? []

  // Reveal rows progressively with 1.8s intervals
  useEffect(() => {
    if (visibleRows >= script.length) return
    const t = setTimeout(() => {
      setVisibleRows((v) => v + 1)
    }, visibleRows === 0 ? 300 : 1800)
    return () => clearTimeout(t)
  }, [visibleRows, script.length])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal panel */}
        <motion.div
          className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(20, 20, 22, 0.96)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          }}
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]"
            style={{ borderTop: `3px solid ${sector.color}` }}
          >
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-0.5"
                style={{ color: sector.color }}
              >
                {sector.name}
              </p>
              <p className="text-[15px] font-semibold text-tx tracking-[-0.01em]">
                Script vidéo — 30 secondes
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-tx3 hover:text-tx hover:bg-white/[0.06] transition-all duration-200"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[72px_1fr_1fr] gap-4 px-6 py-3 border-b border-white/[0.05]">
            <span className="text-[10px] uppercase tracking-[0.1em] text-tx3">Durée</span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-tx3">
              <Mic className="w-3 h-3" />
              Voix off
            </span>
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-tx3">
              <Monitor className="w-3 h-3" />
              Texte écran
            </span>
          </div>

          {/* Script rows */}
          <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {script.map((row, i) => (
              <AnimatePresence key={i}>
                {i < visibleRows && (
                  <motion.div
                    className="grid grid-cols-[72px_1fr_1fr] gap-4 py-3 border-b border-white/[0.04] last:border-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Timestamp */}
                    <span
                      className="text-[11px] font-mono font-semibold tabular-nums self-start mt-0.5"
                      style={{ color: sector.color }}
                    >
                      {row.time}
                    </span>

                    {/* Voice */}
                    <p className="text-[13px] text-tx2 leading-relaxed italic">
                      {row.voice}
                    </p>

                    {/* Screen text */}
                    <p
                      className="text-[12px] font-medium leading-relaxed"
                      style={{ color: `${sector.color}cc` }}
                    >
                      {row.screen}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}

            {/* Reveal progress indicator */}
            {visibleRows < script.length && (
              <div className="flex items-center gap-2 py-2 text-tx3 text-[12px]">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: sector.color }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                Lecture en cours...
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.07] flex items-center justify-between">
            <p className="text-[12px] text-tx3">
              Vidéo 30s — Format LinkedIn 1:1 et Stories 9:16
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[12px] font-medium text-tx2 border border-white/[0.1] hover:border-white/[0.2] hover:text-tx transition-all duration-200"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
