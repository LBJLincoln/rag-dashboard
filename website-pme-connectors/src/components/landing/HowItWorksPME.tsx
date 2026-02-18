'use client'

import { motion } from 'framer-motion'
import { Link, MessageSquare, Zap } from 'lucide-react'

const steps = [
  {
    icon: Link,
    step: '01',
    title: 'Connectez vos apps',
    description: 'Gmail, Slack, HubSpot, Calendar, Drive, Stripe... En 2 clics, sans code, sans API.',
    color: 'var(--ac)',
  },
  {
    icon: MessageSquare,
    step: '02',
    title: 'Parlez au chatbot',
    description: 'En langage naturel. "Relance le client Dupont" ou "Resume le Slack de cette semaine".',
    color: 'var(--gn)',
  },
  {
    icon: Zap,
    step: '03',
    title: 'L\'IA agit pour vous',
    description: 'Email envoye, CRM mis a jour, RDV planifie, facture creee. Vous validez, elle execute.',
    color: 'var(--yl)',
  },
]

export function HowItWorksPME() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24 md:py-32">
      {/* Section header */}
      <motion.div
        className="text-center mb-14"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">Comment ca marche</p>
        <h2 className="text-[28px] md:text-[38px] font-bold tracking-[-0.03em] text-tx leading-[1.1] mb-4">
          3 etapes. Zero complexite.
        </h2>
        <p className="text-[15px] text-tx2 max-w-lg mx-auto leading-relaxed">
          Pas besoin de dev, pas besoin de Zapier, pas besoin de formation.
          Parlez normalement, l&apos;IA fait le reste.
        </p>
      </motion.div>

      {/* 3-step flow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="hidden sm:block absolute top-1/2 -right-2 w-4 h-[1px] bg-white/[0.08]" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  )
}
