'use client'

import { motion } from 'framer-motion'
import { MacBookFrame } from './MacBookFrame'
import { SpotlightBar } from './SpotlightBar'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface MacBookCardProps {
  spotlightPlaceholder?: string
  description?: string
  onSpotlightClick: () => void
}

export function MacBookCard({
  spotlightPlaceholder,
  description,
  onSpotlightClick,
}: MacBookCardProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[13px] uppercase tracking-[0.1em] text-tx3 mb-4">
            Essayez maintenant
          </p>
          <h2 className="text-[28px] md:text-[38px] font-bold tracking-[-0.03em] text-tx leading-[1.1]">
            Une seule question suffit.
          </h2>
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {isMobile ? (
            /* Mobile: Spotlight bar only */
            <div className="w-full max-w-lg">
              <SpotlightBar
                placeholder={spotlightPlaceholder}
                onClick={onSpotlightClick}
              />
              {description && (
                <p className="text-[13px] text-tx3 text-center mt-4 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          ) : (
            /* Desktop/Tablet: Full MacBook */
            <MacBookFrame>
              <SpotlightBar
                placeholder={spotlightPlaceholder}
                onClick={onSpotlightClick}
              />
              {description && (
                <p className="text-[13px] text-tx3 text-center mt-6 max-w-md leading-relaxed">
                  {description}
                </p>
              )}
            </MacBookFrame>
          )}
        </motion.div>
      </div>
    </section>
  )
}
