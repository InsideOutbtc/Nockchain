// Redis client for validator network coordination and state management

import { createClient, RedisClientType } from 'redis';
import { createHash, createHmac } from 'crypto';
import { Logger } from './logger';

export interface RedisConfig {
  url: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryAttempts?: number;
  retryDelay?: number;
  commandTimeout?: number;
}

export interface NetworkState {
  validatorId: string;
  timestamp: number;
  blockHeight: bigint;
  consensusRound: number;
  activeValidators: number;
  networkHealth: number;
  lastSyncTime: number;
}

export interface ConsensusMessage {
  round: number;
  validatorId: string;
  timestamp: number;
  proposal?: any;
  vote?: 'approve' | 'reject';
  signature: string;
}

export class RedisClient {
  private client: RedisClientType;
  private config: RedisConfig;
  private logger?: Logger;
  private isConnected = false;
  private keyPrefix: string;
  private encryptionKey: string;

  constructor(config: RedisConfig | string, logger?: Logger) {
    if (typeof config === 'string') {
      this.config = { url: config };
    } else {
      this.config = config;
    }
    
    this.logger = logger;
    this.keyPrefix = this.config.keyPrefix || 'nock-bridge:';
    this.encryptionKey = process.env.REDIS_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    this.client = createClient({
      url: this.config.url,
      password: this.config.password,
      database: this.config.db || 0,
      socket: {
        connectTimeout: this.config.commandTimeout || 5000,
        commandTimeout: this.config.commandTimeout || 5000,
        reconnectStrategy: (retries) => {
          if (retries > (this.config.retryAttempts || 10)) {
            return new Error('Redis max retry attempts exceeded');
          }
          return Math.min(retries * (this.config.retryDelay || 100), 3000);
        },
      },
    });

    this.setupEventHandlers();
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.isConnected = true;
      this.logger?.info('Redis client connected successfully');
    } catch (error) {
      this.logger?.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.disconnect();
      this.isConnected = false;
      this.logger?.info('Redis client disconnected');
    } catch (error) {
      this.logger?.error('Error disconnecting from Redis', error);
    }
  }

  // Basic Redis operations with encryption
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = this.encrypt(value);
    
    if (ttl) {
      await this.client.setEx(fullKey, ttl, encryptedValue);
    } else {
      await this.client.set(fullKey, encryptedValue);
    }
  }

  async setEx(key: string, ttl: number, value: string): Promise<void> {
    await this.set(key, value, ttl);
  }

  async get(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = await this.client.get(fullKey);
    
    if (!encryptedValue) return null;
    
    try {
      return this.decrypt(encryptedValue);
    } catch (error) {
      this.logger?.error(`Failed to decrypt value for key ${key}`, error);
      return null;
    }
  }

  async del(key: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    return await this.client.del(fullKey);
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return (await this.client.exists(fullKey)) === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    const fullPattern = this.getFullKey(pattern);
    const fullKeys = await this.client.keys(fullPattern);
    
    // Remove prefix from returned keys
    return fullKeys.map(key => key.replace(this.keyPrefix, ''));
  }

  async incr(key: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    return await this.client.incr(fullKey);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return await this.client.expire(fullKey, seconds);
  }

  // Hash operations for complex data
  async hSet(key: string, field: string, value: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = this.encrypt(value);
    return await this.client.hSet(fullKey, field, encryptedValue);
  }

  async hGet(key: string, field: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = await this.client.hGet(fullKey, field);
    
    if (!encryptedValue) return null;
    
    try {
      return this.decrypt(encryptedValue);
    } catch (error) {
      this.logger?.error(`Failed to decrypt hash value for ${key}.${field}`, error);
      return null;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    const fullKey = this.getFullKey(key);
    const encryptedHash = await this.client.hGetAll(fullKey);
    
    const decryptedHash: Record<string, string> = {};
    
    for (const [field, encryptedValue] of Object.entries(encryptedHash)) {
      try {
        decryptedHash[field] = this.decrypt(encryptedValue);
      } catch (error) {
        this.logger?.error(`Failed to decrypt hash field ${key}.${field}`, error);
      }
    }
    
    return decryptedHash;
  }

  async hDel(key: string, field: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    return await this.client.hDel(fullKey, field);
  }

  // Set operations for validator management
  async sAdd(key: string, member: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    const encryptedMember = this.encrypt(member);
    return await this.client.sAdd(fullKey, encryptedMember);
  }

  async sRem(key: string, member: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    const encryptedMember = this.encrypt(member);
    return await this.client.sRem(fullKey, encryptedMember);
  }

  async sMembers(key: string): Promise<string[]> {
    const fullKey = this.getFullKey(key);
    const encryptedMembers = await this.client.sMembers(fullKey);
    
    const decryptedMembers: string[] = [];
    for (const encryptedMember of encryptedMembers) {
      try {
        decryptedMembers.push(this.decrypt(encryptedMember));
      } catch (error) {
        this.logger?.error(`Failed to decrypt set member in ${key}`, error);
      }
    }
    
    return decryptedMembers;
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const encryptedMember = this.encrypt(member);
    return await this.client.sIsMember(fullKey, encryptedMember);
  }

  // List operations for transaction queues
  async lPush(key: string, value: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = this.encrypt(value);
    return await this.client.lPush(fullKey, encryptedValue);
  }

  async rPop(key: string): Promise<string | null> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = await this.client.rPop(fullKey);
    
    if (!encryptedValue) return null;
    
    try {
      return this.decrypt(encryptedValue);
    } catch (error) {
      this.logger?.error(`Failed to decrypt list value from ${key}`, error);
      return null;
    }
  }

  async lLen(key: string): Promise<number> {
    const fullKey = this.getFullKey(key);
    return await this.client.lLen(fullKey);
  }

  // Bridge-specific operations
  async storeNetworkState(state: NetworkState): Promise<void> {
    const key = `network:state:${state.validatorId}`;
    await this.set(key, JSON.stringify(state), 300); // 5 minutes TTL
  }

  async getNetworkState(validatorId: string): Promise<NetworkState | null> {
    const key = `network:state:${validatorId}`;
    const stateData = await this.get(key);
    
    if (!stateData) return null;
    
    try {
      return JSON.parse(stateData);
    } catch (error) {
      this.logger?.error(`Failed to parse network state for ${validatorId}`, error);
      return null;
    }
  }

  async getAllNetworkStates(): Promise<NetworkState[]> {
    const keys = await this.keys('network:state:*');
    const states: NetworkState[] = [];
    
    for (const key of keys) {
      const stateData = await this.get(key);
      if (stateData) {
        try {
          states.push(JSON.parse(stateData));
        } catch (error) {
          this.logger?.error(`Failed to parse network state from ${key}`, error);
        }
      }
    }
    
    return states;
  }

  async storeConsensusMessage(message: ConsensusMessage): Promise<void> {
    const key = `consensus:${message.round}:${message.validatorId}`;
    await this.set(key, JSON.stringify(message), 3600); // 1 hour TTL
  }

  async getConsensusMessages(round: number): Promise<ConsensusMessage[]> {
    const keys = await this.keys(`consensus:${round}:*`);
    const messages: ConsensusMessage[] = [];
    
    for (const key of keys) {
      const messageData = await this.get(key);
      if (messageData) {
        try {
          messages.push(JSON.parse(messageData));
        } catch (error) {
          this.logger?.error(`Failed to parse consensus message from ${key}`, error);
        }
      }
    }
    
    return messages;
  }

  // Transaction processing queue
  async enqueuePendingTransaction(txId: string, txData: any): Promise<void> {
    await this.lPush('pending_transactions', JSON.stringify({ txId, txData, timestamp: Date.now() }));
  }

  async dequeuePendingTransaction(): Promise<{ txId: string; txData: any; timestamp: number } | null> {
    const data = await this.rPop('pending_transactions');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger?.error('Failed to parse pending transaction data', error);
      return null;
    }
  }

  async getPendingTransactionCount(): Promise<number> {
    return await this.lLen('pending_transactions');
  }

  // Validator registration and discovery
  async registerValidator(validatorId: string, validatorData: any): Promise<void> {
    await this.sAdd('active_validators', validatorId);
    await this.set(`validator:${validatorId}`, JSON.stringify(validatorData), 300);
  }

  async unregisterValidator(validatorId: string): Promise<void> {
    await this.sRem('active_validators', validatorId);
    await this.del(`validator:${validatorId}`);
  }

  async getActiveValidators(): Promise<string[]> {
    return await this.sMembers('active_validators');
  }

  async getValidatorInfo(validatorId: string): Promise<any | null> {
    const data = await this.get(`validator:${validatorId}`);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger?.error(`Failed to parse validator info for ${validatorId}`, error);
      return null;
    }
  }

  // Emergency and security operations
  async triggerEmergencyMode(reason: string, metadata?: any): Promise<void> {
    const emergencyData = {
      timestamp: Date.now(),
      reason,
      metadata,
    };
    
    await this.set('emergency_mode', JSON.stringify(emergencyData));
    await this.set('bridge_paused', 'true');
    
    this.logger?.emergency('Emergency mode triggered via Redis', emergencyData);
  }

  async isEmergencyMode(): Promise<boolean> {
    return await this.exists('emergency_mode');
  }

  async clearEmergencyMode(): Promise<void> {
    await this.del('emergency_mode');
    await this.del('bridge_paused');
    this.logger?.info('Emergency mode cleared');
  }

  // Performance monitoring
  async recordMetrics(validatorId: string, metrics: Record<string, number>): Promise<void> {
    const key = `metrics:${validatorId}:${Date.now()}`;
    await this.set(key, JSON.stringify(metrics), 86400); // 24 hours TTL
  }

  async getRecentMetrics(validatorId: string, hours: number = 1): Promise<Array<{ timestamp: number; metrics: Record<string, number> }>> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const pattern = `metrics:${validatorId}:*`;
    const keys = await this.keys(pattern);
    
    const recentMetrics: Array<{ timestamp: number; metrics: Record<string, number> }> = [];
    
    for (const key of keys) {
      const timestamp = parseInt(key.split(':').pop() || '0');
      if (timestamp >= cutoffTime) {
        const metricsData = await this.get(key);
        if (metricsData) {
          try {
            recentMetrics.push({
              timestamp,
              metrics: JSON.parse(metricsData),
            });
          } catch (error) {
            this.logger?.error(`Failed to parse metrics from ${key}`, error);
          }
        }
      }
    }
    
    return recentMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger?.error('Redis ping failed', error);
      return false;
    }
  }

  async getInfo(): Promise<string> {
    return await this.client.info();
  }

  // Cleanup operations
  async cleanup(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    let deletedCount = 0;
    
    for (const key of keys) {
      deletedCount += await this.del(key);
    }
    
    return deletedCount;
  }

  // Private helper methods
  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private encrypt(data: string): string {
    const hmac = createHmac('sha256', this.encryptionKey);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    // Simple encryption - in production, use proper encryption
    const encoded = Buffer.from(data).toString('base64');
    return `${signature}:${encoded}`;
  }

  private decrypt(encryptedData: string): string {
    const [signature, encoded] = encryptedData.split(':');
    if (!signature || !encoded) {
      throw new Error('Invalid encrypted data format');
    }
    
    const data = Buffer.from(encoded, 'base64').toString('utf8');
    
    // Verify signature
    const hmac = createHmac('sha256', this.encryptionKey);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      throw new Error('Data integrity check failed');
    }
    
    return data;
  }

  private setupEventHandlers(): void {
    this.client.on('error', (error) => {
      this.logger?.error('Redis client error', error);
    });

    this.client.on('connect', () => {
      this.logger?.info('Redis client connected');
    });

    this.client.on('reconnecting', () => {
      this.logger?.warn('Redis client reconnecting');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      this.logger?.info('Redis client connection ended');
    });
  }
}

export default RedisClient;