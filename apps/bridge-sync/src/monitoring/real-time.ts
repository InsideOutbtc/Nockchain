// Real-time cross-chain monitoring and alerting system

import { EventEmitter } from 'events';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import WebSocket from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { Logger } from '../utils/logger';
import { RedisClient } from '../utils/redis';
import { StateSynchronizer, TransactionState, ChainState } from '../core/state-sync';

export interface MonitoringAlert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  chain: 'nockchain' | 'solana' | 'bridge';
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: number;
}

export interface ChainMetrics {
  chain: 'nockchain' | 'solana';
  timestamp: number;
  blockHeight: bigint;
  blockTime: number;
  transactionCount: number;
  pendingTransactions: number;
  gasPrice?: bigint;
  fees?: number;
  networkHashRate?: bigint;
  validatorCount: number;
  syncStatus: 'syncing' | 'synced' | 'lagging' | 'error';
}

export interface BridgeMetrics {
  timestamp: number;
  totalVolume: bigint;
  dailyVolume: bigint;
  totalTransactions: bigint;
  pendingTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  bridgeHealth: number; // 0-100
  liquidityUtilization: number; // 0-100
  feeRevenue: bigint;
}

export enum AlertType {
  BLOCK_TIME_ANOMALY = 'block_time_anomaly',
  TRANSACTION_FAILURE = 'transaction_failure',
  BRIDGE_CONGESTION = 'bridge_congestion',
  LIQUIDITY_LOW = 'liquidity_low',
  VALIDATOR_OFFLINE = 'validator_offline',
  SYNC_DELAY = 'sync_delay',
  PRICE_DEVIATION = 'price_deviation',
  EMERGENCY_MODE = 'emergency_mode',
  SECURITY_INCIDENT = 'security_incident',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  NETWORK_PARTITION = 'network_partition',
  SMART_CONTRACT_ERROR = 'smart_contract_error',
}

export interface MonitoringConfiguration {
  alertThresholds: {
    blockTimeDeviation: number; // seconds
    transactionFailureRate: number; // percentage
    syncDelay: number; // seconds
    liquidityThreshold: number; // percentage
    bridgeHealthThreshold: number; // 0-100
  };
  metricsRetentionDays: number;
  alertRetentionDays: number;
  realTimeEndpoints: {
    websocket: string;
    socketio: string;
  };
  notificationChannels: {
    email: string[];
    slack: string;
    webhook: string[];
  };
}

export class RealTimeMonitor extends EventEmitter {
  private config: MonitoringConfiguration;
  private logger: Logger;
  private redis: RedisClient;
  private stateSynchronizer: StateSynchronizer;
  
  // Chain connections
  private solanaConnection: Connection;
  private nockchainProvider: ethers.JsonRpcProvider;
  
  // WebSocket servers
  private wsServer: WebSocket.Server;
  private ioServer: SocketIOServer;
  private httpServer: any;
  
  // Monitoring state
  private isMonitoring = false;
  private alerts: Map<string, MonitoringAlert> = new Map();
  private chainMetrics: Map<string, ChainMetrics> = new Map();
  private bridgeMetrics?: BridgeMetrics;
  private connectedClients: Set<WebSocket> = new Set();
  
  // Monitoring intervals
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Performance tracking
  private performanceBaselines: Map<string, any> = new Map();
  private anomalyDetection = {
    blockTimeHistory: [] as number[],
    transactionRateHistory: [] as number[],
    bridgeVolumeHistory: [] as bigint[],
  };

  constructor(
    config: MonitoringConfiguration,
    logger: Logger,
    redis: RedisClient,
    stateSynchronizer: StateSynchronizer,
    solanaRpcUrl: string,
    nockchainRpcUrl: string
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.redis = redis;
    this.stateSynchronizer = stateSynchronizer;
    
    this.solanaConnection = new Connection(solanaRpcUrl, 'confirmed');
    this.nockchainProvider = new ethers.JsonRpcProvider(nockchainRpcUrl);
    
    this.setupWebSocketServers();
    this.setupEventListeners();
  }

  async start(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Real-time monitor already running');
      return;
    }

    this.logger.info('Starting real-time cross-chain monitor');
    this.isMonitoring = true;

    try {
      // Start WebSocket servers
      await this.startWebSocketServers();
      
      // Start chain monitoring
      this.startChainMonitoring();
      
      // Start bridge monitoring
      this.startBridgeMonitoring();
      
      // Start alert processing
      this.startAlertProcessing();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Start real-time data broadcasting
      this.startDataBroadcasting();
      
      this.logger.info('Real-time monitor started successfully');
      this.emit('started');
      
    } catch (error) {
      this.logger.error('Failed to start real-time monitor', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isMonitoring) return;

    this.logger.info('Stopping real-time monitor');
    this.isMonitoring = false;

    // Clear all intervals
    for (const [name, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Close WebSocket servers
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.ioServer) {
      this.ioServer.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }

    this.logger.info('Real-time monitor stopped');
    this.emit('stopped');
  }

  // Alert management
  createAlert(
    type: AlertType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    chain: 'nockchain' | 'solana' | 'bridge',
    message: string,
    metadata: Record<string, any> = {}
  ): MonitoringAlert {
    const alert: MonitoringAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      chain,
      message,
      timestamp: Date.now(),
      metadata,
      acknowledged: false,
    };
    
    this.alerts.set(alert.id, alert);
    
    this.logger.warn(`Alert created: ${type} - ${message}`, {
      alertId: alert.id,
      severity,
      chain,
      metadata,
    });
    
    // Broadcast alert to connected clients
    this.broadcastAlert(alert);
    
    // Send notifications based on severity
    if (severity === 'high' || severity === 'critical') {
      this.sendNotification(alert);
    }
    
    this.emit('alert', alert);
    return alert;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.acknowledged = true;
    alert.metadata.acknowledgedBy = acknowledgedBy;
    alert.metadata.acknowledgedAt = Date.now();
    
    this.logger.info(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    this.broadcastAlertUpdate(alert);
    
    return true;
  }

  resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.resolvedAt = Date.now();
    alert.metadata.resolvedBy = resolvedBy;
    if (resolution) {
      alert.metadata.resolution = resolution;
    }
    
    this.logger.info(`Alert resolved: ${alertId} by ${resolvedBy}`);
    this.broadcastAlertUpdate(alert);
    
    // Remove from active alerts after 24 hours
    setTimeout(() => {
      this.alerts.delete(alertId);
    }, 24 * 60 * 60 * 1000);
    
    return true;
  }

  // Metrics collection and analysis
  async collectChainMetrics(chain: 'nockchain' | 'solana'): Promise<ChainMetrics> {
    const timestamp = Date.now();
    
    try {
      if (chain === 'solana') {
        const slot = await this.solanaConnection.getSlot('confirmed');
        const blockHeight = BigInt(slot);
        
        // Get recent performance samples
        const perfSamples = await this.solanaConnection.getRecentPerformanceSamples(5);
        const avgBlockTime = perfSamples.reduce((sum, sample) => sum + sample.samplePeriodSecs, 0) / perfSamples.length;
        
        const metrics: ChainMetrics = {
          chain: 'solana',
          timestamp,
          blockHeight,
          blockTime: avgBlockTime,
          transactionCount: 0, // Will be calculated from block data
          pendingTransactions: 0,
          validatorCount: await this.getSolanaValidatorCount(),
          syncStatus: await this.getSolanaSyncStatus(),
        };
        
        this.chainMetrics.set('solana', metrics);
        await this.analyzeChainMetrics(metrics);
        
        return metrics;
      } else {
        const blockNumber = await this.nockchainProvider.getBlockNumber();
        const blockHeight = BigInt(blockNumber);
        
        const block = await this.nockchainProvider.getBlock(blockNumber);
        const prevBlock = await this.nockchainProvider.getBlock(blockNumber - 1);
        
        const blockTime = block && prevBlock ? block.timestamp - prevBlock.timestamp : 0;
        
        const metrics: ChainMetrics = {
          chain: 'nockchain',
          timestamp,
          blockHeight,
          blockTime,
          transactionCount: block?.transactions?.length || 0,
          pendingTransactions: await this.getNockchainPendingTxCount(),
          gasPrice: await this.getNockchainGasPrice(),
          validatorCount: await this.getNockchainValidatorCount(),
          syncStatus: await this.getNockchainSyncStatus(),
        };
        
        this.chainMetrics.set('nockchain', metrics);
        await this.analyzeChainMetrics(metrics);
        
        return metrics;
      }
    } catch (error) {
      this.logger.error(`Failed to collect ${chain} metrics`, error);
      
      // Create error metrics object
      const errorMetrics: ChainMetrics = {
        chain,
        timestamp,
        blockHeight: BigInt(0),
        blockTime: 0,
        transactionCount: 0,
        pendingTransactions: 0,
        validatorCount: 0,
        syncStatus: 'error',
      };
      
      this.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        'high',
        chain,
        `Failed to collect ${chain} metrics: ${error.message}`,
        { error: error.message }
      );
      
      return errorMetrics;
    }
  }

  async collectBridgeMetrics(): Promise<BridgeMetrics> {
    const timestamp = Date.now();
    
    try {
      // Get bridge state from synchronizer
      const solanaState = this.stateSynchronizer.getChainState('solana');
      const nockchainState = this.stateSynchronizer.getChainState('nockchain');
      
      if (!solanaState || !nockchainState) {
        throw new Error('Chain states not available');
      }
      
      const pendingTransactions = this.stateSynchronizer.getPendingTransactions();
      const failedTransactions = pendingTransactions.filter(tx => tx.status === 'failed').length;
      
      // Calculate processing time statistics
      const completedTransactions = await this.getCompletedTransactionsLast24h();
      const avgProcessingTime = this.calculateAverageProcessingTime(completedTransactions);
      
      const metrics: BridgeMetrics = {
        timestamp,
        totalVolume: solanaState.bridgeBalance + nockchainState.bridgeBalance,
        dailyVolume: await this.getDailyVolume(),
        totalTransactions: await this.getTotalTransactionCount(),
        pendingTransactions: pendingTransactions.length,
        failedTransactions,
        averageProcessingTime: avgProcessingTime,
        bridgeHealth: await this.calculateBridgeHealth(),
        liquidityUtilization: await this.calculateLiquidityUtilization(),
        feeRevenue: await this.getTotalFeeRevenue(),
      };
      
      this.bridgeMetrics = metrics;
      await this.analyzeBridgeMetrics(metrics);
      
      return metrics;
    } catch (error) {
      this.logger.error('Failed to collect bridge metrics', error);
      
      const errorMetrics: BridgeMetrics = {
        timestamp,
        totalVolume: BigInt(0),
        dailyVolume: BigInt(0),
        totalTransactions: BigInt(0),
        pendingTransactions: 0,
        failedTransactions: 0,
        averageProcessingTime: 0,
        bridgeHealth: 0,
        liquidityUtilization: 0,
        feeRevenue: BigInt(0),
      };
      
      this.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        'high',
        'bridge',
        `Failed to collect bridge metrics: ${error.message}`,
        { error: error.message }
      );
      
      return errorMetrics;
    }
  }

  // Real-time data access
  getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolvedAt);
  }

  getChainMetrics(chain?: 'nockchain' | 'solana'): ChainMetrics | ChainMetrics[] {
    if (chain) {
      return this.chainMetrics.get(chain);
    }
    return Array.from(this.chainMetrics.values());
  }

  getBridgeMetrics(): BridgeMetrics | undefined {
    return this.bridgeMetrics;
  }

  // Private implementation methods
  private setupWebSocketServers(): void {
    // HTTP server for Socket.IO
    this.httpServer = createServer();
    
    // Socket.IO server for rich real-time communication
    this.ioServer = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    
    // Raw WebSocket server for lightweight connections
    this.wsServer = new WebSocket.Server({ port: 8081 });
  }

  private async startWebSocketServers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.listen(8080, () => {
        this.logger.info('Socket.IO server listening on port 8080');
        
        this.wsServer.on('connection', (ws) => {
          this.handleWebSocketConnection(ws);
        });
        
        this.ioServer.on('connection', (socket) => {
          this.handleSocketIOConnection(socket);
        });
        
        this.logger.info('WebSocket server listening on port 8081');
        resolve();
      });
      
      this.httpServer.on('error', reject);
    });
  }

  private handleWebSocketConnection(ws: WebSocket): void {
    this.connectedClients.add(ws);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWebSocketMessage(ws, message);
      } catch (error) {
        this.logger.error('Invalid WebSocket message', error);
      }
    });
    
    ws.on('close', () => {
      this.connectedClients.delete(ws);
    });
    
    // Send initial data
    this.sendToWebSocket(ws, {
      type: 'welcome',
      data: {
        alerts: this.getActiveAlerts(),
        metrics: {
          chains: Array.from(this.chainMetrics.values()),
          bridge: this.bridgeMetrics,
        },
      },
    });
  }

  private handleSocketIOConnection(socket: any): void {
    this.logger.info(`Socket.IO client connected: ${socket.id}`);
    
    // Send initial data
    socket.emit('welcome', {
      alerts: this.getActiveAlerts(),
      metrics: {
        chains: Array.from(this.chainMetrics.values()),
        bridge: this.bridgeMetrics,
      },
    });
    
    // Handle client requests
    socket.on('acknowledgeAlert', (data: { alertId: string; user: string }) => {
      this.acknowledgeAlert(data.alertId, data.user);
    });
    
    socket.on('resolveAlert', (data: { alertId: string; user: string; resolution?: string }) => {
      this.resolveAlert(data.alertId, data.user, data.resolution);
    });
    
    socket.on('getHistoricalData', async (data: { type: string; timeRange: string }) => {
      const historicalData = await this.getHistoricalData(data.type, data.timeRange);
      socket.emit('historicalData', historicalData);
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'subscribe':
        // Handle subscription to specific data streams
        break;
      case 'ping':
        this.sendToWebSocket(ws, { type: 'pong', timestamp: Date.now() });
        break;
    }
  }

  private setupEventListeners(): void {
    // Listen to state synchronizer events
    this.stateSynchronizer.on('stateUpdated', (data) => {
      this.broadcastStateUpdate(data);
    });
    
    this.stateSynchronizer.on('transactionStatusUpdated', (data) => {
      this.broadcastTransactionUpdate(data);
    });
    
    this.stateSynchronizer.on('stateInconsistency', (data) => {
      this.createAlert(
        AlertType.SYNC_DELAY,
        'high',
        'bridge',
        'Cross-chain state inconsistency detected',
        data
      );
    });
  }

  private startChainMonitoring(): void {
    // Monitor Solana
    const solanaInterval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.collectChainMetrics('solana');
      }
    }, 10000); // Every 10 seconds
    
    this.monitoringIntervals.set('solana', solanaInterval);
    
    // Monitor Nockchain
    const nockchainInterval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.collectChainMetrics('nockchain');
      }
    }, 10000); // Every 10 seconds
    
    this.monitoringIntervals.set('nockchain', nockchainInterval);
  }

  private startBridgeMonitoring(): void {
    const interval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.collectBridgeMetrics();
      }
    }, 15000); // Every 15 seconds
    
    this.monitoringIntervals.set('bridge', interval);
  }

  private startAlertProcessing(): void {
    const interval = setInterval(() => {
      if (this.isMonitoring) {
        this.processAlertQueue();
        this.cleanupOldAlerts();
      }
    }, 30000); // Every 30 seconds
    
    this.monitoringIntervals.set('alerts', interval);
  }

  private startPerformanceMonitoring(): void {
    const interval = setInterval(() => {
      if (this.isMonitoring) {
        this.detectAnomalies();
        this.updatePerformanceBaselines();
      }
    }, 60000); // Every minute
    
    this.monitoringIntervals.set('performance', interval);
  }

  private startDataBroadcasting(): void {
    const interval = setInterval(() => {
      if (this.isMonitoring) {
        this.broadcastMetricsUpdate();
      }
    }, 5000); // Every 5 seconds
    
    this.monitoringIntervals.set('broadcast', interval);
  }

  private async analyzeChainMetrics(metrics: ChainMetrics): Promise<void> {
    // Check for block time anomalies
    if (metrics.blockTime > this.config.alertThresholds.blockTimeDeviation) {
      this.createAlert(
        AlertType.BLOCK_TIME_ANOMALY,
        'medium',
        metrics.chain,
        `Block time anomaly detected: ${metrics.blockTime}s`,
        { blockTime: metrics.blockTime, threshold: this.config.alertThresholds.blockTimeDeviation }
      );
    }
    
    // Check sync status
    if (metrics.syncStatus === 'error' || metrics.syncStatus === 'lagging') {
      this.createAlert(
        AlertType.SYNC_DELAY,
        'high',
        metrics.chain,
        `Chain sync issues detected: ${metrics.syncStatus}`,
        { syncStatus: metrics.syncStatus }
      );
    }
    
    // Update anomaly detection history
    this.anomalyDetection.blockTimeHistory.push(metrics.blockTime);
    if (this.anomalyDetection.blockTimeHistory.length > 100) {
      this.anomalyDetection.blockTimeHistory.shift();
    }
  }

  private async analyzeBridgeMetrics(metrics: BridgeMetrics): Promise<void> {
    // Check bridge health
    if (metrics.bridgeHealth < this.config.alertThresholds.bridgeHealthThreshold) {
      this.createAlert(
        AlertType.PERFORMANCE_DEGRADATION,
        'high',
        'bridge',
        `Bridge health degraded: ${metrics.bridgeHealth}%`,
        { bridgeHealth: metrics.bridgeHealth }
      );
    }
    
    // Check liquidity utilization
    if (metrics.liquidityUtilization > this.config.alertThresholds.liquidityThreshold) {
      this.createAlert(
        AlertType.LIQUIDITY_LOW,
        'medium',
        'bridge',
        `High liquidity utilization: ${metrics.liquidityUtilization}%`,
        { liquidityUtilization: metrics.liquidityUtilization }
      );
    }
    
    // Check transaction failure rate
    const failureRate = (metrics.failedTransactions / Math.max(1, metrics.pendingTransactions)) * 100;
    if (failureRate > this.config.alertThresholds.transactionFailureRate) {
      this.createAlert(
        AlertType.TRANSACTION_FAILURE,
        'high',
        'bridge',
        `High transaction failure rate: ${failureRate.toFixed(2)}%`,
        { failureRate, failed: metrics.failedTransactions, pending: metrics.pendingTransactions }
      );
    }
  }

  private broadcastAlert(alert: MonitoringAlert): void {
    const message = {
      type: 'alert',
      data: alert,
    };
    
    // Broadcast to WebSocket clients
    for (const client of this.connectedClients) {
      this.sendToWebSocket(client, message);
    }
    
    // Broadcast to Socket.IO clients
    this.ioServer.emit('alert', alert);
  }

  private broadcastAlertUpdate(alert: MonitoringAlert): void {
    const message = {
      type: 'alertUpdate',
      data: alert,
    };
    
    for (const client of this.connectedClients) {
      this.sendToWebSocket(client, message);
    }
    
    this.ioServer.emit('alertUpdate', alert);
  }

  private broadcastMetricsUpdate(): void {
    const message = {
      type: 'metricsUpdate',
      data: {
        chains: Array.from(this.chainMetrics.values()),
        bridge: this.bridgeMetrics,
        timestamp: Date.now(),
      },
    };
    
    for (const client of this.connectedClients) {
      this.sendToWebSocket(client, message);
    }
    
    this.ioServer.emit('metricsUpdate', message.data);
  }

  private broadcastStateUpdate(data: any): void {
    const message = {
      type: 'stateUpdate',
      data,
    };
    
    for (const client of this.connectedClients) {
      this.sendToWebSocket(client, message);
    }
    
    this.ioServer.emit('stateUpdate', data);
  }

  private broadcastTransactionUpdate(data: any): void {
    const message = {
      type: 'transactionUpdate',
      data,
    };
    
    for (const client of this.connectedClients) {
      this.sendToWebSocket(client, message);
    }
    
    this.ioServer.emit('transactionUpdate', data);
  }

  private sendToWebSocket(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private async sendNotification(alert: MonitoringAlert): Promise<void> {
    this.logger.warn(`Sending notification for alert: ${alert.id}`);
    // Implement notification sending (email, Slack, webhooks)
  }

  private processAlertQueue(): void {
    // Process any queued alert actions
  }

  private cleanupOldAlerts(): void {
    const cutoffTime = Date.now() - (this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        this.alerts.delete(alertId);
      }
    }
  }

  private detectAnomalies(): void {
    // Implement anomaly detection algorithms
  }

  private updatePerformanceBaselines(): void {
    // Update performance baselines for anomaly detection
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Placeholder implementations for chain-specific operations
  private async getSolanaValidatorCount(): Promise<number> { return 0; }
  private async getSolanaSyncStatus(): Promise<'syncing' | 'synced' | 'lagging' | 'error'> { return 'synced'; }
  private async getNockchainPendingTxCount(): Promise<number> { return 0; }
  private async getNockchainGasPrice(): Promise<bigint> { return BigInt(0); }
  private async getNockchainValidatorCount(): Promise<number> { return 0; }
  private async getNockchainSyncStatus(): Promise<'syncing' | 'synced' | 'lagging' | 'error'> { return 'synced'; }
  private async getCompletedTransactionsLast24h(): Promise<TransactionState[]> { return []; }
  private calculateAverageProcessingTime(transactions: TransactionState[]): number { return 0; }
  private async getDailyVolume(): Promise<bigint> { return BigInt(0); }
  private async getTotalTransactionCount(): Promise<bigint> { return BigInt(0); }
  private async calculateBridgeHealth(): Promise<number> { return 100; }
  private async calculateLiquidityUtilization(): Promise<number> { return 0; }
  private async getTotalFeeRevenue(): Promise<bigint> { return BigInt(0); }
  private async getHistoricalData(type: string, timeRange: string): Promise<any> { return {}; }
}

export default RealTimeMonitor;