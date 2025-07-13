'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Loader2, Lock, ArrowRight } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  requiredRole?: 'miner' | 'enterprise' | 'admin';
  requireVerification?: boolean;
  showLoginPrompt?: boolean;
}

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/login',
  requiredRole,
  requireVerification = false,
  showLoginPrompt = true
}: ProtectedRouteProps) {
  const router = useRouter();
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    checkAuth,
    isVerified 
  } = useAuthStore();

  useEffect(() => {
    // Check authentication status on mount
    if (!isAuthenticated && !isLoading) {
      checkAuth();
    }
  }, [isAuthenticated, isLoading, checkAuth]);

  useEffect(() => {
    // Redirect if not authenticated and not loading
    if (!isLoading && !isAuthenticated && !showLoginPrompt) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router, showLoginPrompt]);

  // Show loading state
  if (isLoading) {
    return (
      <LoadingScreen />
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    if (showLoginPrompt) {
      return (
        <LoginPrompt onLogin={() => router.push(redirectTo)} />
      );
    }
    return fallback || null;
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <UnauthorizedAccess 
        requiredRole={requiredRole} 
        userRole={user?.role}
      />
    );
  }

  // Check verification requirements
  if (requireVerification && !isVerified) {
    return (
      <VerificationRequired />
    );
  }

  // Render protected content
  return <>{children}</>;
}

// Loading Screen Component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-nock-blue-400" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Loading NOCKCHAIN
          </h3>
          <p className="text-white/70 text-sm">
            Authenticating your session...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Login Prompt Component
function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full glass-card flex items-center justify-center">
            <Lock className="w-8 h-8 text-nock-blue-400" />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            Authentication Required
          </h3>
          
          <p className="text-white/70 text-sm mb-6">
            Please sign in to access this page and start your mining journey.
          </p>

          <Button
            onClick={onLogin}
            variant="primary"
            size="lg"
            fullWidth
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Sign In
          </Button>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-nock-green-400 font-semibold">15.7%</div>
                <div className="text-xs text-white/60">Mining Boost</div>
              </div>
              <div>
                <div className="text-nock-blue-400 font-semibold">22ms</div>
                <div className="text-xs text-white/60">API Speed</div>
              </div>
              <div>
                <div className="text-nock-purple-400 font-semibold">AI</div>
                <div className="text-xs text-white/60">Enhanced</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Unauthorized Access Component
function UnauthorizedAccess({ 
  requiredRole, 
  userRole 
}: { 
  requiredRole: string;
  userRole?: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <Alert variant="error" size="lg" className="mb-6">
            <div>
              <h3 className="font-semibold mb-2">Access Denied</h3>
              <p className="text-sm">
                This page requires <strong>{requiredRole}</strong> privileges.
                {userRole && (
                  <span className="block mt-1">
                    Your current role: <strong>{userRole}</strong>
                  </span>
                )}
              </p>
            </div>
          </Alert>

          <Button
            onClick={() => router.push('/dashboard')}
            variant="primary"
            fullWidth
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Verification Required Component
function VerificationRequired() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="text-center p-8">
          <Alert variant="warning" size="lg" className="mb-6">
            <div>
              <h3 className="font-semibold mb-2">Verification Required</h3>
              <p className="text-sm">
                Please verify your account to access this feature.
              </p>
            </div>
          </Alert>

          <div className="space-y-3">
            <Button
              onClick={() => router.push('/verification')}
              variant="primary"
              fullWidth
            >
              Complete Verification
            </Button>
            
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              fullWidth
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for checking permissions
export function useRequireAuth(
  requiredRole?: 'miner' | 'enterprise' | 'admin',
  requireVerification = false
) {
  const { isAuthenticated, user, isVerified } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      router.push('/unauthorized');
      return;
    }

    if (requireVerification && !isVerified) {
      router.push('/verification');
      return;
    }
  }, [isAuthenticated, user, isVerified, requiredRole, requireVerification, router]);

  return {
    isAuthorized: isAuthenticated && 
      (!requiredRole || user?.role === requiredRole) &&
      (!requireVerification || isVerified)
  };
}

// Higher-order component for page-level protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}