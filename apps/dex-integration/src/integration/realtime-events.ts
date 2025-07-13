// Real-time Event System - WebSocket-based live updates for mining pool and bridge operations

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import WebSocket from 'ws';

export interface RealtimeConfig {
  // WebSocket server configuration
  websocket: {
    port: number;
    host: string;
    enableSSL: boolean;
    certPath?: string;
    keyPath?: string;
    maxConnections: number;
    pingInterval: number; // seconds
    connectionTimeout: number; // seconds
  };
  
  // Event filtering and routing
  events: {
    enableFiltering: boolean;
    enableRateLimiting: boolean;
    maxEventsPerSecond: number;
    bufferSize: number;
    enableCompression: boolean;
  };
  
  // Authentication and authorization
  auth: {
    enableAuthentication: boolean;
    jwtSecret: string;
    sessionTimeout: number; // seconds
    enableRoleBasedAccess: boolean;
  };
  
  // Monitoring and metrics
  monitoring: {
    enableMetrics: boolean;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsInterval: number; // seconds
  };
  
  // Performance optimization
  performance: {
    enableClustering: boolean;
    enableRedisAdapter: boolean;
    redisUrl?: string;
    enableMessageQueue: boolean;
    queueUrl?: string;
  };
}

export type EventType = 
  // Mining events
  | 'miner_connected' | 'miner_disconnected' | 'worker_status_changed'
  | 'share_submitted' | 'share_accepted' | 'share_rejected'
  | 'block_found' | 'payout_processed' | 'payout_failed'
  | 'hashrate_updated' | 'difficulty_adjusted'
  
  // Bridge events
  | 'bridge_transaction_initiated' | 'bridge_transaction_completed' | 'bridge_transaction_failed'
  | 'validator_status_changed' | 'bridge_paused' | 'bridge_resumed'
  | 'liquidity_added' | 'liquidity_removed' | 'arbitrage_opportunity'
  
  // Trading events
  | 'trade_executed' | 'order_placed' | 'order_cancelled' | 'order_filled'
  | 'price_updated' | 'market_data_updated'
  
  // System events
  | 'system_status_changed' | 'maintenance_started' | 'maintenance_ended'
  | 'alert_triggered' | 'alert_resolved'
  
  // User events
  | 'user_login' | 'user_logout' | 'preferences_updated'
  | 'notification_sent' | 'notification_read';

export interface RealtimeEvent {
  // Event identification
  id: string;
  type: EventType;
  timestamp: number;
  
  // Event source
  source: {
    system: 'mining_pool' | 'bridge' | 'trading' | 'system' | 'user';
    component: string;
    version: string;
  };
  
  // Event payload
  data: Record<string, any>;
  
  // Routing information
  routing: {
    targetUsers?: string[];
    targetRoles?: string[];
    targetChannels?: string[];
    isGlobal: boolean;
    requiresAuth: boolean;
  };
  
  // Metadata
  metadata: {
    priority: 'low' | 'normal' | 'high' | 'critical';
    category: string;
    tags: string[];
    correlationId?: string;
    sessionId?: string;
  };
  
  // Delivery tracking
  delivery: {
    attempts: number;
    maxAttempts: number;
    lastAttempt?: number;
    deliveredTo: string[];
    failedDeliveries: string[];
  };
}

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  userId?: string;
  roles: string[];
  subscriptions: EventSubscription[];
  
  // Connection metadata
  connectedAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  
  // Authentication
  isAuthenticated: boolean;
  sessionToken?: string;
  tokenExpiry?: number;
  
  // Performance tracking
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  averageLatency: number;
  
  // Rate limiting
  eventRateLimit: number;
  lastEventTime: number;
  eventCount: number;
}

export interface EventSubscription {
  id: string;
  clientId: string;
  eventTypes: EventType[];
  filters: EventFilter[];
  isActive: boolean;
  createdAt: number;
  lastDelivery?: number;
}

export interface EventFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  caseSensitive?: boolean;
}

export interface RealtimeMetrics {
  // Connection metrics
  totalConnections: number;
  authenticatedConnections: number;
  averageConnectionDuration: number;
  connectionRate: number;
  disconnectionRate: number;
  
  // Event metrics
  totalEventsProcessed: number;
  eventsPerSecond: number;
  eventDeliveryRate: number;
  failedDeliveries: number;
  averageDeliveryLatency: number;
  
  // Performance metrics
  memoryUsage: number;
  cpuUsage: number;
  networkThroughput: number;
  messageQueueDepth: number;
  
  // Error metrics
  authenticationFailures: number;
  connectionErrors: number;
  messageErrors: number;
  systemErrors: number;
}

export interface EventHistory {
  id: string;
  event: RealtimeEvent;
  deliveryStatus: 'pending' | 'delivered' | 'failed' | 'expired';
  deliveredAt?: number;
  deliveredTo: string[];
  failureReason?: string;
  retryCount: number;
}

export class RealtimeEventSystem {
  private config: RealtimeConfig;
  private logger: Logger;
  private server?: WebSocket.Server;
  private connections: Map<string, ClientConnection> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: RealtimeEvent[] = [];
  private eventHistory: Map<string, EventHistory> = new Map();
  private metrics: RealtimeMetrics;
  private isRunning: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: RealtimeConfig) {
    this.config = config;
    this.logger = new Logger('RealtimeEventSystem');
    this.initializeMetrics();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Realtime event system is already running');
    }

    this.logger.info('Starting realtime event system');
    this.isRunning = true;

    try {
      // Start WebSocket server
      await this.startWebSocketServer();
      
      // Start event processing
      this.startEventProcessing();
      
      // Start metrics collection
      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }
      
      // Start connection health monitoring
      this.startConnectionMonitoring();
      
      this.logger.info('Realtime event system started successfully', {
        port: this.config.websocket.port,
        host: this.config.websocket.host
      });
      
    } catch (error) {
      this.isRunning = false;
      this.logger.error('Failed to start realtime event system', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping realtime event system');
    this.isRunning = false;

    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.socket.close();
    }

    // Close WebSocket server
    if (this.server) {
      this.server.close();
    }

    this.logger.info('Realtime event system stopped');
  }

  async publishEvent(event: Partial<RealtimeEvent>): Promise<string> {
    const fullEvent: RealtimeEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      source: {
        system: 'system',
        component: 'unknown',
        version: '1.0.0',
        ...event.source
      },
      data: event.data || {},
      routing: {
        isGlobal: false,
        requiresAuth: false,
        ...event.routing
      },
      metadata: {
        priority: 'normal',
        category: 'general',
        tags: [],
        ...event.metadata
      },
      delivery: {
        attempts: 0,
        maxAttempts: 3,
        deliveredTo: [],
        failedDeliveries: []
      },
      ...event
    } as RealtimeEvent;

    // Add to queue for processing
    this.eventQueue.push(fullEvent);

    // Add to history
    this.eventHistory.set(fullEvent.id, {
      id: fullEvent.id,
      event: fullEvent,
      deliveryStatus: 'pending',
      deliveredTo: [],
      retryCount: 0
    });

    this.logger.debug(`Event queued for delivery: ${fullEvent.type}`, {
      eventId: fullEvent.id,
      priority: fullEvent.metadata.priority
    });

    return fullEvent.id;
  }

  async subscribeToEvents(
    clientId: string, 
    eventTypes: EventType[], 
    filters: EventFilter[] = []
  ): Promise<string> {
    const connection = this.connections.get(clientId);
    if (!connection) {
      throw new Error(`Client ${clientId} not found`);
    }

    const subscriptionId = this.generateSubscriptionId();
    const subscription: EventSubscription = {
      id: subscriptionId,
      clientId,
      eventTypes,
      filters,
      isActive: true,
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);
    connection.subscriptions.push(subscription);

    this.logger.info(`Client subscribed to events`, {
      clientId,
      subscriptionId,
      eventTypes: eventTypes.length,
      filters: filters.length
    });

    return subscriptionId;
  }

  async unsubscribeFromEvents(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const connection = this.connections.get(subscription.clientId);
    if (connection) {
      connection.subscriptions = connection.subscriptions.filter(s => s.id !== subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);

    this.logger.info(`Unsubscribed from events`, { subscriptionId });
  }

  async authenticateClient(clientId: string, token: string): Promise<boolean> {
    const connection = this.connections.get(clientId);
    if (!connection) {
      return false;
    }

    try {
      // Verify JWT token (implementation would use actual JWT verification)
      const decoded = this.verifyJWT(token);
      
      connection.isAuthenticated = true;
      connection.sessionToken = token;
      connection.tokenExpiry = decoded.exp * 1000;
      connection.userId = decoded.userId;
      connection.roles = decoded.roles || [];

      this.logger.info(`Client authenticated`, {
        clientId,
        userId: connection.userId,
        roles: connection.roles
      });

      return true;

    } catch (error) {
      this.logger.warn(`Authentication failed for client ${clientId}`, error);
      this.metrics.authenticationFailures++;
      return false;
    }
  }

  async getConnectedClients(): Promise<ClientConnection[]> {
    return Array.from(this.connections.values()).map(conn => ({
      ...conn,
      socket: undefined as any // Don't expose socket object
    }));
  }

  async getEventHistory(limit: number = 100, eventType?: EventType): Promise<EventHistory[]> {
    let history = Array.from(this.eventHistory.values());
    
    if (eventType) {
      history = history.filter(h => h.event.type === eventType);
    }

    return history
      .sort((a, b) => b.event.timestamp - a.event.timestamp)
      .slice(0, limit);
  }

  async getMetrics(): Promise<RealtimeMetrics> {
    return { ...this.metrics };
  }

  async broadcastSystemAlert(
    alertType: 'info' | 'warning' | 'error' | 'critical',
    title: string,
    message: string,
    targetRoles?: string[]
  ): Promise<string> {
    return await this.publishEvent({
      type: 'alert_triggered',
      data: {
        alertType,
        title,
        message,
        timestamp: Date.now()
      },
      routing: {
        isGlobal: !targetRoles,
        targetRoles: targetRoles,
        requiresAuth: true
      },
      metadata: {
        priority: alertType === 'critical' ? 'critical' : alertType === 'error' ? 'high' : 'normal',
        category: 'system',
        tags: ['alert', alertType]
      }
    });
  }

  // Mining pool specific events
  async publishMiningEvent(eventType: EventType, data: any, userId?: string): Promise<string> {
    return await this.publishEvent({
      type: eventType,
      source: {
        system: 'mining_pool',
        component: 'mining_engine',
        version: '1.0.0'
      },
      data,
      routing: {
        targetUsers: userId ? [userId] : undefined,
        isGlobal: !userId,
        requiresAuth: true
      },
      metadata: {
        priority: this.getMiningEventPriority(eventType),
        category: 'mining',
        tags: ['mining', eventType]
      }
    });
  }

  // Bridge specific events
  async publishBridgeEvent(eventType: EventType, data: any, userId?: string): Promise<string> {
    return await this.publishEvent({
      type: eventType,
      source: {
        system: 'bridge',
        component: 'bridge_processor',
        version: '1.0.0'
      },
      data,
      routing: {
        targetUsers: userId ? [userId] : undefined,
        isGlobal: !userId,
        requiresAuth: true
      },
      metadata: {
        priority: this.getBridgeEventPriority(eventType),
        category: 'bridge',
        tags: ['bridge', eventType]
      }
    });
  }

  // Trading specific events
  async publishTradingEvent(eventType: EventType, data: any, userId?: string): Promise<string> {
    return await this.publishEvent({
      type: eventType,
      source: {
        system: 'trading',
        component: 'trading_engine',
        version: '1.0.0'
      },
      data,
      routing: {
        targetUsers: userId ? [userId] : undefined,
        isGlobal: !userId,
        requiresAuth: true
      },
      metadata: {
        priority: 'normal',
        category: 'trading',
        tags: ['trading', eventType]
      }
    });
  }

  private async startWebSocketServer(): Promise<void> {
    const serverOptions: WebSocket.ServerOptions = {
      port: this.config.websocket.port,
      host: this.config.websocket.host,
      maxPayload: 1024 * 1024, // 1MB
      perMessageDeflate: this.config.events.enableCompression
    };

    this.server = new WebSocket.Server(serverOptions);

    this.server.on('connection', (socket, request) => {
      this.handleNewConnection(socket, request);
    });

    this.server.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
      this.metrics.systemErrors++;
    });

    this.logger.info(`WebSocket server listening on ${this.config.websocket.host}:${this.config.websocket.port}`);
  }

  private handleNewConnection(socket: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    const connection: ClientConnection = {
      id: clientId,
      socket,
      roles: [],
      subscriptions: [],
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: request.socket.remoteAddress || 'unknown',
      userAgent: request.headers['user-agent'] || 'unknown',
      isAuthenticated: false,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
      averageLatency: 0,
      eventRateLimit: this.config.events.maxEventsPerSecond,
      lastEventTime: 0,
      eventCount: 0
    };

    this.connections.set(clientId, connection);
    this.metrics.totalConnections++;

    this.logger.info(`New client connected`, {
      clientId,
      ipAddress: connection.ipAddress,
      totalConnections: this.connections.size
    });

    // Set up socket event handlers
    socket.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleClientDisconnection(clientId);
    });

    socket.on('error', (error) => {
      this.logger.error(`Client socket error: ${clientId}`, error);
      this.metrics.connectionErrors++;
    });

    socket.on('pong', () => {
      connection.lastActivity = Date.now();
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      data: {
        clientId,
        serverTime: Date.now(),
        maxEventRate: this.config.events.maxEventsPerSecond
      }
    });
  }

  private handleClientMessage(clientId: string, data: WebSocket.Data): void {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    try {
      const message = JSON.parse(data.toString());
      connection.messagesReceived++;
      connection.lastActivity = Date.now();

      this.logger.debug(`Received message from client ${clientId}`, { type: message.type });

      switch (message.type) {
        case 'authenticate':
          this.handleAuthenticationMessage(clientId, message);
          break;
        case 'subscribe':
          this.handleSubscriptionMessage(clientId, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribeMessage(clientId, message);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', data: { timestamp: Date.now() } });
          break;
        default:
          this.logger.warn(`Unknown message type from client ${clientId}`, { type: message.type });
      }

    } catch (error) {
      this.logger.error(`Failed to parse message from client ${clientId}`, error);
      this.metrics.messageErrors++;
    }
  }

  private handleClientDisconnection(clientId: string): void {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    // Clean up subscriptions
    for (const subscription of connection.subscriptions) {
      this.subscriptions.delete(subscription.id);
    }

    this.connections.delete(clientId);

    const duration = Date.now() - connection.connectedAt;
    this.logger.info(`Client disconnected`, {
      clientId,
      duration,
      messagesSent: connection.messagesSent,
      messagesReceived: connection.messagesReceived
    });
  }

  private async handleAuthenticationMessage(clientId: string, message: any): Promise<void> {
    const success = await this.authenticateClient(clientId, message.token);
    
    this.sendToClient(clientId, {
      type: 'authentication_result',
      data: { success, clientId }
    });
  }

  private async handleSubscriptionMessage(clientId: string, message: any): Promise<void> {
    try {
      const subscriptionId = await this.subscribeToEvents(
        clientId,
        message.eventTypes || [],
        message.filters || []
      );

      this.sendToClient(clientId, {
        type: 'subscription_created',
        data: { subscriptionId, eventTypes: message.eventTypes }
      });

    } catch (error) {
      this.sendToClient(clientId, {
        type: 'subscription_error',
        data: { error: error.message }
      });
    }
  }

  private async handleUnsubscribeMessage(clientId: string, message: any): Promise<void> {
    try {
      await this.unsubscribeFromEvents(message.subscriptionId);
      
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        data: { subscriptionId: message.subscriptionId }
      });

    } catch (error) {
      this.sendToClient(clientId, {
        type: 'unsubscribe_error',
        data: { error: error.message }
      });
    }
  }

  private startEventProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processEventQueue();
    }, 100); // Process every 100ms
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, this.config.events.bufferSize);
    
    for (const event of events) {
      try {
        await this.deliverEvent(event);
        this.metrics.totalEventsProcessed++;
      } catch (error) {
        this.logger.error(`Failed to deliver event ${event.id}`, error);
        this.metrics.failedDeliveries++;
      }
    }
  }

  private async deliverEvent(event: RealtimeEvent): Promise<void> {
    const targetConnections = this.findTargetConnections(event);
    const history = this.eventHistory.get(event.id);
    
    if (!history) return;

    let deliveredCount = 0;
    
    for (const connection of targetConnections) {
      if (this.shouldDeliverToConnection(event, connection)) {
        try {
          await this.sendEventToClient(connection.id, event);
          history.deliveredTo.push(connection.id);
          deliveredCount++;
        } catch (error) {
          this.logger.error(`Failed to deliver event to client ${connection.id}`, error);
          history.failedDeliveries.push(connection.id);
        }
      }
    }

    history.deliveryStatus = deliveredCount > 0 ? 'delivered' : 'failed';
    history.deliveredAt = Date.now();

    if (deliveredCount === 0 && history.retryCount < event.delivery.maxAttempts) {
      // Retry delivery
      history.retryCount++;
      this.eventQueue.push(event);
    }
  }

  private findTargetConnections(event: RealtimeEvent): ClientConnection[] {
    const connections = Array.from(this.connections.values());

    if (event.routing.isGlobal) {
      return connections.filter(c => c.isAuthenticated || !event.routing.requiresAuth);
    }

    let targetConnections: ClientConnection[] = [];

    // Filter by target users
    if (event.routing.targetUsers && event.routing.targetUsers.length > 0) {
      targetConnections = connections.filter(c => 
        c.userId && event.routing.targetUsers!.includes(c.userId)
      );
    }

    // Filter by target roles
    if (event.routing.targetRoles && event.routing.targetRoles.length > 0) {
      const roleConnections = connections.filter(c =>
        c.roles.some(role => event.routing.targetRoles!.includes(role))
      );
      targetConnections = [...targetConnections, ...roleConnections];
    }

    // Remove duplicates
    return Array.from(new Set(targetConnections));
  }

  private shouldDeliverToConnection(event: RealtimeEvent, connection: ClientConnection): boolean {
    // Check authentication requirement
    if (event.routing.requiresAuth && !connection.isAuthenticated) {
      return false;
    }

    // Check if client has subscription for this event type
    const hasSubscription = connection.subscriptions.some(sub =>
      sub.isActive && 
      sub.eventTypes.includes(event.type) &&
      this.eventMatchesFilters(event, sub.filters)
    );

    if (!hasSubscription) {
      return false;
    }

    // Check rate limiting
    return this.checkRateLimit(connection);
  }

  private eventMatchesFilters(event: RealtimeEvent, filters: EventFilter[]): boolean {
    if (filters.length === 0) return true;

    return filters.every(filter => {
      const value = this.getNestedValue(event.data, filter.field);
      return this.evaluateFilter(value, filter);
    });
  }

  private evaluateFilter(value: any, filter: EventFilter): boolean {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        return String(value).includes(String(filter.value));
      case 'starts_with':
        return String(value).startsWith(String(filter.value));
      case 'ends_with':
        return String(value).endsWith(String(filter.value));
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private checkRateLimit(connection: ClientConnection): boolean {
    const now = Date.now();
    const windowMs = 1000; // 1 second window

    if (now - connection.lastEventTime > windowMs) {
      connection.eventCount = 0;
      connection.lastEventTime = now;
    }

    if (connection.eventCount >= connection.eventRateLimit) {
      return false;
    }

    connection.eventCount++;
    return true;
  }

  private async sendEventToClient(clientId: string, event: RealtimeEvent): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    const message = {
      type: 'event',
      event: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data,
        metadata: event.metadata
      }
    };

    await this.sendToClient(clientId, message);
  }

  private async sendToClient(clientId: string, message: any): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const data = JSON.stringify(message);
      connection.socket.send(data);
      connection.messagesSent++;
      connection.bytesTransferred += data.length;

    } catch (error) {
      this.logger.error(`Failed to send message to client ${clientId}`, error);
      throw error;
    }
  }

  private startConnectionMonitoring(): void {
    setInterval(() => {
      this.monitorConnections();
    }, this.config.websocket.pingInterval * 1000);
  }

  private monitorConnections(): void {
    const now = Date.now();
    const timeout = this.config.websocket.connectionTimeout * 1000;

    for (const [clientId, connection] of this.connections.entries()) {
      // Check for inactive connections
      if (now - connection.lastActivity > timeout) {
        this.logger.info(`Closing inactive connection: ${clientId}`);
        connection.socket.close();
        continue;
      }

      // Send ping to active connections
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      }
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, this.config.monitoring.metricsInterval * 1000);
  }

  private updateMetrics(): void {
    const connections = Array.from(this.connections.values());
    
    this.metrics.totalConnections = connections.length;
    this.metrics.authenticatedConnections = connections.filter(c => c.isAuthenticated).length;
    this.metrics.messageQueueDepth = this.eventQueue.length;
    
    // Calculate average connection duration
    const now = Date.now();
    const totalDuration = connections.reduce((sum, c) => sum + (now - c.connectedAt), 0);
    this.metrics.averageConnectionDuration = connections.length > 0 
      ? totalDuration / connections.length 
      : 0;
  }

  private getMiningEventPriority(eventType: EventType): RealtimeEvent['metadata']['priority'] {
    switch (eventType) {
      case 'block_found':
        return 'high';
      case 'payout_failed':
        return 'high';
      case 'miner_disconnected':
        return 'normal';
      default:
        return 'normal';
    }
  }

  private getBridgeEventPriority(eventType: EventType): RealtimeEvent['metadata']['priority'] {
    switch (eventType) {
      case 'bridge_transaction_failed':
        return 'high';
      case 'bridge_paused':
        return 'critical';
      case 'validator_status_changed':
        return 'high';
      default:
        return 'normal';
    }
  }

  private verifyJWT(token: string): any {
    // Implementation would use actual JWT verification
    // For now, return mock decoded token
    return {
      userId: 'user123',
      roles: ['user'],
      exp: Date.now() / 1000 + 3600 // 1 hour from now
    };
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      authenticatedConnections: 0,
      averageConnectionDuration: 0,
      connectionRate: 0,
      disconnectionRate: 0,
      totalEventsProcessed: 0,
      eventsPerSecond: 0,
      eventDeliveryRate: 0,
      failedDeliveries: 0,
      averageDeliveryLatency: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkThroughput: 0,
      messageQueueDepth: 0,
      authenticationFailures: 0,
      connectionErrors: 0,
      messageErrors: 0,
      systemErrors: 0
    };
  }
}