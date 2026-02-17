'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Server, Clock, Target, ExternalLink, Zap } from 'lucide-react'

// Types
interface RepoConfig {
  id: string
  name: string
  label: string
  description: string
  github_url: string
  vercel_url?: string
  runtime: 'codespace' | 'vercel' | 'static'
  codespace_status: string | null
  last_commit: string
  last_commit_date: string
  last_commit_msg: string
  n8n: string
  status: 'deployed' | 'idle' | 'pending'
  current_objective: string
  key_commands: string[]
  metrics: Record<string, number | string>
}

interface ReposConfig {
  generated_at: string
  repos: RepoConfig[]
  vm: { ip: string; type: string; ram_mb: number; n8n_workflows: number; status: string }
  phase: { current: number; name: string; gates_passed: boolean; blockers: string[] }
}

const STATUS_COLORS: Record<RepoConfig['status'], string> = {
  deployed: 'bg-green-500/20 text-green-400 border border-green-500/30',
  idle: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  pending: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

const RUNTIME_COLORS: Record<RepoConfig['runtime'], string> = {
  vercel: 'bg-blue-500/20 text-blue-400',
  codespace: 'bg-purple-500/20 text-purple-400',
  static: 'bg-gray-500/20 text-gray-400',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function ReposPanel() {
  const [config, setConfig] = useState<ReposConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      const res = await fetch('/repos-config.json', { cache: 'no-store' })
      if (res.ok) setConfig(await res.json())
    } catch {
      /* silent */
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchConfig()
    const interval = setInterval(fetchConfig, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-800 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!config) return null

  return (
    <div className="space-y-4">
      {/* VM + Phase header */}
      <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <Server className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-mono text-gray-300">VM {config.vm.ip}</span>
          <span className="text-xs text-gray-500">
            {config.vm.type} · {config.vm.n8n_workflows} workflows ON
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              config.phase.gates_passed
                ? 'bg-green-500/20 text-green-400'
                : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            Phase {config.phase.current} — {config.phase.gates_passed ? 'PASS' : 'BLOCKED'}
          </span>
        </div>
      </div>

      {/* Blockers (if any) */}
      {!config.phase.gates_passed && config.phase.blockers.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {config.phase.blockers.map(b => (
            <span
              key={b}
              className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded"
            >
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Repo cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {config.repos.map(repo => (
          <div
            key={repo.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-gray-700 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">{repo.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${RUNTIME_COLORS[repo.runtime]}`}>
                    {repo.runtime}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{repo.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[repo.status]}`}>
                {repo.status}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 line-clamp-2">{repo.description}</p>

            {/* Last commit */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <GitBranch className="w-3 h-3" />
              <span className="font-mono text-gray-400">{repo.last_commit}</span>
              <Clock className="w-3 h-3 ml-1" />
              <span>{formatDate(repo.last_commit_date)}</span>
            </div>

            {/* Objective */}
            <div className="flex items-start gap-2">
              <Target className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
              <span className="text-xs text-blue-300">{repo.current_objective}</span>
            </div>

            {/* Metrics */}
            {Object.keys(repo.metrics).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(repo.metrics).map(([k, v]) => (
                  <span key={k} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {k.replace(/_/g, ' ')}:{' '}
                    <span className="text-white">{v}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3 pt-1">
              <a
                href={repo.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> GitHub
              </a>
              {repo.vercel_url && (
                <a
                  href={repo.vercel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <Zap className="w-3 h-3" /> Vercel
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Mis à jour : {formatDate(config.generated_at)} · refresh 60s
      </p>
    </div>
  )
}
