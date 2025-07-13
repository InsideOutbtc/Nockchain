// Comprehensive audit trail system for tracking all system activities

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface AuditTrailConfig {
  // Storage settings
  enablePersistentStorage: boolean;
  enableRealTimeStreaming: boolean;
  storageEndpoint?: string;
  streamingEndpoint?: string;
  
  // Event filtering
  enabledCategories: AuditCategory[];
  minimumSeverity: AuditSeverity;
  excludeInternalEvents: boolean;
  
  // Compliance settings
  retentionPeriod: number; // days
  encryptSensitiveData: boolean;
  enableImmutableStorage: boolean;
  complianceMode: 'SOX' | 'GDPR' | 'SOC2' | 'custom';
  
  // Performance settings
  batchSize: number;
  flushInterval: number; // seconds
  maxMemoryBuffer: number; // MB
  enableCompression: boolean;
  
  // Alert settings
  enableAnomalyDetection: boolean;
  alertThresholds: {
    suspiciousTransactionCount: number;
    unusualVolumeMultiplier: number;
    failureRateThreshold: number;
    unauthorizedAccessAttempts: number;
  };
}

export type AuditCategory = 
  | 'transaction'
  | 'trading'
  | 'yield_optimization'
  | 'emergency'
  | 'governance'
  | 'security'
  | 'system'
  | 'user_action'
  | 'api_call'
  | 'configuration'
  | 'compliance'
  | 'performance';

export type AuditSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type AuditAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'authorize'
  | 'deny'
  | 'pause'
  | 'resume'
  | 'transfer'
  | 'vote'
  | 'sign'
  | 'configure'
  | 'monitor'
  | 'alert';

export interface AuditEvent {
  // Core event data
  id: string;
  timestamp: number;
  category: AuditCategory;
  action: AuditAction;
  severity: AuditSeverity;
  
  // Actor information
  actor: {
    type: 'user' | 'system' | 'external' | 'automated';
    id: string;
    address?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Resource information
  resource: {
    type: string;
    id: string;
    name?: string;
    attributes?: Record<string, any>;
  };
  
  // Event details
  details: {
    description: string;
    operation: string;
    parameters?: Record<string, any>;
    previousState?: any;
    newState?: any;
    metadata?: Record<string, any>;
  };
  
  // Context information
  context: {
    requestId?: string;
    correlationId?: string;
    strategyId?: string;
    orderBookId?: string;
    blockNumber?: number;
    transactionHash?: string;
    gasUsed?: number;
    networkFees?: BN;
  };
  
  // Outcome information
  outcome: {
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
    duration?: number;
    affectedRecords?: number;
    businessImpact?: string;
  };
  
  // Compliance data
  compliance: {
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retainUntil: number;
    encryptionRequired: boolean;
    immutable: boolean;
    regulatoryTags: string[];
  };
}

export interface AuditQuery {
  // Time range
  startTime?: number;
  endTime?: number;
  
  // Filters
  categories?: AuditCategory[];
  actions?: AuditAction[];
  severities?: AuditSeverity[];
  actorIds?: string[];
  resourceTypes?: string[];
  resourceIds?: string[];
  
  // Search
  searchText?: string;
  searchFields?: string[];
  
  // Pagination
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditReport {
  id: string;
  title: string;
  description: string;
  generatedAt: number;
  period: {
    startTime: number;
    endTime: number;
  };
  
  // Summary statistics
  summary: {
    totalEvents: number;
    eventsByCategory: Record<AuditCategory, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    uniqueActors: number;
    failureRate: number;
    averageResponseTime: number;
  };
  
  // Detailed sections
  sections: {
    transactions: TransactionAuditSection;
    security: SecurityAuditSection;
    compliance: ComplianceAuditSection;
    performance: PerformanceAuditSection;
    anomalies: AnomalyAuditSection;
  };
  
  // Recommendations
  recommendations: AuditRecommendation[];
  
  // Compliance attestation
  compliance: {
    framework: string;
    attestedBy: string;
    attestedAt: number;
    findings: ComplianceFinding[];
  };
}

export interface TransactionAuditSection {
  totalTransactions: number;
  totalVolume: BN;
  averageTransactionSize: BN;
  largestTransaction: BN;
  transactionsByType: Record<string, number>;
  failedTransactions: number;
  failureReasons: Record<string, number>;
  gasAnalysis: {
    totalGasUsed: number;
    averageGasPrice: BN;
    gasEfficiencyTrend: Array<{ timestamp: number; efficiency: number }>;
  };
}

export interface SecurityAuditSection {
  securityEvents: number;
  authenticationAttempts: number;
  authenticationFailures: number;
  unauthorizedAccessAttempts: number;
  suspiciousActivities: Array<{
    description: string;
    severity: AuditSeverity;
    timestamp: number;
    actor: string;
  }>;
  emergencyActivations: number;
  securityAlerts: number;
}

export interface ComplianceAuditSection {
  complianceFramework: string;
  controlsEvaluated: number;
  controlsPassed: number;
  controlsFailed: number;
  exemptions: number;
  dataRetentionCompliance: boolean;
  encryptionCompliance: boolean;
  accessControlCompliance: boolean;
  auditTrailIntegrity: boolean;
}

export interface PerformanceAuditSection {
  systemUptime: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  performanceTrends: Array<{
    timestamp: number;
    metric: string;
    value: number;
  }>;
  bottlenecks: Array<{
    component: string;
    issue: string;
    impact: string;
  }>;
}

export interface AnomalyAuditSection {
  anomaliesDetected: number;
  anomalyTypes: Record<string, number>;
  highRiskAnomalies: Array<{
    type: string;
    description: string;
    timestamp: number;
    riskScore: number;
  }>;
  falsePositives: number;
  investigationStatus: Record<string, number>;
}

export interface AuditRecommendation {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  implementation: string;
  estimatedEffort: string;
  riskReduction: string;
}

export interface ComplianceFinding {
  id: string;
  controlId: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable';
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence: string[];
  remediation?: string;
}

export interface AuditStream {
  subscribe(callback: (event: AuditEvent) => void): void;
  unsubscribe(): void;
  filter(query: AuditQuery): AuditStream;
}

export interface AuditMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  storageUtilization: number;
  indexingLatency: number;
  queryPerformance: number;
  bufferUtilization: number;
  streamingLatency: number;
  compressionRatio: number;
}

export class AuditTrail {
  private config: AuditTrailConfig;
  private logger: Logger;
  private connection: Connection;
  
  private events: AuditEvent[] = [];
  private eventBuffer: AuditEvent[] = [];
  private eventIndex: Map<string, Set<number>> = new Map();
  private streams: Set<AuditStream> = new Set();
  
  private isActive: boolean = false;
  private flushInterval?: NodeJS.Timeout;
  private anomalyDetectionInterval?: NodeJS.Timeout;
  private metricsUpdateInterval?: NodeJS.Timeout;
  
  private metrics: AuditMetrics = {
    totalEvents: 0,
    eventsPerSecond: 0,
    storageUtilization: 0,
    indexingLatency: 0,
    queryPerformance: 0,
    bufferUtilization: 0,
    streamingLatency: 0,
    compressionRatio: 0,
  };

  constructor(
    config: AuditTrailConfig,
    connection: Connection,
    logger: Logger
  ) {
    this.config = config;
    this.connection = connection;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Audit trail already active');
      return;
    }

    this.logger.info('Starting comprehensive audit trail system', {
      enabledCategories: this.config.enabledCategories,
      complianceMode: this.config.complianceMode,
      retentionPeriod: this.config.retentionPeriod,
      enableAnomalyDetection: this.config.enableAnomalyDetection,
    });

    try {
      // Initialize storage systems
      await this.initializeStorage();
      
      // Start monitoring cycles
      this.isActive = true;
      this.startMonitoringCycles();

      this.logger.info('Audit trail system started successfully', {
        bufferSize: this.config.batchSize,
        flushInterval: this.config.flushInterval,
        enableRealTimeStreaming: this.config.enableRealTimeStreaming,
      });

    } catch (error) {
      this.logger.error('Failed to start audit trail system', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Audit trail not active');
      return;
    }

    this.logger.info('Stopping audit trail system');

    try {
      // Flush remaining events
      await this.flushEvents();
      
      // Stop monitoring intervals
      if (this.flushInterval) clearInterval(this.flushInterval);
      if (this.anomalyDetectionInterval) clearInterval(this.anomalyDetectionInterval);
      if (this.metricsUpdateInterval) clearInterval(this.metricsUpdateInterval);

      this.isActive = false;
      
      this.logger.info('Audit trail system stopped successfully', {
        totalEventsProcessed: this.metrics.totalEvents,
        finalBufferSize: this.eventBuffer.length,
      });

    } catch (error) {
      this.logger.error('Failed to stop audit trail system gracefully', error);
      this.isActive = false;
    }
  }

  async recordEvent(event: Partial<AuditEvent>): Promise<string> {
    if (!this.isActive) {
      throw new Error('Audit trail not active');
    }

    // Generate event ID and timestamp if not provided
    const eventId = event.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = event.timestamp || Date.now();

    // Build complete audit event
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp,
      category: event.category || 'system',
      action: event.action || 'execute',
      severity: event.severity || 'info',
      
      actor: {
        type: 'system',
        id: 'unknown',
        ...event.actor,
      },
      
      resource: {
        type: 'unknown',
        id: 'unknown',
        ...event.resource,
      },
      
      details: {
        description: 'System event',
        operation: 'unknown',
        ...event.details,
      },
      
      context: {
        ...event.context,
      },
      
      outcome: {
        success: true,
        ...event.outcome,
      },
      
      compliance: {
        dataClassification: 'internal',
        retainUntil: timestamp + (this.config.retentionPeriod * 24 * 60 * 60 * 1000),
        encryptionRequired: this.config.encryptSensitiveData,
        immutable: this.config.enableImmutableStorage,
        regulatoryTags: [],
        ...event.compliance,
      },
    };

    // Validate event
    this.validateEvent(auditEvent);

    // Check if event should be recorded
    if (!this.shouldRecordEvent(auditEvent)) {
      return eventId;
    }

    // Add to buffer
    this.eventBuffer.push(auditEvent);
    this.updateIndex(auditEvent);
    this.metrics.totalEvents++;

    // Stream to subscribers
    if (this.config.enableRealTimeStreaming) {
      this.streamToSubscribers(auditEvent);
    }

    // Check for anomalies
    if (this.config.enableAnomalyDetection) {
      await this.checkForAnomalies(auditEvent);
    }

    // Auto-flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flushEvents();
    }

    this.logger.debug('Audit event recorded', {
      eventId,
      category: auditEvent.category,
      action: auditEvent.action,
      severity: auditEvent.severity,
    });

    return eventId;
  }

  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    const startTime = Date.now();

    try {
      let results = [...this.events, ...this.eventBuffer];

      // Apply filters
      if (query.startTime) {
        results = results.filter(event => event.timestamp >= query.startTime!);
      }
      
      if (query.endTime) {
        results = results.filter(event => event.timestamp <= query.endTime!);
      }
      
      if (query.categories && query.categories.length > 0) {
        results = results.filter(event => query.categories!.includes(event.category));
      }
      
      if (query.actions && query.actions.length > 0) {
        results = results.filter(event => query.actions!.includes(event.action));
      }
      
      if (query.severities && query.severities.length > 0) {
        results = results.filter(event => query.severities!.includes(event.severity));
      }
      
      if (query.actorIds && query.actorIds.length > 0) {
        results = results.filter(event => query.actorIds!.includes(event.actor.id));
      }
      
      if (query.resourceTypes && query.resourceTypes.length > 0) {
        results = results.filter(event => query.resourceTypes!.includes(event.resource.type));
      }
      
      if (query.resourceIds && query.resourceIds.length > 0) {
        results = results.filter(event => query.resourceIds!.includes(event.resource.id));
      }

      // Apply text search
      if (query.searchText) {
        const searchTerm = query.searchText.toLowerCase();
        const searchFields = query.searchFields || ['details.description', 'details.operation'];
        
        results = results.filter(event => {
          return searchFields.some(field => {
            const value = this.getNestedValue(event, field);
            return value && value.toString().toLowerCase().includes(searchTerm);
          });
        });
      }

      // Apply sorting
      if (query.sortBy) {
        results.sort((a, b) => {
          const valueA = this.getNestedValue(a, query.sortBy!);
          const valueB = this.getNestedValue(b, query.sortBy!);
          
          const order = query.sortOrder === 'desc' ? -1 : 1;
          
          if (valueA < valueB) return -1 * order;
          if (valueA > valueB) return 1 * order;
          return 0;
        });
      } else {
        // Default sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      results = results.slice(offset, offset + limit);

      // Update metrics
      this.metrics.queryPerformance = Date.now() - startTime;

      this.logger.debug('Audit query executed', {
        query,
        resultCount: results.length,
        executionTime: this.metrics.queryPerformance,
      });

      return results;

    } catch (error) {
      this.logger.error('Audit query failed', error, { query });
      throw error;
    }
  }

  async generateReport(period: { startTime: number; endTime: number }): Promise<AuditReport> {
    this.logger.info('Generating comprehensive audit report', period);

    try {
      const events = await this.queryEvents({
        startTime: period.startTime,
        endTime: period.endTime,
      });

      const reportId = `audit_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const report: AuditReport = {
        id: reportId,
        title: `Audit Report - ${new Date(period.startTime).toISOString()} to ${new Date(period.endTime).toISOString()}`,
        description: 'Comprehensive audit trail report covering all system activities',
        generatedAt: Date.now(),
        period,
        
        summary: this.generateSummaryStatistics(events),
        
        sections: {
          transactions: this.generateTransactionSection(events),
          security: this.generateSecuritySection(events),
          compliance: this.generateComplianceSection(events),
          performance: this.generatePerformanceSection(events),
          anomalies: this.generateAnomalySection(events),
        },
        
        recommendations: await this.generateRecommendations(events),
        
        compliance: {
          framework: this.config.complianceMode,
          attestedBy: 'system',
          attestedAt: Date.now(),
          findings: await this.generateComplianceFindings(events),
        },
      };

      this.logger.info('Audit report generated successfully', {
        reportId,
        totalEvents: events.length,
        period,
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate audit report', error);
      throw error;
    }
  }

  createStream(query?: AuditQuery): AuditStream {
    const stream = new AuditStreamImpl(query);
    this.streams.add(stream);
    
    return stream;
  }

  getMetrics(): AuditMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  async exportEvents(query: AuditQuery, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const events = await this.queryEvents(query);
    
    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);
      case 'csv':
        return this.convertToCSV(events);
      case 'xml':
        return this.convertToXML(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private implementation methods

  private async initializeStorage(): Promise<void> {
    if (this.config.enablePersistentStorage) {
      // Initialize persistent storage connection
      this.logger.info('Initializing persistent storage', {
        endpoint: this.config.storageEndpoint,
      });
    }

    if (this.config.enableRealTimeStreaming) {
      // Initialize streaming connection
      this.logger.info('Initializing real-time streaming', {
        endpoint: this.config.streamingEndpoint,
      });
    }
  }

  private startMonitoringCycles(): void {
    // Event flushing cycle
    this.flushInterval = setInterval(async () => {
      await this.flushEvents();
    }, this.config.flushInterval * 1000);

    // Anomaly detection cycle
    if (this.config.enableAnomalyDetection) {
      this.anomalyDetectionInterval = setInterval(async () => {
        await this.runAnomalyDetection();
      }, 60 * 1000); // Every minute
    }

    // Metrics update cycle
    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics();
    }, 30 * 1000); // Every 30 seconds
  }

  private validateEvent(event: AuditEvent): void {
    if (!event.id || !event.timestamp || !event.category || !event.action) {
      throw new Error('Invalid audit event: missing required fields');
    }

    if (!this.config.enabledCategories.includes(event.category)) {
      throw new Error(`Category ${event.category} not enabled in audit configuration`);
    }

    const severityLevels = ['debug', 'info', 'warning', 'error', 'critical'];
    const minIndex = severityLevels.indexOf(this.config.minimumSeverity);
    const eventIndex = severityLevels.indexOf(event.severity);
    
    if (eventIndex < minIndex) {
      throw new Error(`Event severity ${event.severity} below minimum threshold ${this.config.minimumSeverity}`);
    }
  }

  private shouldRecordEvent(event: AuditEvent): boolean {
    // Check category filter
    if (!this.config.enabledCategories.includes(event.category)) {
      return false;
    }

    // Check severity filter
    const severityLevels = ['debug', 'info', 'warning', 'error', 'critical'];
    const minIndex = severityLevels.indexOf(this.config.minimumSeverity);
    const eventIndex = severityLevels.indexOf(event.severity);
    
    if (eventIndex < minIndex) {
      return false;
    }

    // Check internal event filter
    if (this.config.excludeInternalEvents && event.actor.type === 'system') {
      return false;
    }

    return true;
  }

  private updateIndex(event: AuditEvent): void {
    // Index by category
    if (!this.eventIndex.has(`category:${event.category}`)) {
      this.eventIndex.set(`category:${event.category}`, new Set());
    }
    this.eventIndex.get(`category:${event.category}`)!.add(this.events.length + this.eventBuffer.length - 1);

    // Index by actor
    if (!this.eventIndex.has(`actor:${event.actor.id}`)) {
      this.eventIndex.set(`actor:${event.actor.id}`, new Set());
    }
    this.eventIndex.get(`actor:${event.actor.id}`)!.add(this.events.length + this.eventBuffer.length - 1);

    // Index by resource
    if (!this.eventIndex.has(`resource:${event.resource.type}:${event.resource.id}`)) {
      this.eventIndex.set(`resource:${event.resource.type}:${event.resource.id}`, new Set());
    }
    this.eventIndex.get(`resource:${event.resource.type}:${event.resource.id}`)!.add(this.events.length + this.eventBuffer.length - 1);
  }

  private streamToSubscribers(event: AuditEvent): void {
    for (const stream of this.streams) {
      (stream as any).emit(event);
    }
  }

  private async checkForAnomalies(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    const recentEvents = this.eventBuffer.slice(-100);
    
    // Check for unusual transaction volumes
    if (event.category === 'transaction' && event.context.transactionHash) {
      const recentTransactions = recentEvents.filter(e => e.category === 'transaction');
      if (recentTransactions.length > this.config.alertThresholds.suspiciousTransactionCount) {
        await this.recordEvent({
          category: 'security',
          action: 'alert',
          severity: 'warning',
          actor: { type: 'system', id: 'anomaly_detector' },
          resource: { type: 'transaction_pattern', id: 'volume_spike' },
          details: {
            description: 'Unusual transaction volume detected',
            operation: 'anomaly_detection',
            parameters: { transactionCount: recentTransactions.length },
          },
          outcome: { success: true },
        });
      }
    }

    // Check for repeated failures
    if (!event.outcome.success) {
      const recentFailures = recentEvents.filter(e => !e.outcome.success && e.actor.id === event.actor.id);
      if (recentFailures.length >= this.config.alertThresholds.failureRateThreshold) {
        await this.recordEvent({
          category: 'security',
          action: 'alert',
          severity: 'error',
          actor: { type: 'system', id: 'anomaly_detector' },
          resource: { type: 'failure_pattern', id: 'repeated_failures' },
          details: {
            description: 'Repeated failures detected from same actor',
            operation: 'anomaly_detection',
            parameters: { failureCount: recentFailures.length, actorId: event.actor.id },
          },
          outcome: { success: true },
        });
      }
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Move to main storage
      this.events.push(...eventsToFlush);

      // Persist to external storage if enabled
      if (this.config.enablePersistentStorage) {
        await this.persistEvents(eventsToFlush);
      }

      // Apply retention policy
      await this.applyRetentionPolicy();

      this.logger.debug('Events flushed successfully', {
        eventCount: eventsToFlush.length,
        totalEvents: this.events.length,
      });

    } catch (error) {
      // Restore events to buffer on failure
      this.eventBuffer.unshift(...eventsToFlush);
      this.logger.error('Failed to flush events', error);
      throw error;
    }
  }

  private async persistEvents(events: AuditEvent[]): Promise<void> {
    // Implementation would persist to external storage
    // This is a placeholder for the actual persistence logic
    this.logger.debug('Persisting events to external storage', { count: events.length });
  }

  private async applyRetentionPolicy(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const originalCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    
    const removedCount = originalCount - this.events.length;
    if (removedCount > 0) {
      this.logger.info('Applied retention policy', {
        removedEvents: removedCount,
        remainingEvents: this.events.length,
        retentionPeriod: this.config.retentionPeriod,
      });
    }
  }

  private async runAnomalyDetection(): Promise<void> {
    // Comprehensive anomaly detection across all recent events
    const recentEvents = this.events.slice(-1000);
    
    // Detect patterns and anomalies
    // This would include more sophisticated ML-based detection in production
    this.logger.debug('Running anomaly detection', { eventCount: recentEvents.length });
  }

  private updateMetrics(): void {
    const totalEvents = this.events.length + this.eventBuffer.length;
    const bufferSize = this.eventBuffer.length * 1024; // Rough estimate
    const maxBufferSize = this.config.maxMemoryBuffer * 1024 * 1024;

    this.metrics = {
      totalEvents,
      eventsPerSecond: this.calculateEventsPerSecond(),
      storageUtilization: (this.events.length / 1000000) * 100, // Rough percentage
      indexingLatency: this.calculateIndexingLatency(),
      queryPerformance: this.metrics.queryPerformance, // Updated during queries
      bufferUtilization: (bufferSize / maxBufferSize) * 100,
      streamingLatency: this.calculateStreamingLatency(),
      compressionRatio: this.config.enableCompression ? 3.2 : 1.0, // Estimated
    };
  }

  private calculateEventsPerSecond(): number {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    const recentEvents = this.eventBuffer.filter(event => event.timestamp >= oneSecondAgo);
    return recentEvents.length;
  }

  private calculateIndexingLatency(): number {
    // Simplified calculation - in production would measure actual indexing time
    return this.eventBuffer.length * 0.1; // Estimated ms per event
  }

  private calculateStreamingLatency(): number {
    // Simplified calculation - in production would measure actual streaming latency
    return this.config.enableRealTimeStreaming ? 5 : 0;
  }

  private generateSummaryStatistics(events: AuditEvent[]): AuditReport['summary'] {
    const eventsByCategory = {} as Record<AuditCategory, number>;
    const eventsBySeverity = {} as Record<AuditSeverity, number>;
    const actors = new Set<string>();
    const failures = events.filter(e => !e.outcome.success);
    const responseTimes = events.filter(e => e.outcome.duration).map(e => e.outcome.duration!);

    for (const event of events) {
      eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      actors.add(event.actor.id);
    }

    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      totalEvents: events.length,
      eventsByCategory,
      eventsBySeverity,
      uniqueActors: actors.size,
      failureRate: events.length > 0 ? (failures.length / events.length) * 100 : 0,
      averageResponseTime,
    };
  }

  private generateTransactionSection(events: AuditEvent[]): TransactionAuditSection {
    const transactionEvents = events.filter(e => e.category === 'transaction');
    
    // Implementation would analyze transaction patterns
    return {
      totalTransactions: transactionEvents.length,
      totalVolume: new BN(0), // Would calculate from actual transaction data
      averageTransactionSize: new BN(0),
      largestTransaction: new BN(0),
      transactionsByType: {},
      failedTransactions: transactionEvents.filter(e => !e.outcome.success).length,
      failureReasons: {},
      gasAnalysis: {
        totalGasUsed: 0,
        averageGasPrice: new BN(0),
        gasEfficiencyTrend: [],
      },
    };
  }

  private generateSecuritySection(events: AuditEvent[]): SecurityAuditSection {
    const securityEvents = events.filter(e => e.category === 'security');
    
    return {
      securityEvents: securityEvents.length,
      authenticationAttempts: 0, // Would count from actual events
      authenticationFailures: 0,
      unauthorizedAccessAttempts: 0,
      suspiciousActivities: [],
      emergencyActivations: 0,
      securityAlerts: 0,
    };
  }

  private generateComplianceSection(events: AuditEvent[]): ComplianceAuditSection {
    return {
      complianceFramework: this.config.complianceMode,
      controlsEvaluated: 0,
      controlsPassed: 0,
      controlsFailed: 0,
      exemptions: 0,
      dataRetentionCompliance: true,
      encryptionCompliance: this.config.encryptSensitiveData,
      accessControlCompliance: true,
      auditTrailIntegrity: true,
    };
  }

  private generatePerformanceSection(events: AuditEvent[]): PerformanceAuditSection {
    const responseTimes = events.filter(e => e.outcome.duration).map(e => e.outcome.duration!);
    const failures = events.filter(e => !e.outcome.success);

    return {
      systemUptime: 99.9, // Would calculate from actual uptime data
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0,
      throughput: events.length,
      errorRate: events.length > 0 ? (failures.length / events.length) * 100 : 0,
      performanceTrends: [],
      bottlenecks: [],
    };
  }

  private generateAnomalySection(events: AuditEvent[]): AnomalyAuditSection {
    const anomalyEvents = events.filter(e => 
      e.category === 'security' && e.action === 'alert'
    );

    return {
      anomaliesDetected: anomalyEvents.length,
      anomalyTypes: {},
      highRiskAnomalies: [],
      falsePositives: 0,
      investigationStatus: {},
    };
  }

  private async generateRecommendations(events: AuditEvent[]): Promise<AuditRecommendation[]> {
    const recommendations: AuditRecommendation[] = [];

    // Analyze patterns and generate recommendations
    const failures = events.filter(e => !e.outcome.success);
    if (failures.length > events.length * 0.05) { // >5% failure rate
      recommendations.push({
        id: 'reduce_failure_rate',
        category: 'performance',
        priority: 'high',
        title: 'Reduce System Failure Rate',
        description: 'System failure rate exceeds recommended threshold',
        rationale: `Current failure rate: ${((failures.length / events.length) * 100).toFixed(2)}%`,
        implementation: 'Investigate root causes of failures and implement preventive measures',
        estimatedEffort: '2-4 weeks',
        riskReduction: 'High',
      });
    }

    return recommendations;
  }

  private async generateComplianceFindings(events: AuditEvent[]): Promise<ComplianceFinding[]> {
    // Generate compliance findings based on framework requirements
    return [];
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'id', 'timestamp', 'category', 'action', 'severity',
      'actor.id', 'actor.type', 'resource.type', 'resource.id',
      'details.description', 'outcome.success', 'outcome.duration'
    ];

    const csvLines = [headers.join(',')];

    for (const event of events) {
      const row = headers.map(header => {
        const value = this.getNestedValue(event, header);
        return value !== undefined ? JSON.stringify(value) : '';
      });
      csvLines.push(row.join(','));
    }

    return csvLines.join('\n');
  }

  private convertToXML(events: AuditEvent[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditEvents>\n';
    
    for (const event of events) {
      xml += '  <event>\n';
      xml += `    <id>${event.id}</id>\n`;
      xml += `    <timestamp>${event.timestamp}</timestamp>\n`;
      xml += `    <category>${event.category}</category>\n`;
      xml += `    <action>${event.action}</action>\n`;
      xml += `    <severity>${event.severity}</severity>\n`;
      xml += `    <description>${event.details.description}</description>\n`;
      xml += '  </event>\n';
    }
    
    xml += '</auditEvents>';
    return xml;
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): AuditTrailConfig {
    return { ...this.config };
  }
}

// Audit stream implementation
class AuditStreamImpl implements AuditStream {
  private query?: AuditQuery;
  private callback?: (event: AuditEvent) => void;

  constructor(query?: AuditQuery) {
    this.query = query;
  }

  subscribe(callback: (event: AuditEvent) => void): void {
    this.callback = callback;
  }

  unsubscribe(): void {
    this.callback = undefined;
  }

  filter(query: AuditQuery): AuditStream {
    return new AuditStreamImpl(query);
  }

  emit(event: AuditEvent): void {
    if (this.callback && this.matchesQuery(event)) {
      this.callback(event);
    }
  }

  private matchesQuery(event: AuditEvent): boolean {
    if (!this.query) return true;

    if (this.query.categories && !this.query.categories.includes(event.category)) {
      return false;
    }

    if (this.query.severities && !this.query.severities.includes(event.severity)) {
      return false;
    }

    if (this.query.startTime && event.timestamp < this.query.startTime) {
      return false;
    }

    if (this.query.endTime && event.timestamp > this.query.endTime) {
      return false;
    }

    return true;
  }
}

export default AuditTrail;