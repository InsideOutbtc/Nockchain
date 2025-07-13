'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, ArrowRight, Users, Globe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10"></div>
      
      <div className="relative">
        {/* Navigation */}
        <nav className="glass-header sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold gradient-text"
            >
              NOCKCHAIN
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-6"
            >
              <Link href="/login" className="glass-button px-6 py-2 rounded-lg font-medium hover:scale-105 transition-transform">
                Launch App
              </Link>
            </motion.div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-7xl font-bold mb-6">
              <span className="gradient-text">Revolutionary</span>
              <br />
              <span className="text-white">NOCK Mining</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Professional-grade mining platform with <span className="text-nock-blue-400 font-semibold">15.7% efficiency boost</span>, 
              enterprise security, and advanced AI-powered autonomous operations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/login"
                className="glass-button px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2 group"
              >
                Start Mining <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="glass-card px-8 py-4 rounded-lg font-medium text-lg hover:scale-105 transition-transform">
                View Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6 rounded-xl"
              >
                <div className="text-3xl font-bold text-nock-green-400 mb-2">15.7%</div>
                <div className="text-gray-300">Efficiency Boost</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-6 rounded-xl"
              >
                <div className="text-3xl font-bold text-nock-purple-400 mb-2">22ms</div>
                <div className="text-gray-300">API Response</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-6 rounded-xl"
              >
                <div className="text-3xl font-bold text-nock-blue-400 mb-2">21</div>
                <div className="text-gray-300">AI Agents</div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Next-Generation Mining Platform</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Built for professional miners with enterprise-grade security and autonomous operations
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <Zap className="w-12 h-12 text-nock-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">NOCK Optimization</h3>
              <p className="text-gray-300">Eon-aware mining algorithms leveraging NOCK&apos;s unique architecture for maximum efficiency.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <Shield className="w-12 h-12 text-nock-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Military-Grade Security</h3>
              <p className="text-gray-300">5-of-9 multi-signature validation with HSM integration and zero-trust architecture.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <TrendingUp className="w-12 h-12 text-nock-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Cross-Chain Bridge</h3>
              <p className="text-gray-300">Seamless NOCK ↔ wNOCK conversion with institutional-grade liquidity management.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <Users className="w-12 h-12 text-nock-blue-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Autonomous Operations</h3>
              <p className="text-gray-300">Advanced AI algorithms handling everything from optimization to financial operations.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <Globe className="w-12 h-12 text-nock-green-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Professional Trading</h3>
              <p className="text-gray-300">Advanced trading interface with real-time analytics and portfolio management.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card-hover p-8 rounded-xl"
            >
              <Zap className="w-12 h-12 text-nock-purple-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Mobile Mining</h3>
              <p className="text-gray-300">First eon-aware mobile mining with 150 KH/s optimized hashrate and thermal management.</p>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="glass-card p-12 rounded-2xl text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Dominate NOCK Mining?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join the revolution with enterprise-grade mining platform powered by autonomous AI operations.
            </p>
            <Link
              href="/login"
              className="glass-button px-12 py-4 rounded-lg font-bold text-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              Launch Platform <ArrowRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="glass-header mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-2xl font-bold gradient-text mb-4 md:mb-0">
                NOCKCHAIN
              </div>
              <div className="text-gray-400">
                © 2025 Nockchain. Revolutionary mining platform.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
