'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroPME } from '@/components/landing/HeroPME'
import { HowItWorksPME } from '@/components/landing/HowItWorksPME'
import { UseCaseCatalog } from '@/components/catalog/UseCaseCatalog'
import { MacBookCard } from '@/components/macbook/MacBookCard'
import { TermiusModal } from '@/components/modal/TermiusModal'
import { PME_SECTOR } from '@/lib/constants-pme'
import type { Sector } from '@/types/sector'

export default function Home() {
  const [activeSector, setActiveSector] = useState<Sector | null>(null)

  const handleOpenChatbot = useCallback(() => {
    setActiveSector(PME_SECTOR)
  }, [])

  const handleTestUseCase = useCallback((_query: string) => {
    setActiveSector(PME_SECTOR)
  }, [])

  return (
    <>
      <Header />
      <main>
        {/* 1. Hero PME (use cases variant) */}
        <HeroPME onOpenChatbot={handleOpenChatbot} />

        {/* 2. How it works: 3 steps */}
        <HowItWorksPME />

        {/* 3. Use case catalog: 10 categories, filters, search */}
        <UseCaseCatalog onTestUseCase={handleTestUseCase} />

        {/* 4. MacBook + Spotlight */}
        <MacBookCard
          spotlightPlaceholder="Decrivez une tache repetitive de votre quotidien. Notre chatbot vous montre comment l'automatiser."
          description="Chaque cas d'usage est teste et mesure. ROI moyen : 65K EUR/an par automatisation."
          onSpotlightClick={handleOpenChatbot}
        />
      </main>
      <Footer />

      {/* Chatbot modal */}
      <TermiusModal
        sector={activeSector}
        onClose={() => setActiveSector(null)}
      />
    </>
  )
}
