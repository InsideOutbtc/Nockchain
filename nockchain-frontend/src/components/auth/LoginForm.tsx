'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Wallet, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLogin?: (credentials: LoginCredentials) => Promise<void>;
  onRegister?: () => void;
  onForgotPassword?: () => void;
  loading?: boolean;
  error?: string;
}

interface LoginCredentials {
  email?: string;
  password?: string;
  walletAddress?: string;
  loginMethod: 'email' | 'wallet';
}

export function LoginForm({
  onLogin,
  onRegister,
  onForgotPassword,
  loading = false,
  error
}: LoginFormProps) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'wallet'>('email');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    walletAddress: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (loginMethod === 'email') {
      if (!formData.email || !formData.password) {
        setFormError('Please fill in all fields');
        return;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setFormError('Please enter a valid email address');
        return;
      }
    } else {
      if (!formData.walletAddress) {
        setFormError('Please enter your wallet address');
        return;
      }
    }

    const credentials: LoginCredentials = {
      loginMethod,
      ...(loginMethod === 'email' && {
        email: formData.email,
        password: formData.password
      }),
      ...(loginMethod === 'wallet' && {
        walletAddress: formData.walletAddress
      })
    };

    try {
      await onLogin?.(credentials);
    } catch (err) {
      setFormError('Login failed. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const connectWallet = async () => {
    try {
      // Mock wallet connection - replace with actual wallet integration
      if (typeof window !== 'undefined' && (window as any).solana) {
        const response = await (window as any).solana.connect();
        handleInputChange('walletAddress', response.publicKey.toString());
      } else {
        setFormError('Please install a Solana wallet extension');
      }
    } catch (err) {
      setFormError('Failed to connect wallet');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card variant="large">
        <CardHeader className="text-center">
          <CardTitle gradient className="text-3xl mb-2">
            Welcome to NOCKCHAIN
          </CardTitle>
          <p className="text-white/70">
            Sign in to access your mining dashboard
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Login Method Toggle */}
          <div className="flex rounded-lg p-1 glass-card">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                loginMethod === 'email'
                  ? 'glass-button-primary text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('wallet')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                loginMethod === 'wallet'
                  ? 'glass-button-primary text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Wallet
            </button>
          </div>

          {/* Error Display */}
          {(error || formError) && (
            <Alert variant="error" size="sm">
              {error || formError}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMethod === 'email' ? (
              <>
                {/* Email Login */}
                <div className="space-y-2">
                  <Label htmlFor="email" required>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email"
                    leftIcon={<Mail className="w-4 h-4" />}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/50 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                    disabled={loading}
                    required
                  />
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-nock-blue-400 hover:text-nock-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Wallet Login */}
                <div className="space-y-2">
                  <Label htmlFor="wallet" required>
                    Wallet Address
                  </Label>
                  <div className="space-y-2">
                    <Input
                      id="wallet"
                      value={formData.walletAddress}
                      onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                      placeholder="Enter wallet address or connect wallet"
                      leftIcon={<Wallet className="w-4 h-4" />}
                      disabled={loading}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={connectWallet}
                      disabled={loading}
                      fullWidth
                      icon={<Wallet className="w-4 h-4" />}
                    >
                      Connect Wallet
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              fullWidth
              className="mt-6"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-sm text-white/70">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onRegister}
                className="text-nock-blue-400 hover:text-nock-blue-300 transition-colors font-medium"
              >
                Create one now
              </button>
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="text-center p-3 glass-card rounded-lg">
              <div className="text-nock-green-400 mb-1">15.7%</div>
              <div className="text-xs text-white/60">Mining Boost</div>
            </div>
            <div className="text-center p-3 glass-card rounded-lg">
              <div className="text-nock-blue-400 mb-1">22ms</div>
              <div className="text-xs text-white/60">API Speed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}