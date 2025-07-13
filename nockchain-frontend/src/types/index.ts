// Global type definitions for Nockchain Frontend

export interface User {
  id: string;
  email?: string;
  walletAddress?: string;
  role: 'miner' | 'enterprise' | 'admin';
  createdAt: string;
  isVerified?: boolean;
  profile?: {
    name?: string;
    avatar?: string;
    preferences?: Record<string, unknown>;
  };
}

export interface MiningStats {
  currentHashrate: number;
  averageHashrate: number;
  efficiency: number;
  totalShares: number;
  validShares: number;
  invalidShares: number;
  pendingBalance: number;
  paidBalance: number;
  workersOnline: number;
  poolHashrate: number;
  networkHashrate: number;
  difficulty: number;
  blockHeight: number;
  lastBlockFound: string;
  estimatedEarnings24h: number;
}

export interface Worker {
  id: string;
  name: string;
  hashrate: number;
  temperature: number;
  status: 'online' | 'offline' | 'warning';
  lastSeen: string;
}

export interface BridgeTransaction {
  id: string;
  from: 'NOCK' | 'wNOCK';
  to: 'NOCK' | 'wNOCK';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  txHash?: string;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  status: 'filled' | 'partial' | 'pending' | 'cancelled';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}