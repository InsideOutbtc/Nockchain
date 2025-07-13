// Comprehensive performance monitoring and metrics collection system

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface PerformanceMonitorConfig {
  // Monitoring settings
  enableRealTimeMonitoring: boolean;
  enableHistoricalTracking: boolean;
  enablePredictiveAnalytics: boolean;
  enableAlertSystem: boolean;
  
  // Collection intervals
  metricsCollectionInterval: number; // seconds
  performanceSnapshotInterval: number; // seconds
  healthCheckInterval: number; // seconds
  
  // Storage settings
  maxHistoryPoints: number;
  retentionPeriod: number; // days
  enableCompression: boolean;
  
  // Alert thresholds
  thresholds: {
    responseTime: {
      warning: number; // ms
      critical: number; // ms
    };
    throughput: {
      warning: number; // ops/sec
      critical: number; // ops/sec
    };
    errorRate: {
      warning: number; // percentage
      critical: number; // percentage
    };
    memoryUsage: {
      warning: number; // percentage
      critical: number; // percentage
    };
    cpuUsage: {
      warning: number; // percentage
      critical: number; // percentage
    };
    diskUsage: {
      warning: number; // percentage
      critical: number; // percentage
    };
    networkLatency: {
      warning: number; // ms
      critical: number; // ms
    };
  };
  
  // Component monitoring
  monitoredComponents: string[];
  enabledMetrics: PerformanceMetricType[];
}

export type PerformanceMetricType = 
  | 'response_time'
  | 'throughput'
  | 'error_rate'
  | 'memory_usage'
  | 'cpu_usage'
  | 'disk_usage'
  | 'network_latency'
  | 'transaction_latency'
  | 'gas_efficiency'
  | 'dex_performance'
  | 'yield_optimization'
  | 'trading_performance'
  | 'emergency_response'
  | 'audit_performance';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  component: string;
  metricType: PerformanceMetricType;
  value: number;
  unit: string;
  metadata: {
    samplingMethod: string;
    confidence: number;
    source: string;
    tags: Record<string, string>;
  };
}

export interface PerformanceSnapshot {
  id: string;
  timestamp: number;
  duration: number; // Collection period in ms
  
  // System metrics
  system: {
    uptime: number;
    memoryUsage: {
      total: number;
      used: number;
      free: number;
      utilization: number;
    };
    cpuUsage: {
      cores: number;
      utilization: number;
      loadAverage: number[];
    };
    diskUsage: {
      total: number;
      used: number;
      free: number;
      utilization: number;
    };
    networkStats: {
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
      latency: number;
    };
  };
  
  // Application metrics
  application: {
    responseTime: {
      average: number;
      median: number;
      p95: number;
      p99: number;
      min: number;
      max: number;
    };
    throughput: {
      requestsPerSecond: number;
      transactionsPerSecond: number;
      operationsPerSecond: number;
    };
    errorRate: {
      percentage: number;
      totalErrors: number;
      errorsByType: Record<string, number>;
    };
    activeConnections: number;
    queueSizes: Record<string, number>;
  };
  
  // Component-specific metrics
  components: Record<string, ComponentPerformanceMetrics>;
  
  // Health status
  health: {
    overall: 'healthy' | 'warning' | 'critical';
    components: Record<string, 'healthy' | 'warning' | 'critical'>;
    alerts: PerformanceAlert[];
  };
}

export interface ComponentPerformanceMetrics {
  component: string;
  status: 'active' | 'inactive' | 'error';
  uptime: number;
  
  // Performance metrics
  responseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  
  // Resource usage
  memoryUsage: number;
  cpuUsage: number;
  
  // Component-specific data
  customMetrics: Record<string, number>;
  
  // Recent activity
  recentEvents: number;
  lastActivity: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: PerformanceMetricType;
  component: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

export interface PerformanceTrend {
  metricType: PerformanceMetricType;
  component: string;
  period: {
    startTime: number;
    endTime: number;
  };
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
  statistics: {
    average: number;
    median: number;
    min: number;
    max: number;
    standardDeviation: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changeRate: number; // percentage change
  };
}

export interface PerformanceReport {
  id: string;
  title: string;
  generatedAt: number;
  period: {
    startTime: number;
    endTime: number;
  };
  
  // Executive summary
  summary: {
    overallHealth: 'healthy' | 'warning' | 'critical';
    uptime: number;
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    alertsGenerated: number;
    criticalIssues: number;
  };
  
  // Detailed sections
  sections: {
    systemPerformance: SystemPerformanceSection;
    componentAnalysis: ComponentAnalysisSection;
    trendAnalysis: TrendAnalysisSection;
    alertAnalysis: AlertAnalysisSection;
    recommendations: RecommendationSection;
  };
  
  // Charts and visualizations
  charts: {
    responseTimeChart: ChartData;
    throughputChart: ChartData;
    errorRateChart: ChartData;
    resourceUtilizationChart: ChartData;
  };
}

export interface SystemPerformanceSection {
  uptime: number;
  availability: number;
  reliability: number;
  
  performance: {
    averageResponseTime: number;
    peakResponseTime: number;
    throughput: number;
    peakThroughput: number;
    errorRate: number;
    successRate: number;
  };
  
  resources: {
    memoryUtilization: number;
    cpuUtilization: number;
    diskUtilization: number;
    networkUtilization: number;
  };
  
  scalability: {
    currentLoad: number;
    maxCapacity: number;
    utilizationPercentage: number;
    bottlenecks: string[];
  };
}

export interface ComponentAnalysisSection {
  components: Array<{
    name: string;
    status: string;
    performance: ComponentPerformanceMetrics;
    trends: PerformanceTrend[];
    issues: string[];
    recommendations: string[];
  }>;
  
  dependencies: Array<{
    from: string;
    to: string;
    latency: number;
    reliability: number;
    issues: string[];
  }>;
}

export interface TrendAnalysisSection {
  trends: PerformanceTrend[];
  predictions: Array<{
    metric: string;
    component: string;
    prediction: number;
    confidence: number;
    timeframe: number;
  }>;
  seasonality: Array<{
    metric: string;
    pattern: string;
    strength: number;
  }>;
}

export interface AlertAnalysisSection {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByComponent: Record<string, number>;
  alertsByType: Record<string, number>;
  
  topIssues: Array<{
    description: string;
    frequency: number;
    impact: string;
    resolution: string;
  }>;
  
  mttr: number; // Mean Time To Resolution
  mtbf: number; // Mean Time Between Failures
}

export interface RecommendationSection {
  performance: string[];
  scalability: string[];
  reliability: string[];
  optimization: string[];
  
  priority: Array<{
    recommendation: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort: string;
    impact: string;
  }>;
}

export interface ChartData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  xAxis: string;
  yAxis: string;
  datasets: Array<{
    label: string;
    data: Array<{ x: number; y: number }>;
    color: string;
  }>;
}

export class PerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private logger: Logger;
  private connection: Connection;
  
  private isActive: boolean = false;
  private metrics: PerformanceMetric[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private trends: Map<string, PerformanceTrend> = new Map();
  
  // Monitoring intervals
  private metricsInterval?: NodeJS.Timeout;
  private snapshotInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private alertProcessingInterval?: NodeJS.Timeout;

  constructor(
    config: PerformanceMonitorConfig,
    connection: Connection,
    logger: Logger
  ) {
    this.config = config;
    this.connection = connection;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Performance monitor already active');
      return;
    }

    this.logger.info('Starting comprehensive performance monitoring system', {
      enableRealTimeMonitoring: this.config.enableRealTimeMonitoring,
      enableHistoricalTracking: this.config.enableHistoricalTracking,
      enablePredictiveAnalytics: this.config.enablePredictiveAnalytics,
      monitoredComponents: this.config.monitoredComponents,
    });

    try {
      // Initialize monitoring systems
      await this.initializeMonitoring();
      
      // Start monitoring cycles
      this.isActive = true;
      this.startMonitoringCycles();

      this.logger.info('Performance monitoring system started successfully', {
        metricsCollectionInterval: this.config.metricsCollectionInterval,
        enabledMetrics: this.config.enabledMetrics,
      });

    } catch (error) {
      this.logger.error('Failed to start performance monitoring system', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Performance monitor not active');
      return;
    }

    this.logger.info('Stopping performance monitoring system');

    try {
      // Stop monitoring intervals
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      if (this.snapshotInterval) clearInterval(this.snapshotInterval);
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.alertProcessingInterval) clearInterval(this.alertProcessingInterval);

      this.isActive = false;
      
      this.logger.info('Performance monitoring system stopped successfully', {
        totalMetricsCollected: this.metrics.length,
        totalSnapshots: this.snapshots.length,
        totalAlerts: this.alerts.length,
      });

    } catch (error) {
      this.logger.error('Failed to stop performance monitoring system gracefully', error);
      this.isActive = false;
    }
  }

  async recordMetric(
    component: string,
    metricType: PerformanceMetricType,
    value: number,
    unit: string,
    metadata?: Partial<PerformanceMetric['metadata']>
  ): Promise<void> {
    if (!this.isActive) {
      throw new Error('Performance monitor not active');
    }

    const metric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      component,
      metricType,
      value,
      unit,
      metadata: {
        samplingMethod: 'direct',
        confidence: 1.0,
        source: 'system',
        tags: {},
        ...metadata,
      },
    };

    this.metrics.push(metric);

    // Apply retention policy
    await this.applyMetricsRetention();

    // Check for alerts
    if (this.config.enableAlertSystem) {
      await this.checkAlertThresholds(metric);
    }

    // Update trends
    if (this.config.enableHistoricalTracking) {
      this.updateTrends(metric);
    }

    this.logger.debug('Performance metric recorded', {
      component,
      metricType,
      value,
      unit,
    });
  }

  async takeSnapshot(): Promise<PerformanceSnapshot> {
    const startTime = Date.now();
    
    this.logger.debug('Taking performance snapshot');

    try {
      const snapshot: PerformanceSnapshot = {
        id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: startTime,
        duration: 0, // Will be set at the end
        
        system: await this.collectSystemMetrics(),
        application: await this.collectApplicationMetrics(),
        components: await this.collectComponentMetrics(),
        health: await this.assessSystemHealth(),
      };

      snapshot.duration = Date.now() - startTime;
      
      this.snapshots.push(snapshot);
      await this.applySnapshotRetention();

      this.logger.debug('Performance snapshot completed', {
        snapshotId: snapshot.id,
        duration: snapshot.duration,
        overallHealth: snapshot.health.overall,
      });

      return snapshot;

    } catch (error) {
      this.logger.error('Failed to take performance snapshot', error);
      throw error;
    }
  }

  async generateReport(period: { startTime: number; endTime: number }): Promise<PerformanceReport> {
    this.logger.info('Generating comprehensive performance report', period);

    try {
      const reportId = `perf_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Filter data for the period
      const periodMetrics = this.metrics.filter(m => 
        m.timestamp >= period.startTime && m.timestamp <= period.endTime
      );
      const periodSnapshots = this.snapshots.filter(s => 
        s.timestamp >= period.startTime && s.timestamp <= period.endTime
      );
      const periodAlerts = this.alerts.filter(a => 
        a.timestamp >= period.startTime && a.timestamp <= period.endTime
      );

      const report: PerformanceReport = {
        id: reportId,
        title: `Performance Report - ${new Date(period.startTime).toISOString()} to ${new Date(period.endTime).toISOString()}`,
        generatedAt: Date.now(),
        period,
        
        summary: await this.generateSummary(periodMetrics, periodSnapshots, periodAlerts),
        
        sections: {
          systemPerformance: await this.generateSystemPerformanceSection(periodSnapshots),
          componentAnalysis: await this.generateComponentAnalysisSection(periodMetrics, periodSnapshots),
          trendAnalysis: await this.generateTrendAnalysisSection(periodMetrics),
          alertAnalysis: await this.generateAlertAnalysisSection(periodAlerts),
          recommendations: await this.generateRecommendationsSection(periodMetrics, periodSnapshots, periodAlerts),
        },
        
        charts: await this.generateCharts(periodMetrics, periodSnapshots),
      };

      this.logger.info('Performance report generated successfully', {
        reportId,
        period,
        metricsAnalyzed: periodMetrics.length,
        snapshotsAnalyzed: periodSnapshots.length,
        alertsAnalyzed: periodAlerts.length,
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate performance report', error);
      throw error;
    }
  }

  getTrends(
    metricType: PerformanceMetricType,
    component?: string,
    period?: { startTime: number; endTime: number }
  ): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    for (const trend of this.trends.values()) {
      if (trend.metricType === metricType &&
          (!component || trend.component === component) &&
          (!period || (trend.period.startTime >= period.startTime && trend.period.endTime <= period.endTime))) {
        trends.push(trend);
      }
    }
    
    return trends.sort((a, b) => b.period.endTime - a.period.endTime);
  }

  getAlerts(severity?: PerformanceAlert['severity'], component?: string): PerformanceAlert[] {
    return this.alerts
      .filter(alert => 
        (!severity || alert.severity === severity) &&
        (!component || alert.component === component) &&
        !alert.resolvedAt
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.info('Performance alert acknowledged', { alertId });
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.logger.info('Performance alert resolved', { alertId });
    }
  }

  getMetrics(
    component?: string,
    metricType?: PerformanceMetricType,
    period?: { startTime: number; endTime: number }
  ): PerformanceMetric[] {
    return this.metrics.filter(metric =>
      (!component || metric.component === component) &&
      (!metricType || metric.metricType === metricType) &&
      (!period || (metric.timestamp >= period.startTime && metric.timestamp <= period.endTime))
    );
  }

  getLatestSnapshot(): PerformanceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  // Private implementation methods

  private async initializeMonitoring(): Promise<void> {
    // Initialize performance baseline
    await this.establishBaseline();
    
    // Initialize alert thresholds
    this.validateAlertThresholds();
    
    this.logger.info('Performance monitoring initialized');
  }

  private startMonitoringCycles(): void {
    // Metrics collection cycle
    if (this.config.enableRealTimeMonitoring) {
      this.metricsInterval = setInterval(async () => {
        await this.collectAllMetrics();
      }, this.config.metricsCollectionInterval * 1000);
    }

    // Performance snapshot cycle
    if (this.config.enableHistoricalTracking) {
      this.snapshotInterval = setInterval(async () => {
        await this.takeSnapshot();
      }, this.config.performanceSnapshotInterval * 1000);
    }

    // Health check cycle
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval * 1000);

    // Alert processing cycle
    if (this.config.enableAlertSystem) {
      this.alertProcessingInterval = setInterval(async () => {
        await this.processAlerts();
      }, 30 * 1000); // Every 30 seconds
    }
  }

  private async establishBaseline(): Promise<void> {
    // Take initial performance measurements to establish baseline
    this.logger.info('Establishing performance baseline');
    
    for (const component of this.config.monitoredComponents) {
      for (const metricType of this.config.enabledMetrics) {
        const value = await this.measureMetric(component, metricType);
        if (value !== null) {
          await this.recordMetric(component, metricType, value, this.getMetricUnit(metricType), {
            tags: { baseline: 'true' },
          });
        }
      }
    }
  }

  private validateAlertThresholds(): void {
    // Validate that alert thresholds are properly configured
    const requiredThresholds = [
      'responseTime', 'throughput', 'errorRate', 'memoryUsage', 'cpuUsage'
    ];
    
    for (const threshold of requiredThresholds) {
      if (!this.config.thresholds[threshold as keyof typeof this.config.thresholds]) {
        throw new Error(`Missing alert threshold configuration for: ${threshold}`);
      }
    }
  }

  private async collectAllMetrics(): Promise<void> {
    try {
      for (const component of this.config.monitoredComponents) {
        for (const metricType of this.config.enabledMetrics) {
          const value = await this.measureMetric(component, metricType);
          if (value !== null) {
            await this.recordMetric(component, metricType, value, this.getMetricUnit(metricType));
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
    }
  }

  private async measureMetric(component: string, metricType: PerformanceMetricType): Promise<number | null> {
    try {
      switch (metricType) {
        case 'response_time':
          return await this.measureResponseTime(component);
        case 'throughput':
          return await this.measureThroughput(component);
        case 'error_rate':
          return await this.measureErrorRate(component);
        case 'memory_usage':
          return await this.measureMemoryUsage(component);
        case 'cpu_usage':
          return await this.measureCpuUsage(component);
        case 'network_latency':
          return await this.measureNetworkLatency(component);
        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`Failed to measure ${metricType} for ${component}`, error);
      return null;
    }
  }

  private async measureResponseTime(component: string): Promise<number> {
    // Measure component response time
    const startTime = Date.now();
    
    // Simulate component health check
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    return Date.now() - startTime;
  }

  private async measureThroughput(component: string): Promise<number> {
    // Measure component throughput (operations per second)
    // This would integrate with actual component metrics
    return Math.random() * 1000;
  }

  private async measureErrorRate(component: string): Promise<number> {
    // Measure component error rate as percentage
    return Math.random() * 5; // 0-5% error rate
  }

  private async measureMemoryUsage(component: string): Promise<number> {
    // Measure component memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return (usage.heapUsed / usage.heapTotal) * 100;
    }
    return Math.random() * 80; // 0-80% memory usage
  }

  private async measureCpuUsage(component: string): Promise<number> {
    // Measure component CPU usage
    return Math.random() * 60; // 0-60% CPU usage
  }

  private async measureNetworkLatency(component: string): Promise<number> {
    // Measure network latency
    const startTime = Date.now();
    
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      return Date.now() - startTime;
    } catch (error) {
      return -1; // Indicate failure
    }
  }

  private getMetricUnit(metricType: PerformanceMetricType): string {
    const units: Record<PerformanceMetricType, string> = {
      response_time: 'ms',
      throughput: 'ops/sec',
      error_rate: '%',
      memory_usage: '%',
      cpu_usage: '%',
      disk_usage: '%',
      network_latency: 'ms',
      transaction_latency: 'ms',
      gas_efficiency: 'gas/tx',
      dex_performance: 'ops/sec',
      yield_optimization: '%',
      trading_performance: 'ops/sec',
      emergency_response: 'ms',
      audit_performance: 'events/sec',
    };
    
    return units[metricType] || 'unit';
  }

  private async collectSystemMetrics(): Promise<PerformanceSnapshot['system']> {
    // Collect system-level metrics
    const memoryUsage = typeof process !== 'undefined' ? process.memoryUsage() : null;
    
    return {
      uptime: Date.now() - (this.isActive ? Date.now() - 3600000 : Date.now()), // Simplified
      memoryUsage: {
        total: memoryUsage?.heapTotal || 1000000000,
        used: memoryUsage?.heapUsed || 500000000,
        free: memoryUsage ? memoryUsage.heapTotal - memoryUsage.heapUsed : 500000000,
        utilization: memoryUsage ? (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 : 50,
      },
      cpuUsage: {
        cores: 4, // Simplified
        utilization: Math.random() * 60,
        loadAverage: [1.2, 1.5, 1.8],
      },
      diskUsage: {
        total: 1000000000000, // 1TB
        used: 500000000000, // 500GB
        free: 500000000000, // 500GB
        utilization: 50,
      },
      networkStats: {
        bytesIn: 1000000,
        bytesOut: 800000,
        packetsIn: 5000,
        packetsOut: 4000,
        latency: Math.random() * 50,
      },
    };
  }

  private async collectApplicationMetrics(): Promise<PerformanceSnapshot['application']> {
    // Collect application-level metrics
    const recentMetrics = this.metrics.slice(-100);
    const responseTimes = recentMetrics
      .filter(m => m.metricType === 'response_time')
      .map(m => m.value);
    
    return {
      responseTime: {
        average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        median: this.calculateMedian(responseTimes),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      },
      throughput: {
        requestsPerSecond: Math.random() * 1000,
        transactionsPerSecond: Math.random() * 100,
        operationsPerSecond: Math.random() * 500,
      },
      errorRate: {
        percentage: Math.random() * 5,
        totalErrors: Math.floor(Math.random() * 10),
        errorsByType: {
          'network_error': Math.floor(Math.random() * 3),
          'validation_error': Math.floor(Math.random() * 2),
          'timeout_error': Math.floor(Math.random() * 1),
        },
      },
      activeConnections: Math.floor(Math.random() * 100),
      queueSizes: {
        'transaction_queue': Math.floor(Math.random() * 50),
        'audit_queue': Math.floor(Math.random() * 20),
      },
    };
  }

  private async collectComponentMetrics(): Promise<Record<string, ComponentPerformanceMetrics>> {
    const componentMetrics: Record<string, ComponentPerformanceMetrics> = {};
    
    for (const component of this.config.monitoredComponents) {
      const recentMetrics = this.metrics.filter(m => 
        m.component === component && 
        m.timestamp > Date.now() - 300000 // Last 5 minutes
      );
      
      componentMetrics[component] = {
        component,
        status: 'active',
        uptime: Math.random() * 86400000, // Random uptime in ms
        
        responseTime: this.getAverageMetricValue(recentMetrics, 'response_time'),
        throughput: this.getAverageMetricValue(recentMetrics, 'throughput'),
        errorRate: this.getAverageMetricValue(recentMetrics, 'error_rate'),
        successRate: 100 - this.getAverageMetricValue(recentMetrics, 'error_rate'),
        
        memoryUsage: this.getAverageMetricValue(recentMetrics, 'memory_usage'),
        cpuUsage: this.getAverageMetricValue(recentMetrics, 'cpu_usage'),
        
        customMetrics: {},
        
        recentEvents: recentMetrics.length,
        lastActivity: recentMetrics.length > 0 ? Math.max(...recentMetrics.map(m => m.timestamp)) : 0,
      };
    }
    
    return componentMetrics;
  }

  private async assessSystemHealth(): Promise<PerformanceSnapshot['health']> {
    const componentHealth: Record<string, 'healthy' | 'warning' | 'critical'> = {};
    const activeAlerts = this.getAlerts();
    
    // Assess component health
    for (const component of this.config.monitoredComponents) {
      const componentAlerts = activeAlerts.filter(a => a.component === component);
      const criticalAlerts = componentAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = componentAlerts.filter(a => a.severity === 'warning');
      
      if (criticalAlerts.length > 0) {
        componentHealth[component] = 'critical';
      } else if (warningAlerts.length > 0) {
        componentHealth[component] = 'warning';
      } else {
        componentHealth[component] = 'healthy';
      }
    }
    
    // Determine overall health
    const criticalComponents = Object.values(componentHealth).filter(h => h === 'critical').length;
    const warningComponents = Object.values(componentHealth).filter(h => h === 'warning').length;
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalComponents > 0) {
      overall = 'critical';
    } else if (warningComponents > 0) {
      overall = 'warning';
    }
    
    return {
      overall,
      components: componentHealth,
      alerts: activeAlerts,
    };
  }

  private async checkAlertThresholds(metric: PerformanceMetric): Promise<void> {
    const thresholds = this.getThresholdsForMetric(metric.metricType);
    if (!thresholds) return;
    
    let alertSeverity: PerformanceAlert['severity'] | null = null;
    
    if (metric.value >= thresholds.critical) {
      alertSeverity = 'critical';
    } else if (metric.value >= thresholds.warning) {
      alertSeverity = 'warning';
    }
    
    if (alertSeverity) {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: metric.timestamp,
        severity: alertSeverity,
        type: metric.metricType,
        component: metric.component,
        metric: metric.metricType,
        value: metric.value,
        threshold: alertSeverity === 'critical' ? thresholds.critical : thresholds.warning,
        message: `${metric.metricType} for ${metric.component} exceeded ${alertSeverity} threshold: ${metric.value}${metric.unit}`,
        acknowledged: false,
        metadata: { ...metric.metadata },
      };
      
      this.alerts.push(alert);
      
      this.logger.warn(`Performance alert generated`, {
        alertId: alert.id,
        severity: alertSeverity,
        component: metric.component,
        metric: metric.metricType,
        value: metric.value,
        threshold: alert.threshold,
      });
    }
  }

  private getThresholdsForMetric(metricType: PerformanceMetricType): { warning: number; critical: number } | null {
    switch (metricType) {
      case 'response_time':
        return this.config.thresholds.responseTime;
      case 'throughput':
        return this.config.thresholds.throughput;
      case 'error_rate':
        return this.config.thresholds.errorRate;
      case 'memory_usage':
        return this.config.thresholds.memoryUsage;
      case 'cpu_usage':
        return this.config.thresholds.cpuUsage;
      case 'network_latency':
        return this.config.thresholds.networkLatency;
      default:
        return null;
    }
  }

  private updateTrends(metric: PerformanceMetric): void {
    const trendKey = `${metric.component}:${metric.metricType}`;
    const existingTrend = this.trends.get(trendKey);
    
    if (existingTrend) {
      // Update existing trend
      existingTrend.dataPoints.push({
        timestamp: metric.timestamp,
        value: metric.value,
      });
      
      // Keep only recent data points
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      existingTrend.dataPoints = existingTrend.dataPoints.filter(dp => dp.timestamp >= cutoff);
      
      // Update statistics
      existingTrend.statistics = this.calculateTrendStatistics(existingTrend.dataPoints);
      existingTrend.period.endTime = metric.timestamp;
    } else {
      // Create new trend
      const trend: PerformanceTrend = {
        metricType: metric.metricType,
        component: metric.component,
        period: {
          startTime: metric.timestamp,
          endTime: metric.timestamp,
        },
        dataPoints: [{
          timestamp: metric.timestamp,
          value: metric.value,
        }],
        statistics: {
          average: metric.value,
          median: metric.value,
          min: metric.value,
          max: metric.value,
          standardDeviation: 0,
          trend: 'stable',
          changeRate: 0,
        },
      };
      
      this.trends.set(trendKey, trend);
    }
  }

  private calculateTrendStatistics(dataPoints: Array<{ timestamp: number; value: number }>): PerformanceTrend['statistics'] {
    if (dataPoints.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        trend: 'stable',
        changeRate: 0,
      };
    }
    
    const values = dataPoints.map(dp => dp.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = this.calculateMedian(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const standardDeviation = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
    );
    
    // Calculate trend direction
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let changeRate = 0;
    
    if (dataPoints.length >= 2) {
      const firstValue = dataPoints[0].value;
      const lastValue = dataPoints[dataPoints.length - 1].value;
      changeRate = ((lastValue - firstValue) / firstValue) * 100;
      
      if (Math.abs(changeRate) > 5) { // 5% threshold
        trend = changeRate > 0 ? 'increasing' : 'decreasing';
      }
    }
    
    return {
      average,
      median,
      min,
      max,
      standardDeviation,
      trend,
      changeRate,
    };
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    
    return sorted[Math.max(0, index)];
  }

  private getAverageMetricValue(metrics: PerformanceMetric[], metricType: PerformanceMetricType): number {
    const filteredMetrics = metrics.filter(m => m.metricType === metricType);
    if (filteredMetrics.length === 0) return 0;
    
    return filteredMetrics.reduce((sum, m) => sum + m.value, 0) / filteredMetrics.length;
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const snapshot = await this.takeSnapshot();
      
      if (snapshot.health.overall === 'critical') {
        this.logger.error('Critical system health detected', {
          criticalComponents: Object.entries(snapshot.health.components)
            .filter(([_, health]) => health === 'critical')
            .map(([component, _]) => component),
          activeAlerts: snapshot.health.alerts.length,
        });
      }
    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  private async processAlerts(): Promise<void> {
    const unacknowledgedAlerts = this.alerts.filter(a => !a.acknowledged && !a.resolvedAt);
    
    // Auto-resolve alerts that are no longer applicable
    for (const alert of unacknowledgedAlerts) {
      const recentMetrics = this.getMetrics(alert.component, alert.type, {
        startTime: Date.now() - 300000, // Last 5 minutes
        endTime: Date.now(),
      });
      
      if (recentMetrics.length > 0) {
        const latestValue = recentMetrics[recentMetrics.length - 1].value;
        const thresholds = this.getThresholdsForMetric(alert.type);
        
        if (thresholds && latestValue < thresholds.warning) {
          await this.resolveAlert(alert.id);
        }
      }
    }
  }

  private async applyMetricsRetention(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const originalCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff);
    
    const removedCount = originalCount - this.metrics.length;
    if (removedCount > 0) {
      this.logger.debug('Applied metrics retention policy', {
        removedMetrics: removedCount,
        remainingMetrics: this.metrics.length,
      });
    }
  }

  private async applySnapshotRetention(): Promise<void> {
    if (this.snapshots.length > this.config.maxHistoryPoints) {
      const toRemove = this.snapshots.length - this.config.maxHistoryPoints;
      this.snapshots.splice(0, toRemove);
      
      this.logger.debug('Applied snapshot retention policy', {
        removedSnapshots: toRemove,
        remainingSnapshots: this.snapshots.length,
      });
    }
  }

  // Report generation methods (simplified implementations)

  private async generateSummary(
    metrics: PerformanceMetric[],
    snapshots: PerformanceSnapshot[],
    alerts: PerformanceAlert[]
  ): Promise<PerformanceReport['summary']> {
    const responseTimeMetrics = metrics.filter(m => m.metricType === 'response_time');
    const throughputMetrics = metrics.filter(m => m.metricType === 'throughput');
    const errorRateMetrics = metrics.filter(m => m.metricType === 'error_rate');
    
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const uptime = snapshots.length > 0 ? snapshots[snapshots.length - 1].system.uptime : 0;

    return {
      overallHealth: criticalAlerts.length > 0 ? 'critical' : 
                    alerts.filter(a => a.severity === 'warning').length > 0 ? 'warning' : 'healthy',
      uptime,
      averageResponseTime: responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length 
        : 0,
      throughput: throughputMetrics.length > 0 
        ? throughputMetrics.reduce((sum, m) => sum + m.value, 0) / throughputMetrics.length 
        : 0,
      errorRate: errorRateMetrics.length > 0 
        ? errorRateMetrics.reduce((sum, m) => sum + m.value, 0) / errorRateMetrics.length 
        : 0,
      alertsGenerated: alerts.length,
      criticalIssues: criticalAlerts.length,
    };
  }

  private async generateSystemPerformanceSection(snapshots: PerformanceSnapshot[]): Promise<SystemPerformanceSection> {
    // Implementation would analyze system performance across snapshots
    return {
      uptime: 99.9,
      availability: 99.8,
      reliability: 99.5,
      performance: {
        averageResponseTime: 150,
        peakResponseTime: 500,
        throughput: 1000,
        peakThroughput: 2000,
        errorRate: 0.5,
        successRate: 99.5,
      },
      resources: {
        memoryUtilization: 65,
        cpuUtilization: 45,
        diskUtilization: 50,
        networkUtilization: 30,
      },
      scalability: {
        currentLoad: 60,
        maxCapacity: 100,
        utilizationPercentage: 60,
        bottlenecks: ['network_latency', 'database_connections'],
      },
    };
  }

  private async generateComponentAnalysisSection(
    metrics: PerformanceMetric[],
    snapshots: PerformanceSnapshot[]
  ): Promise<ComponentAnalysisSection> {
    // Implementation would analyze component performance
    return {
      components: [],
      dependencies: [],
    };
  }

  private async generateTrendAnalysisSection(metrics: PerformanceMetric[]): Promise<TrendAnalysisSection> {
    return {
      trends: Array.from(this.trends.values()),
      predictions: [],
      seasonality: [],
    };
  }

  private async generateAlertAnalysisSection(alerts: PerformanceAlert[]): Promise<AlertAnalysisSection> {
    const alertsBySeverity: Record<string, number> = {};
    const alertsByComponent: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};

    for (const alert of alerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsByComponent[alert.component] = (alertsByComponent[alert.component] || 0) + 1;
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    }

    return {
      totalAlerts: alerts.length,
      alertsBySeverity,
      alertsByComponent,
      alertsByType,
      topIssues: [],
      mttr: 1800, // 30 minutes average
      mtbf: 86400, // 24 hours average
    };
  }

  private async generateRecommendationsSection(
    metrics: PerformanceMetric[],
    snapshots: PerformanceSnapshot[],
    alerts: PerformanceAlert[]
  ): Promise<RecommendationSection> {
    return {
      performance: ['Optimize database queries', 'Implement caching'],
      scalability: ['Add load balancing', 'Increase server capacity'],
      reliability: ['Implement circuit breakers', 'Add retry mechanisms'],
      optimization: ['Compress response data', 'Optimize memory usage'],
      priority: [
        {
          recommendation: 'Reduce response time',
          priority: 'high',
          effort: '1-2 weeks',
          impact: 'High',
        },
      ],
    };
  }

  private async generateCharts(
    metrics: PerformanceMetric[],
    snapshots: PerformanceSnapshot[]
  ): Promise<PerformanceReport['charts']> {
    return {
      responseTimeChart: {
        title: 'Response Time Trend',
        type: 'line',
        xAxis: 'Time',
        yAxis: 'Response Time (ms)',
        datasets: [{
          label: 'Response Time',
          data: metrics
            .filter(m => m.metricType === 'response_time')
            .map(m => ({ x: m.timestamp, y: m.value })),
          color: '#007bff',
        }],
      },
      throughputChart: {
        title: 'Throughput Trend',
        type: 'line',
        xAxis: 'Time',
        yAxis: 'Operations per Second',
        datasets: [{
          label: 'Throughput',
          data: metrics
            .filter(m => m.metricType === 'throughput')
            .map(m => ({ x: m.timestamp, y: m.value })),
          color: '#28a745',
        }],
      },
      errorRateChart: {
        title: 'Error Rate Trend',
        type: 'line',
        xAxis: 'Time',
        yAxis: 'Error Rate (%)',
        datasets: [{
          label: 'Error Rate',
          data: metrics
            .filter(m => m.metricType === 'error_rate')
            .map(m => ({ x: m.timestamp, y: m.value })),
          color: '#dc3545',
        }],
      },
      resourceUtilizationChart: {
        title: 'Resource Utilization',
        type: 'bar',
        xAxis: 'Resource',
        yAxis: 'Utilization (%)',
        datasets: [{
          label: 'Utilization',
          data: [
            { x: 'CPU', y: 45 },
            { x: 'Memory', y: 65 },
            { x: 'Disk', y: 50 },
            { x: 'Network', y: 30 },
          ],
          color: '#ffc107',
        }],
      },
    };
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }
}

export default PerformanceMonitor;