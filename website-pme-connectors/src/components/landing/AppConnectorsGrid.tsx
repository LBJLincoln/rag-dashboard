'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CONNECTORS } from '@/lib/constants-pme'

const categories = [
  { id: 'all', label: 'Toutes', color: '#f5f5f7' },
  { id: 'communication', label: 'Communication', color: '#0a84ff' },
  { id: 'stockage', label: 'Stockage', color: '#30d158' },
  { id: 'productivite', label: 'Productivite', color: '#ffd60a' },
  { id: 'crm', label: 'CRM', color: '#ff9f0a' },
  { id: 'finance', label: 'Finance', color: '#bf5af2' },
] as const

export function AppConnectorsGrid() {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filtered = activeCategory === 'all'
    ? CONNECTORS
    : CONNECTORS.filter((c) => c.category === activeCategory)

  return (
    <section id="connecteurs" className="py-20 md:py-32" style={{ background: 'var(--s1)' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[13px] uppercase tracking-[0.12em] text-tx3 mb-5">
            Ecosysteme
          </p>
          <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.035em] text-tx leading-[1.05] mb-5">
            15 apps. Une intelligence.
          </h2>
          <p className="text-[17px] text-tx2 max-w-2xl mx-auto leading-relaxed">
            Chaque application que vous utilisez au quotidien, connectee
            nativement. Le chatbot comprend le contexte entre vos outils.
          </p>
        </motion.div>

        {/* Category filter */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300"
                style={{
                  color: isActive ? '#000' : cat.color,
                  background: isActive ? cat.color : `${cat.color}08`,
                  border: `1px solid ${isActive ? cat.color : `${cat.color}20`}`,
                }}
              >
                {cat.label}
                {cat.id !== 'all' && (
                  <span className="ml-1.5 text-[11px] opacity-60">
                    {CONNECTORS.filter((c) => c.category === cat.id).length}
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>

        {/* Connectors grid — large clean cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((connector) => (
              <motion.div
                key={connector.id}
                layout
                className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-400"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-start gap-4">
                  {/* Brand circle */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-bold tracking-tight transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `${connector.color}15`,
                      color: connector.color,
                      border: `1px solid ${connector.color}25`,
                    }}
                  >
                    {connector.abbr}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name + category */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[15px] font-semibold text-tx tracking-[-0.01em]">
                        {connector.name}
                      </h3>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: connector.color,
                          background: `${connector.color}10`,
                        }}
                      >
                        {connector.category}
                      </span>
                    </div>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1.5">
                      {connector.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="text-[11px] text-tx3 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 30% 30%, ${connector.color}06, transparent 70%)`,
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom stats */}
        <motion.div
          className="flex items-center justify-center gap-8 mt-14 pt-8 border-t border-white/[0.06]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {[
            { value: '15', label: 'Apps natives' },
            { value: '200+', label: 'Actions possibles' },
            { value: '$0', label: 'Cout mensuel' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[24px] font-bold text-tx tracking-tight">{stat.value}</div>
              <div className="text-[12px] text-tx3 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
