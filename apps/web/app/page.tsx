import { Metadata } from 'next'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { StatsSection } from '@/components/landing/stats-section'
import { TechnologySection } from '@/components/landing/technology-section'
import { CTASection } from '@/components/landing/cta-section'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Nockchain Platform - Dominate the NOCK Economy',
  description: 'The definitive infrastructure platform controlling NOCK token flow between mining ecosystem and DeFi trading markets. Enterprise-grade mining pool with cross-chain bridge to Solana.',
  openGraph: {
    title: 'Nockchain Platform - Dominate the NOCK Economy',
    description: 'The definitive infrastructure platform controlling NOCK token flow between mining ecosystem and DeFi trading markets.',
  },
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <TechnologySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}