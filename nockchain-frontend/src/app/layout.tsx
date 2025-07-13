import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@/styles/glass-morphism.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NOCKCHAIN - Revolutionary Mining Platform',
  description: 'Professional-grade NOCK mining platform with 15.7% efficiency boost and enterprise security',
  keywords: ['NOCK', 'mining', 'blockchain', 'cryptocurrency', 'DeFi', 'cross-chain'],
  authors: [{ name: 'Nockchain Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
          {children}
        </div>
      </body>
    </html>
  )
}
