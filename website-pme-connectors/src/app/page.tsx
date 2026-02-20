'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HeroPME } from '@/components/landing/HeroPME'
import { HowItWorksPME } from '@/components/landing/HowItWorksPME'
import { AppConnectorsGrid } from '@/components/landing/AppConnectorsGrid'
import { WorkflowPatterns } from '@/components/landing/WorkflowPatterns'
import { MacBookCard } from '@/components/macbook/MacBookCard'
import { TermiusModal } from '@/components/modal/TermiusModal'
import { PME_SECTOR } from '@/lib/constants-pme'
import type { Sector } from '@/types/sector'

export default function Home() {
  const [activeSector, setActiveSector] = useState<Sector | null>(null)

  const handleOpenChatbot = useCallback(() => {
    setActiveSector(PME_SECTOR)
  }, [])

  return (
    <>
      <Header />
      <main>
        {/* 1. Hero: pain points + headline */}
        <HeroPME onOpenChatbot={handleOpenChatbot} />

        {/* 2. How it works: 3 steps */}
        <HowItWorksPME />

        {/* 3. App connectors grid — 15 apps */}
        <AppConnectorsGrid />

        {/* 4. Workflow patterns — under the hood */}
        <WorkflowPatterns />

        {/* 5. MacBook + Spotlight CTA */}
        <MacBookCard
          spotlightPlaceholder="Decrivez une tache quotidienne que vous aimeriez automatiser..."
          description="Pas besoin de syntaxe. Parlez normalement. Le chatbot comprend et agit."
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
