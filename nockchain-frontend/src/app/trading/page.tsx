'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import PremiumTradingInterface from '@/components/trading/PremiumTradingInterface';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, TrendingUp, Shield, Zap, Activity, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// Loading component for Trading page
function TradingLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-10 w-80 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Market data skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="glass-loading">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-white/10 rounded-xl animate-pulse" />
                  <div className="w-16 h-6 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main trading interface skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order book skeleton */}
        <Card className="glass-loading">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Trading form skeleton */}
        <Card className="glass-loading">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
                </div>
              ))}
              <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        {/* Recent trades skeleton */}
        <Card className="glass-loading">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-white/10 rounded-full animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Error boundary for Trading page
function TradingError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full glass-card glass-alert-error flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              ⚠️
            </motion.div>
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            Trading Platform Error
          </h3>
          
          <p className="text-white/70 text-sm mb-6">
            Failed to load trading interface. This might be a connection issue with market data feeds.
          </p>

          <div className="space-y-3">
            <button
              onClick={retry}
              className="glass-button-primary w-full py-2 px-4 rounded-lg font-medium"
            >
              Reconnect to Markets
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="glass-button w-full py-2 px-4 rounded-lg font-medium text-sm"
            >
              Reload Page
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-xs text-white/50">
            Error: {error.message}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Performance wrapper for Trading page
function TradingPerformanceWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
}

// Trading page header component
function TradingPageHeader() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">
              Professional Trading
            </h1>
            <Badge variant="success" className="px-3 py-1">
              <Activity className="w-4 h-4 mr-1" />
              Live Markets
            </Badge>
          </div>
          <p className="text-white/70 text-lg">
            Advanced trading platform with institutional-grade execution
          </p>
        </div>
      </div>

      {/* Trading Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4"
      >
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
          Real-Time Order Book
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Shield className="w-4 h-4 mr-2 text-blue-400" />
          Secure Trading Engine
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Zap className="w-4 h-4 mr-2 text-yellow-400" />
          Sub-25ms Execution
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <BarChart3 className="w-4 h-4 mr-2 text-purple-400" />
          Advanced Analytics
        </Badge>
      </motion.div>

      {/* Market Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-white/60 mb-1">Market Status</div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-medium">Open</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-white/60 mb-1">Trading Pairs</div>
            <div className="text-white font-semibold">12 Active</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-white/60 mb-1">24h Volume</div>
            <div className="text-white font-semibold">$2.84M</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 text-center">
            <div className="text-sm text-white/60 mb-1">Avg Latency</div>
            <div className="text-green-400 font-semibold">22ms</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Main Trading page component
export default function TradingPage() {
  return (
    <ProtectedRoute 
      requireVerification={false}
      showLoginPrompt={true}
    >
      <MainLayout>
        <TradingPerformanceWrapper>
          <div className="space-y-8">
            <TradingPageHeader />
            
            <Suspense fallback={<TradingLoading />}>
              <ErrorBoundary>
                <PremiumTradingInterface />
              </ErrorBoundary>
            </Suspense>

            {/* Trading Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Lightning Fast
                  </h3>
                  <p className="text-white/70 text-sm">
                    Sub-25ms order execution with institutional-grade infrastructure
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Secure Trading
                  </h3>
                  <p className="text-white/70 text-sm">
                    Multi-layered security with 2FA and cold storage protection
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Advanced Tools
                  </h3>
                  <p className="text-white/70 text-sm">
                    Professional charting, order types, and risk management tools
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Real-Time Data
                  </h3>
                  <p className="text-white/70 text-sm">
                    Live market data with WebSocket streaming and price alerts
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Risk Disclaimer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="glass-card border border-yellow-500/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">
                        Risk Disclosure
                      </h3>
                      <p className="text-white/70 text-sm leading-relaxed">
                        Trading cryptocurrencies involves substantial risk and may not be suitable for all investors. 
                        Past performance does not guarantee future results. Please ensure you understand the risks 
                        involved and consider seeking independent financial advice. Never invest more than you can 
                        afford to lose.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TradingPerformanceWrapper>
      </MainLayout>
    </ProtectedRoute>
  );
}

// Error boundary implementation
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Trading page error:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      console.error('Trading page crash:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <TradingError
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}