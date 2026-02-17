'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi,
  WifiOff,
  RotateCcw,
  Database,
  Network,
  BarChart3,
  GitMerge,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary'
import { PipelineCards } from '@/components/dashboard/PipelineCards'
import { DataSources } from '@/components/dashboard/DataSources'
import { AccuracyTrend } from '@/components/dashboard/AccuracyTrend'
import { PhaseExplorer } from '@/components/dashboard/PhaseExplorer'
import { QuestionViewer } from '@/components/dashboard/QuestionViewer'
import { XPProgressionBar } from '@/components/dashboard/XPProgressionBar'
import { VirtualizedFeedList } from '@/components/dashboard/live/VirtualizedFeedList'
import { FeedStatusBar } from '@/components/dashboard/live/FeedStatusBar'
import { MilestoneNotification } from '@/components/dashboard/live/MilestoneNotification'
import { useEvalStream } from '@/hooks/useEvalStream'
import { useEvalStore } from '@/stores/evalStore'
import { ReposPanel } from '@/components/dashboard/ReposPanel'

// ---- Types ---------------------------------------------------------------

interface SourceInfo {
  label: string
  description: string
  status: 'connected' | 'offline' | 'pending'
  last_update: string | null
  datasets: string
}

interface PipelineData {
  accuracy: number
  target: number
  met: boolean
  tested: number
  correct: number
  errors: number
  gap: number
}

interface DashboardData {
  status: {
    pipelines?: Record<string, PipelineData>
    overall?: { accuracy: number; target: number; met: boolean }
    phase?: { current: number; name: string }
    blockers?: string[]
  }
  meta: {
    total_unique_questions?: number
    total_test_runs?: number
    total_iterations?: number
    source?: string
  }
  sources: Record<string, SourceInfo>
  phase: { current: number; name: string; gates_passed: boolean }
  lastIteration: { id: string; label: string; timestamp: string } | null
  iterations: {
    id: string
    label: string
    timestamp: string
    results_summary: Record<
      string,
      { tested: number; correct: number; accuracy: number }
    >
  }[]
  recentQuestions: Record<string, unknown>[]
  registrySize: number
}

function toPhaseExplorerData(data: DashboardData) {
  return {
    phase: data.phase ?? data.status.phase,
    pipelines: data.status.pipelines,
    overall: data.status.overall,
    status: data.status,
  }
}

// ---- Stream connection indicator pill ------------------------------------

function StreamConnectionIndicator({ onReconnect }: { onReconnect: () => void }) {
  const connectionStatus = useEvalStore(s => s.connectionStatus)

  const config = {
    idle:         { label: 'IDLE',         color: '#86868b', dot: false, pulse: false },
    connecting:   { label: 'CONNECTING',   color: '#ff9f0a', dot: true,  pulse: true  },
    live:         { label: 'LIVE',         color: '#30d158', dot: true,  pulse: true  },
    reconnecting: { label: 'RECONNECTING', color: '#ff9f0a', dot: true,  pulse: true  },
    error:        { label: 'ERROR',        color: '#ff453a', dot: false, pulse: false },
  }[connectionStatus]

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold"
        style={{
          backgroundColor: `${config.color}15`,
          border: `1px solid ${config.color}35`,
          color: config.color,
        }}
      >
        {config.dot && (
          <span
            className={`w-1.5 h-1.5 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: config.color }}
          />
        )}
        {connectionStatus === 'live' ? (
          <Wifi className="w-3 h-3" />
        ) : connectionStatus === 'error' ? (
          <WifiOff className="w-3 h-3" />
        ) : null}
        {config.label}
      </div>

      {(connectionStatus === 'error' || connectionStatus === 'reconnecting') && (
        <button
          onClick={onReconnect}
          className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
          title="Reconnect"
        >
          <RotateCcw className="w-3 h-3 text-tx3" />
        </button>
      )}
    </div>
  )
}

// ---- Pedagogical explanation section ------------------------------------

function PedagogicalSection() {
  const [open, setOpen] = useState(false)

  const pipelines = [
    {
      icon: Database,
      name: 'Standard RAG',
      color: '#0a84ff',
      tagline: 'Recherche vectorielle rapide',
      what: 'Cherche les documents les plus proches de votre question en comparant des vecteurs mathematiques (embeddings). Tres rapide (2-4s), efficace pour les questions de type "qu\'est-ce que..." ou "comment fonctionne...".',
      why: 'C\'est le pipeline de base : il couvre 80% des questions documentaires standards dans les secteurs BTP, Finance, Industrie, Juridique.',
      target: '85%',
      db: 'Pinecone (22K vecteurs)',
    },
    {
      icon: Network,
      name: 'Graph RAG',
      color: '#bf5af2',
      tagline: 'Raisonnement par relations',
      what: 'Exploite un graphe de connaissances (Neo4j) pour suivre les relations entre entites : entreprises, personnes, contrats, reglementations. Repond aux questions "Qui est lie a...?" ou "Quels sont les liens entre...?".',
      why: 'Les questions metier complexes impliquent souvent des chaines de relations (fournisseurs, filiales, reglements appliques a plusieurs entites). Le graphe capture ces liens.',
      target: '70%',
      db: 'Neo4j (19K noeuds, 77K relations)',
    },
    {
      icon: BarChart3,
      name: 'Quantitatif',
      color: '#ffd60a',
      tagline: 'Calculs et tableaux financiers',
      what: 'Specialise dans les questions numeriques : ratios financiers (LCR, Tier 1), amortissements, seuils reglementaires. Interroge une base SQL structuree (Supabase) plutot que des documents texte.',
      why: 'Les LLM generaux ont du mal avec les calculs precis sur des donnees financieres. Ce pipeline utilise des requetes SQL exactes sur des donnees structurees, ce qui garantit la precision des chiffres.',
      target: '85%',
      db: 'Supabase (17K lignes)',
    },
    {
      icon: GitMerge,
      name: 'Orchestrateur',
      color: '#30d158',
      tagline: 'Routage intelligent',
      what: 'Analyse la question et decide automatiquement quel pipeline est le plus adapte (Standard, Graph, ou Quantitatif). Combine les reponses si necessaire. Plus lent (5-7s), mais plus robuste.',
      why: 'Les utilisateurs ne savent pas toujours quelle base de donnees contient la reponse. L\'orchestrateur eliminite ce fardeau cognitif et maximise la precision globale.',
      target: '70%',
      db: 'Meta-pipeline (3 sous-systemes)',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-ac" />
          <span className="text-[14px] font-semibold text-tx">
            Comprendre ce tableau de bord
          </span>
          <span className="text-[11px] text-tx3 hidden sm:inline">
            — Explication pour non-techniciens
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-tx3" />
        ) : (
          <ChevronDown className="w-4 h-4 text-tx3" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-6 border-t border-white/[0.06]">

              {/* What is RAG */}
              <div className="pt-5">
                <h3 className="text-[13px] font-semibold text-tx mb-2">
                  Qu'est-ce que le RAG ?
                </h3>
                <p className="text-[13px] text-tx2 leading-relaxed">
                  RAG (Retrieval-Augmented Generation) est une technique qui permet a un assistant IA de
                  repondre a des questions en cherchant d'abord dans une base de documents, puis en
                  generant une reponse basee sur les documents trouves. Contrairement a ChatGPT qui
                  repond depuis sa memoire figee, Nomos AI consulte vos vrais documents metier en
                  temps reel. Resultat : des reponses precises, tracables, et toujours a jour.
                </p>
              </div>

              {/* What the tests measure */}
              <div>
                <h3 className="text-[13px] font-semibold text-tx mb-2">
                  Que mesurent ces tests ?
                </h3>
                <p className="text-[13px] text-tx2 leading-relaxed mb-3">
                  Chaque test pose une vraie question metier au systeme, compare la reponse avec
                  la bonne reponse connue, et attribue un score de 0 a 1 (F1-score).
                  La "precision" affichee est la moyenne de ces scores sur toutes les questions testees.
                  Les questions proviennent de benchmarks publics HuggingFace couvrant les domaines
                  BTP, Finance, Industrie et Juridique.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="font-semibold mb-1" style={{ color: '#30d158' }}>
                      85%+ = Excellent
                    </div>
                    <p className="text-tx3">
                      Le systeme repond correctement a plus de 8 questions sur 10.
                      Deployable en production.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="font-semibold mb-1" style={{ color: '#ffd60a' }}>
                      70-85% = Acceptable
                    </div>
                    <p className="text-tx3">
                      Bon pour des usages assistes (l'humain valide la reponse).
                      Ameliorations en cours.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="font-semibold mb-1" style={{ color: '#ff453a' }}>
                      &lt;70% = En cours
                    </div>
                    <p className="text-tx3">
                      Pipeline en phase d'optimisation. Ne pas utiliser
                      sans supervision humaine.
                    </p>
                  </div>
                </div>
              </div>

              {/* The 4 pipelines */}
              <div>
                <h3 className="text-[13px] font-semibold text-tx mb-3">
                  Pourquoi 4 pipelines differents ?
                </h3>
                <p className="text-[13px] text-tx2 leading-relaxed mb-4">
                  Il n'existe pas un seul systeme "universel" capable de repondre parfaitement
                  a tous les types de questions metier. Chaque pipeline est specialise pour
                  un type de raisonnement different.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pipelines.map(pl => {
                    const Icon = pl.icon
                    return (
                      <div
                        key={pl.name}
                        className="p-4 rounded-xl border"
                        style={{
                          borderColor: `${pl.color}20`,
                          backgroundColor: `${pl.color}06`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" style={{ color: pl.color }} />
                          <span
                            className="text-[13px] font-semibold"
                            style={{ color: pl.color }}
                          >
                            {pl.name}
                          </span>
                          <span className="text-[10px] text-tx3 italic">
                            — {pl.tagline}
                          </span>
                        </div>
                        <p className="text-[12px] text-tx2 leading-relaxed mb-2">
                          {pl.what}
                        </p>
                        <p className="text-[11px] text-tx3 leading-relaxed mb-2 italic">
                          Pourquoi : {pl.why}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span style={{ color: pl.color }}>
                            Cible: {pl.target}
                          </span>
                          <span className="text-tx3">{pl.db}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Why these datasets */}
              <div>
                <h3 className="text-[13px] font-semibold text-tx mb-2">
                  Pourquoi ces jeux de donnees de test ?
                </h3>
                <p className="text-[13px] text-tx2 leading-relaxed">
                  Les questions de test proviennent de benchmarks publics HuggingFace (FQuAD,
                  FinQA, SQUAD-fr, MultiRC, BoolQ en francais) qui ont ete valides par des experts
                  humains. Cela garantit que nos scores refletent des performances reelles sur des
                  questions representatives du terrain — pas des tests artificiels que le systeme
                  aurait "memorises". La progression 1q → 5q → 10q → 50q → 100q → 500q → 1000q
                  permet de valider que les bonnes performances a petite echelle se maintiennent
                  quand on augmente le volume.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

// ---- Main page -----------------------------------------------------------

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [bottomExpanded, setBottomExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [feedExpanded, setFeedExpanded] = useState(true)

  // Connect eval stream (SSE) — single connection for the whole page
  const { reconnect } = useEvalStream()

  // Elapsed timer
  const tick = useEvalStore(s => s.tick)
  const isRunning = useEvalStore(s => s.isRunning)
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isRunning, tick])

  // Fetch dashboard data (static + polling)
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) setData(await res.json())
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16 pb-20 px-4 md:px-8 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-bold tracking-[-0.03em] text-tx">
              Quality Dashboard
            </h1>
            <p className="text-[14px] text-tx2 mt-1">
              Transparence totale sur les performances de Nomos AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StreamConnectionIndicator onReconnect={reconnect} />
            <button
              onClick={() => setBottomExpanded(e => !e)}
              className="flex items-center gap-2 px-4 py-1.5 text-[12px] font-medium rounded-xl border border-white/[0.06] bg-white/[0.04] text-tx2 hover:bg-white/[0.06] transition-all"
            >
              {bottomExpanded ? 'Reduire' : 'Developper'}
              <span
                className="text-white/30 transition-transform duration-200"
                style={{
                  display: 'inline-block',
                  transform: bottomExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ↓
              </span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-ac/30 border-t-ac rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">

            {/* 1 — XP Progression Bar (always visible) */}
            <XPProgressionBar />

            {/* 2 — Executive KPIs */}
            <ExecutiveSummary status={data.status} meta={data.meta} />

            {/* 3 — Pipeline cards with live stats */}
            <PipelineCards
              pipelines={data.status.pipelines ?? {}}
              view="detailed"
            />

            {/* 4 — Repos & Infrastructure */}
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                  Repos & Infrastructure
                </h2>
                <ReposPanel />
              </div>
            </section>

            {/* 5 — Live Q&A Feed */}
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setFeedExpanded(e => !e)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.1em] text-tx3">
                    Feed temps reel — questions & reponses
                  </span>
                  <span className="text-[10px] text-tx3/50">
                    (streaming SSE)
                  </span>
                </div>
                {feedExpanded ? (
                  <ChevronUp className="w-4 h-4 text-tx3" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-tx3" />
                )}
              </div>

              <AnimatePresence>
                {feedExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <VirtualizedFeedList />
                    <FeedStatusBar />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* 5 — Accuracy trend chart */}
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                Tendance de precision — 42 iterations
              </h2>
              <AccuracyTrend />
            </div>

            {/* 6 — Data sources */}
            {data.sources && <DataSources sources={data.sources} />}

            {/* 7 — Last iteration info */}
            {data.lastIteration && (
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-2">
                  Derniere iteration
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-mono text-tx">
                    {data.lastIteration.label}
                  </span>
                  <span className="text-[11px] text-tx3">
                    {new Date(data.lastIteration.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            )}

            {/* 8 — Pedagogical explanation (collapsible) */}
            <PedagogicalSection />

            {/* 9 — Bottom collapsible sections */}
            {bottomExpanded && (
              <>
                <div>
                  <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                    Progression par phase
                  </h2>
                  <PhaseExplorer data={toPhaseExplorerData(data)} />
                </div>

                <div>
                  <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3 mb-4">
                    Historique des questions
                  </h2>
                  <QuestionViewer questions={data.recentQuestions} />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-tx2 py-20">
            Impossible de charger les donnees. Verifiez que le serveur de status est accessible.
          </div>
        )}
      </main>

      {/* Floating milestone notifications — always rendered */}
      <MilestoneNotification />
    </>
  )
}
