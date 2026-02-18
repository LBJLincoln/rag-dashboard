'use client'

import { motion } from 'framer-motion'
import { CONNECTORS } from '@/lib/constants-pme'

export function AppConnectorsGrid() {
  const categories = [
    { id: 'communication', label: 'Communication', color: '#0a84ff' },
    { id: 'crm', label: 'CRM', color: '#ff9f0a' },
    { id: 'productivite', label: 'Productivite', color: '#30d158' },
    { id: 'finance', label: 'Finance', color: '#bf5af2' },
  ]

  return (
    <section id="connecteurs" className="py-16 md:py-24" style={{ background: 'var(--s1)' }}>
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">
            Connecteurs
          </p>
          <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] text-tx leading-[1.1] mb-4">
            12+ apps deja connectees.
          </h2>
          <p className="text-[16px] text-tx2 max-w-xl mx-auto leading-relaxed">
            Et des dizaines d&apos;autres en cours d&apos;integration.
            Vos outils du quotidien, unifies dans une seule conversation.
          </p>
        </motion.div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <span
              key={cat.id}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium border"
              style={{
                color: cat.color,
                borderColor: `${cat.color}30`,
                backgroundColor: `${cat.color}08`,
              }}
            >
              {cat.label}
            </span>
          ))}
        </div>

        {/* Connectors grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {CONNECTORS.map((connector, i) => (
            <motion.div
              key={connector.id}
              className="group relative p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center hover:border-white/[0.12] transition-all duration-300 hover:scale-[1.03]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.04 * i }}
            >
              {/* Icon */}
              <div className="text-[32px] mb-3">{connector.icon}</div>

              {/* Name */}
              <p className="text-[13px] font-semibold text-tx mb-2">{connector.name}</p>

              {/* Capabilities */}
              <div className="flex flex-wrap items-center justify-center gap-1">
                {connector.capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] text-tx3 px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Color indicator */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: connector.color }}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          className="text-center text-[13px] text-tx3 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          + Zapier, Make, n8n et 200+ integrations via API ouverte.
        </motion.p>
      </div>
    </section>
  )
}
