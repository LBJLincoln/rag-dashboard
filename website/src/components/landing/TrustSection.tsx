'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, BookOpen, BarChart3, Cpu } from 'lucide-react'

const BENCHMARKS = [
  'SQuAD 2.0',
  'HotpotQA',
  'MuSiQue',
  'FinQA',
  'TAT-QA',
  'NaturalQuestions',
  'TriviaQA',
  'WikiMultiHop',
  'MultiFieldQA',
  'DROP',
  '2WikiMQA',
  'IIRC',
  'ARC-Challenge',
  'Qasper',
]

const TRUST_POINTS = [
  {
    icon: BookOpen,
    title: '14 benchmarks academiques',
    description:
      'Evaluation sur des benchmarks reconnus par la communaute scientifique : SQuAD, HotpotQA, FinQA, MuSiQue et 10 autres.',
    color: '#0a84ff',
  },
  {
    icon: BarChart3,
    title: '232+ questions uniques',
    description:
      '42 iterations de tests avec double validation. Chaque resultat est reproductible et archive.',
    color: '#30d158',
  },
  {
    icon: Cpu,
    title: '4 pipelines specialises',
    description:
      'Standard (vectoriel), Graph (relations), Quantitatif (tableaux), Orchestrateur (meta-routing).',
    color: '#bf5af2',
  },
  {
    icon: ShieldCheck,
    title: '78.1% accuracy globale',
    description:
      'Mesure objective sur des questions a reponse connue. Cible Phase 1 : 75%. Standard RAG a 85.5%.',
    color: '#ffd60a',
  },
]

export function TrustSection() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-3">Transparence</h2>
        <p className="text-[28px] md:text-[34px] font-bold tracking-[-0.03em] text-tx">
          Resultats mesurables, pas des promesses.
        </p>
        <p className="text-[15px] text-tx2 mt-3 max-w-lg mx-auto">
          Chaque reponse est evaluee contre des datasets academiques reconnus.
          Consultez le <a href="/dashboard" className="text-ac hover:underline">dashboard en temps reel</a>.
        </p>
      </motion.div>

      {/* Trust cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        {TRUST_POINTS.map((point, i) => (
          <motion.div
            key={point.title}
            className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${point.color} 12%, transparent)` }}
              >
                <point.icon className="w-4 h-4" style={{ color: point.color }} />
              </div>
              <h3 className="text-[14px] font-semibold text-tx">{point.title}</h3>
            </div>
            <p className="text-[13px] text-tx2 leading-relaxed">{point.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Benchmark strip */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {BENCHMARKS.map((name) => (
          <span
            key={name}
            className="px-3 py-1 text-[11px] font-mono text-tx3 rounded-full border border-white/[0.06] bg-white/[0.02]"
          >
            {name}
          </span>
        ))}
      </motion.div>
    </section>
  )
}
