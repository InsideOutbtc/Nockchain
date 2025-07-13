// Advanced network monitoring for validator network health and performance

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger';

export interface NetworkMetrics {
  timestamp: number;
  validatorId: string;
  latency: number;
  throughput: number;
  packetLoss: number;
  connectionCount: number;
  bandwidthUsage: {
    incoming: number;
    outgoing: number;
  };
  errorRate: number;
  consensusParticipation: number;
}

export interface NetworkAlert {
  id: string;
  type: NetworkAlertType;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  message: string;
  timestamp: number;
  validatorId?: string;
  metrics?: Partial<NetworkMetrics>;
  resolved: boolean;
}

export enum NetworkAlertType {
  HIGH_LATENCY = 'high_latency',
  PACKET_LOSS = 'packet_loss',
  CONNECTION_FAILURE = 'connection_failure',
  BANDWIDTH_EXCEEDED = 'bandwidth_exceeded',
  VALIDATOR_OFFLINE = 'validator_offline',
  CONSENSUS_TIMEOUT = 'consensus_timeout',
  NETWORK_PARTITION = 'network_partition',
  ANOMALOUS_TRAFFIC = 'anomalous_traffic',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
}

export interface ValidatorPeer {
  id: string;
  endpoint: string;
  publicKey: string;
  lastSeen: number;
  isConnected: boolean;
  connectionQuality: number; // 0-100
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  reputation: number;
}

export interface NetworkTopology {
  totalValidators: number;
  connectedValidators: number;
  averageLatency: number;
  networkPartitions: number;
  consensusEfficiency: number;
  networkHealth: number; // 0-100
  lastUpdate: number;
}

export class NetworkMonitor extends EventEmitter {
  private logger: Logger;
  private validatorPeers: Map<string, ValidatorPeer> = new Map();
  private metrics: NetworkMetrics[] = [];
  private alerts: NetworkAlert[] = [];
  private isMonitoring = false;
  private connections: Map<string, WebSocket> = new Map();
  
  // Configuration
  private readonly config = {
    metricsRetentionHours: 24,
    alertRetentionHours: 72,
    latencyThreshold: 1000, // ms
    packetLossThreshold: 5, // %
    bandwidthThreshold: 100 * 1024 * 1024, // 100 MB/s
    heartbeatInterval: 30000, // 30 seconds
    consensusTimeout: 60000, // 60 seconds
    reconnectAttempts: 5,
    reconnectDelay: 5000, // 5 seconds
  };
  
  // Performance tracking
  private performanceBaseline = {
    averageLatency: 0,
    averageThroughput: 0,
    averagePacketLoss: 0,
    sampleCount: 0,
  };

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Network monitor already running');
      return;
    }

    this.logger.info('Starting network monitor');
    this.isMonitoring = true;

    // Start monitoring loops
    this.startMetricsCollection();
    this.startPeerHealthChecks();
    this.startNetworkDiscovery();
    this.startPerformanceAnalysis();
    this.startAlertProcessing();

    this.logger.info('Network monitor started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isMonitoring) return;

    this.logger.info('Stopping network monitor');
    this.isMonitoring = false;

    // Close all connections
    for (const [id, ws] of this.connections) {
      try {
        ws.close();
      } catch (error) {
        this.logger.error(`Error closing connection to ${id}`, error);
      }
    }
    this.connections.clear();

    this.logger.info('Network monitor stopped');
  }

  // Peer management
  addPeer(peer: Omit<ValidatorPeer, 'lastSeen' | 'isConnected' | 'connectionQuality' | 'latency' | 'messagesSent' | 'messagesReceived' | 'errors' | 'reputation'>): void {
    const fullPeer: ValidatorPeer = {
      ...peer,
      lastSeen: Date.now(),
      isConnected: false,
      connectionQuality: 0,
      latency: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      reputation: 100,
    };

    this.validatorPeers.set(peer.id, fullPeer);
    this.connectToPeer(fullPeer);
    
    this.logger.info(`Added peer to network monitor: ${peer.id}`);
  }

  removePeer(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.close();
      this.connections.delete(peerId);
    }
    
    this.validatorPeers.delete(peerId);
    this.logger.info(`Removed peer from network monitor: ${peerId}`);
  }

  getPeerStatus(peerId: string): ValidatorPeer | null {
    return this.validatorPeers.get(peerId) || null;
  }

  getAllPeers(): ValidatorPeer[] {
    return Array.from(this.validatorPeers.values());
  }

  getConnectedPeers(): ValidatorPeer[] {
    return this.getAllPeers().filter(peer => peer.isConnected);
  }

  // Network topology analysis
  getNetworkTopology(): NetworkTopology {
    const peers = this.getAllPeers();
    const connectedPeers = this.getConnectedPeers();
    
    const averageLatency = connectedPeers.length > 0 
      ? connectedPeers.reduce((sum, peer) => sum + peer.latency, 0) / connectedPeers.length
      : 0;
    
    // Detect network partitions by analyzing connectivity patterns
    const networkPartitions = this.detectNetworkPartitions();
    
    // Calculate consensus efficiency based on successful message exchanges
    const consensusEfficiency = this.calculateConsensusEfficiency();
    
    // Overall network health score
    const networkHealth = this.calculateNetworkHealth();
    
    return {
      totalValidators: peers.length,
      connectedValidators: connectedPeers.length,
      averageLatency,
      networkPartitions,
      consensusEfficiency,
      networkHealth,
      lastUpdate: Date.now(),
    };
  }

  // Metrics and monitoring
  recordMetrics(metrics: Omit<NetworkMetrics, 'timestamp'>): void {
    const fullMetrics: NetworkMetrics = {
      ...metrics,
      timestamp: Date.now(),
    };
    
    this.metrics.push(fullMetrics);
    
    // Maintain metrics retention
    const cutoffTime = Date.now() - (this.config.metricsRetentionHours * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    // Update performance baseline
    this.updatePerformanceBaseline(fullMetrics);
    
    // Check for alerts
    this.checkMetricsForAlerts(fullMetrics);
    
    this.emit('metrics', fullMetrics);
  }

  getRecentMetrics(hours: number = 1): NetworkMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  getAverageMetrics(hours: number = 1): Partial<NetworkMetrics> {
    const recentMetrics = this.getRecentMetrics(hours);
    
    if (recentMetrics.length === 0) {
      return {};
    }
    
    return {
      latency: recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length,
      throughput: recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length,
      packetLoss: recentMetrics.reduce((sum, m) => sum + m.packetLoss, 0) / recentMetrics.length,
      connectionCount: recentMetrics.reduce((sum, m) => sum + m.connectionCount, 0) / recentMetrics.length,
      errorRate: recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length,
      consensusParticipation: recentMetrics.reduce((sum, m) => sum + m.consensusParticipation, 0) / recentMetrics.length,
    };
  }

  // Alert management
  createAlert(
    type: NetworkAlertType,
    severity: 'info' | 'warning' | 'critical' | 'emergency',
    message: string,
    validatorId?: string,
    metrics?: Partial<NetworkMetrics>
  ): NetworkAlert {
    const alert: NetworkAlert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      validatorId,
      metrics,
      resolved: false,
    };
    
    this.alerts.push(alert);
    
    // Maintain alert retention
    const cutoffTime = Date.now() - (this.config.alertRetentionHours * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    
    this.logger.warn(`Network alert created: ${type}`, {
      alertId: alert.id,
      severity,
      message,
      validatorId,
    });
    
    this.emit('alert', alert);
    return alert;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.info(`Network alert resolved: ${alertId}`);
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  getActiveAlerts(): NetworkAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getAllAlerts(): NetworkAlert[] {
    return [...this.alerts];
  }

  // Performance analysis
  detectPerformanceDegradation(): boolean {
    const recentMetrics = this.getRecentMetrics(0.5); // Last 30 minutes
    if (recentMetrics.length < 5) return false;
    
    const avgLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
    const avgThroughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length;
    
    // Compare with baseline
    const latencyIncrease = (avgLatency - this.performanceBaseline.averageLatency) / this.performanceBaseline.averageLatency;
    const throughputDecrease = (this.performanceBaseline.averageThroughput - avgThroughput) / this.performanceBaseline.averageThroughput;
    
    return latencyIncrease > 0.5 || throughputDecrease > 0.3; // 50% latency increase or 30% throughput decrease
  }

  // Network health assessment
  assessNetworkHealth(): {
    overall: number;
    connectivity: number;
    performance: number;
    reliability: number;
    consensus: number;
  } {
    const topology = this.getNetworkTopology();
    const connectedRatio = topology.connectedValidators / topology.totalValidators;
    
    // Connectivity score (0-100)
    const connectivity = Math.round(connectedRatio * 100);
    
    // Performance score based on latency and throughput
    const avgMetrics = this.getAverageMetrics(1);
    const performance = Math.round(Math.max(0, 100 - (avgMetrics.latency || 0) / 10));
    
    // Reliability based on error rates and packet loss
    const reliability = Math.round(Math.max(0, 100 - (avgMetrics.errorRate || 0) * 10 - (avgMetrics.packetLoss || 0) * 5));
    
    // Consensus efficiency
    const consensus = Math.round(topology.consensusEfficiency * 100);
    
    // Overall health (weighted average)
    const overall = Math.round(
      (connectivity * 0.3 + performance * 0.3 + reliability * 0.2 + consensus * 0.2)
    );
    
    return {
      overall,
      connectivity,
      performance,
      reliability,
      consensus,
    };
  }

  // Private implementation methods
  private async connectToPeer(peer: ValidatorPeer): Promise<void> {
    if (this.connections.has(peer.id)) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(peer.endpoint);
      
      ws.on('open', () => {
        peer.isConnected = true;
        peer.lastSeen = Date.now();
        this.connections.set(peer.id, ws);
        this.logger.info(`Connected to peer: ${peer.id}`);
        
        // Start heartbeat
        this.startPeerHeartbeat(peer.id);
      });
      
      ws.on('message', (data) => {
        peer.messagesReceived++;
        peer.lastSeen = Date.now();
        this.handlePeerMessage(peer.id, data);
      });
      
      ws.on('close', () => {
        peer.isConnected = false;
        this.connections.delete(peer.id);
        this.logger.warn(`Disconnected from peer: ${peer.id}`);
        
        // Attempt reconnection
        if (this.isMonitoring) {
          setTimeout(() => this.connectToPeer(peer), this.config.reconnectDelay);
        }
      });
      
      ws.on('error', (error) => {
        peer.errors++;
        peer.reputation = Math.max(0, peer.reputation - 5);
        this.logger.error(`WebSocket error for peer ${peer.id}`, error);
      });
      
    } catch (error) {
      this.logger.error(`Failed to connect to peer ${peer.id}`, error);
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      // Collect current network metrics
      const metrics = this.collectCurrentMetrics();
      this.recordMetrics(metrics);
      
    }, 30000); // Every 30 seconds
  }

  private startPeerHealthChecks(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      for (const peer of this.validatorPeers.values()) {
        this.checkPeerHealth(peer);
      }
      
    }, this.config.heartbeatInterval);
  }

  private startNetworkDiscovery(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      // Discover new peers and update topology
      this.discoverPeers();
      
    }, 60000); // Every minute
  }

  private startPerformanceAnalysis(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      // Analyze performance trends
      if (this.detectPerformanceDegradation()) {
        this.createAlert(
          NetworkAlertType.PERFORMANCE_DEGRADATION,
          'warning',
          'Network performance degradation detected'
        );
      }
      
    }, 300000); // Every 5 minutes
  }

  private startAlertProcessing(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;
      
      // Process and potentially auto-resolve alerts
      this.processAlerts();
      
    }, 60000); // Every minute
  }

  private collectCurrentMetrics(): Omit<NetworkMetrics, 'timestamp'> {
    const connectedPeers = this.getConnectedPeers();
    
    return {
      validatorId: 'network_monitor',
      latency: connectedPeers.reduce((sum, p) => sum + p.latency, 0) / Math.max(1, connectedPeers.length),
      throughput: this.calculateNetworkThroughput(),
      packetLoss: this.calculatePacketLoss(),
      connectionCount: connectedPeers.length,
      bandwidthUsage: this.calculateBandwidthUsage(),
      errorRate: this.calculateErrorRate(),
      consensusParticipation: this.calculateConsensusParticipation(),
    };
  }

  private checkPeerHealth(peer: ValidatorPeer): void {
    const now = Date.now();
    const timeSinceLastSeen = now - peer.lastSeen;
    
    // Check if peer is considered offline
    if (timeSinceLastSeen > this.config.heartbeatInterval * 2) {
      if (peer.isConnected) {
        peer.isConnected = false;
        this.createAlert(
          NetworkAlertType.VALIDATOR_OFFLINE,
          'warning',
          `Validator ${peer.id} appears to be offline`,
          peer.id
        );
      }
    }
    
    // Update connection quality based on recent performance
    peer.connectionQuality = this.calculateConnectionQuality(peer);
  }

  private calculateConnectionQuality(peer: ValidatorPeer): number {
    const factors = {
      latency: Math.max(0, 100 - peer.latency / 10),
      reliability: Math.max(0, 100 - peer.errors),
      uptime: peer.isConnected ? 100 : 0,
    };
    
    return Math.round(
      (factors.latency * 0.4 + factors.reliability * 0.3 + factors.uptime * 0.3)
    );
  }

  private startPeerHeartbeat(peerId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(peerId);
      const peer = this.validatorPeers.get(peerId);
      
      if (!connection || !peer || !peer.isConnected) {
        clearInterval(interval);
        return;
      }
      
      try {
        const heartbeat = {
          type: 'heartbeat',
          timestamp: Date.now(),
          from: 'network_monitor',
        };
        
        const startTime = Date.now();
        connection.send(JSON.stringify(heartbeat));
        
        // Measure latency when we get a response
        const responseHandler = (data: any) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'heartbeat_response') {
              peer.latency = Date.now() - startTime;
              connection.removeListener('message', responseHandler);
            }
          } catch {
            // Ignore malformed responses
          }
        };
        
        connection.once('message', responseHandler);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          connection.removeListener('message', responseHandler);
        }, 5000);
        
      } catch (error) {
        this.logger.error(`Failed to send heartbeat to ${peerId}`, error);
      }
      
    }, this.config.heartbeatInterval);
  }

  private handlePeerMessage(peerId: string, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'heartbeat':
          // Respond to heartbeat
          this.sendHeartbeatResponse(peerId);
          break;
          
        case 'metrics':
          // Process peer metrics
          this.processPeerMetrics(peerId, message.data);
          break;
          
        case 'alert':
          // Process peer alert
          this.processPeerAlert(peerId, message.data);
          break;
      }
      
    } catch (error) {
      this.logger.error(`Failed to parse message from ${peerId}`, error);
    }
  }

  private sendHeartbeatResponse(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      const response = {
        type: 'heartbeat_response',
        timestamp: Date.now(),
      };
      connection.send(JSON.stringify(response));
    }
  }

  private processPeerMetrics(peerId: string, metricsData: any): void {
    // Process metrics from peer
    this.logger.debug(`Received metrics from peer ${peerId}`, metricsData);
  }

  private processPeerAlert(peerId: string, alertData: any): void {
    // Process alert from peer
    this.logger.warn(`Received alert from peer ${peerId}`, alertData);
  }

  private updatePerformanceBaseline(metrics: NetworkMetrics): void {
    const baseline = this.performanceBaseline;
    
    // Exponential moving average
    const alpha = 0.1;
    baseline.averageLatency = baseline.averageLatency * (1 - alpha) + metrics.latency * alpha;
    baseline.averageThroughput = baseline.averageThroughput * (1 - alpha) + metrics.throughput * alpha;
    baseline.averagePacketLoss = baseline.averagePacketLoss * (1 - alpha) + metrics.packetLoss * alpha;
    baseline.sampleCount++;
  }

  private checkMetricsForAlerts(metrics: NetworkMetrics): void {
    // Check for high latency
    if (metrics.latency > this.config.latencyThreshold) {
      this.createAlert(
        NetworkAlertType.HIGH_LATENCY,
        'warning',
        `High latency detected: ${metrics.latency}ms`,
        metrics.validatorId,
        { latency: metrics.latency }
      );
    }
    
    // Check for packet loss
    if (metrics.packetLoss > this.config.packetLossThreshold) {
      this.createAlert(
        NetworkAlertType.PACKET_LOSS,
        'warning',
        `High packet loss detected: ${metrics.packetLoss}%`,
        metrics.validatorId,
        { packetLoss: metrics.packetLoss }
      );
    }
    
    // Check bandwidth usage
    const totalBandwidth = metrics.bandwidthUsage.incoming + metrics.bandwidthUsage.outgoing;
    if (totalBandwidth > this.config.bandwidthThreshold) {
      this.createAlert(
        NetworkAlertType.BANDWIDTH_EXCEEDED,
        'info',
        `High bandwidth usage: ${Math.round(totalBandwidth / 1024 / 1024)} MB/s`,
        metrics.validatorId,
        { bandwidthUsage: metrics.bandwidthUsage }
      );
    }
  }

  private detectNetworkPartitions(): number {
    // Simple partition detection based on connectivity patterns
    const connectedPeers = this.getConnectedPeers();
    const totalPeers = this.getAllPeers();
    
    if (totalPeers.length === 0) return 0;
    
    const connectivityRatio = connectedPeers.length / totalPeers.length;
    
    // If less than 67% of validators are connected, consider it a partition
    return connectivityRatio < 0.67 ? 1 : 0;
  }

  private calculateConsensusEfficiency(): number {
    // Calculate based on successful consensus rounds vs timeouts
    const recentMetrics = this.getRecentMetrics(1);
    if (recentMetrics.length === 0) return 1;
    
    const avgParticipation = recentMetrics.reduce((sum, m) => sum + m.consensusParticipation, 0) / recentMetrics.length;
    return avgParticipation / 100;
  }

  private calculateNetworkHealth(): number {
    const health = this.assessNetworkHealth();
    return health.overall;
  }

  private calculateNetworkThroughput(): number {
    // Calculate based on message exchange rates
    const connectedPeers = this.getConnectedPeers();
    return connectedPeers.reduce((sum, peer) => sum + peer.messagesReceived + peer.messagesSent, 0);
  }

  private calculatePacketLoss(): number {
    // Calculate based on failed message attempts
    const peers = this.getAllPeers();
    if (peers.length === 0) return 0;
    
    const totalMessages = peers.reduce((sum, peer) => sum + peer.messagesSent, 0);
    const totalErrors = peers.reduce((sum, peer) => sum + peer.errors, 0);
    
    return totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;
  }

  private calculateBandwidthUsage(): { incoming: number; outgoing: number } {
    // Estimate bandwidth usage
    return {
      incoming: 1024 * 1024, // 1 MB/s placeholder
      outgoing: 512 * 1024,   // 512 KB/s placeholder
    };
  }

  private calculateErrorRate(): number {
    const peers = this.getAllPeers();
    if (peers.length === 0) return 0;
    
    const totalErrors = peers.reduce((sum, peer) => sum + peer.errors, 0);
    return totalErrors / peers.length;
  }

  private calculateConsensusParticipation(): number {
    // Calculate based on active participation in consensus
    const connectedPeers = this.getConnectedPeers();
    const totalPeers = this.getAllPeers();
    
    if (totalPeers.length === 0) return 0;
    
    return (connectedPeers.length / totalPeers.length) * 100;
  }

  private discoverPeers(): void {
    // Peer discovery logic - would integrate with validator registry
    this.logger.debug('Running peer discovery');
  }

  private processAlerts(): void {
    // Process and potentially auto-resolve alerts
    const activeAlerts = this.getActiveAlerts();
    
    for (const alert of activeAlerts) {
      // Auto-resolve alerts that are no longer relevant
      if (this.shouldAutoResolveAlert(alert)) {
        this.resolveAlert(alert.id);
      }
    }
  }

  private shouldAutoResolveAlert(alert: NetworkAlert): boolean {
    const alertAge = Date.now() - alert.timestamp;
    
    // Auto-resolve alerts older than 1 hour if conditions have improved
    if (alertAge > 60 * 60 * 1000) {
      switch (alert.type) {
        case NetworkAlertType.HIGH_LATENCY:
        case NetworkAlertType.PACKET_LOSS:
        case NetworkAlertType.PERFORMANCE_DEGRADATION:
          return true; // These should resolve themselves if conditions improve
        default:
          return false;
      }
    }
    
    return false;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 8)}`;
  }
}

export default NetworkMonitor;