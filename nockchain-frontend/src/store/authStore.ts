import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVerified: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

interface LoginCredentials {
  email?: string;
  password?: string;
  walletAddress?: string;
  loginMethod: 'email' | 'wallet';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isVerified: false,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true });
          
          const response = await authAPI.login(credentials);
          const { user, token, refreshToken } = response.data;

          // Store tokens
          if (typeof window !== 'undefined') {
            localStorage.setItem('nockchain-auth', JSON.stringify({ token, refreshToken }));
          }

          set({
            user,
            token,
            isAuthenticated: true,
            isVerified: user.isVerified || false,
            isLoading: false
          });

        } catch (error) {
          set({ isLoading: false });
          console.error('Login failed:', error);
          throw error;
        }
      },

      logout: () => {
        // Clear stored tokens
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nockchain-auth');
        }

        // Call logout API
        authAPI.logout().catch(console.error);

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isVerified: false,
          isLoading: false
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
            isVerified: userData.isVerified ?? get().isVerified
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });

          // Check for stored token
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('nockchain-auth');
            if (stored) {
              const { token } = JSON.parse(stored);
              if (token) {
                // Validate token with backend
                // This would typically involve calling a /me or /verify endpoint
                // For now, we'll assume the token is valid if it exists
                set({
                  token,
                  isAuthenticated: true,
                  isLoading: false
                });
                return;
              }
            }
          }

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isVerified: false,
            isLoading: false
          });

        } catch (error) {
          console.error('Auth check failed:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isVerified: false,
            isLoading: false
          });
        }
      },

      refreshToken: async () => {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('nockchain-auth');
            if (stored) {
              const { refreshToken } = JSON.parse(stored);
              if (refreshToken) {
                // Call refresh token API
                const response = await authAPI.refresh({ refreshToken });
                const { token: newToken, refreshToken: newRefreshToken } = response.data;

                // Update stored tokens
                localStorage.setItem('nockchain-auth', JSON.stringify({
                  token: newToken,
                  refreshToken: newRefreshToken
                }));

                set({ token: newToken });
                return;
              }
            }
          }

          // If refresh fails, logout
          get().logout();
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'nockchain-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isVerified: state.isVerified
      })
    }
  )
);