// Redis client for cross-chain state coordination

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
    this.keyPrefix = this.config.keyPrefix || 'bridge-sync:';
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

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key);
    const encryptedValue = this.encrypt(value);
    
    if (ttl) {
      await this.client.setEx(fullKey, ttl, encryptedValue);
    } else {
      await this.client.set(fullKey, encryptedValue);
    }
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
    
    return fullKeys.map(key => key.replace(this.keyPrefix, ''));
  }

  async recordMetrics(component: string, metrics: Record<string, number>): Promise<void> {
    const key = `metrics:${component}:${Date.now()}`;
    await this.set(key, JSON.stringify(metrics), 86400); // 24 hours TTL
  }

  async getRecentMetrics(component: string, hours: number = 1): Promise<Array<{ timestamp: number; metrics: Record<string, number> }>> {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const pattern = `metrics:${component}:*`;
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

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger?.error('Redis ping failed', error);
      return false;
    }
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private encrypt(data: string): string {
    const hmac = createHmac('sha256', this.encryptionKey);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    const encoded = Buffer.from(data).toString('base64');
    return `${signature}:${encoded}`;
  }

  private decrypt(encryptedData: string): string {
    const [signature, encoded] = encryptedData.split(':');
    if (!signature || !encoded) {
      throw new Error('Invalid encrypted data format');
    }
    
    const data = Buffer.from(encoded, 'base64').toString('utf8');
    
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