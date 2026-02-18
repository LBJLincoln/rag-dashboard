import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nomos AI PME | 200 Cas d\'Usage Concrets',
  description:
    '200 cas d\'usage concrets pour automatiser votre PME/ETI. Filtrez par categorie, mesurez le ROI, testez dans le chatbot.',
  openGraph: {
    title: 'Nomos AI PME — 200 Cas d\'Usage',
    description: '200 automatisations concretes pour PME/ETI francaises. ROI mesurable, testable en direct.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
