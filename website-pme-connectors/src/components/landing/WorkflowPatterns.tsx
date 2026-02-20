'use client'

import { motion } from 'framer-motion'

const patterns = [
  {
    id: 'rag',
    label: 'Recherche',
    input: 'WhatsApp',
    inputColor: '#25D366',
    query: 'Trouve le rapport budget du mois dernier',
    steps: ['Intent: Document retrieval', 'Vector Search (perso + pro)', 'Rerank top 5', 'Resume + lien fichier'],
    output: 'Reponse WhatsApp avec le document',
    accent: '#0a84ff',
  },
  {
    id: 'calendar',
    label: 'Action',
    input: 'Telegram',
    inputColor: '#26A5E4',
    query: 'Planifie une demo avec Jean mardi 15h',
    steps: ['Intent: Calendar action', 'Google Calendar: check dispo', 'Creer event + invitation', 'Confirmation'],
    output: 'RDV cree, invitation envoyee',
    accent: '#30d158',
  },
  {
    id: 'report',
    label: 'Rapport',
    input: 'WhatsApp',
    inputColor: '#25D366',
    query: 'Resume hebdo des mails importants',
    steps: ['Intent: Email analysis', 'Gmail: 7 derniers jours', 'LLM: resume + categories', 'Google Docs: rapport'],
    output: 'Rapport envoye par email + lien Drive',
    accent: '#bf5af2',
  },
]

export function WorkflowPatterns() {
  return (
    <section className="py-20 md:py-32">
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
            Sous le capot
          </p>
          <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.035em] text-tx leading-[1.05] mb-5">
            Vous parlez. L&apos;IA orchestre.
          </h2>
          <p className="text-[17px] text-tx2 max-w-2xl mx-auto leading-relaxed">
            Chaque message declenche un workflow intelligent.
            Voici ce qui se passe en coulisses.
          </p>
        </motion.div>

        {/* Workflow cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {patterns.map((pattern, i) => (
            <motion.div
              key={pattern.id}
              className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              {/* Top accent bar */}
              <div className="h-[2px]" style={{ background: pattern.accent }} />

              <div className="p-6">
                {/* Label + source */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                    style={{ color: pattern.accent, background: `${pattern.accent}12` }}
                  >
                    {pattern.label}
                  </span>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ color: pattern.inputColor, background: `${pattern.inputColor}12` }}
                  >
                    via {pattern.input}
                  </span>
                </div>

                {/* User query */}
                <div className="glass rounded-xl p-4 mb-5">
                  <p className="text-[13px] text-tx leading-relaxed italic">
                    &ldquo;{pattern.query}&rdquo;
                  </p>
                </div>

                {/* Pipeline steps */}
                <div className="space-y-2 mb-5">
                  {pattern.steps.map((step, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                        style={{ background: `${pattern.accent}15`, color: pattern.accent }}
                      >
                        {j + 1}
                      </div>
                      <span className="text-[12px] text-tx2">{step}</span>
                    </div>
                  ))}
                </div>

                {/* Output */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                  <div className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
                  <span className="text-[12px] text-gn font-medium">{pattern.output}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
