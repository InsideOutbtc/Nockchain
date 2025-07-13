'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import OptimizedMiningDashboard from '@/components/dashboard/OptimizedMiningDashboard';
import { Card, CardContent } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

// Loading component for Suspense
function DashboardLoading() {
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

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
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

      {/* Main content skeleton */}
      <div className="space-y-6">
        <Card className="glass-loading">
          <CardContent className="p-6">
            <div className="h-64 bg-white/5 rounded-lg animate-pulse" />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-loading">
            <CardContent className="p-6">
              <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
          <Card className="glass-loading">
            <CardContent className="p-6">
              <div className="h-48 bg-white/5 rounded-lg animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Error boundary component
function DashboardError({ error, retry }: { error: Error; retry: () => void }) {
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
            Dashboard Error
          </h3>
          
          <p className="text-white/70 text-sm mb-6">
            Failed to load mining dashboard. This might be a temporary issue.
          </p>

          <div className="space-y-3">
            <button
              onClick={retry}
              className="glass-button-primary w-full py-2 px-4 rounded-lg font-medium"
            >
              Try Again
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

// Performance monitoring wrapper
function DashboardPerformanceWrapper({ children }: { children: React.ReactNode }) {
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

// Main dashboard page component
export default function DashboardPage() {
  return (
    <ProtectedRoute 
      requireVerification={false}
      showLoginPrompt={true}
    >
      <MainLayout>
        <DashboardPerformanceWrapper>
          <Suspense fallback={<DashboardLoading />}>
            <ErrorBoundary>
              <OptimizedMiningDashboard />
            </ErrorBoundary>
          </Suspense>
        </DashboardPerformanceWrapper>
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
    console.error('Dashboard error:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined') {
      // Send error to monitoring service
      console.error('Dashboard crash:', {
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
        <DashboardError
          error={this.state.error}
          retry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}