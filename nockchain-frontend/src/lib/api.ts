import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nockchain-auth');
    if (token) {
      try {
        const { token: authToken } = JSON.parse(token);
        config.headers.Authorization = `Bearer ${authToken}`;
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nockchain-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  mining: {
    stats: '/api/mining/stats',
    workers: '/api/mining/workers',
    pool: '/api/mining/pool',
    earnings: '/api/mining/earnings',
  },
  bridge: {
    convert: '/api/bridge/convert',
    history: '/api/bridge/history',
    fees: '/api/bridge/fees',
    status: '/api/bridge/status',
  },
  trading: {
    orderbook: '/api/trading/orderbook',
    trades: '/api/trading/trades',
    orders: '/api/trading/orders',
    portfolio: '/api/trading/portfolio',
  },
  analytics: {
    revenue: '/api/analytics/revenue',
    performance: '/api/analytics/performance',
    users: '/api/analytics/users',
    overview: '/api/analytics/overview',
  },
};

// API functions
export const authAPI = {
  login: (credentials: { email?: string; password?: string; walletAddress?: string }) =>
    api.post(endpoints.auth.login, credentials),
  register: (userData: unknown) => api.post(endpoints.auth.register, userData),
  refresh: (data: { refreshToken: string }) => api.post(endpoints.auth.refresh, data),
  logout: () => api.post(endpoints.auth.logout),
};

export const miningAPI = {
  getStats: () => api.get(endpoints.mining.stats),
  getWorkers: () => api.get(endpoints.mining.workers),
  getPoolInfo: () => api.get(endpoints.mining.pool),
  getEarnings: () => api.get(endpoints.mining.earnings),
};

export const bridgeAPI = {
  convert: (data: unknown) => api.post(endpoints.bridge.convert, data),
  getHistory: () => api.get(endpoints.bridge.history),
  getFees: () => api.get(endpoints.bridge.fees),
  getStatus: () => api.get(endpoints.bridge.status),
};

export const tradingAPI = {
  getOrderbook: (pair: string) => api.get(`${endpoints.trading.orderbook}?pair=${pair}`),
  getTrades: (pair: string) => api.get(`${endpoints.trading.trades}?pair=${pair}`),
  placeOrder: (order: unknown) => api.post(endpoints.trading.orders, order),
  getPortfolio: () => api.get(endpoints.trading.portfolio),
};

export const analyticsAPI = {
  getRevenue: (timeframe: string) => api.get(`${endpoints.analytics.revenue}?timeframe=${timeframe}`),
  getPerformance: () => api.get(endpoints.analytics.performance),
  getUsers: (timeframe: string) => api.get(`${endpoints.analytics.users}?timeframe=${timeframe}`),
  getOverview: () => api.get(endpoints.analytics.overview),
};