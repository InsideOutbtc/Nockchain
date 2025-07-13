'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import PremiumBridgeInterface from '@/components/bridge/PremiumBridgeInterface';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2, Shield, Zap, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// Loading component for Bridge page
function BridgeLoading() {
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

      {/* Security badges skeleton */}
      <div className="flex flex-wrap gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
        ))}
      </div>

      {/* Main bridge interface skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-loading lg:col-span-2">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="h-8 w-48 bg-white/10 rounded-lg animate-pulse" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                    <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-12 w-full bg-white/10 rounded-lg animate-pulse" />
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card className="glass-loading">
            <CardContent className="p-6">
              <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
          <Card className="glass-loading">
            <CardContent className="p-6">
              <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Error boundary for Bridge page
function BridgeError({ error, retry }: { error: Error; retry: () => void }) {
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
            Bridge Connection Error
          </h3>
          
          <p className="text-white/70 text-sm mb-6">
            Failed to load bridge interface. This might be a network connectivity issue.
          </p>

          <div className="space-y-3">
            <button
              onClick={retry}
              className="glass-button-primary w-full py-2 px-4 rounded-lg font-medium"
            >
              Retry Connection
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

// Performance wrapper for Bridge page
function BridgePerformanceWrapper({ children }: { children: React.ReactNode }) {
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

// Bridge page header component
function BridgePageHeader() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">
              Cross-Chain Bridge
            </h1>
            <Badge variant="success" className="px-3 py-1">
              <Zap className="w-4 h-4 mr-1" />
              Active
            </Badge>
          </div>
          <p className="text-white/70 text-lg">
            Seamlessly transfer NOCK tokens across blockchain networks
          </p>
        </div>
      </div>

      {/* Security Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-4"
      >
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Shield className="w-4 h-4 mr-2 text-blue-400" />
          5-of-9 Multi-Signature Security
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Globe className="w-4 h-4 mr-2 text-green-400" />
          Cross-Chain Compatible
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Zap className="w-4 h-4 mr-2 text-yellow-400" />
          Sub-2 Minute Transfers
        </Badge>
        <Badge variant="neutral" className="px-4 py-2 glass-card">
          <Shield className="w-4 h-4 mr-2 text-purple-400" />
          Military-Grade Encryption
        </Badge>
      </motion.div>
    </div>
  );
}

// Main Bridge page component
export default function BridgePage() {
  return (
    <ProtectedRoute 
      requireVerification={false}
      showLoginPrompt={true}
    >
      <MainLayout>
        <BridgePerformanceWrapper>
          <div className="space-y-8">
            <BridgePageHeader />
            
            <Suspense fallback={<BridgeLoading />}>
              <ErrorBoundary>
                <PremiumBridgeInterface />
              </ErrorBoundary>
            </Suspense>

            {/* Additional Bridge Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Enterprise Security
                  </h3>
                  <p className="text-white/70 text-sm">
                    5-of-9 multi-signature validation with hardware security modules for maximum protection
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Lightning Fast
                  </h3>
                  <p className="text-white/70 text-sm">
                    Average transfer time under 2 minutes with real-time status tracking and notifications
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl glass-card glass-glow flex items-center justify-center">
                    <Globe className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Multi-Chain Support
                  </h3>
                  <p className="text-white/70 text-sm">
                    Seamless bridging between Ethereum, BSC, Polygon, and other major blockchain networks
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </BridgePerformanceWrapper>
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
    console.error('Bridge page error:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      console.error('Bridge page crash:', {
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
        <BridgeError
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}