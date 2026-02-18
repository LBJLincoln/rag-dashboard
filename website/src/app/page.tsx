'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/landing/Hero'
import { BentoGrid } from '@/components/landing/BentoGrid'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { CaseStudy } from '@/components/landing/CaseStudy'
import { DashboardCTA } from '@/components/landing/DashboardCTA'
import { TrustSection } from '@/components/landing/TrustSection'
import { TermiusModal } from '@/components/modal/TermiusModal'
import { UseCasePortfolio } from '@/components/portfolio/UseCasePortfolio'
import type { Sector } from '@/types/sector'

export default function Home() {
  const [activeSector, setActiveSector] = useState<Sector | null>(null)
  const [portfolioSector, setPortfolioSector] = useState<Sector | null>(null)

  const handleOpenChatbot = useCallback((sector: Sector) => {
    setActiveSector(sector)
  }, [])

  const handleOpenPortfolio = useCallback((sector: Sector) => {
    setPortfolioSector(sector)
  }, [])

  const handleTestUseCase = useCallback((sector: Sector, _question: string) => {
    setPortfolioSector(null)
    setActiveSector(sector)
  }, [])

  return (
    <>
      <Header />
      <main>
        {/* 1. Hero: problem-first, dual CTA */}
        <Hero />

        {/* 2. How it works: "sous le capot", pipelines as sub-section */}
        <HowItWorks />

        {/* 3. Sector cards: Apple-style pain point + ROI focus */}
        <div id="secteurs">
          <BentoGrid
            onOpenChatbot={handleOpenChatbot}
            onOpenPortfolio={handleOpenPortfolio}
          />
        </div>

        {/* 4. Case studies: real ROI, real companies */}
        <CaseStudy />

        {/* 5. Dashboard CTA: transparency + benchmarks link */}
        <DashboardCTA />

        {/* 6. Trust section: academic benchmarks, methodology */}
        <TrustSection />
      </main>
      <Footer />

      {/* Chatbot modal */}
      <TermiusModal
        sector={activeSector}
        onClose={() => setActiveSector(null)}
      />

      {/* Use case portfolio */}
      <UseCasePortfolio
        sector={portfolioSector}
        onClose={() => setPortfolioSector(null)}
        onTestUseCase={handleTestUseCase}
      />
    </>
  )
}
