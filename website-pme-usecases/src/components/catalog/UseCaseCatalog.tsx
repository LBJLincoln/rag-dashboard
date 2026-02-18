'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter } from 'lucide-react'
import { PME_USECASES, PME_CATEGORIES, TOTAL_TARGET, CURRENT_COUNT } from '@/lib/pme-usecases'
import type { PMEUseCaseDetail } from '@/lib/pme-usecases'
import { UseCaseCatalogCard } from './UseCaseCatalogCard'
import { UseCaseDetailModal } from './UseCaseDetailModal'

interface UseCaseCatalogProps {
  onTestUseCase: (query: string) => void
}

type ImpactFilter = 'all' | 'critique' | 'fort' | 'moyen'

export function UseCaseCatalog({ onTestUseCase }: UseCaseCatalogProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUseCase, setSelectedUseCase] = useState<PMEUseCaseDetail | null>(null)

  const filteredUseCases = useMemo(() => {
    let results = PME_USECASES

    if (activeCategory) {
      results = results.filter((uc) => uc.category === activeCategory)
    }

    if (impactFilter !== 'all') {
      results = results.filter((uc) => uc.impact === impactFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      results = results.filter(
        (uc) =>
          uc.title.toLowerCase().includes(q) ||
          uc.problem.toLowerCase().includes(q) ||
          uc.description.toLowerCase().includes(q) ||
          uc.apps.some((app) => app.toLowerCase().includes(q))
      )
    }

    return results
  }, [activeCategory, impactFilter, searchQuery])

  return (
    <section id="catalogue" className="py-16 md:py-24" style={{ background: 'var(--s1)' }}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">
            Catalogue
          </p>
          <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] text-tx leading-[1.1] mb-4">
            {TOTAL_TARGET} cas d&apos;usage concrets.
          </h2>
          <p className="text-[16px] text-tx2 max-w-xl mx-auto leading-relaxed">
            {CURRENT_COUNT} cas detailles disponibles, {TOTAL_TARGET - CURRENT_COUNT} en cours de redaction.
            Filtrez par categorie, impact ou recherchez par mot-cle.
          </p>
        </motion.div>

        {/* Filters */}
        <div className="space-y-4 mb-8">
          {/* Category pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                !activeCategory
                  ? 'bg-ac/15 text-ac border-ac/30'
                  : 'text-tx3 border-white/[0.08] hover:border-white/[0.16]'
              }`}
              onClick={() => setActiveCategory(null)}
            >
              Tous ({CURRENT_COUNT})
            </button>
            {PME_CATEGORIES.map((cat) => {
              const count = PME_USECASES.filter((uc) => uc.category === cat.id).length
              return (
                <button
                  key={cat.id}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'border-white/[0.2]'
                      : 'text-tx3 border-white/[0.08] hover:border-white/[0.16]'
                  }`}
                  style={
                    activeCategory === cat.id
                      ? { backgroundColor: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}30` }
                      : undefined
                  }
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                >
                  {cat.emoji} {cat.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Search + Impact filter */}
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {/* Search */}
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <Search className="w-4 h-4 text-tx3 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un cas d'usage..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] text-tx placeholder:text-tx3 outline-none"
              />
            </div>

            {/* Impact filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-tx3" />
              {(['all', 'critique', 'fort', 'moyen'] as ImpactFilter[]).map((level) => (
                <button
                  key={level}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${
                    impactFilter === level
                      ? 'bg-white/[0.1] text-tx'
                      : 'text-tx3 hover:text-tx2'
                  }`}
                  onClick={() => setImpactFilter(level)}
                >
                  {level === 'all' ? 'Tous' : level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-[12px] text-tx3 mb-4 text-center">
          {filteredUseCases.length} cas d&apos;usage affiches
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUseCases.map((uc, i) => (
            <UseCaseCatalogCard
              key={uc.id}
              useCase={uc}
              index={i}
              onSelect={setSelectedUseCase}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredUseCases.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[16px] text-tx2 mb-2">Aucun cas d&apos;usage trouve.</p>
            <p className="text-[13px] text-tx3">Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        )}

        {/* Bottom note */}
        <motion.p
          className="text-center text-[13px] text-tx3 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {TOTAL_TARGET - CURRENT_COUNT} cas supplementaires en cours de redaction — 20 par categorie.
        </motion.p>
      </div>

      {/* Detail modal */}
      <UseCaseDetailModal
        useCase={selectedUseCase}
        onClose={() => setSelectedUseCase(null)}
        onTest={(query) => {
          setSelectedUseCase(null)
          onTestUseCase(query)
        }}
      />
    </section>
  )
}
