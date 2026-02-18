'use client'

import { motion } from 'framer-motion'
import { SECTORS } from '@/lib/constants'
import { SectorCard } from './SectorCard'
import type { Sector } from '@/types/sector'

interface BentoGridProps {
  onOpenChatbot: (sector: Sector) => void
  onOpenPortfolio: (sector: Sector) => void
}

export function BentoGrid({ onOpenChatbot, onOpenPortfolio }: BentoGridProps) {
  return (
    <section id="secteurs" className="py-16 md:py-24" style={{ background: 'var(--s1)' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header — Apple style: small label + big statement */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">
            Votre secteur. Vos documents.
          </p>
          <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] text-tx leading-[1.1] mb-4">
            Un chatbot taille pour votre metier.
          </h2>
          <p className="text-[16px] text-tx2 max-w-xl mx-auto leading-relaxed">
            Pas un assistant generaliste. Un expert de votre domaine, connecte a vos donnees,
            qui repond avec les sources exactes.
          </p>
        </motion.div>

        {/* Transition CTA */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-[22px] md:text-[28px] font-bold text-tx tracking-[-0.02em]">
            Mais testez directement par vous-meme :
          </p>
        </motion.div>

        {/* 2-column grid — compact iPad mosaic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTORS.map((sector, i) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              index={i}
              onOpenChatbot={onOpenChatbot}
              onOpenPortfolio={onOpenPortfolio}
            />
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-center text-[13px] text-tx3 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Chaque secteur dispose de son propre index documentaire et de pipelines IA specialises.
        </motion.p>
      </div>
    </section>
  )
}
