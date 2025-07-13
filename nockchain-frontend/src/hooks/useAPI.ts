'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosResponse, AxiosError, CancelTokenSource } from 'axios';
import { useNotifications } from '@/components/ui/Notifications';
import { useAPICache } from './useLocalStorage';

export interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

export interface UseAPIOptions {
  immediate?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  retries?: number;
  retryDelay?: number;
  showErrorNotifications?: boolean;
  showSuccessNotifications?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface APIEndpoints {
  // Authentication
  login: (credentials: { email: string; password: string }) => Promise<any>;
  register: (userData: { email: string; password: string; name: string }) => Promise<any>;
  refreshToken: () => Promise<any>;
  logout: () => Promise<any>;
  
  // Mining
  getMiningStats: () => Promise<any>;
  getWorkers: () => Promise<any>;
  getPoolStats: () => Promise<any>;
  getEarnings: () => Promise<any>;
  
  // Bridge
  getBridgeStatus: () => Promise<any>;
  getBridgeHistory: () => Promise<any>;
  initiateBridge: (params: { from: string; to: string; amount: number }) => Promise<any>;
  
  // Trading
  getOrderBook: (pair: string) => Promise<any>;
  getTradingHistory: () => Promise<any>;
  placeOrder: (order: any) => Promise<any>;
  cancelOrder: (orderId: string) => Promise<any>;
  
  // Analytics
  getAnalytics: (timeframe?: string) => Promise<any>;
  getRevenueStats: () => Promise<any>;
  getUserStats: () => Promise<any>;
  getSystemHealth: () => Promise<any>;
}

// Create axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nockchain-auth');
    if (token) {
      try {
        const { token: authToken } = JSON.parse(token);
        config.headers.Authorization = `Bearer ${authToken}`;
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('nockchain-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Main useAPI hook
export function useAPI<T = any>(
  endpoint: string | (() => Promise<AxiosResponse<T>>),
  options: UseAPIOptions = {}
) {
  const {
    immediate = false,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retries = 3,
    retryDelay = 1000,
    showErrorNotifications = true,
    showSuccessNotifications = false,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  });

  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addNotification } = useNotifications();
  const cache = useAPICache<T>(cacheKey || '', cacheTTL);

  // Check cache first
  useEffect(() => {
    if (cacheKey) {
      const cachedData = cache.get();
      if (cachedData) {
        setState({
          data: cachedData,
          loading: false,
          error: null,
          lastFetched: new Date()
        });
      }
    }
  }, [cacheKey]);

  const execute = useCallback(async (params?: any, retryCount = 0): Promise<T | null> => {
    // Cancel previous request if exists
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('New request initiated');
    }

    // Create new cancel token
    cancelTokenRef.current = axios.CancelToken.source();

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let response: AxiosResponse<T>;

      if (typeof endpoint === 'string') {
        response = await api.get(endpoint, {
          cancelToken: cancelTokenRef.current.token,
          params
        });
      } else {
        response = await endpoint();
      }

      const data = response.data;
      const now = new Date();

      setState({
        data,
        loading: false,
        error: null,
        lastFetched: now
      });

      // Cache the response
      if (cacheKey) {
        cache.set(data);
      }

      if (showSuccessNotifications) {
        addNotification({
          type: 'success',
          title: 'Request Successful',
          message: 'Data loaded successfully',
          duration: 2000
        });
      }

      onSuccess?.(data);
      return data;

    } catch (error) {
      // Don't handle cancelled requests
      if (axios.isCancel(error)) {
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      // Retry logic
      if (retryCount < retries && !axios.isCancel(error)) {
        retryTimeoutRef.current = setTimeout(() => {
          execute(params, retryCount + 1);
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return null;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      if (showErrorNotifications) {
        addNotification({
          type: 'error',
          title: 'Request Failed',
          message: errorMessage,
          duration: 5000
        });
      }

      onError?.(errorMessage);
      throw error;
    }
  }, [endpoint, cacheKey, retries, retryDelay, showErrorNotifications, showSuccessNotifications, onSuccess, onError, addNotification, cache]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate && !state.data && !cache.get()) {
      execute();
    }
  }, [immediate, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      lastFetched: null
    });
    if (cacheKey) {
      cache.clear();
    }
  }, [cacheKey, cache]);

  return {
    ...state,
    execute,
    reset,
    refetch: () => execute()
  };
}

// Specialized hooks for different API categories
export function useMiningAPI() {
  const statsAPI = useAPI('/api/mining/stats', { 
    immediate: true, 
    cacheKey: 'mining-stats',
    cacheTTL: 30000 // 30 seconds
  });
  
  const workersAPI = useAPI('/api/mining/workers', { 
    immediate: true,
    cacheKey: 'mining-workers',
    cacheTTL: 60000 // 1 minute
  });

  const poolAPI = useAPI('/api/mining/pool', { 
    immediate: true,
    cacheKey: 'pool-stats',
    cacheTTL: 60000
  });

  const earningsAPI = useAPI('/api/mining/earnings', { 
    immediate: true,
    cacheKey: 'earnings',
    cacheTTL: 300000 // 5 minutes
  });

  return {
    stats: statsAPI,
    workers: workersAPI,
    pool: poolAPI,
    earnings: earningsAPI
  };
}

export function useBridgeAPI() {
  const statusAPI = useAPI('/api/bridge/status', {
    immediate: true,
    cacheKey: 'bridge-status',
    cacheTTL: 30000
  });

  const historyAPI = useAPI('/api/bridge/history', {
    immediate: true,
    cacheKey: 'bridge-history',
    cacheTTL: 60000
  });

  const initiateBridge = useCallback(async (params: { from: string; to: string; amount: number }) => {
    const response = await api.post('/api/bridge/initiate', params);
    return response.data;
  }, []);

  return {
    status: statusAPI,
    history: historyAPI,
    initiate: initiateBridge
  };
}

export function useTradingAPI() {
  const [selectedPair, setSelectedPair] = useState('NOCK/USDT');

  const orderBookAPI = useAPI(`/api/trading/orderbook/${selectedPair}`, {
    immediate: true,
    cacheKey: `orderbook-${selectedPair}`,
    cacheTTL: 5000 // 5 seconds
  });

  const historyAPI = useAPI('/api/trading/history', {
    immediate: true,
    cacheKey: 'trading-history',
    cacheTTL: 60000
  });

  const placeOrder = useCallback(async (order: any) => {
    const response = await api.post('/api/trading/order', order);
    // Refresh order book and history after placing order
    orderBookAPI.refetch();
    historyAPI.refetch();
    return response.data;
  }, [orderBookAPI, historyAPI]);

  const cancelOrder = useCallback(async (orderId: string) => {
    const response = await api.delete(`/api/trading/order/${orderId}`);
    // Refresh data after cancelling
    orderBookAPI.refetch();
    historyAPI.refetch();
    return response.data;
  }, [orderBookAPI, historyAPI]);

  useEffect(() => {
    // Refetch order book when pair changes
    orderBookAPI.refetch();
  }, [selectedPair]);

  return {
    orderBook: orderBookAPI,
    history: historyAPI,
    selectedPair,
    setSelectedPair,
    placeOrder,
    cancelOrder
  };
}

export function useAnalyticsAPI() {
  const [timeframe, setTimeframe] = useState('24h');

  const analyticsAPI = useAPI(`/api/analytics/overview?timeframe=${timeframe}`, {
    immediate: true,
    cacheKey: `analytics-${timeframe}`,
    cacheTTL: 300000 // 5 minutes
  });

  const revenueAPI = useAPI('/api/analytics/revenue', {
    immediate: true,
    cacheKey: 'revenue-stats',
    cacheTTL: 300000
  });

  const userStatsAPI = useAPI('/api/analytics/users', {
    immediate: true,
    cacheKey: 'user-stats',
    cacheTTL: 600000 // 10 minutes
  });

  const systemHealthAPI = useAPI('/api/system/health', {
    immediate: true,
    cacheKey: 'system-health',
    cacheTTL: 30000 // 30 seconds
  });

  useEffect(() => {
    // Refetch analytics when timeframe changes
    analyticsAPI.refetch();
  }, [timeframe]);

  return {
    overview: analyticsAPI,
    revenue: revenueAPI,
    users: userStatsAPI,
    systemHealth: systemHealthAPI,
    timeframe,
    setTimeframe
  };
}

// Authentication API
export function useAuthAPI() {
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', credentials);
    const { token, user } = response.data;
    
    localStorage.setItem('nockchain-auth', JSON.stringify({ token, user }));
    return response.data;
  }, []);

  const register = useCallback(async (userData: { email: string; password: string; name: string }) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('nockchain-auth');
      window.location.href = '/login';
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const response = await api.post('/api/auth/refresh');
    const { token } = response.data;
    
    const currentAuth = localStorage.getItem('nockchain-auth');
    if (currentAuth) {
      const auth = JSON.parse(currentAuth);
      localStorage.setItem('nockchain-auth', JSON.stringify({ ...auth, token }));
    }
    
    return response.data;
  }, []);

  return {
    login,
    register,
    logout,
    refreshToken
  };
}

// Batch API requests
export function useBatchAPI() {
  const [requests, setRequests] = useState<Array<{ key: string; endpoint: string; params?: any }>>([]);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRequest = useCallback((key: string, endpoint: string, params?: any) => {
    setRequests(prev => [...prev, { key, endpoint, params }]);
  }, []);

  const execute = useCallback(async () => {
    if (requests.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const responses = await Promise.allSettled(
        requests.map(req => api.get(req.endpoint, { params: req.params }))
      );

      const newResults: Record<string, any> = {};
      
      responses.forEach((response, index) => {
        const request = requests[index];
        if (response.status === 'fulfilled') {
          newResults[request.key] = response.value.data;
        } else {
          newResults[request.key] = { error: response.reason.message };
        }
      });

      setResults(newResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch request failed');
    } finally {
      setLoading(false);
    }
  }, [requests]);

  const reset = useCallback(() => {
    setRequests([]);
    setResults({});
    setError(null);
  }, []);

  return {
    addRequest,
    execute,
    reset,
    results,
    loading,
    error
  };
}

export { api };
export default api;