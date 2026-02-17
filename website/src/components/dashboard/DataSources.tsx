'use client'

import { motion } from 'framer-motion'
import { Server, FlaskConical, Database, Wifi, WifiOff, Clock } from 'lucide-react'

interface SourceInfo {
  label: string
  description: string
  status: 'connected' | 'offline' | 'pending'
  last_update: string | null
  datasets: string
}

interface Props {
  sources: Record<string, SourceInfo>
}

const SOURCE_META: Record<string, { icon: typeof Server; color: string }> = {
  'mon-ipad': { icon: Server, color: '#0a84ff' },
  'rag-website': { icon: FlaskConical, color: '#bf5af2' },
  'rag-data-ingestion': { icon: Database, color: '#ff9f0a' },
}

const STATUS_CONFIG = {
  connected: { label: 'Connected', icon: Wifi, color: '#30d158', bg: 'rgba(48,209,88,0.1)', border: 'rgba(48,209,88,0.2)' },
  offline: { label: 'Offline', icon: WifiOff, color: '#ff453a', bg: 'rgba(255,69,58,0.1)', border: 'rgba(255,69,58,0.2)' },
  pending: { label: 'Pending', icon: Clock, color: '#ff9f0a', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.2)' },
}

export function DataSources({ sources }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">Sources de donnees</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(sources).map(([key, src], i) => {
          const meta = SOURCE_META[key] ?? { icon: Server, color: '#8e8e93' }
          const statusCfg = STATUS_CONFIG[src.status] ?? STATUS_CONFIG.pending
          const Icon = meta.icon
          const StatusIcon = statusCfg.icon

          return (
            <motion.div
              key={key}
              className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-[13px] font-medium text-tx">{src.label}</span>
                </div>
                <span
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-[12px] text-tx3 leading-relaxed mb-3">{src.description}</p>
              <div className="text-[11px] text-tx3">
                <span className="text-tx2">{src.datasets}</span>
              </div>
              {src.last_update && (
                <div className="text-[10px] text-tx3 mt-2">
                  Derniere MAJ: {new Date(src.last_update).toLocaleString('fr-FR')}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
