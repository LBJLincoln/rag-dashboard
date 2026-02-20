'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, ArrowUpRight, ShieldCheck } from 'lucide-react'

interface DashboardStatus {
  overall?: { accuracy: number }
  pipelines?: { standard?: { accuracy: number } }
  totals?: { unique_questions: number }
}

function useLiveMetrics() {
  const [metrics, setMetrics] = useState({
    accuracy: '83.9%',
    standard: '85.5%',
    tests: '232+',
    benchmarks: '14',
  })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/dashboard', { signal: controller.signal, cache: 'no-store' })
      .then(r => r.json())
      .then((data: { status?: DashboardStatus }) => {
        const s = data?.status
        if (s) {
          setMetrics({
            accuracy: s.overall?.accuracy ? `${s.overall.accuracy}%` : '83.9%',
            standard: s.pipelines?.standard?.accuracy ? `${s.pipelines.standard.accuracy}%` : '85.5%',
            tests: s.totals?.unique_questions ? `${s.totals.unique_questions}+` : '232+',
            benchmarks: '14',
          })
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  return metrics
}

function buildLiveMetrics(m: ReturnType<typeof useLiveMetrics>) {
  return [
    { label: 'Accuracy globale', value: m.accuracy, color: 'var(--gn)' },
    { label: 'Standard RAG', value: m.standard, color: 'var(--ac)' },
    { label: 'Tests effectués', value: m.tests, color: 'var(--pp)' },
    { label: 'Benchmarks', value: m.benchmarks, color: 'var(--yl)' },
  ]
}

export function DashboardCTA() {
  const metrics = useLiveMetrics()
  const LIVE_METRICS = buildLiveMetrics(metrics)

  return (
    <section className="py-16 md:py-20" style={{ background: 'var(--s1)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(20, 20, 24, 0.8)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Subtle top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, var(--ac) 0%, var(--pp) 50%, var(--gn) 100%)' }}
          />

          <div className="px-8 py-10 md:flex md:items-center md:justify-between gap-8">
            {/* Left: message */}
            <div className="mb-8 md:mb-0 md:max-w-md">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-gn" style={{ color: 'var(--gn)' }} />
                <span className="text-[11px] uppercase tracking-[0.1em] text-tx3 font-semibold">
                  Transparence totale
                </span>
              </div>
              <h3 className="text-[22px] md:text-[26px] font-bold tracking-[-0.03em] text-tx mb-3 leading-[1.2]">
                Nos benchmarks publics.
                <br />
                Rien à cacher.
              </h3>
              <p className="text-[14px] text-tx2 leading-relaxed mb-5">
                Chaque résultat est mesuré sur des questions à réponse connue,
                évalué contre 14 benchmarks académiques reconnus.
                Consultez les données brutes en temps réel.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300 hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, var(--ac), var(--ac2, #0077ed))',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(10,132,255,0.3)',
                }}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Voir le dashboard en direct
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right: live metric tiles */}
            <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
              {LIVE_METRICS.map((m, i) => (
                <motion.div
                  key={m.label}
                  className="rounded-xl p-4 border border-white/[0.06] bg-white/[0.02] text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                >
                  <div
                    className="text-[26px] font-bold font-mono tabular-nums leading-none mb-1"
                    style={{ color: m.color }}
                  >
                    {m.value}
                  </div>
                  <div className="text-[11px] text-tx3 leading-tight">{m.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
