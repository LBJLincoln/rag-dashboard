'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PME_PAIN_POINTS } from '@/lib/constants-pme'

interface HeroPMEProps {
  onOpenChatbot: () => void
}

export function HeroPME({ onOpenChatbot }: HeroPMEProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PME_PAIN_POINTS.length)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const active = PME_PAIN_POINTS[activeIndex]

  return (
    <section className="relative py-24 md:py-36 flex flex-col items-center justify-center overflow-hidden">
      {/* Mesh gradient background */}
      <div className="mesh-gradient absolute inset-0" style={{ opacity: 0.25 }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[13px] text-tx2 mb-10">
            <div className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            <span>200 automatisations PME/ETI</span>
          </div>
        </motion.div>

        {/* Pain point carousel */}
        <motion.div
          className="mb-5 h-[72px] md:h-[56px] flex items-center justify-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={activeIndex}
              className="text-[20px] md:text-[24px] font-medium leading-snug tracking-[-0.02em] max-w-2xl"
              style={{ color: active.color }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            >
              {active.text}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-[44px] md:text-[64px] lg:text-[76px] font-bold tracking-[-0.04em] leading-[1.0] mb-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.16, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="text-tx">200 taches automatisees.</span>
          <br />
          <span className="text-gradient">ROI mesure.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-[17px] md:text-[19px] text-tx2 max-w-2xl mx-auto mb-10 leading-relaxed tracking-[-0.01em]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.24, ease: [0.4, 0, 0.2, 1] }}
        >
          Commercial, RH, Finance, Logistique, Juridique — 10 categories metier.
          Trouvez votre automatisation, testez-la en direct dans le chatbot.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.34, ease: [0.4, 0, 0.2, 1] }}
        >
          <button
            onClick={onOpenChatbot}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0a84ff, #0077ed)',
              boxShadow: '0 4px 24px rgba(10, 132, 255, 0.35)',
            }}
          >
            Essayer le chatbot
            <span className="text-[16px]">→</span>
          </button>

          <a
            href="#catalogue"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-medium text-tx2 border border-white/[0.1] hover:border-white/[0.2] hover:text-tx transition-all duration-300"
          >
            Explorer le catalogue
            <span className="text-[14px]">↓</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
