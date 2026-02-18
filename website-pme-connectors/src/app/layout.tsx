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
  title: 'Nomos AI PME | Toutes vos apps, une conversation',
  description:
    'Connectez WhatsApp, Gmail, Slack, CRM et 200+ outils. Decrivez ce que vous voulez faire — le chatbot IA agit pour vous.',
  openGraph: {
    title: 'Nomos AI PME — Connecteurs Apps',
    description: 'Toutes vos apps professionnelles connectees a un seul chatbot IA intelligent.',
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
