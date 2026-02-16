'use client'

import { motion } from 'framer-motion'
import { Shield, Target, Zap, BarChart3 } from 'lucide-react'

interface Props {
  status: {
    overall?: { accuracy: number; target: number; met: boolean }
    phase?: { current: number; name: string }
    blockers?: string[]
  }
  meta: {
    total_unique_questions?: number
    total_test_runs?: number
    total_iterations?: number
  }
}

export function ExecutiveSummary({ status, meta }: Props) {
  const overall = status.overall ?? { accuracy: 0, target: 75, met: false }
  const phase = status.phase ?? { current: 1, name: 'Baseline' }

  const kpis = [
    {
      icon: Target,
      label: 'Accuracy globale',
      value: `${overall.accuracy.toFixed(1)}%`,
      target: `Cible: ${overall.target}%`,
      color: overall.met ? '#30d158' : '#ff453a',
      met: overall.met,
    },
    {
      icon: BarChart3,
      label: 'Phase actuelle',
      value: `Phase ${phase.current}`,
      target: phase.name,
      color: '#0a84ff',
      met: true,
    },
    {
      icon: Zap,
      label: 'Questions testees',
      value: `${(meta.total_unique_questions ?? 0).toLocaleString()}`,
      target: `${(meta.total_test_runs ?? 0).toLocaleString()} runs total`,
      color: '#bf5af2',
      met: true,
    },
    {
      icon: Shield,
      label: 'Iterations',
      value: `${meta.total_iterations ?? 0}`,
      target: `${(status.blockers ?? []).length} blockers`,
      color: (status.blockers ?? []).length > 0 ? '#ff9f0a' : '#30d158',
      met: (status.blockers ?? []).length === 0,
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero message */}
      <div className="mb-6 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-[15px] text-tx leading-relaxed">
          <span className="font-semibold">Multi-RAG Orchestrator</span> est un systeme de recherche
          documentaire intelligent compose de <span className="text-ac font-medium">4 pipelines RAG</span> specialises,
          evaluees en continu sur <span className="text-pp font-medium">{(meta.total_unique_questions ?? 0).toLocaleString()} questions</span> issues
          de <span className="text-gn font-medium">14 benchmarks academiques</span> reconnus (SQuAD, HotpotQA, FinQA...).
          Chaque resultat affiche ici est verifiable et reproductible.
        </p>
        {(status.blockers ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(status.blockers ?? []).map((b, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-or/10 border border-or/20 text-or">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-[11px] text-tx3 uppercase tracking-[0.06em]">{kpi.label}</span>
            </div>
            <div className="text-[28px] font-bold font-mono tabular-nums" style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <div className="text-[12px] text-tx3 mt-1">{kpi.target}</div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
