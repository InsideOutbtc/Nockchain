import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'Nockchain Platform - Enterprise Mining Pool & Bridge',
    template: '%s | Nockchain Platform',
  },
  description: 'The definitive infrastructure platform controlling NOCK token flow between mining ecosystem and DeFi trading markets. Enterprise-grade mining pool with cross-chain bridge to Solana.',
  keywords: [
    'Nockchain',
    'NOCK',
    'mining pool',
    'cryptocurrency mining',
    'cross-chain bridge',
    'Solana',
    'DeFi',
    'blockchain',
    'proof of work',
    'zero knowledge proofs'
  ],
  authors: [{ name: 'Nockchain Platform' }],
  creator: 'Nockchain Platform',
  publisher: 'Nockchain Platform',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://nockchain.platform',
    title: 'Nockchain Platform - Enterprise Mining Pool & Bridge',
    description: 'The definitive infrastructure platform controlling NOCK token flow between mining ecosystem and DeFi trading markets.',
    siteName: 'Nockchain Platform',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nockchain Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nockchain Platform - Enterprise Mining Pool & Bridge',
    description: 'The definitive infrastructure platform controlling NOCK token flow between mining ecosystem and DeFi trading markets.',
    images: ['/og-image.png'],
    creator: '@nockchain',
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(var(--primary))',
                  secondary: 'hsl(var(--primary-foreground))',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--destructive-foreground))',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}