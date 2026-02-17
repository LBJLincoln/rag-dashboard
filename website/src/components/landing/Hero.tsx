'use client'

import { motion } from 'framer-motion'
import { FileText, Target, Grid3x3 } from 'lucide-react'

const B2B_STATS = [
  { value: '10 411', label: 'documents indexés', icon: FileText, color: '#0a84ff' },
  { value: '85.5%', label: 'de précision', icon: Target, color: '#30d158' },
  { value: '4', label: 'secteurs couverts', icon: Grid3x3, color: '#bf5af2' },
]

export function Hero() {
  return (
    <section className="relative py-24 md:py-32 flex flex-col items-center justify-center overflow-hidden">
      {/* Mesh gradient background — reduced opacity */}
      <div
        className="mesh-gradient absolute inset-0"
        style={{ opacity: 0.3 }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[13px] text-tx2 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            <span>Chatbot RAG entreprise — Production</span>
          </div>
        </motion.div>

        {/* Headline — static, powerful B2B */}
        <motion.h1
          className="text-[44px] md:text-[64px] lg:text-[76px] font-bold tracking-[-0.04em] leading-[1.0] mb-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="text-tx">{"L'IA documentaire des"}</span>
          <br />
          <span className="text-gradient">entreprises françaises</span>
        </motion.h1>

        {/* Subtitle — clear B2B value prop */}
        <motion.p
          className="text-[17px] md:text-[19px] text-tx2 max-w-2xl mx-auto mb-10 leading-relaxed tracking-[-0.01em]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          Chatbot sectoriel connecté à vos données. Réponses sourcées, vérifiables, en moins de 5 secondes.
        </motion.p>

        {/* 3-stat row — clean B2B metrics */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {B2B_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="flex flex-col items-center gap-1 px-10"
              style={{
                borderRight: i < B2B_STATS.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 + i * 0.08 }}
            >
              <span
                className="text-[28px] md:text-[34px] font-bold font-mono tabular-nums leading-none"
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
              <span className="text-[12px] text-tx3 tracking-[0.04em]">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          <a
            href="#secteurs"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0a84ff, #0077ed)',
              boxShadow: '0 4px 24px rgba(10, 132, 255, 0.35)',
            }}
          >
            Choisir votre secteur
            <span className="text-[16px]">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
