'use client'

import { motion } from 'framer-motion'

const CASE_STUDIES = [
  {
    sector: 'BTP',
    color: '#4C8BF5',
    company: 'Groupe de construction français (250 employés)',
    problem: '5h/semaine perdu à chercher les normes DTU et Eurocodes',
    roi: '−78%',
    roiLabel: 'de temps de recherche documentaire',
    quote: 'Nos conducteurs de travaux trouvent les réponses en 30 secondes, pas en 2 heures',
  },
  {
    sector: 'Finance',
    color: '#F5B731',
    company: 'Banque régionale française (1200 employés)',
    problem: 'Veille réglementaire MIFID II / DORA manuelle, risque de non-conformité',
    roi: '−65%',
    roiLabel: 'de coût de conformité, 0 incident réglementaire',
    quote: 'Le chatbot lit 3200 documents réglementaires à notre place',
  },
  {
    sector: 'Juridique',
    color: '#F08838',
    company: "Cabinet d'avocats d'affaires (80 avocats)",
    problem: 'Recherche jurisprudentielle chronophage, 3h par dossier en moyenne',
    roi: '−70%',
    roiLabel: 'de temps de recherche, +40% de dossiers traités',
    quote: 'Légifrance et 5000 articles de loi consultables instantanément',
  },
]

export function CaseStudy() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-8 pb-20">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-3">Cas clients</h2>
        <p className="text-[28px] md:text-[34px] font-bold tracking-[-0.03em] text-tx">
          Des résultats mesurables.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CASE_STUDIES.map((cs, i) => (
          <motion.div
            key={cs.sector}
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(28, 28, 30, 0.50)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderLeft: `4px solid ${cs.color}`,
            }}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="p-6">
              {/* Sector label */}
              <div className="mb-4">
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: `${cs.color}12`,
                    color: cs.color,
                  }}
                >
                  {cs.sector}
                </span>
              </div>

              {/* Company */}
              <p className="text-[12px] text-tx3 mb-3 leading-snug">{cs.company}</p>

              {/* Problem */}
              <p className="text-[13px] text-tx2 mb-5 leading-relaxed">
                <span className="text-tx3 text-[11px] uppercase tracking-[0.06em] block mb-1">Problème</span>
                {cs.problem}
              </p>

              {/* ROI — prominent */}
              <div className="mb-5">
                <div
                  className="text-[42px] font-bold font-mono tabular-nums leading-none mb-1"
                  style={{ color: cs.color }}
                >
                  {cs.roi}
                </div>
                <div className="text-[12px] text-tx2 leading-snug">{cs.roiLabel}</div>
              </div>

              {/* Divider */}
              <div
                className="w-full h-[1px] mb-4"
                style={{ background: `linear-gradient(90deg, ${cs.color}30, transparent)` }}
              />

              {/* Quote */}
              <blockquote className="text-[13px] text-tx2 italic leading-relaxed">
                &ldquo;{cs.quote}&rdquo;
              </blockquote>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
