// High-performance database layer for cross-chain state persistence

import { Level } from 'level';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';
import { ChainState, TransactionState } from '../core/state-sync';
import { MonitoringAlert, ChainMetrics, BridgeMetrics } from '../monitoring/real-time';

export interface DatabaseConfig {
  dataPath: string;
  maxCacheSize: number; // MB
  compressionEnabled: boolean;
  backupInterval: number; // seconds
  retentionPeriod: number; // days
}

export interface StateSnapshot {
  id: string;
  timestamp: number;
  chains: Record<string, ChainState>;
  transactions: TransactionState[];
  metrics: {
    chains: ChainMetrics[];
    bridge?: BridgeMetrics;
  };
  checksum: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

export class StateDatabase {
  private config: DatabaseConfig;
  private logger: Logger;
  private db: Level<string, any>;
  private isOpen = false;
  
  // Sublevel databases for different data types
  private chainStatesDB: Level<string, ChainState>;
  private transactionsDB: Level<string, TransactionState>;
  private alertsDB: Level<string, MonitoringAlert>;
  private metricsDB: Level<string, any>;
  private snapshotsDB: Level<string, StateSnapshot>;
  
  // Cache for frequently accessed data
  private cache: Map<string, { data: any; timestamp: number; hits: number }> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
  };
  
  // Backup and maintenance
  private backupInterval?: NodeJS.Timeout;
  private maintenanceInterval?: NodeJS.Timeout;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize main database
    this.db = new Level(config.dataPath, {
      valueEncoding: 'json',
      compression: config.compressionEnabled,
    });
    
    // Initialize sublevel databases
    this.chainStatesDB = this.db.sublevel('chain-states', { valueEncoding: 'json' });
    this.transactionsDB = this.db.sublevel('transactions', { valueEncoding: 'json' });
    this.alertsDB = this.db.sublevel('alerts', { valueEncoding: 'json' });
    this.metricsDB = this.db.sublevel('metrics', { valueEncoding: 'json' });
    this.snapshotsDB = this.db.sublevel('snapshots', { valueEncoding: 'json' });
  }

  async open(): Promise<void> {
    if (this.isOpen) {
      this.logger.warn('Database already open');
      return;
    }

    try {
      await this.db.open();
      this.isOpen = true;
      
      this.logger.info('Database opened successfully', {
        path: this.config.dataPath,
        compression: this.config.compressionEnabled,
      });
      
      // Start background processes
      this.startBackupProcess();
      this.startMaintenanceProcess();
      
    } catch (error) {
      this.logger.error('Failed to open database', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.isOpen) return;

    try {
      // Stop background processes
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
      }
      
      if (this.maintenanceInterval) {
        clearInterval(this.maintenanceInterval);
      }
      
      // Create final snapshot
      await this.createSnapshot('shutdown');
      
      // Close database
      await this.db.close();
      this.isOpen = false;
      
      this.logger.info('Database closed successfully');
      
    } catch (error) {
      this.logger.error('Error closing database', error);
      throw error;
    }
  }

  // Chain state operations
  async saveChainState(chain: string, state: ChainState): Promise<void> {
    try {
      const key = `${chain}:current`;
      const historicalKey = `${chain}:${state.timestamp}`;
      
      // Save current state
      await this.chainStatesDB.put(key, state);
      
      // Save historical state
      await this.chainStatesDB.put(historicalKey, state);
      
      // Update cache
      this.updateCache(key, state);
      
      this.logger.debug(`Saved chain state for ${chain}`, {
        blockHeight: state.blockHeight.toString(),
        timestamp: state.timestamp,
      });
      
    } catch (error) {
      this.logger.error(`Failed to save chain state for ${chain}`, error);
      throw error;
    }
  }

  async getChainState(chain: string): Promise<ChainState | null> {
    try {
      const key = `${chain}:current`;
      
      // Check cache first
      const cached = this.getCached(key);
      if (cached) {
        return cached;
      }
      
      // Get from database
      const state = await this.chainStatesDB.get(key);
      
      // Update cache
      this.updateCache(key, state);
      
      return state;
      
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Failed to get chain state for ${chain}`, error);
      throw error;
    }
  }

  async getChainStateHistory(
    chain: string,
    options: QueryOptions & { timeRange?: { start: number; end: number } } = {}
  ): Promise<ChainState[]> {
    try {
      const states: ChainState[] = [];
      const prefix = `${chain}:`;
      
      for await (const [key, value] of this.chainStatesDB.iterator({
        gte: options.timeRange?.start ? `${prefix}${options.timeRange.start}` : prefix,
        lte: options.timeRange?.end ? `${prefix}${options.timeRange.end}` : `${prefix}\xff`,
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        if (!key.endsWith(':current')) {
          states.push(value);
        }
      }
      
      return states;
      
    } catch (error) {
      this.logger.error(`Failed to get chain state history for ${chain}`, error);
      throw error;
    }
  }

  // Transaction operations
  async saveTransaction(transaction: TransactionState): Promise<void> {
    try {
      const key = transaction.id;
      const statusKey = `status:${transaction.status}:${key}`;
      const chainKey = `chain:${transaction.sourceChain}:${key}`;
      
      // Save main transaction record
      await this.transactionsDB.put(key, transaction);
      
      // Create indexes for efficient querying
      await this.transactionsDB.put(statusKey, { id: key, timestamp: transaction.createdAt });
      await this.transactionsDB.put(chainKey, { id: key, timestamp: transaction.createdAt });
      
      // Update cache
      this.updateCache(key, transaction);
      
      this.logger.debug(`Saved transaction: ${transaction.id}`, {
        status: transaction.status,
        sourceChain: transaction.sourceChain,
        destChain: transaction.destChain,
      });
      
    } catch (error) {
      this.logger.error(`Failed to save transaction: ${transaction.id}`, error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<TransactionState | null> {
    try {
      // Check cache first
      const cached = this.getCached(id);
      if (cached) {
        return cached;
      }
      
      // Get from database
      const transaction = await this.transactionsDB.get(id);
      
      // Update cache
      this.updateCache(id, transaction);
      
      return transaction;
      
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Failed to get transaction: ${id}`, error);
      throw error;
    }
  }

  async getTransactionsByStatus(
    status: string,
    options: QueryOptions = {}
  ): Promise<TransactionState[]> {
    try {
      const transactions: TransactionState[] = [];
      const prefix = `status:${status}:`;
      
      // Get transaction IDs from status index
      const txIds: string[] = [];
      for await (const [key, value] of this.transactionsDB.iterator({
        gte: prefix,
        lte: `${prefix}\xff`,
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        txIds.push(value.id);
      }
      
      // Fetch full transaction data
      for (const txId of txIds) {
        const transaction = await this.getTransaction(txId);
        if (transaction) {
          transactions.push(transaction);
        }
      }
      
      return transactions;
      
    } catch (error) {
      this.logger.error(`Failed to get transactions by status: ${status}`, error);
      throw error;
    }
  }

  async getTransactionsByChain(
    chain: string,
    options: QueryOptions = {}
  ): Promise<TransactionState[]> {
    try {
      const transactions: TransactionState[] = [];
      const prefix = `chain:${chain}:`;
      
      // Get transaction IDs from chain index
      const txIds: string[] = [];
      for await (const [key, value] of this.transactionsDB.iterator({
        gte: prefix,
        lte: `${prefix}\xff`,
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        txIds.push(value.id);
      }
      
      // Fetch full transaction data
      for (const txId of txIds) {
        const transaction = await this.getTransaction(txId);
        if (transaction) {
          transactions.push(transaction);
        }
      }
      
      return transactions;
      
    } catch (error) {
      this.logger.error(`Failed to get transactions by chain: ${chain}`, error);
      throw error;
    }
  }

  // Alert operations
  async saveAlert(alert: MonitoringAlert): Promise<void> {
    try {
      const key = alert.id;
      const typeKey = `type:${alert.type}:${key}`;
      const severityKey = `severity:${alert.severity}:${key}`;
      
      // Save main alert record
      await this.alertsDB.put(key, alert);
      
      // Create indexes
      await this.alertsDB.put(typeKey, { id: key, timestamp: alert.timestamp });
      await this.alertsDB.put(severityKey, { id: key, timestamp: alert.timestamp });
      
      this.logger.debug(`Saved alert: ${alert.id}`, {
        type: alert.type,
        severity: alert.severity,
      });
      
    } catch (error) {
      this.logger.error(`Failed to save alert: ${alert.id}`, error);
      throw error;
    }
  }

  async getAlert(id: string): Promise<MonitoringAlert | null> {
    try {
      return await this.alertsDB.get(id);
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Failed to get alert: ${id}`, error);
      throw error;
    }
  }

  async getAlertsByType(
    type: string,
    options: QueryOptions = {}
  ): Promise<MonitoringAlert[]> {
    try {
      const alerts: MonitoringAlert[] = [];
      const prefix = `type:${type}:`;
      
      const alertIds: string[] = [];
      for await (const [key, value] of this.alertsDB.iterator({
        gte: prefix,
        lte: `${prefix}\xff`,
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        alertIds.push(value.id);
      }
      
      for (const alertId of alertIds) {
        const alert = await this.getAlert(alertId);
        if (alert) {
          alerts.push(alert);
        }
      }
      
      return alerts;
      
    } catch (error) {
      this.logger.error(`Failed to get alerts by type: ${type}`, error);
      throw error;
    }
  }

  // Metrics operations
  async saveMetrics(
    type: 'chain' | 'bridge',
    metrics: ChainMetrics | BridgeMetrics
  ): Promise<void> {
    try {
      const key = `${type}:${metrics.timestamp}`;
      
      await this.metricsDB.put(key, metrics);
      
      this.logger.debug(`Saved ${type} metrics`, {
        timestamp: metrics.timestamp,
      });
      
    } catch (error) {
      this.logger.error(`Failed to save ${type} metrics`, error);
      throw error;
    }
  }

  async getMetricsHistory(
    type: 'chain' | 'bridge',
    timeRange: { start: number; end: number },
    options: QueryOptions = {}
  ): Promise<(ChainMetrics | BridgeMetrics)[]> {
    try {
      const metrics: (ChainMetrics | BridgeMetrics)[] = [];
      const prefix = `${type}:`;
      
      for await (const [key, value] of this.metricsDB.iterator({
        gte: `${prefix}${timeRange.start}`,
        lte: `${prefix}${timeRange.end}`,
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        metrics.push(value);
      }
      
      return metrics;
      
    } catch (error) {
      this.logger.error(`Failed to get ${type} metrics history`, error);
      throw error;
    }
  }

  // Snapshot operations
  async createSnapshot(reason: string = 'scheduled'): Promise<string> {
    try {
      const timestamp = Date.now();
      const id = `snapshot_${timestamp}_${reason}`;
      
      this.logger.info(`Creating database snapshot: ${id}`);
      
      // Collect all current states
      const chains: Record<string, ChainState> = {};
      const chainNames = ['solana', 'nockchain'];
      
      for (const chain of chainNames) {
        const state = await this.getChainState(chain);
        if (state) {
          chains[chain] = state;
        }
      }
      
      // Collect recent transactions
      const transactions: TransactionState[] = [];
      const cutoffTime = timestamp - (24 * 60 * 60 * 1000); // Last 24 hours
      
      for await (const [key, value] of this.transactionsDB.iterator()) {
        if (typeof value === 'object' && value.createdAt && value.createdAt > cutoffTime) {
          transactions.push(value);
        }
      }
      
      // Collect recent metrics
      const chainMetrics: ChainMetrics[] = [];
      let bridgeMetrics: BridgeMetrics | undefined;
      
      for await (const [key, value] of this.metricsDB.iterator({
        gte: `chain:${cutoffTime}`,
        lte: `chain:${timestamp}`,
      })) {
        chainMetrics.push(value);
      }
      
      try {
        for await (const [key, value] of this.metricsDB.iterator({
          gte: `bridge:${cutoffTime}`,
          lte: `bridge:${timestamp}`,
          reverse: true,
          limit: 1,
        })) {
          bridgeMetrics = value;
          break;
        }
      } catch {
        // No bridge metrics available
      }
      
      const snapshot: StateSnapshot = {
        id,
        timestamp,
        chains,
        transactions,
        metrics: {
          chains: chainMetrics,
          bridge: bridgeMetrics,
        },
        checksum: '',
      };
      
      // Calculate checksum
      snapshot.checksum = this.calculateChecksum(snapshot);
      
      // Save snapshot
      await this.snapshotsDB.put(id, snapshot);
      
      this.logger.info(`Database snapshot created: ${id}`, {
        chains: Object.keys(chains).length,
        transactions: transactions.length,
        size: JSON.stringify(snapshot).length,
      });
      
      return id;
      
    } catch (error) {
      this.logger.error('Failed to create database snapshot', error);
      throw error;
    }
  }

  async getSnapshot(id: string): Promise<StateSnapshot | null> {
    try {
      return await this.snapshotsDB.get(id);
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.logger.error(`Failed to get snapshot: ${id}`, error);
      throw error;
    }
  }

  async listSnapshots(options: QueryOptions = {}): Promise<StateSnapshot[]> {
    try {
      const snapshots: StateSnapshot[] = [];
      
      for await (const [key, value] of this.snapshotsDB.iterator({
        limit: options.limit,
        reverse: options.sortOrder === 'desc',
      })) {
        snapshots.push(value);
      }
      
      return snapshots;
      
    } catch (error) {
      this.logger.error('Failed to list snapshots', error);
      throw error;
    }
  }

  async restoreFromSnapshot(snapshotId: string): Promise<void> {
    try {
      const snapshot = await this.getSnapshot(snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotId}`);
      }
      
      // Verify checksum
      const expectedChecksum = this.calculateChecksum(snapshot);
      if (snapshot.checksum !== expectedChecksum) {
        throw new Error('Snapshot checksum verification failed');
      }
      
      this.logger.info(`Restoring from snapshot: ${snapshotId}`);
      
      // Restore chain states
      for (const [chain, state] of Object.entries(snapshot.chains)) {
        await this.saveChainState(chain, state);
      }
      
      // Restore transactions
      for (const transaction of snapshot.transactions) {
        await this.saveTransaction(transaction);
      }
      
      this.logger.info(`Successfully restored from snapshot: ${snapshotId}`);
      
    } catch (error) {
      this.logger.error(`Failed to restore from snapshot: ${snapshotId}`, error);
      throw error;
    }
  }

  // Cache management
  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < 60000) { // 1 minute cache TTL
        cached.hits++;
        this.cacheStats.hits++;
        return cached.data;
      } else {
        this.cache.delete(key);
        this.cacheStats.size--;
      }
    }
    
    this.cacheStats.misses++;
    return null;
  }

  private updateCache(key: string, data: any): void {
    // Remove LRU items if cache is full
    if (this.cache.size >= this.config.maxCacheSize * 1000) { // Rough estimation
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
      this.cacheStats.size--;
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
    this.cacheStats.size++;
  }

  // Maintenance operations
  private startBackupProcess(): void {
    if (this.config.backupInterval > 0) {
      this.backupInterval = setInterval(async () => {
        try {
          await this.createSnapshot('scheduled');
        } catch (error) {
          this.logger.error('Scheduled backup failed', error);
        }
      }, this.config.backupInterval * 1000);
    }
  }

  private startMaintenanceProcess(): void {
    this.maintenanceInterval = setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        this.logger.error('Database maintenance failed', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async performMaintenance(): Promise<void> {
    this.logger.debug('Performing database maintenance');
    
    // Clean up old data
    await this.cleanupOldData();
    
    // Clean up old snapshots
    await this.cleanupOldSnapshots();
    
    // Update cache statistics
    this.logCacheStatistics();
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    
    // Clean up old metrics
    let deletedCount = 0;
    for await (const [key] of this.metricsDB.iterator()) {
      const timestamp = parseInt(key.split(':')[1]);
      if (timestamp < cutoffTime) {
        await this.metricsDB.del(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.logger.info(`Cleaned up ${deletedCount} old metric records`);
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots({ sortOrder: 'desc' });
    
    // Keep only the last 10 snapshots
    if (snapshots.length > 10) {
      const toDelete = snapshots.slice(10);
      
      for (const snapshot of toDelete) {
        await this.snapshotsDB.del(snapshot.id);
      }
      
      this.logger.info(`Cleaned up ${toDelete.length} old snapshots`);
    }
  }

  private logCacheStatistics(): void {
    const hitRate = this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100;
    
    this.logger.debug('Database cache statistics', {
      size: this.cacheStats.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: hitRate.toFixed(2) + '%',
    });
  }

  private calculateChecksum(snapshot: StateSnapshot): string {
    const data = { ...snapshot };
    delete data.checksum;
    
    return createHash('sha256')
      .update(JSON.stringify(data, Object.keys(data).sort()))
      .digest('hex');
  }

  // Statistics and monitoring
  async getDatabaseStatistics(): Promise<{
    size: number;
    entryCount: {
      chainStates: number;
      transactions: number;
      alerts: number;
      metrics: number;
      snapshots: number;
    };
    cache: {
      size: number;
      hitRate: number;
    };
  }> {
    const stats = {
      size: 0,
      entryCount: {
        chainStates: 0,
        transactions: 0,
        alerts: 0,
        metrics: 0,
        snapshots: 0,
      },
      cache: {
        size: this.cacheStats.size,
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100,
      },
    };
    
    // Count entries in each sublevel
    for await (const [key] of this.chainStatesDB.iterator()) {
      stats.entryCount.chainStates++;
    }
    
    for await (const [key] of this.transactionsDB.iterator()) {
      stats.entryCount.transactions++;
    }
    
    for await (const [key] of this.alertsDB.iterator()) {
      stats.entryCount.alerts++;
    }
    
    for await (const [key] of this.metricsDB.iterator()) {
      stats.entryCount.metrics++;
    }
    
    for await (const [key] of this.snapshotsDB.iterator()) {
      stats.entryCount.snapshots++;
    }
    
    return stats;
  }
}

export default StateDatabase;