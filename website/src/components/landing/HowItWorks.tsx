'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Cpu, Database, CheckCircle, ArrowUpRight } from 'lucide-react'

const steps = [
  {
    icon: MessageSquare,
    step: '01',
    title: 'Vous posez une question',
    description: 'En langage naturel, dans votre secteur. Pas de syntaxe, pas de formation.',
    color: 'var(--ac)',
  },
  {
    icon: Cpu,
    step: '02',
    title: "L'IA choisit la meilleure méthode",
    description: '4 moteurs spécialisés — vectoriel, relationnel, tabulaire, méta-routing — sélectionnés automatiquement.',
    color: 'var(--pp)',
  },
  {
    icon: Database,
    step: '03',
    title: 'Recherche dans vos documents',
    description: 'Pinecone, Neo4j et Supabase interrogés simultanément. Vos données restent chez vous.',
    color: 'var(--gn)',
  },
  {
    icon: CheckCircle,
    step: '04',
    title: 'Réponse sourcée en 3 secondes',
    description: 'Avec les sources exactes, un score de confiance, et les passages pertinents mis en avant.',
    color: 'var(--yl)',
  },
]

const PIPELINES = [
  { name: 'Standard RAG', detail: 'Vectoriel — Pinecone', accuracy: '85.5%', pass: true },
  { name: 'Graph RAG', detail: 'Relationnel — Neo4j', accuracy: '68.7%', pass: false },
  { name: 'Quantitatif', detail: 'Tabulaire — Supabase', accuracy: '78.3%', pass: false },
  { name: 'Orchestrateur', detail: 'Méta-routing', accuracy: '80.0%', pass: true },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24 md:py-32">
      {/* Section header */}
      <motion.div
        className="text-center mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">Sous le capot</p>
        <h2 className="text-[28px] md:text-[38px] font-bold tracking-[-0.03em] text-tx leading-[1.1] mb-4">
          La technologie transparente.
        </h2>
        <p className="text-[15px] text-tx2 max-w-lg mx-auto leading-relaxed">
          De votre question à la réponse sourcée, en moins de 5 secondes.
          Chaque étape est mesurée, auditée, publique.
        </p>
      </motion.div>

      {/* 4-step flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {steps.map((step, i) => (
          <motion.div
            key={step.step}
            className="relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            {/* Step number */}
            <div className="text-[11px] font-mono text-tx3 mb-4">{step.step}</div>

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `color-mix(in srgb, ${step.color} 12%, transparent)` }}
            >
              <step.icon className="w-5 h-5" style={{ color: step.color }} />
            </div>

            <h3 className="text-[14px] font-semibold text-tx mb-2 tracking-[-0.01em]">
              {step.title}
            </h3>
            <p className="text-[12px] text-tx2 leading-relaxed">{step.description}</p>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-[1px] bg-white/[0.08]" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Pipelines sub-section */}
      <motion.div
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Sub-header */}
        <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-1">4 moteurs spécialisés</p>
            <p className="text-[15px] font-semibold text-tx tracking-[-0.01em]">
              Précision globale : <span style={{ color: 'var(--gn)' }}>78.1%</span> — Phase 1 validée
            </p>
          </div>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ac hover:text-tx transition-colors duration-200"
          >
            Benchmarks publics
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Pipeline table */}
        <div className="divide-y divide-white/[0.04]">
          {PIPELINES.map((p, i) => (
            <motion.div
              key={p.name}
              className="flex items-center justify-between px-6 py-4"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
            >
              <div>
                <p className="text-[13px] font-medium text-tx mb-0.5">{p.name}</p>
                <p className="text-[11px] text-tx3">{p.detail}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-[15px] font-bold font-mono tabular-nums"
                  style={{ color: p.pass ? 'var(--gn)' : 'var(--yl)' }}
                >
                  {p.accuracy}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em]"
                  style={{
                    backgroundColor: p.pass ? 'rgba(48,209,88,0.1)' : 'rgba(255,214,10,0.1)',
                    color: p.pass ? 'var(--gn)' : 'var(--yl)',
                  }}
                >
                  {p.pass ? 'PASS' : 'EN COURS'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
