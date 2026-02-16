'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, X, AlertTriangle, Clock, Brain } from 'lucide-react'

interface Question {
  question_id?: string
  question?: string
  expected?: string
  got?: string
  correct?: boolean
  f1?: number
  latency_ms?: number
  rag_type?: string
  match_method?: string
  error_type?: string
  iteration_label?: string
}

interface Props {
  questions: Record<string, unknown>[]
}

export function QuestionViewer({ questions }: Props) {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'errors'>('all')
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all')

  const typedQuestions = questions as unknown as Question[]

  const filtered = typedQuestions.filter((q) => {
    if (filter === 'correct' && !q.correct) return false
    if (filter === 'incorrect' && (q.correct || q.error_type)) return false
    if (filter === 'errors' && !q.error_type) return false
    if (selectedPipeline !== 'all' && q.rag_type !== selectedPipeline) return false
    return true
  })

  const pipelines = [...new Set(typedQuestions.map(q => q.rag_type).filter(Boolean))]

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-[0.1em] text-tx3">Questions recentes</h2>
        <div className="flex gap-1">
          {(['all', 'correct', 'incorrect', 'errors'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-[10px] font-medium rounded-lg transition-all ${
                filter === f ? 'bg-white/[0.08] text-tx' : 'text-tx3 hover:text-tx2'
              }`}
            >
              {f === 'all' ? 'Toutes' : f === 'correct' ? 'Correctes' : f === 'incorrect' ? 'Incorrectes' : 'Erreurs'}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline filter */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setSelectedPipeline('all')}
          className={`px-3 py-1 text-[10px] rounded-lg ${selectedPipeline === 'all' ? 'bg-ac/10 text-ac border border-ac/20' : 'text-tx3 border border-white/[0.06]'}`}
        >
          Tous
        </button>
        {pipelines.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPipeline(p!)}
            className={`px-3 py-1 text-[10px] rounded-lg capitalize ${selectedPipeline === p ? 'bg-ac/10 text-ac border border-ac/20' : 'text-tx3 border border-white/[0.06]'}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center text-tx3 text-[13px] py-8">Aucune question trouvee.</div>
        ) : (
          filtered.slice(-50).map((q, i) => (
            <motion.div
              key={q.question_id ?? i}
              className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="mt-0.5">
                  {q.error_type ? (
                    <AlertTriangle className="w-4 h-4 text-or" />
                  ) : q.correct ? (
                    <Check className="w-4 h-4 text-gn" />
                  ) : (
                    <X className="w-4 h-4 text-rd" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Question text */}
                  <p className="text-[13px] text-tx leading-snug mb-2 line-clamp-2">
                    {q.question ?? q.question_id}
                  </p>

                  {/* Answer comparison */}
                  {(q.expected || q.got) && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {q.expected && (
                        <div className="text-[11px]">
                          <span className="text-tx3">Attendu: </span>
                          <span className="text-gn font-mono">{String(q.expected).slice(0, 100)}</span>
                        </div>
                      )}
                      {q.got && (
                        <div className="text-[11px]">
                          <span className="text-tx3">Obtenu: </span>
                          <span className="text-tx font-mono">{String(q.got).slice(0, 100)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metrics row */}
                  <div className="flex items-center gap-4 text-[10px]">
                    {q.rag_type && (
                      <span className="px-2 py-0.5 rounded-full bg-ac/10 text-ac border border-ac/20 capitalize">
                        {q.rag_type}
                      </span>
                    )}
                    {q.f1 != null && (
                      <span className="flex items-center gap-1 text-tx3">
                        <Brain className="w-3 h-3" />
                        F1: <span className="font-mono text-tx">{q.f1.toFixed(2)}</span>
                      </span>
                    )}
                    {q.latency_ms != null && (
                      <span className="flex items-center gap-1 text-tx3">
                        <Clock className="w-3 h-3" />
                        <span className="font-mono text-tx">{(q.latency_ms / 1000).toFixed(1)}s</span>
                      </span>
                    )}
                    {q.match_method && (
                      <span className="text-tx3 font-mono">{q.match_method}</span>
                    )}
                    {q.error_type && (
                      <span className="text-or font-mono">{q.error_type}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-3 text-center text-[10px] text-tx3">
        {filtered.length} questions affichees sur {typedQuestions.length}
      </div>
    </motion.section>
  )
}
