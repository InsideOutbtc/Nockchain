// Mining Pool API Integration - Direct integration with existing mining pool infrastructure

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface MiningPoolAPIConfig {
  // Mining pool connection
  miningPoolEndpoint: string;
  apiKey: string;
  secretKey: string;
  
  // Database connection
  databaseUrl: string;
  redisUrl: string;
  
  // Integration settings
  enableRealTimeSync: boolean;
  syncInterval: number; // seconds
  enableWebhooks: boolean;
  webhookSecret: string;
  
  // Performance settings
  maxConcurrentRequests: number;
  requestTimeout: number; // milliseconds
  retryAttempts: number;
  enableCaching: boolean;
  cacheExpiry: number; // seconds
}

export interface MiningPoolUser {
  id: string;
  username: string;
  email: string;
  walletAddress: string;
  solanaWallet?: string;
  
  // Mining statistics
  totalHashrate: number;
  averageHashrate: number;
  activeWorkers: number;
  totalShares: number;
  validShares: number;
  invalidShares: number;
  
  // Financial data
  totalEarnings: BN;
  paidAmount: BN;
  pendingBalance: BN;
  unconfirmedBalance: BN;
  lastPayoutAt?: number;
  
  // Pool statistics
  poolContribution: number; // percentage
  efficiency: number; // percentage
  luck: number; // percentage
  
  // Account status
  isActive: boolean;
  joinedAt: number;
  lastSeenAt: number;
  tier: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  
  // Preferences
  payoutThreshold: BN;
  payoutAddress: string;
  enableAutoPayout: boolean;
  preferredChain: 'nockchain' | 'solana';
}

export interface MiningWorker {
  id: string;
  userId: string;
  name: string;
  
  // Hardware info
  hardwareType: string;
  hashrate: number;
  temperature: number;
  powerConsumption: number;
  
  // Status
  isOnline: boolean;
  lastSeen: number;
  connectionCount: number;
  
  // Performance
  acceptedShares: number;
  rejectedShares: number;
  efficiency: number;
  uptime: number;
  
  // Configuration
  difficulty: number;
  stratumUrl: string;
  version: string;
}

export interface PoolStatistics {
  // Network statistics
  networkHashrate: number;
  networkDifficulty: number;
  blockHeight: number;
  lastBlockTime: number;
  
  // Pool statistics
  poolHashrate: number;
  activeMiners: number;
  totalMiners: number;
  shareRate: number;
  
  // Block statistics
  blocksFound24h: number;
  blocksFoundTotal: number;
  lastBlockFound?: number;
  currentRound: {
    shares: number;
    startTime: number;
    estimatedTime: number;
  };
  
  // Financial statistics
  totalRewards: BN;
  totalFees: BN;
  pendingPayouts: BN;
  
  // Performance metrics
  poolLuck24h: number;
  poolEfficiency: number;
  averageBlockTime: number;
  
  // System health
  systemLoad: number;
  connectionCount: number;
  responseTime: number;
}

export interface PayoutRecord {
  id: string;
  userId: string;
  amount: BN;
  fee: BN;
  transactionHash: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chain: 'nockchain' | 'solana';
  createdAt: number;
  processedAt?: number;
  confirmations: number;
  blockHeight?: number;
}

export interface ShareSubmission {
  userId: string;
  workerId: string;
  jobId: string;
  nonce: string;
  result: string;
  difficulty: number;
  timestamp: number;
  isValid: boolean;
  blockHeight: number;
}

export interface BlockFound {
  id: string;
  height: number;
  hash: string;
  timestamp: number;
  difficulty: number;
  reward: BN;
  finderId: string;
  finderName: string;
  confirmations: number;
  isOrphaned: boolean;
  effort: number; // percentage
  luck: number; // percentage
  roundShares: number;
  roundTime: number;
}

export interface MiningPoolEvent {
  type: 'user_connected' | 'user_disconnected' | 'share_submitted' | 'block_found' | 'payout_processed' | 'worker_status';
  timestamp: number;
  userId?: string;
  workerId?: string;
  data: Record<string, any>;
}

export class MiningPoolAPI {
  private config: MiningPoolAPIConfig;
  private logger: Logger;
  private baseUrl: string;
  private headers: Record<string, string>;
  private eventHandlers: Map<string, Function[]> = new Map();
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private rateLimiter: Map<string, number[]> = new Map();

  constructor(config: MiningPoolAPIConfig) {
    this.config = config;
    this.logger = new Logger('MiningPoolAPI');
    this.baseUrl = config.miningPoolEndpoint.replace(/\/$/, '');
    this.headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-API-Secret': config.secretKey,
      'Content-Type': 'application/json',
      'User-Agent': 'NOCK-Bridge-Integration/1.0'
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing mining pool API connection');
    
    // Test connection
    await this.testConnection();
    
    // Start event polling if webhooks are not enabled
    if (!this.config.enableWebhooks) {
      this.startEventPolling();
    }
    
    // Clear expired cache entries periodically
    setInterval(() => this.cleanupCache(), 60000);
    
    // Reset rate limiters periodically
    setInterval(() => this.resetRateLimiters(), 60000);
    
    this.logger.info('Mining pool API initialized successfully');
  }

  // User Management
  async getUser(userId: string): Promise<MiningPoolUser | null> {
    const cacheKey = `user:${userId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.makeRequest(`/api/users/${userId}`);
      const user = this.mapUserResponse(response);
      
      this.setCached(cacheKey, user, 300); // 5 minutes cache
      return user;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async getAllUsers(limit: number = 100, offset: number = 0): Promise<MiningPoolUser[]> {
    const cacheKey = `users:${limit}:${offset}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest(`/api/users?limit=${limit}&offset=${offset}`);
    const users = response.users.map((u: any) => this.mapUserResponse(u));
    
    this.setCached(cacheKey, users, 60); // 1 minute cache
    return users;
  }

  async updateUserPreferences(userId: string, preferences: {
    payoutThreshold?: BN;
    payoutAddress?: string;
    enableAutoPayout?: boolean;
    preferredChain?: 'nockchain' | 'solana';
  }): Promise<void> {
    const payload = {
      payout_threshold: preferences.payoutThreshold?.toString(),
      payout_address: preferences.payoutAddress,
      enable_auto_payout: preferences.enableAutoPayout,
      preferred_chain: preferences.preferredChain
    };

    await this.makeRequest(`/api/users/${userId}/preferences`, 'PUT', payload);
    
    // Invalidate cache
    this.invalidateCache(`user:${userId}`);
  }

  // Worker Management
  async getUserWorkers(userId: string): Promise<MiningWorker[]> {
    const cacheKey = `workers:${userId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest(`/api/users/${userId}/workers`);
    const workers = response.workers.map((w: any) => this.mapWorkerResponse(w));
    
    this.setCached(cacheKey, workers, 60); // 1 minute cache
    return workers;
  }

  async getWorker(workerId: string): Promise<MiningWorker | null> {
    try {
      const response = await this.makeRequest(`/api/workers/${workerId}`);
      return this.mapWorkerResponse(response);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async getWorkerStats(workerId: string, timeframe: 'hour' | 'day' | 'week'): Promise<{
    hashrate: { timestamp: number; value: number }[];
    shares: { timestamp: number; accepted: number; rejected: number }[];
    efficiency: { timestamp: number; value: number }[];
  }> {
    const response = await this.makeRequest(`/api/workers/${workerId}/stats?timeframe=${timeframe}`);
    return response;
  }

  // Pool Statistics
  async getPoolStats(): Promise<PoolStatistics> {
    const cacheKey = 'pool:stats';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest('/api/pool/stats');
    const stats = this.mapPoolStatsResponse(response);
    
    this.setCached(cacheKey, stats, 30); // 30 seconds cache
    return stats;
  }

  async getPoolHashrateHistory(timeframe: 'hour' | 'day' | 'week'): Promise<{
    timestamp: number;
    hashrate: number;
    miners: number;
  }[]> {
    const cacheKey = `pool:hashrate:${timeframe}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest(`/api/pool/hashrate?timeframe=${timeframe}`);
    
    this.setCached(cacheKey, response.data, 300); // 5 minutes cache
    return response.data;
  }

  // Payout Management
  async getUserPayouts(userId: string, limit: number = 50): Promise<PayoutRecord[]> {
    const response = await this.makeRequest(`/api/users/${userId}/payouts?limit=${limit}`);
    return response.payouts.map((p: any) => this.mapPayoutResponse(p));
  }

  async createPayout(userId: string, amount: BN, chain: 'nockchain' | 'solana'): Promise<string> {
    const payload = {
      user_id: userId,
      amount: amount.toString(),
      chain,
      auto_bridge: chain === 'solana'
    };

    const response = await this.makeRequest('/api/payouts', 'POST', payload);
    return response.payout_id;
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutRecord | null> {
    try {
      const response = await this.makeRequest(`/api/payouts/${payoutId}`);
      return this.mapPayoutResponse(response);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async processPendingPayouts(): Promise<string[]> {
    const response = await this.makeRequest('/api/payouts/process', 'POST');
    return response.processed_payouts;
  }

  // Share and Block Management
  async getRecentShares(userId?: string, limit: number = 100): Promise<ShareSubmission[]> {
    const url = userId 
      ? `/api/shares?user_id=${userId}&limit=${limit}`
      : `/api/shares?limit=${limit}`;
    
    const response = await this.makeRequest(url);
    return response.shares.map((s: any) => this.mapShareResponse(s));
  }

  async getBlocksFound(limit: number = 50): Promise<BlockFound[]> {
    const cacheKey = `blocks:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest(`/api/blocks?limit=${limit}`);
    const blocks = response.blocks.map((b: any) => this.mapBlockResponse(b));
    
    this.setCached(cacheKey, blocks, 300); // 5 minutes cache
    return blocks;
  }

  async getBlockDetails(blockHash: string): Promise<BlockFound | null> {
    try {
      const response = await this.makeRequest(`/api/blocks/${blockHash}`);
      return this.mapBlockResponse(response);
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  // Event Management
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(`Error in event handler for ${event}`, error);
        }
      });
    }
  }

  // Analytics and Reporting
  async getUserAnalytics(userId: string, timeframe: 'day' | 'week' | 'month'): Promise<{
    totalShares: number;
    validShares: number;
    invalidShares: number;
    totalEarnings: BN;
    averageHashrate: number;
    efficiency: number;
    uptime: number;
    payoutsReceived: number;
    blocksFound: number;
  }> {
    const response = await this.makeRequest(`/api/users/${userId}/analytics?timeframe=${timeframe}`);
    return {
      totalShares: response.total_shares,
      validShares: response.valid_shares,
      invalidShares: response.invalid_shares,
      totalEarnings: new BN(response.total_earnings),
      averageHashrate: response.average_hashrate,
      efficiency: response.efficiency,
      uptime: response.uptime,
      payoutsReceived: response.payouts_received,
      blocksFound: response.blocks_found
    };
  }

  async getPoolAnalytics(timeframe: 'day' | 'week' | 'month'): Promise<{
    totalHashrate: number;
    totalMiners: number;
    totalShares: number;
    blocksFound: number;
    totalRewards: BN;
    averageBlockTime: number;
    poolLuck: number;
    poolEfficiency: number;
  }> {
    const cacheKey = `analytics:pool:${timeframe}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const response = await this.makeRequest(`/api/pool/analytics?timeframe=${timeframe}`);
    const analytics = {
      totalHashrate: response.total_hashrate,
      totalMiners: response.total_miners,
      totalShares: response.total_shares,
      blocksFound: response.blocks_found,
      totalRewards: new BN(response.total_rewards),
      averageBlockTime: response.average_block_time,
      poolLuck: response.pool_luck,
      poolEfficiency: response.pool_efficiency
    };
    
    this.setCached(cacheKey, analytics, 300); // 5 minutes cache
    return analytics;
  }

  // Health and Status
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    connections: number;
    responseTime: number;
    errorRate: number;
    lastUpdate: number;
  }> {
    const response = await this.makeRequest('/api/system/health');
    return response;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/api/ping');
      this.logger.info('Mining pool API connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Mining pool API connection test failed', error);
      throw new Error('Failed to connect to mining pool API');
    }
  }

  // Private helper methods
  private async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    body?: any
  ): Promise<any> {
    // Rate limiting check
    if (!this.checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      timeout: this.config.requestTimeout
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status;
          throw error;
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          this.logger.warn(`Request failed, retrying in ${delay}ms`, { attempt, error: error.message });
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`Request failed after ${this.config.retryAttempts} attempts`, lastError);
    throw lastError;
  }

  private checkRateLimit(endpoint: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxRequests = this.config.maxConcurrentRequests;

    if (!this.rateLimiter.has(endpoint)) {
      this.rateLimiter.set(endpoint, []);
    }

    const requests = this.rateLimiter.get(endpoint)!;
    
    // Remove requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.rateLimiter.set(endpoint, validRequests);
    return true;
  }

  private resetRateLimiters(): void {
    this.rateLimiter.clear();
  }

  private getCached(key: string): any | null {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCached(key: string, data: any, ttlSeconds: number): void {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  private invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  private startEventPolling(): void {
    setInterval(async () => {
      try {
        await this.pollEvents();
      } catch (error) {
        this.logger.error('Event polling failed', error);
      }
    }, this.config.syncInterval * 1000);
  }

  private async pollEvents(): Promise<void> {
    const response = await this.makeRequest('/api/events/recent');
    const events: MiningPoolEvent[] = response.events;

    events.forEach(event => {
      this.emit(event.type, event);
    });
  }

  // Response mapping methods
  private mapUserResponse(data: any): MiningPoolUser {
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      walletAddress: data.wallet_address,
      solanaWallet: data.solana_wallet,
      totalHashrate: data.total_hashrate,
      averageHashrate: data.average_hashrate,
      activeWorkers: data.active_workers,
      totalShares: data.total_shares,
      validShares: data.valid_shares,
      invalidShares: data.invalid_shares,
      totalEarnings: new BN(data.total_earnings),
      paidAmount: new BN(data.paid_amount),
      pendingBalance: new BN(data.pending_balance),
      unconfirmedBalance: new BN(data.unconfirmed_balance),
      lastPayoutAt: data.last_payout_at,
      poolContribution: data.pool_contribution,
      efficiency: data.efficiency,
      luck: data.luck,
      isActive: data.is_active,
      joinedAt: data.joined_at,
      lastSeenAt: data.last_seen_at,
      tier: data.tier,
      payoutThreshold: new BN(data.payout_threshold),
      payoutAddress: data.payout_address,
      enableAutoPayout: data.enable_auto_payout,
      preferredChain: data.preferred_chain
    };
  }

  private mapWorkerResponse(data: any): MiningWorker {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      hardwareType: data.hardware_type,
      hashrate: data.hashrate,
      temperature: data.temperature,
      powerConsumption: data.power_consumption,
      isOnline: data.is_online,
      lastSeen: data.last_seen,
      connectionCount: data.connection_count,
      acceptedShares: data.accepted_shares,
      rejectedShares: data.rejected_shares,
      efficiency: data.efficiency,
      uptime: data.uptime,
      difficulty: data.difficulty,
      stratumUrl: data.stratum_url,
      version: data.version
    };
  }

  private mapPoolStatsResponse(data: any): PoolStatistics {
    return {
      networkHashrate: data.network_hashrate,
      networkDifficulty: data.network_difficulty,
      blockHeight: data.block_height,
      lastBlockTime: data.last_block_time,
      poolHashrate: data.pool_hashrate,
      activeMiners: data.active_miners,
      totalMiners: data.total_miners,
      shareRate: data.share_rate,
      blocksFound24h: data.blocks_found_24h,
      blocksFoundTotal: data.blocks_found_total,
      lastBlockFound: data.last_block_found,
      currentRound: {
        shares: data.current_round.shares,
        startTime: data.current_round.start_time,
        estimatedTime: data.current_round.estimated_time
      },
      totalRewards: new BN(data.total_rewards),
      totalFees: new BN(data.total_fees),
      pendingPayouts: new BN(data.pending_payouts),
      poolLuck24h: data.pool_luck_24h,
      poolEfficiency: data.pool_efficiency,
      averageBlockTime: data.average_block_time,
      systemLoad: data.system_load,
      connectionCount: data.connection_count,
      responseTime: data.response_time
    };
  }

  private mapPayoutResponse(data: any): PayoutRecord {
    return {
      id: data.id,
      userId: data.user_id,
      amount: new BN(data.amount),
      fee: new BN(data.fee),
      transactionHash: data.transaction_hash,
      status: data.status,
      chain: data.chain,
      createdAt: data.created_at,
      processedAt: data.processed_at,
      confirmations: data.confirmations,
      blockHeight: data.block_height
    };
  }

  private mapShareResponse(data: any): ShareSubmission {
    return {
      userId: data.user_id,
      workerId: data.worker_id,
      jobId: data.job_id,
      nonce: data.nonce,
      result: data.result,
      difficulty: data.difficulty,
      timestamp: data.timestamp,
      isValid: data.is_valid,
      blockHeight: data.block_height
    };
  }

  private mapBlockResponse(data: any): BlockFound {
    return {
      id: data.id,
      height: data.height,
      hash: data.hash,
      timestamp: data.timestamp,
      difficulty: data.difficulty,
      reward: new BN(data.reward),
      finderId: data.finder_id,
      finderName: data.finder_name,
      confirmations: data.confirmations,
      isOrphaned: data.is_orphaned,
      effort: data.effort,
      luck: data.luck,
      roundShares: data.round_shares,
      roundTime: data.round_time
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}