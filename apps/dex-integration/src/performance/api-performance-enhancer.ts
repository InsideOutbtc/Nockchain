// API Performance Enhancer - Comprehensive optimization for <50ms response times

import { Logger } from '../utils/logger';
import { QueryOptimizer, OptimizedQuery } from './query-optimizer';
import BN from 'bn.js';

export interface PerformanceEnhancerConfig {
  // Response time targets
  targets: {
    criticalApiResponseMs: number; // 25ms
    standardApiResponseMs: number; // 50ms
    batchApiResponseMs: number; // 100ms
  };
  
  // Caching strategy
  caching: {
    enableMultiLayer: boolean;
    l1CacheSize: number; // Memory cache
    l2CacheSize: number; // Redis cache
    l3CacheEnabled: boolean; // CDN cache
    
    ttlByEndpoint: {
      [endpoint: string]: number;
    };
    
    compressionEnabled: boolean;
    compressionThreshold: number; // bytes
  };
  
  // Connection optimization
  connections: {
    enableConnectionPooling: boolean;
    maxConnectionsPerService: number;
    connectionTimeoutMs: number;
    keepAliveMs: number;
    enableTcpNoDelay: boolean;
  };
  
  // Request optimization
  requestOptimization: {
    enableRequestCoalescing: boolean;
    enableBatching: boolean;
    maxBatchSize: number;
    batchTimeoutMs: number;
    enableCompression: boolean;
  };
  
  // Monitoring
  monitoring: {
    enableDetailedMetrics: boolean;
    enableTracing: boolean;
    sampleRate: number;
    alertThresholds: {
      responseTimeMs: number;
      errorRate: number;
      throughputRps: number;
    };
  };
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTimeMs: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  cacheHit: boolean;
  timestamp: number;
  userId?: string;
  traceId?: string;
}

export interface EndpointPerformance {
  endpoint: string;
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  throughputRps: number;
  lastHour: PerformanceMetrics[];
}

export class ApiPerformanceEnhancer {
  private config: PerformanceEnhancerConfig;
  private logger: Logger;
  private queryOptimizer: QueryOptimizer;
  
  // Multi-layer caching
  private l1Cache: Map<string, { data: any; timestamp: number; ttl: number }>; // Memory
  private l2Cache: Map<string, { data: any; timestamp: number; ttl: number }>; // Redis simulation
  private requestCoalescing: Map<string, Promise<any>>;
  
  // Performance tracking
  private metrics: Map<string, PerformanceMetrics[]>;
  private activeRequests: Map<string, { startTime: number; traceId: string }>;
  
  // Request batching
  private pendingBatches: Map<string, {
    requests: any[];
    timeout: NodeJS.Timeout;
    resolve: (results: any[]) => void;
  }>;

  constructor(config: PerformanceEnhancerConfig, queryOptimizer: QueryOptimizer) {
    this.config = config;
    this.logger = new Logger('ApiPerformanceEnhancer');
    this.queryOptimizer = queryOptimizer;
    
    this.l1Cache = new Map();
    this.l2Cache = new Map();
    this.requestCoalescing = new Map();
    this.metrics = new Map();
    this.activeRequests = new Map();
    this.pendingBatches = new Map();
    
    this.startPerformanceMonitoring();
    this.startCacheCleanup();
  }

  async enhanceApiRequest(request: {
    endpoint: string;
    method: string;
    params: any;
    userId?: string;
    priority: 'critical' | 'standard' | 'batch';
    enableCache?: boolean;
    customTtl?: number;
  }): Promise<{
    data: any;
    metadata: {
      responseTimeMs: number;
      cacheHit: boolean;
      source: 'cache' | 'database' | 'coalesced';
      traceId: string;
    };
  }> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    const cacheKey = this.generateCacheKey(request.endpoint, request.params);
    
    // Register active request
    this.activeRequests.set(traceId, { startTime, traceId });
    
    try {
      // Check cache layers
      if (request.enableCache !== false) {
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
          const responseTime = Date.now() - startTime;
          
          this.recordMetrics({
            endpoint: request.endpoint,
            method: request.method,
            responseTimeMs: responseTime,
            statusCode: 200,
            requestSize: JSON.stringify(request.params).length,
            responseSize: JSON.stringify(cached).length,
            cacheHit: true,
            timestamp: Date.now(),
            userId: request.userId,
            traceId
          });
          
          return {
            data: cached,
            metadata: {
              responseTimeMs: responseTime,
              cacheHit: true,
              source: 'cache',
              traceId
            }
          };
        }
      }
      
      // Check for request coalescing
      if (this.config.requestOptimization.enableRequestCoalescing && 
          this.requestCoalescing.has(cacheKey)) {
        const coalescedResult = await this.requestCoalescing.get(cacheKey);
        const responseTime = Date.now() - startTime;
        
        return {
          data: coalescedResult,
          metadata: {
            responseTimeMs: responseTime,
            cacheHit: false,
            source: 'coalesced',
            traceId
          }
        };
      }
      
      // Execute request with optimization
      const requestPromise = this.executeOptimizedRequest(request, traceId);
      
      if (this.config.requestOptimization.enableRequestCoalescing) {
        this.requestCoalescing.set(cacheKey, requestPromise);
      }
      
      const result = await requestPromise;
      const responseTime = Date.now() - startTime;
      
      // Cache the result
      if (request.enableCache !== false) {
        const ttl = request.customTtl || this.getTtlForEndpoint(request.endpoint);
        await this.cacheResponse(cacheKey, result, ttl);
      }
      
      // Record metrics
      this.recordMetrics({
        endpoint: request.endpoint,
        method: request.method,
        responseTimeMs: responseTime,
        statusCode: 200,
        requestSize: JSON.stringify(request.params).length,
        responseSize: JSON.stringify(result).length,
        cacheHit: false,
        timestamp: Date.now(),
        userId: request.userId,
        traceId
      });
      
      // Check performance targets
      const target = this.getResponseTimeTarget(request.priority);
      if (responseTime > target) {
        this.logger.warn('Response time exceeded target', {
          endpoint: request.endpoint,
          responseTime,
          target,
          traceId
        });
      }
      
      return {
        data: result,
        metadata: {
          responseTimeMs: responseTime,
          cacheHit: false,
          source: 'database',
          traceId
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.recordMetrics({
        endpoint: request.endpoint,
        method: request.method,
        responseTimeMs: responseTime,
        statusCode: 500,
        requestSize: JSON.stringify(request.params).length,
        responseSize: 0,
        cacheHit: false,
        timestamp: Date.now(),
        userId: request.userId,
        traceId
      });
      
      this.logger.error('Enhanced API request failed', {
        endpoint: request.endpoint,
        error: error.message,
        responseTime,
        traceId
      });
      
      throw error;
    } finally {
      this.activeRequests.delete(traceId);
      if (this.config.requestOptimization.enableRequestCoalescing) {
        setTimeout(() => this.requestCoalescing.delete(cacheKey), 1000);
      }
    }
  }

  async enhanceBatchRequest(requests: Array<{
    endpoint: string;
    method: string;
    params: any;
    userId?: string;
    enableCache?: boolean;
  }>): Promise<Array<{
    data: any;
    metadata: {
      responseTimeMs: number;
      cacheHit: boolean;
      source: string;
      traceId: string;
    };
  }>> {
    const startTime = Date.now();
    const batchId = this.generateTraceId();
    
    this.logger.info('Processing batch request', {
      batchId,
      requestCount: requests.length
    });
    
    // Separate cached and uncached requests
    const cachedResults: any[] = [];
    const uncachedRequests: any[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      const cacheKey = this.generateCacheKey(request.endpoint, request.params);
      
      if (request.enableCache !== false) {
        const cached = await this.getCachedResponse(cacheKey);
        if (cached) {
          cachedResults[i] = {
            data: cached,
            metadata: {
              responseTimeMs: Date.now() - startTime,
              cacheHit: true,
              source: 'cache',
              traceId: batchId + '_' + i
            }
          };
          continue;
        }
      }
      
      uncachedRequests.push({ ...request, originalIndex: i });
    }
    
    // Execute uncached requests in optimized batches
    const uncachedResults = await this.executeBatchOptimized(uncachedRequests, batchId);
    
    // Merge results
    const finalResults: any[] = new Array(requests.length);
    let uncachedIndex = 0;
    
    for (let i = 0; i < requests.length; i++) {
      if (cachedResults[i]) {
        finalResults[i] = cachedResults[i];
      } else {
        finalResults[i] = uncachedResults[uncachedIndex++];
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    this.logger.info('Batch request completed', {
      batchId,
      totalTime,
      cachedCount: cachedResults.filter(Boolean).length,
      uncachedCount: uncachedRequests.length
    });
    
    return finalResults;
  }

  getPerformanceReport(): {
    overall: {
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      totalRequests: number;
      errorRate: number;
      cacheHitRate: number;
      activeRequests: number;
    };
    byEndpoint: Map<string, EndpointPerformance>;
    recommendations: string[];
  } {
    const allMetrics: PerformanceMetrics[] = [];
    this.metrics.forEach(metrics => allMetrics.push(...metrics));
    
    // Calculate overall metrics
    const responseTimes = allMetrics.map(m => m.responseTimeMs).sort((a, b) => a - b);
    const errorCount = allMetrics.filter(m => m.statusCode >= 400).length;
    const cacheHits = allMetrics.filter(m => m.cacheHit).length;
    
    const overall = {
      averageResponseTime: responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
      p95ResponseTime: responseTimes.length > 0 ? 
        responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
      p99ResponseTime: responseTimes.length > 0 ? 
        responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
      totalRequests: allMetrics.length,
      errorRate: allMetrics.length > 0 ? errorCount / allMetrics.length : 0,
      cacheHitRate: allMetrics.length > 0 ? cacheHits / allMetrics.length : 0,
      activeRequests: this.activeRequests.size
    };
    
    // Calculate per-endpoint metrics
    const byEndpoint = new Map<string, EndpointPerformance>();
    const endpointGroups = new Map<string, PerformanceMetrics[]>();
    
    allMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const group = endpointGroups.get(key) || [];
      group.push(metric);
      endpointGroups.set(key, group);
    });
    
    endpointGroups.forEach((metrics, endpoint) => {
      const times = metrics.map(m => m.responseTimeMs).sort((a, b) => a - b);
      const errors = metrics.filter(m => m.statusCode >= 400).length;
      const hits = metrics.filter(m => m.cacheHit).length;
      const lastHour = metrics.filter(m => Date.now() - m.timestamp < 3600000);
      
      byEndpoint.set(endpoint, {
        endpoint,
        totalRequests: metrics.length,
        averageResponseTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        p95ResponseTime: times[Math.floor(times.length * 0.95)] || 0,
        p99ResponseTime: times[Math.floor(times.length * 0.99)] || 0,
        errorRate: errors / metrics.length,
        cacheHitRate: hits / metrics.length,
        throughputRps: lastHour.length / 3600,
        lastHour
      });
    });
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (overall.averageResponseTime > this.config.targets.standardApiResponseMs) {
      recommendations.push('Average response time exceeds target - optimize slow endpoints');
    }
    
    if (overall.cacheHitRate < 0.7) {
      recommendations.push('Cache hit rate below 70% - review caching strategy');
    }
    
    if (overall.errorRate > 0.01) {
      recommendations.push('Error rate above 1% - investigate failing endpoints');
    }
    
    byEndpoint.forEach((perf, endpoint) => {
      if (perf.averageResponseTime > this.config.targets.standardApiResponseMs) {
        recommendations.push(`Endpoint ${endpoint} is slow (${perf.averageResponseTime.toFixed(2)}ms)`);
      }
    });
    
    return {
      overall,
      byEndpoint,
      recommendations
    };
  }

  async preloadCriticalData(): Promise<void> {
    this.logger.info('Preloading critical data for performance optimization');
    
    // Critical endpoints to preload
    const criticalEndpoints = [
      { endpoint: '/api/bridge/status', params: {} },
      { endpoint: '/api/mining/pools', params: {} },
      { endpoint: '/api/trading/markets', params: {} },
      { endpoint: '/api/institutional/portfolio', params: {} }
    ];
    
    const preloadPromises = criticalEndpoints.map(async (endpoint) => {
      try {
        await this.enhanceApiRequest({
          endpoint: endpoint.endpoint,
          method: 'GET',
          params: endpoint.params,
          priority: 'critical',
          enableCache: true,
          customTtl: 60 // 1 minute for critical data
        });
      } catch (error) {
        this.logger.warn('Failed to preload critical data', {
          endpoint: endpoint.endpoint,
          error: error.message
        });
      }
    });
    
    await Promise.allSettled(preloadPromises);
    this.logger.info('Critical data preload completed');
  }

  private async executeOptimizedRequest(request: any, traceId: string): Promise<any> {
    // Convert to optimized query
    const optimizedQuery: OptimizedQuery = {
      sql: this.generateSqlFromRequest(request),
      parameters: this.extractParameters(request.params),
      enableCache: request.enableCache !== false,
      priority: request.priority === 'critical' ? 'high' : 
                request.priority === 'standard' ? 'medium' : 'low',
      maxExecutionTimeMs: this.getResponseTimeTarget(request.priority),
      ttl: this.getTtlForEndpoint(request.endpoint)
    };
    
    // Execute through query optimizer
    const optimized = await this.queryOptimizer.optimizeQuery(optimizedQuery);
    return await this.queryOptimizer.executeOptimizedQuery(optimized);
  }

  private async executeBatchOptimized(requests: any[], batchId: string): Promise<any[]> {
    // Convert requests to optimized queries
    const queries = requests.map(request => ({
      sql: this.generateSqlFromRequest(request),
      parameters: this.extractParameters(request.params),
      enableCache: request.enableCache !== false,
      priority: 'medium' as const,
      maxExecutionTimeMs: this.config.targets.batchApiResponseMs,
      ttl: this.getTtlForEndpoint(request.endpoint)
    }));
    
    // Execute through query optimizer
    return await this.queryOptimizer.executeBatchOptimized(queries);
  }

  private async getCachedResponse(cacheKey: string): Promise<any | null> {
    // Check L1 cache (memory)
    const l1Result = this.l1Cache.get(cacheKey);
    if (l1Result && Date.now() - l1Result.timestamp < l1Result.ttl * 1000) {
      return l1Result.data;
    }
    
    // Check L2 cache (Redis simulation)
    const l2Result = this.l2Cache.get(cacheKey);
    if (l2Result && Date.now() - l2Result.timestamp < l2Result.ttl * 1000) {
      // Promote to L1
      this.l1Cache.set(cacheKey, l2Result);
      return l2Result.data;
    }
    
    return null;
  }

  private async cacheResponse(cacheKey: string, data: any, ttlSeconds: number): Promise<void> {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    };
    
    // Store in both L1 and L2
    this.l1Cache.set(cacheKey, cacheEntry);
    this.l2Cache.set(cacheKey, cacheEntry);
    
    // Manage cache size
    if (this.l1Cache.size > this.config.caching.l1CacheSize) {
      this.evictOldestEntries(this.l1Cache, Math.floor(this.config.caching.l1CacheSize * 0.1));
    }
    
    if (this.l2Cache.size > this.config.caching.l2CacheSize) {
      this.evictOldestEntries(this.l2Cache, Math.floor(this.config.caching.l2CacheSize * 0.1));
    }
  }

  private evictOldestEntries(cache: Map<string, any>, count: number): void {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < count && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }

  private generateCacheKey(endpoint: string, params: any): string {
    const key = `${endpoint}:${JSON.stringify(params)}`;
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getResponseTimeTarget(priority: string): number {
    switch (priority) {
      case 'critical': return this.config.targets.criticalApiResponseMs;
      case 'standard': return this.config.targets.standardApiResponseMs;
      case 'batch': return this.config.targets.batchApiResponseMs;
      default: return this.config.targets.standardApiResponseMs;
    }
  }

  private getTtlForEndpoint(endpoint: string): number {
    return this.config.caching.ttlByEndpoint[endpoint] || 300; // 5 minutes default
  }

  private generateSqlFromRequest(request: any): string {
    // Simplified SQL generation based on endpoint
    const endpointMap = {
      '/api/bridge/status': 'SELECT * FROM bridge_status WHERE active = true',
      '/api/mining/pools': 'SELECT * FROM mining_pools WHERE enabled = true',
      '/api/trading/markets': 'SELECT * FROM trading_markets WHERE active = true',
      '/api/institutional/portfolio': 'SELECT * FROM portfolios WHERE user_id = ?'
    };
    
    return endpointMap[request.endpoint] || 'SELECT 1';
  }

  private extractParameters(params: any): any[] {
    // Extract parameters for SQL query
    return Object.values(params || {});
  }

  private recordMetrics(metrics: PerformanceMetrics): void {
    const endpointMetrics = this.metrics.get(metrics.endpoint) || [];
    endpointMetrics.push(metrics);
    
    // Keep only last 1000 metrics per endpoint
    if (endpointMetrics.length > 1000) {
      endpointMetrics.splice(0, endpointMetrics.length - 1000);
    }
    
    this.metrics.set(metrics.endpoint, endpointMetrics);
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const report = this.getPerformanceReport();
      
      if (report.overall.averageResponseTime > this.config.monitoring.alertThresholds.responseTimeMs) {
        this.logger.warn('High average response time detected', {
          averageTime: report.overall.averageResponseTime,
          threshold: this.config.monitoring.alertThresholds.responseTimeMs
        });
      }
      
      if (report.overall.errorRate > this.config.monitoring.alertThresholds.errorRate) {
        this.logger.error('High error rate detected', {
          errorRate: report.overall.errorRate,
          threshold: this.config.monitoring.alertThresholds.errorRate
        });
      }
    }, 60000); // Check every minute
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean L1 cache
      for (const [key, value] of this.l1Cache.entries()) {
        if (now - value.timestamp > value.ttl * 1000) {
          this.l1Cache.delete(key);
        }
      }
      
      // Clean L2 cache
      for (const [key, value] of this.l2Cache.entries()) {
        if (now - value.timestamp > value.ttl * 1000) {
          this.l2Cache.delete(key);
        }
      }
    }, 300000); // Clean every 5 minutes
  }
}