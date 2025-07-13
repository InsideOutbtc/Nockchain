// Enterprise API gateway with load balancing, caching, and advanced routing

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface EnterpriseGatewayConfig {
  // Gateway settings
  enableLoadBalancing: boolean;
  enableCaching: boolean;
  enableRateLimiting: boolean;
  enableCircuitBreaker: boolean;
  
  // Load balancing
  loadBalancing: {
    algorithm: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'ip_hash';
    healthCheckInterval: number; // seconds
    unhealthyThreshold: number;
    healthyThreshold: number;
    maxRetries: number;
    retryDelay: number; // milliseconds
  };
  
  // Backend services
  backends: BackendService[];
  
  // Caching configuration
  caching: {
    enableRedis: boolean;
    enableMemory: boolean;
    defaultTTL: number; // seconds
    maxSize: number; // MB
    compressionEnabled: boolean;
    cachingStrategies: CachingStrategy[];
  };
  
  // Rate limiting
  rateLimiting: {
    windowSize: number; // seconds
    requestLimit: number;
    enableDistributed: boolean;
    keyGenerator: 'ip' | 'user' | 'api_key' | 'custom';
    enableBurstAllowance: boolean;
    burstSize: number;
  };
  
  // Circuit breaker
  circuitBreaker: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number; // milliseconds
    monitoringPeriod: number; // seconds
  };
  
  // Security features
  security: {
    enableCORS: boolean;
    corsOrigins: string[];
    enableRequestSigning: boolean;
    enableEncryption: boolean;
    enableDDoSProtection: boolean;
    maxRequestSize: number; // bytes
    enableSQLInjectionProtection: boolean;
    enableXSSProtection: boolean;
  };
  
  // Monitoring and observability
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    metricsPort: number;
    tracingSampleRate: number;
  };
  
  // WebSocket support
  websocket: {
    enabled: boolean;
    maxConnections: number;
    heartbeatInterval: number; // seconds
    messageQueueSize: number;
    enableCompression: boolean;
  };
}

export interface BackendService {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  
  // Health and routing
  healthCheckPath: string;
  weight: number;
  priority: number;
  timeout: number; // milliseconds
  
  // Service capabilities
  capabilities: string[];
  apiVersion: string;
  
  // Load balancing
  maxConnections: number;
  currentConnections: number;
  
  // Health status
  status: 'healthy' | 'unhealthy' | 'degraded' | 'maintenance';
  lastHealthCheck: number;
  consecutiveFailures: number;
  
  // Metadata
  region: string;
  datacenter: string;
  tags: Record<string, string>;
}

export interface CachingStrategy {
  pattern: string; // URL pattern or regex
  ttl: number; // seconds
  vary: string[]; // headers to vary cache by
  invalidationTags: string[];
  enabled: boolean;
}

export interface GatewayRequest {
  id: string;
  timestamp: number;
  
  // Request details
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  
  // Client information
  clientIP: string;
  userAgent: string;
  apiKey?: string;
  userId?: string;
  
  // Routing information
  backend?: string;
  route?: RouteDefinition;
  
  // Processing metadata
  processingTime: number;
  cacheHit: boolean;
  retryCount: number;
  
  // Security
  riskScore: number;
  blocked: boolean;
  blockReason?: string;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  
  // Metadata
  processingTime: number;
  backend: string;
  cacheHit: boolean;
  compressed: boolean;
  
  // Tracing
  traceId: string;
  spanId: string;
}

export interface RouteDefinition {
  id: string;
  pattern: string;
  method: string;
  backend: string;
  
  // Routing options
  pathRewrite?: string;
  stripPath?: boolean;
  preserveHost?: boolean;
  
  // Middleware
  middleware: string[];
  
  // Caching
  cachingEnabled: boolean;
  cacheTTL?: number;
  
  // Rate limiting
  rateLimitOverride?: {
    requestLimit: number;
    windowSize: number;
  };
  
  // Security
  requireAuth: boolean;
  requiredScopes: string[];
  
  // Metadata
  description: string;
  tags: string[];
  deprecated: boolean;
}

export interface LoadBalancerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  
  // Backend statistics
  backendStats: Map<string, BackendStats>;
  
  // Current state
  activeConnections: number;
  queuedRequests: number;
  circuitBreakerStatus: 'closed' | 'open' | 'half_open';
}

export interface BackendStats {
  requests: number;
  successes: number;
  failures: number;
  averageResponseTime: number;
  currentConnections: number;
  lastResponseTime: number;
  healthScore: number;
}

export interface CacheStats {
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  memoryUsage: number;
  entryCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface WebSocketConnection {
  id: string;
  clientIP: string;
  userAgent: string;
  connectedAt: number;
  lastActivity: number;
  subscriptions: string[];
  messagesSent: number;
  messagesReceived: number;
  status: 'connected' | 'disconnected' | 'error';
}

export interface WebSocketMessage {
  id: string;
  connectionId: string;
  type: 'subscribe' | 'unsubscribe' | 'data' | 'ping' | 'pong' | 'error';
  channel?: string;
  data: any;
  timestamp: number;
}

export class EnterpriseGateway {
  private config: EnterpriseGatewayConfig;
  private logger: Logger;
  
  // Core components
  private loadBalancer: LoadBalancer;
  private cache: GatewayCache;
  private rateLimiter: GatewayRateLimiter;
  private circuitBreaker: GatewayCircuitBreaker;
  private router: APIRouter;
  private websocketManager: WebSocketManager;
  
  // Service state
  private isActive: boolean = false;
  private startTime: number = 0;
  private stats: LoadBalancerStats;
  
  // Request tracking
  private activeRequests: Map<string, GatewayRequest> = new Map();
  private requestHistory: GatewayRequest[] = [];
  
  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: EnterpriseGatewayConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize components
    this.loadBalancer = new LoadBalancer(config.loadBalancing, config.backends, logger);
    this.cache = new GatewayCache(config.caching, logger);
    this.rateLimiter = new GatewayRateLimiter(config.rateLimiting, logger);
    this.circuitBreaker = new GatewayCircuitBreaker(config.circuitBreaker, logger);
    this.router = new APIRouter(logger);
    this.websocketManager = new WebSocketManager(config.websocket, logger);
    
    // Initialize stats
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      backendStats: new Map(),
      activeConnections: 0,
      queuedRequests: 0,
      circuitBreakerStatus: 'closed',
    };
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Enterprise gateway already active');
      return;
    }

    this.logger.info('Starting enterprise API gateway', {
      enableLoadBalancing: this.config.enableLoadBalancing,
      enableCaching: this.config.enableCaching,
      enableRateLimiting: this.config.enableRateLimiting,
      backendCount: this.config.backends.length,
    });

    try {
      // Start core components
      await this.loadBalancer.start();
      await this.cache.start();
      await this.rateLimiter.start();
      await this.circuitBreaker.start();
      await this.router.start();
      
      if (this.config.websocket.enabled) {
        await this.websocketManager.start();
      }
      
      // Initialize routes
      await this.initializeRoutes();
      
      // Start monitoring
      this.isActive = true;
      this.startTime = Date.now();
      this.startMonitoring();

      this.logger.info('Enterprise gateway started successfully', {
        backends: this.config.backends.length,
        routes: this.router.getRouteCount(),
      });

    } catch (error) {
      this.logger.error('Failed to start enterprise gateway', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Enterprise gateway not active');
      return;
    }

    this.logger.info('Stopping enterprise gateway');

    try {
      // Stop monitoring
      this.stopMonitoring();
      
      // Stop components
      await this.websocketManager.stop();
      await this.router.stop();
      await this.circuitBreaker.stop();
      await this.rateLimiter.stop();
      await this.cache.stop();
      await this.loadBalancer.stop();

      this.isActive = false;
      
      this.logger.info('Enterprise gateway stopped successfully', {
        uptime: Date.now() - this.startTime,
        totalRequestsProcessed: this.stats.totalRequests,
      });

    } catch (error) {
      this.logger.error('Failed to stop enterprise gateway gracefully', error);
      this.isActive = false;
    }
  }

  async handleRequest(request: Partial<GatewayRequest>): Promise<GatewayResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const fullRequest: GatewayRequest = {
      id: requestId,
      timestamp: startTime,
      method: request.method || 'GET',
      path: request.path || '/',
      query: request.query || {},
      headers: request.headers || {},
      body: request.body,
      clientIP: request.clientIP || '0.0.0.0',
      userAgent: request.userAgent || 'unknown',
      apiKey: request.apiKey,
      userId: request.userId,
      processingTime: 0,
      cacheHit: false,
      retryCount: 0,
      riskScore: 0,
      blocked: false,
    };

    this.activeRequests.set(requestId, fullRequest);
    this.stats.totalRequests++;

    try {
      // Security screening
      const securityResult = await this.performSecurityScreening(fullRequest);
      if (securityResult.blocked) {
        return this.createErrorResponse(requestId, 403, 'Request blocked', securityResult.reason);
      }

      // Rate limiting
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await this.rateLimiter.checkLimit(fullRequest);
        if (!rateLimitResult.allowed) {
          return this.createErrorResponse(requestId, 429, 'Rate limit exceeded', undefined, {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': (rateLimitResult.retryAfter || 60).toString(),
          });
        }
      }

      // Route resolution
      const route = await this.router.resolveRoute(fullRequest);
      if (!route) {
        return this.createErrorResponse(requestId, 404, 'Route not found');
      }
      fullRequest.route = route;

      // Cache check
      let cacheKey: string | null = null;
      if (this.config.enableCaching && route.cachingEnabled) {
        cacheKey = this.generateCacheKey(fullRequest);
        const cachedResponse = await this.cache.get(cacheKey);
        if (cachedResponse) {
          fullRequest.cacheHit = true;
          fullRequest.processingTime = Date.now() - startTime;
          this.stats.successfulRequests++;
          return this.enhanceResponse(cachedResponse, fullRequest);
        }
      }

      // Circuit breaker check
      if (this.config.enableCircuitBreaker) {
        const circuitOpen = await this.circuitBreaker.isOpen(route.backend);
        if (circuitOpen) {
          return this.createErrorResponse(requestId, 503, 'Service temporarily unavailable');
        }
      }

      // Load balancing and backend selection
      const backend = await this.loadBalancer.selectBackend(route.backend);
      if (!backend) {
        return this.createErrorResponse(requestId, 503, 'No healthy backends available');
      }
      fullRequest.backend = backend.id;

      // Forward request to backend
      const response = await this.forwardRequest(fullRequest, backend);
      
      // Cache response if applicable
      if (cacheKey && response.statusCode < 400) {
        await this.cache.set(cacheKey, response, route.cacheTTL);
      }

      // Update circuit breaker
      if (this.config.enableCircuitBreaker) {
        if (response.statusCode >= 500) {
          await this.circuitBreaker.recordFailure(backend.id);
        } else {
          await this.circuitBreaker.recordSuccess(backend.id);
        }
      }

      // Update statistics
      fullRequest.processingTime = Date.now() - startTime;
      if (response.statusCode < 400) {
        this.stats.successfulRequests++;
      } else {
        this.stats.failedRequests++;
      }

      return this.enhanceResponse(response, fullRequest);

    } catch (error) {
      this.logger.error('Request processing failed', error, { requestId });
      this.stats.failedRequests++;
      return this.createErrorResponse(requestId, 500, 'Internal server error');
    } finally {
      this.activeRequests.delete(requestId);
      this.requestHistory.push(fullRequest);
      this.applyHistoryRetention();
    }
  }

  async addRoute(route: RouteDefinition): Promise<void> {
    await this.router.addRoute(route);
    this.logger.info('Route added to gateway', {
      routeId: route.id,
      pattern: route.pattern,
      backend: route.backend,
    });
  }

  async removeRoute(routeId: string): Promise<void> {
    await this.router.removeRoute(routeId);
    this.logger.info('Route removed from gateway', { routeId });
  }

  async addBackend(backend: BackendService): Promise<void> {
    await this.loadBalancer.addBackend(backend);
    this.stats.backendStats.set(backend.id, {
      requests: 0,
      successes: 0,
      failures: 0,
      averageResponseTime: 0,
      currentConnections: 0,
      lastResponseTime: 0,
      healthScore: 1.0,
    });
    
    this.logger.info('Backend added to gateway', {
      backendId: backend.id,
      host: backend.host,
      port: backend.port,
    });
  }

  async removeBackend(backendId: string): Promise<void> {
    await this.loadBalancer.removeBackend(backendId);
    this.stats.backendStats.delete(backendId);
    this.logger.info('Backend removed from gateway', { backendId });
  }

  async handleWebSocketConnection(connectionInfo: Partial<WebSocketConnection>): Promise<string> {
    if (!this.config.websocket.enabled) {
      throw new Error('WebSocket support not enabled');
    }

    return await this.websocketManager.handleConnection(connectionInfo);
  }

  async handleWebSocketMessage(message: WebSocketMessage): Promise<void> {
    if (!this.config.websocket.enabled) {
      throw new Error('WebSocket support not enabled');
    }

    await this.websocketManager.handleMessage(message);
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  getBackendHealth(): Record<string, BackendService> {
    return this.loadBalancer.getBackendHealth();
  }

  getActiveConnections(): WebSocketConnection[] {
    return this.websocketManager.getActiveConnections();
  }

  // Private implementation methods

  private async initializeRoutes(): Promise<void> {
    // Initialize default routes based on configuration
    const defaultRoutes: RouteDefinition[] = [
      {
        id: 'api_v1_health',
        pattern: '/api/v1/health',
        method: 'GET',
        backend: 'health_service',
        middleware: ['cors', 'logging'],
        cachingEnabled: true,
        cacheTTL: 30,
        requireAuth: false,
        requiredScopes: [],
        description: 'Health check endpoint',
        tags: ['health', 'monitoring'],
        deprecated: false,
      },
      {
        id: 'api_v1_portfolio',
        pattern: '/api/v1/portfolio/*',
        method: '*',
        backend: 'institutional_api',
        middleware: ['cors', 'auth', 'rate_limit', 'logging'],
        cachingEnabled: false,
        requireAuth: true,
        requiredScopes: ['portfolio:read'],
        description: 'Portfolio management endpoints',
        tags: ['portfolio', 'institutional'],
        deprecated: false,
      },
      {
        id: 'api_v1_trading',
        pattern: '/api/v1/trading/*',
        method: '*',
        backend: 'institutional_api',
        middleware: ['cors', 'auth', 'rate_limit', 'logging', 'security'],
        cachingEnabled: false,
        requireAuth: true,
        requiredScopes: ['trading:execute'],
        description: 'Trading execution endpoints',
        tags: ['trading', 'institutional'],
        deprecated: false,
      },
      {
        id: 'api_v1_custody',
        pattern: '/api/v1/custody/*',
        method: '*',
        backend: 'custody_service',
        middleware: ['cors', 'auth', 'rate_limit', 'logging', 'security', 'audit'],
        cachingEnabled: false,
        requireAuth: true,
        requiredScopes: ['custody:manage'],
        description: 'Custody management endpoints',
        tags: ['custody', 'institutional', 'security'],
        deprecated: false,
      },
    ];

    for (const route of defaultRoutes) {
      await this.addRoute(route);
    }
  }

  private async performSecurityScreening(request: GatewayRequest): Promise<{ blocked: boolean; reason?: string }> {
    // DDoS protection
    if (this.config.security.enableDDoSProtection) {
      const requestsFromIP = this.requestHistory.filter(r => 
        r.clientIP === request.clientIP && 
        r.timestamp > Date.now() - 60000 // Last minute
      ).length;
      
      if (requestsFromIP > 100) { // 100 requests per minute threshold
        return { blocked: true, reason: 'DDoS protection triggered' };
      }
    }

    // Request size validation
    if (request.body && JSON.stringify(request.body).length > this.config.security.maxRequestSize) {
      return { blocked: true, reason: 'Request size exceeds limit' };
    }

    // SQL injection protection
    if (this.config.security.enableSQLInjectionProtection) {
      const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)|('|(\\')|(;)|(--)|(\|))/i;
      const requestString = JSON.stringify(request.query) + JSON.stringify(request.body);
      
      if (sqlInjectionPattern.test(requestString)) {
        return { blocked: true, reason: 'SQL injection attempt detected' };
      }
    }

    // XSS protection
    if (this.config.security.enableXSSProtection) {
      const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
      const requestString = JSON.stringify(request.query) + JSON.stringify(request.body);
      
      if (xssPattern.test(requestString)) {
        return { blocked: true, reason: 'XSS attempt detected' };
      }
    }

    return { blocked: false };
  }

  private generateCacheKey(request: GatewayRequest): string {
    const route = request.route!;
    const strategy = this.config.caching.cachingStrategies.find(s => 
      new RegExp(s.pattern).test(request.path)
    );
    
    let key = `${request.method}:${request.path}`;
    
    // Add query parameters
    const sortedQuery = Object.keys(request.query).sort().map(k => `${k}=${request.query[k]}`).join('&');
    if (sortedQuery) {
      key += `?${sortedQuery}`;
    }
    
    // Add vary headers if specified
    if (strategy?.vary) {
      const varyValues = strategy.vary.map(header => 
        `${header}:${request.headers[header.toLowerCase()] || ''}`
      ).join('|');
      key += `|${varyValues}`;
    }
    
    return key;
  }

  private async forwardRequest(request: GatewayRequest, backend: BackendService): Promise<GatewayResponse> {
    const startTime = Date.now();
    
    try {
      // Build backend URL
      const url = `${backend.protocol}://${backend.host}:${backend.port}${request.path}`;
      const queryString = Object.keys(request.query).map(k => `${k}=${request.query[k]}`).join('&');
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      // Prepare headers
      const headers = { ...request.headers };
      headers['X-Forwarded-For'] = request.clientIP;
      headers['X-Request-ID'] = request.id;
      
      // Simulate HTTP request (in real implementation, use actual HTTP client)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // 50-150ms delay
      
      const responseTime = Date.now() - startTime;
      
      // Update backend statistics
      const backendStats = this.stats.backendStats.get(backend.id);
      if (backendStats) {
        backendStats.requests++;
        backendStats.successes++;
        backendStats.lastResponseTime = responseTime;
        backendStats.averageResponseTime = 
          (backendStats.averageResponseTime * (backendStats.requests - 1) + responseTime) / backendStats.requests;
      }
      
      // Simulate successful response
      const response: GatewayResponse = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Backend': backend.id,
          'X-Response-Time': responseTime.toString(),
        },
        body: {
          success: true,
          data: 'Response from backend',
          timestamp: Date.now(),
        },
        processingTime: responseTime,
        backend: backend.id,
        cacheHit: false,
        compressed: false,
        traceId: `trace_${request.id}`,
        spanId: `span_${Date.now()}`,
      };
      
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update backend statistics for failure
      const backendStats = this.stats.backendStats.get(backend.id);
      if (backendStats) {
        backendStats.requests++;
        backendStats.failures++;
        backendStats.lastResponseTime = responseTime;
      }
      
      this.logger.error('Backend request failed', error, {
        backendId: backend.id,
        requestId: request.id,
      });
      
      throw error;
    }
  }

  private enhanceResponse(response: GatewayResponse, request: GatewayRequest): GatewayResponse {
    // Add gateway headers
    const enhancedHeaders = {
      ...response.headers,
      'X-Gateway': 'enterprise-gateway',
      'X-Request-ID': request.id,
      'X-Processing-Time': request.processingTime.toString(),
      'X-Cache-Hit': request.cacheHit.toString(),
    };
    
    // Add CORS headers if enabled
    if (this.config.security.enableCORS) {
      enhancedHeaders['Access-Control-Allow-Origin'] = this.config.security.corsOrigins.includes('*') 
        ? '*' 
        : this.config.security.corsOrigins[0] || '*';
      enhancedHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      enhancedHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
    }
    
    return {
      ...response,
      headers: enhancedHeaders,
    };
  }

  private createErrorResponse(
    requestId: string, 
    statusCode: number, 
    message: string, 
    details?: string,
    additionalHeaders?: Record<string, string>
  ): GatewayResponse {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...additionalHeaders,
      },
      body: {
        error: {
          code: statusCode,
          message,
          details,
        },
        requestId,
        timestamp: Date.now(),
      },
      processingTime: 0,
      backend: 'gateway',
      cacheHit: false,
      compressed: false,
      traceId: `trace_${requestId}`,
      spanId: `span_${Date.now()}`,
    };
  }

  private startMonitoring(): void {
    // Health check monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.loadBalancing.healthCheckInterval * 1000);

    // Metrics collection
    this.metricsCollectionInterval = setInterval(() => {
      this.updateMetrics();
    }, 60 * 1000); // Every minute

    // Cleanup old data
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 300 * 1000); // Every 5 minutes
  }

  private stopMonitoring(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsCollectionInterval) clearInterval(this.metricsCollectionInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  private async performHealthChecks(): Promise<void> {
    await this.loadBalancer.performHealthChecks();
  }

  private updateMetrics(): void {
    // Update average response time
    const recentRequests = this.requestHistory.filter(r => 
      r.timestamp > Date.now() - 60000 // Last minute
    );
    
    if (recentRequests.length > 0) {
      this.stats.averageResponseTime = 
        recentRequests.reduce((sum, r) => sum + r.processingTime, 0) / recentRequests.length;
    }
    
    // Update active connections
    this.stats.activeConnections = this.activeRequests.size;
    
    // Update circuit breaker status
    this.stats.circuitBreakerStatus = this.circuitBreaker.getOverallStatus();
  }

  private performCleanup(): void {
    this.applyHistoryRetention();
    this.cache.cleanup();
  }

  private applyHistoryRetention(): void {
    const maxHistory = 10000; // Keep last 10k requests
    if (this.requestHistory.length > maxHistory) {
      this.requestHistory = this.requestHistory.slice(-maxHistory);
    }
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): EnterpriseGatewayConfig {
    return { ...this.config };
  }

  getLoadBalancer(): LoadBalancer {
    return this.loadBalancer;
  }

  getCache(): GatewayCache {
    return this.cache;
  }

  getRateLimiter(): GatewayRateLimiter {
    return this.rateLimiter;
  }

  getCircuitBreaker(): GatewayCircuitBreaker {
    return this.circuitBreaker;
  }

  getRouter(): APIRouter {
    return this.router;
  }

  getWebSocketManager(): WebSocketManager {
    return this.websocketManager;
  }
}

// Supporting classes (simplified implementations)

class LoadBalancer {
  private config: EnterpriseGatewayConfig['loadBalancing'];
  private backends: Map<string, BackendService> = new Map();
  private logger: Logger;
  private currentIndex: number = 0;

  constructor(config: EnterpriseGatewayConfig['loadBalancing'], backends: BackendService[], logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    backends.forEach(backend => {
      this.backends.set(backend.id, backend);
    });
  }

  async start(): Promise<void> {
    this.logger.info('Load balancer started');
  }

  async stop(): Promise<void> {
    this.logger.info('Load balancer stopped');
  }

  async selectBackend(serviceId: string): Promise<BackendService | null> {
    const availableBackends = Array.from(this.backends.values())
      .filter(b => b.name === serviceId && b.status === 'healthy');
    
    if (availableBackends.length === 0) {
      return null;
    }
    
    switch (this.config.algorithm) {
      case 'round_robin':
        return this.roundRobinSelection(availableBackends);
      case 'least_connections':
        return this.leastConnectionsSelection(availableBackends);
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelection(availableBackends);
      default:
        return availableBackends[0];
    }
  }

  async addBackend(backend: BackendService): Promise<void> {
    this.backends.set(backend.id, backend);
  }

  async removeBackend(backendId: string): Promise<void> {
    this.backends.delete(backendId);
  }

  async performHealthChecks(): Promise<void> {
    for (const backend of this.backends.values()) {
      try {
        const isHealthy = await this.checkBackendHealth(backend);
        const previousStatus = backend.status;
        
        if (isHealthy) {
          backend.consecutiveFailures = 0;
          if (backend.consecutiveFailures <= this.config.healthyThreshold) {
            backend.status = 'healthy';
          }
        } else {
          backend.consecutiveFailures++;
          if (backend.consecutiveFailures >= this.config.unhealthyThreshold) {
            backend.status = 'unhealthy';
          }
        }
        
        backend.lastHealthCheck = Date.now();
        
        if (previousStatus !== backend.status) {
          this.logger.info('Backend status changed', {
            backendId: backend.id,
            from: previousStatus,
            to: backend.status,
          });
        }
      } catch (error) {
        this.logger.error('Health check failed for backend', error, { backendId: backend.id });
      }
    }
  }

  getBackendHealth(): Record<string, BackendService> {
    const health: Record<string, BackendService> = {};
    for (const [id, backend] of this.backends) {
      health[id] = { ...backend };
    }
    return health;
  }

  private roundRobinSelection(backends: BackendService[]): BackendService {
    const backend = backends[this.currentIndex % backends.length];
    this.currentIndex++;
    return backend;
  }

  private leastConnectionsSelection(backends: BackendService[]): BackendService {
    return backends.reduce((least, current) => 
      current.currentConnections < least.currentConnections ? current : least
    );
  }

  private weightedRoundRobinSelection(backends: BackendService[]): BackendService {
    const totalWeight = backends.reduce((sum, b) => sum + b.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const backend of backends) {
      random -= backend.weight;
      if (random <= 0) {
        return backend;
      }
    }
    
    return backends[0];
  }

  private async checkBackendHealth(backend: BackendService): Promise<boolean> {
    // Simplified health check
    return Math.random() > 0.1; // 90% healthy
  }
}

class GatewayCache {
  private config: EnterpriseGatewayConfig['caching'];
  private logger: Logger;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats;

  constructor(config: EnterpriseGatewayConfig['caching'], logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.stats = {
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
      entryCount: 0,
    };
  }

  async start(): Promise<void> {
    this.logger.info('Gateway cache started');
  }

  async stop(): Promise<void> {
    this.logger.info('Gateway cache stopped');
  }

  async get(key: string): Promise<any> {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      this.stats.missCount++;
      this.updateHitRate();
      return null;
    }
    
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      this.stats.missCount++;
      this.updateHitRate();
      return null;
    }
    
    this.stats.hitCount++;
    this.updateHitRate();
    return entry.data;
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    const expiresAt = Date.now() + ((ttl || this.config.defaultTTL) * 1000);
    
    this.memoryCache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
    });
    
    this.stats.entryCount = this.memoryCache.size;
    this.updateMemoryUsage();
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    this.stats.entryCount = this.memoryCache.size;
  }

  cleanup(): void {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        evicted++;
      }
    }
    
    this.stats.evictionCount += evicted;
    this.stats.entryCount = this.memoryCache.size;
    this.updateMemoryUsage();
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? (this.stats.hitCount / total) * 100 : 0;
  }

  private updateMemoryUsage(): void {
    // Simplified memory usage calculation
    this.stats.memoryUsage = this.memoryCache.size * 1024; // Assume 1KB per entry
  }
}

interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
}

class GatewayRateLimiter {
  private config: EnterpriseGatewayConfig['rateLimiting'];
  private logger: Logger;
  private windows: Map<string, RateLimitWindow> = new Map();

  constructor(config: EnterpriseGatewayConfig['rateLimiting'], logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.logger.info('Rate limiter started');
  }

  async stop(): Promise<void> {
    this.logger.info('Rate limiter stopped');
  }

  async checkLimit(request: GatewayRequest): Promise<RateLimitResult> {
    const key = this.generateRateLimitKey(request);
    const now = Date.now();
    
    let window = this.windows.get(key);
    if (!window) {
      window = {
        requests: [],
        windowStart: now,
      };
      this.windows.set(key, window);
    }
    
    // Clean old requests outside the window
    const windowStart = now - (this.config.windowSize * 1000);
    window.requests = window.requests.filter(time => time >= windowStart);
    
    // Check if limit exceeded
    if (window.requests.length >= this.config.requestLimit) {
      const oldestRequest = Math.min(...window.requests);
      const resetTime = oldestRequest + (this.config.windowSize * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
      };
    }
    
    // Add current request
    window.requests.push(now);
    
    return {
      allowed: true,
      remaining: this.config.requestLimit - window.requests.length,
      resetTime: now + (this.config.windowSize * 1000),
    };
  }

  private generateRateLimitKey(request: GatewayRequest): string {
    switch (this.config.keyGenerator) {
      case 'ip':
        return `ip:${request.clientIP}`;
      case 'user':
        return `user:${request.userId || request.clientIP}`;
      case 'api_key':
        return `api_key:${request.apiKey || request.clientIP}`;
      default:
        return `custom:${request.clientIP}`;
    }
  }
}

interface RateLimitWindow {
  requests: number[];
  windowStart: number;
}

class GatewayCircuitBreaker {
  private config: EnterpriseGatewayConfig['circuitBreaker'];
  private logger: Logger;
  private circuits: Map<string, CircuitState> = new Map();

  constructor(config: EnterpriseGatewayConfig['circuitBreaker'], logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.logger.info('Circuit breaker started');
  }

  async stop(): Promise<void> {
    this.logger.info('Circuit breaker stopped');
  }

  async isOpen(backendId: string): Promise<boolean> {
    const circuit = this.getCircuit(backendId);
    
    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailureTime > this.config.timeout) {
        circuit.state = 'half_open';
        this.logger.info('Circuit breaker transitioning to half-open', { backendId });
      } else {
        return true;
      }
    }
    
    return false;
  }

  async recordSuccess(backendId: string): Promise<void> {
    const circuit = this.getCircuit(backendId);
    
    circuit.successCount++;
    circuit.lastSuccessTime = Date.now();
    
    if (circuit.state === 'half_open' && circuit.successCount >= this.config.successThreshold) {
      circuit.state = 'closed';
      circuit.failureCount = 0;
      this.logger.info('Circuit breaker closed', { backendId });
    }
  }

  async recordFailure(backendId: string): Promise<void> {
    const circuit = this.getCircuit(backendId);
    
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    if (circuit.failureCount >= this.config.failureThreshold) {
      circuit.state = 'open';
      this.logger.warn('Circuit breaker opened', { backendId, failures: circuit.failureCount });
    }
  }

  getOverallStatus(): 'closed' | 'open' | 'half_open' {
    const circuits = Array.from(this.circuits.values());
    
    if (circuits.some(c => c.state === 'open')) {
      return 'open';
    } else if (circuits.some(c => c.state === 'half_open')) {
      return 'half_open';
    } else {
      return 'closed';
    }
  }

  private getCircuit(backendId: string): CircuitState {
    let circuit = this.circuits.get(backendId);
    if (!circuit) {
      circuit = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
      };
      this.circuits.set(backendId, circuit);
    }
    return circuit;
  }
}

interface CircuitState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

class APIRouter {
  private logger: Logger;
  private routes: Map<string, RouteDefinition> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.logger.info('API router started');
  }

  async stop(): Promise<void> {
    this.logger.info('API router stopped');
  }

  async addRoute(route: RouteDefinition): Promise<void> {
    this.routes.set(route.id, route);
  }

  async removeRoute(routeId: string): Promise<void> {
    this.routes.delete(routeId);
  }

  async resolveRoute(request: GatewayRequest): Promise<RouteDefinition | null> {
    for (const route of this.routes.values()) {
      if (this.matchesRoute(request, route)) {
        return route;
      }
    }
    return null;
  }

  getRouteCount(): number {
    return this.routes.size;
  }

  private matchesRoute(request: GatewayRequest, route: RouteDefinition): boolean {
    // Method matching
    if (route.method !== '*' && route.method !== request.method) {
      return false;
    }
    
    // Path matching (simplified pattern matching)
    const pattern = route.pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    
    return regex.test(request.path);
  }
}

class WebSocketManager {
  private config: EnterpriseGatewayConfig['websocket'];
  private logger: Logger;
  private connections: Map<string, WebSocketConnection> = new Map();

  constructor(config: EnterpriseGatewayConfig['websocket'], logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.logger.info('WebSocket manager started');
  }

  async stop(): Promise<void> {
    this.logger.info('WebSocket manager stopped');
  }

  async handleConnection(connectionInfo: Partial<WebSocketConnection>): Promise<string> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum WebSocket connections reached');
    }

    const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: WebSocketConnection = {
      id: connectionId,
      clientIP: connectionInfo.clientIP || '0.0.0.0',
      userAgent: connectionInfo.userAgent || 'unknown',
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      subscriptions: [],
      messagesSent: 0,
      messagesReceived: 0,
      status: 'connected',
    };

    this.connections.set(connectionId, connection);
    
    this.logger.info('WebSocket connection established', { connectionId });
    return connectionId;
  }

  async handleMessage(message: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(message.connectionId);
    if (!connection) {
      throw new Error(`WebSocket connection ${message.connectionId} not found`);
    }

    connection.lastActivity = Date.now();
    connection.messagesReceived++;

    switch (message.type) {
      case 'subscribe':
        if (message.channel && !connection.subscriptions.includes(message.channel)) {
          connection.subscriptions.push(message.channel);
        }
        break;
      case 'unsubscribe':
        if (message.channel) {
          connection.subscriptions = connection.subscriptions.filter(s => s !== message.channel);
        }
        break;
      case 'ping':
        // Respond with pong
        break;
    }
  }

  getActiveConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }
}

export default EnterpriseGateway;