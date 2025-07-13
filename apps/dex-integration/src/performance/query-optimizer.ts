// Query Optimizer - Advanced database query optimization for <50ms API responses

import { Logger } from '../utils/logger';
import BN from 'bn.js';

export interface QueryOptimizationConfig {
  // Connection pool optimization
  connectionPool: {
    minConnections: number;
    maxConnections: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    enablePreparedStatements: boolean;
  };
  
  // Query caching
  queryCache: {
    enabled: boolean;
    maxSize: number;
    ttlSeconds: number;
    enableDistributedCache: boolean;
    redisCluster?: string[];
  };
  
  // Performance monitoring
  monitoring: {
    enableQueryLogging: boolean;
    slowQueryThresholdMs: number;
    enableExplainAnalyze: boolean;
    enableMetrics: boolean;
  };
  
  // Optimization strategies
  optimization: {
    enableQueryPlan: boolean;
    enableIndexHints: boolean;
    enableParallelQueries: boolean;
    maxParallelQueries: number;
    enableResultStreaming: boolean;
  };
}

export interface QueryMetrics {
  queryId: string;
  executionTimeMs: number;
  rowsReturned: number;
  bytesTransferred: number;
  cacheHit: boolean;
  indexesUsed: string[];
  queryPlan?: any;
  timestamp: number;
}

export interface OptimizedQuery {
  sql: string;
  parameters: any[];
  cacheKey?: string;
  ttl?: number;
  enableCache: boolean;
  priority: 'high' | 'medium' | 'low';
  maxExecutionTimeMs: number;
}

export class QueryOptimizer {
  private config: QueryOptimizationConfig;
  private logger: Logger;
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private queryMetrics: Map<string, QueryMetrics[]>;
  private activeQueries: Map<string, Promise<any>>;
  private preparedStatements: Map<string, any>;

  constructor(config: QueryOptimizationConfig) {
    this.config = config;
    this.logger = new Logger('QueryOptimizer');
    this.queryCache = new Map();
    this.queryMetrics = new Map();
    this.activeQueries = new Map();
    this.preparedStatements = new Map();
    
    this.startCacheCleanup();
    this.startMetricsAggregation();
  }

  async optimizeQuery(query: OptimizedQuery): Promise<OptimizedQuery> {
    const startTime = Date.now();
    
    // Generate cache key
    if (query.enableCache && !query.cacheKey) {
      query.cacheKey = this.generateCacheKey(query.sql, query.parameters);
    }
    
    // Check cache first
    if (query.enableCache && query.cacheKey) {
      const cached = this.getCachedResult(query.cacheKey);
      if (cached) {
        this.recordQueryMetrics({
          queryId: query.cacheKey,
          executionTimeMs: Date.now() - startTime,
          rowsReturned: Array.isArray(cached) ? cached.length : 1,
          bytesTransferred: JSON.stringify(cached).length,
          cacheHit: true,
          indexesUsed: [],
          timestamp: Date.now()
        });
        return query;
      }
    }
    
    // Optimize SQL query
    query.sql = await this.optimizeSqlQuery(query.sql);
    
    // Add query hints
    if (this.config.optimization.enableIndexHints) {
      query.sql = this.addIndexHints(query.sql);
    }
    
    // Set execution timeout
    if (!query.maxExecutionTimeMs) {
      query.maxExecutionTimeMs = query.priority === 'high' ? 25 : 50;
    }
    
    return query;
  }

  async executeOptimizedQuery(query: OptimizedQuery): Promise<any> {
    const startTime = Date.now();
    const queryId = query.cacheKey || this.generateQueryId(query.sql);
    
    try {
      // Check for duplicate in-flight queries
      if (this.activeQueries.has(queryId)) {
        return await this.activeQueries.get(queryId);
      }
      
      // Execute query with timeout
      const queryPromise = this.executeWithTimeout(query);
      this.activeQueries.set(queryId, queryPromise);
      
      const result = await queryPromise;
      
      // Cache result if enabled
      if (query.enableCache && query.cacheKey) {
        this.cacheResult(query.cacheKey, result, query.ttl || 300);
      }
      
      // Record metrics
      this.recordQueryMetrics({
        queryId,
        executionTimeMs: Date.now() - startTime,
        rowsReturned: Array.isArray(result) ? result.length : 1,
        bytesTransferred: JSON.stringify(result).length,
        cacheHit: false,
        indexesUsed: await this.getIndexesUsed(query.sql),
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Query execution failed', {
        queryId,
        sql: query.sql,
        error: error.message,
        executionTime: Date.now() - startTime
      });
      throw error;
    } finally {
      this.activeQueries.delete(queryId);
    }
  }

  async executeBatchOptimized(queries: OptimizedQuery[]): Promise<any[]> {
    const startTime = Date.now();
    
    // Group queries by priority
    const highPriority = queries.filter(q => q.priority === 'high');
    const mediumPriority = queries.filter(q => q.priority === 'medium');
    const lowPriority = queries.filter(q => q.priority === 'low');
    
    // Execute in priority order with controlled parallelism
    const results: any[] = [];
    
    // High priority queries - execute in parallel
    if (highPriority.length > 0) {
      const highResults = await this.executeParallel(highPriority, 10);
      results.push(...highResults);
    }
    
    // Medium priority queries - limited parallelism
    if (mediumPriority.length > 0) {
      const mediumResults = await this.executeParallel(mediumPriority, 5);
      results.push(...mediumResults);
    }
    
    // Low priority queries - sequential execution
    if (lowPriority.length > 0) {
      for (const query of lowPriority) {
        const result = await this.executeOptimizedQuery(query);
        results.push(result);
      }
    }
    
    this.logger.info('Batch query execution completed', {
      totalQueries: queries.length,
      executionTime: Date.now() - startTime,
      highPriority: highPriority.length,
      mediumPriority: mediumPriority.length,
      lowPriority: lowPriority.length
    });
    
    return results;
  }

  getQueryPerformanceMetrics(): {
    averageExecutionTime: number;
    cacheHitRate: number;
    slowQueries: number;
    totalQueries: number;
    performanceByQuery: Map<string, {
      avgTime: number;
      hitRate: number;
      executions: number;
    }>;
  } {
    const allMetrics: QueryMetrics[] = [];
    this.queryMetrics.forEach(metrics => allMetrics.push(...metrics));
    
    if (allMetrics.length === 0) {
      return {
        averageExecutionTime: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        totalQueries: 0,
        performanceByQuery: new Map()
      };
    }
    
    const totalTime = allMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0);
    const cacheHits = allMetrics.filter(m => m.cacheHit).length;
    const slowQueries = allMetrics.filter(m => 
      m.executionTimeMs > this.config.monitoring.slowQueryThresholdMs
    ).length;
    
    // Aggregate by query
    const queryStats = new Map<string, {
      totalTime: number;
      hitCount: number;
      executions: number;
    }>();
    
    allMetrics.forEach(metric => {
      const existing = queryStats.get(metric.queryId) || {
        totalTime: 0,
        hitCount: 0,
        executions: 0
      };
      
      existing.totalTime += metric.executionTimeMs;
      existing.executions += 1;
      if (metric.cacheHit) existing.hitCount += 1;
      
      queryStats.set(metric.queryId, existing);
    });
    
    const performanceByQuery = new Map<string, {
      avgTime: number;
      hitRate: number;
      executions: number;
    }>();
    
    queryStats.forEach((stats, queryId) => {
      performanceByQuery.set(queryId, {
        avgTime: stats.totalTime / stats.executions,
        hitRate: stats.hitCount / stats.executions,
        executions: stats.executions
      });
    });
    
    return {
      averageExecutionTime: totalTime / allMetrics.length,
      cacheHitRate: cacheHits / allMetrics.length,
      slowQueries,
      totalQueries: allMetrics.length,
      performanceByQuery
    };
  }

  async generateQueryOptimizationReport(): Promise<{
    summary: any;
    recommendations: string[];
    indexSuggestions: string[];
    slowQueries: QueryMetrics[];
  }> {
    const metrics = this.getQueryPerformanceMetrics();
    const recommendations: string[] = [];
    const indexSuggestions: string[] = [];
    
    // Analyze performance
    if (metrics.averageExecutionTime > 50) {
      recommendations.push('Average query time exceeds 50ms target - consider query optimization');
    }
    
    if (metrics.cacheHitRate < 0.8) {
      recommendations.push('Cache hit rate below 80% - review caching strategy');
    }
    
    if (metrics.slowQueries > metrics.totalQueries * 0.1) {
      recommendations.push('More than 10% of queries are slow - investigate bottlenecks');
    }
    
    // Analyze slow queries for index suggestions
    const allMetrics: QueryMetrics[] = [];
    this.queryMetrics.forEach(metrics => allMetrics.push(...metrics));
    
    const slowQueries = allMetrics.filter(m => 
      m.executionTimeMs > this.config.monitoring.slowQueryThresholdMs
    );
    
    // Generate index suggestions based on slow queries
    slowQueries.forEach(query => {
      if (query.indexesUsed.length === 0) {
        indexSuggestions.push(`Query ${query.queryId} not using indexes - review WHERE clauses`);
      }
    });
    
    return {
      summary: {
        totalQueries: metrics.totalQueries,
        averageExecutionTime: metrics.averageExecutionTime,
        cacheHitRate: metrics.cacheHitRate,
        slowQueriesCount: metrics.slowQueries,
        cacheSize: this.queryCache.size,
        activeConcurrentQueries: this.activeQueries.size
      },
      recommendations,
      indexSuggestions,
      slowQueries: slowQueries.slice(0, 10) // Top 10 slowest
    };
  }

  private async optimizeSqlQuery(sql: string): Promise<string> {
    // Remove unnecessary whitespace
    sql = sql.replace(/\s+/g, ' ').trim();
    
    // Add LIMIT if not present for potentially large result sets
    if (sql.toLowerCase().includes('select') && 
        !sql.toLowerCase().includes('limit') && 
        !sql.toLowerCase().includes('count(')) {
      sql += ' LIMIT 1000';
    }
    
    // Optimize JOIN order (simple heuristic)
    if (sql.toLowerCase().includes('join')) {
      // This would contain more sophisticated JOIN optimization logic
      sql = this.optimizeJoins(sql);
    }
    
    return sql;
  }

  private optimizeJoins(sql: string): string {
    // Simple JOIN optimization - move smaller tables first
    // In production, this would analyze table statistics
    return sql;
  }

  private addIndexHints(sql: string): string {
    // Add index hints based on query pattern analysis
    // This is a simplified version - production would use query plan analysis
    if (sql.toLowerCase().includes('where') && sql.toLowerCase().includes('user_id')) {
      sql = sql.replace(/from\s+(\w+)/i, 'FROM $1 USE INDEX (idx_user_id)');
    }
    
    return sql;
  }

  private async executeWithTimeout(query: OptimizedQuery): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Query timeout after ${query.maxExecutionTimeMs}ms`));
      }, query.maxExecutionTimeMs);
      
      try {
        // This would execute the actual database query
        const result = await this.executeActualQuery(query);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async executeActualQuery(query: OptimizedQuery): Promise<any> {
    // Placeholder for actual database execution
    // In production, this would use the actual database driver
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB call
    return { data: `Result for: ${query.sql}` };
  }

  private async executeParallel(queries: OptimizedQuery[], maxConcurrency: number): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(query => this.executeOptimizedQuery(query))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  private generateCacheKey(sql: string, parameters: any[]): string {
    const key = sql + JSON.stringify(parameters);
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  private generateQueryId(sql: string): string {
    return Buffer.from(sql).toString('base64').slice(0, 16);
  }

  private getCachedResult(cacheKey: string): any | null {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl * 1000) {
      this.queryCache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }

  private cacheResult(cacheKey: string, data: any, ttlSeconds: number): void {
    if (this.queryCache.size >= this.config.queryCache.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < Math.floor(this.config.queryCache.maxSize * 0.1); i++) {
        this.queryCache.delete(entries[i][0]);
      }
    }
    
    this.queryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  private recordQueryMetrics(metrics: QueryMetrics): void {
    const queryMetrics = this.queryMetrics.get(metrics.queryId) || [];
    queryMetrics.push(metrics);
    
    // Keep only last 100 metrics per query
    if (queryMetrics.length > 100) {
      queryMetrics.splice(0, queryMetrics.length - 100);
    }
    
    this.queryMetrics.set(metrics.queryId, queryMetrics);
    
    // Log slow queries
    if (metrics.executionTimeMs > this.config.monitoring.slowQueryThresholdMs) {
      this.logger.warn('Slow query detected', {
        queryId: metrics.queryId,
        executionTime: metrics.executionTimeMs,
        rowsReturned: metrics.rowsReturned
      });
    }
  }

  private async getIndexesUsed(sql: string): Promise<string[]> {
    // Placeholder for actual query plan analysis
    // In production, this would use EXPLAIN ANALYZE
    return ['idx_user_id', 'idx_created_at'];
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.queryCache.entries()) {
        if (now - value.timestamp > value.ttl * 1000) {
          this.queryCache.delete(key);
        }
      }
    }, 60000); // Clean every minute
  }

  private startMetricsAggregation(): void {
    setInterval(() => {
      const metrics = this.getQueryPerformanceMetrics();
      this.logger.info('Query performance metrics', metrics);
    }, this.config.monitoring.enableMetrics ? 300000 : 0); // Every 5 minutes
  }
}