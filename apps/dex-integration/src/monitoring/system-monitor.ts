// System-wide monitoring and health management service

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface SystemMonitorConfig {
  // Core monitoring settings
  enableSystemMonitoring: boolean;
  enableComponentMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  enableSecurityMonitoring: boolean;
  
  // Monitoring intervals
  systemCheckInterval: number; // seconds
  componentCheckInterval: number; // seconds
  networkCheckInterval: number; // seconds
  securityCheckInterval: number; // seconds
  
  // Health check settings
  healthCheckTimeout: number; // seconds
  maxConsecutiveFailures: number;
  enableAutomaticRecovery: boolean;
  
  // Alert settings
  enableAlerts: boolean;
  alertChannels: AlertChannel[];
  escalationRules: EscalationRule[];
  
  // Data retention
  retentionPeriod: number; // days
  maxDataPoints: number;
  enableCompression: boolean;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'webhook' | 'sms' | 'slack' | 'discord';
  endpoint: string;
  enabled: boolean;
  severity: SystemSeverity[];
  components: string[];
}

export interface EscalationRule {
  id: string;
  condition: {
    severity: SystemSeverity;
    duration: number; // minutes
    consecutiveFailures: number;
  };
  action: {
    type: 'notify' | 'restart' | 'failover' | 'emergency_stop';
    parameters: Record<string, any>;
  };
}

export type SystemSeverity = 'info' | 'warning' | 'error' | 'critical' | 'emergency';

export type SystemStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export type ComponentType = 
  | 'dex_aggregator'
  | 'yield_optimizer'
  | 'trading_interface'
  | 'emergency_manager'
  | 'audit_trail'
  | 'performance_monitor'
  | 'bridge_validator'
  | 'smart_contract'
  | 'database'
  | 'cache'
  | 'message_queue'
  | 'external_api';

export interface SystemHealthStatus {
  overall: SystemStatus;
  timestamp: number;
  uptime: number;
  
  // Component health
  components: Record<string, ComponentHealth>;
  
  // System metrics
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
    reliability: number;
  };
  
  // Resource utilization
  resources: {
    memory: ResourceMetric;
    cpu: ResourceMetric;
    disk: ResourceMetric;
    network: ResourceMetric;
  };
  
  // Security status
  security: {
    status: SystemStatus;
    threats: ThreatInfo[];
    vulnerabilities: VulnerabilityInfo[];
    lastSecurityScan: number;
  };
  
  // Active alerts
  activeAlerts: SystemAlert[];
  
  // Dependencies
  dependencies: DependencyHealth[];
}

export interface ComponentHealth {
  name: string;
  type: ComponentType;
  status: SystemStatus;
  lastCheck: number;
  lastSuccess: number;
  consecutiveFailures: number;
  
  // Performance metrics
  responseTime: number;
  throughput: number;
  errorRate: number;
  
  // Resource usage
  memoryUsage: number;
  cpuUsage: number;
  
  // Health checks
  healthChecks: HealthCheck[];
  
  // Dependencies
  dependencies: string[];
  dependents: string[];
  
  // Configuration
  config: {
    enabled: boolean;
    autoRestart: boolean;
    maxRestarts: number;
    timeout: number;
  };
  
  // Metadata
  version: string;
  buildInfo: Record<string, any>;
  environment: string;
}

export interface ResourceMetric {
  current: number;
  max: number;
  utilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  thresholds: {
    warning: number;
    critical: number;
  };
}

export interface ThreatInfo {
  id: string;
  type: string;
  severity: SystemSeverity;
  description: string;
  source: string;
  timestamp: number;
  mitigated: boolean;
  mitigation?: string;
}

export interface VulnerabilityInfo {
  id: string;
  type: string;
  severity: SystemSeverity;
  description: string;
  component: string;
  discovered: number;
  patched: boolean;
  patchInfo?: string;
}

export interface DependencyHealth {
  name: string;
  type: 'internal' | 'external';
  endpoint?: string;
  status: SystemStatus;
  lastCheck: number;
  responseTime: number;
  availability: number;
  
  // Dependency-specific metrics
  connectionPool?: {
    active: number;
    idle: number;
    max: number;
  };
  
  // External service info
  serviceInfo?: {
    provider: string;
    version: string;
    region: string;
    rateLimit: number;
  };
}

export interface HealthCheck {
  id: string;
  name: string;
  type: 'ping' | 'http' | 'tcp' | 'custom';
  enabled: boolean;
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
  
  // Check configuration
  config: {
    url?: string;
    port?: number;
    expectedStatus?: number;
    expectedResponse?: string;
    customFunction?: () => Promise<boolean>;
  };
  
  // Check results
  lastRun: number;
  lastSuccess: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  successRate: number;
  
  // History
  history: HealthCheckResult[];
}

export interface HealthCheckResult {
  timestamp: number;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  timestamp: number;
  severity: SystemSeverity;
  component: string;
  type: string;
  title: string;
  description: string;
  
  // Alert details
  details: {
    metric?: string;
    value?: number;
    threshold?: number;
    duration?: number;
    impact?: string;
  };
  
  // Alert lifecycle
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  
  // Escalation
  escalated: boolean;
  escalationLevel: number;
  escalationHistory: EscalationEvent[];
  
  // Metadata
  correlationId?: string;
  tags: Record<string, string>;
  actions: AlertAction[];
}

export interface EscalationEvent {
  timestamp: number;
  level: number;
  action: string;
  result: string;
  details: Record<string, any>;
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'acknowledge' | 'resolve' | 'escalate' | 'restart' | 'investigate';
  enabled: boolean;
  requiresConfirmation: boolean;
}

export interface SystemEvent {
  id: string;
  timestamp: number;
  type: 'startup' | 'shutdown' | 'restart' | 'configuration_change' | 'deployment' | 'error' | 'warning' | 'recovery';
  component: string;
  description: string;
  details: Record<string, any>;
  severity: SystemSeverity;
  user?: string;
  automated: boolean;
}

export interface MonitoringReport {
  id: string;
  title: string;
  generatedAt: number;
  period: {
    startTime: number;
    endTime: number;
  };
  
  // Executive summary
  summary: {
    overallHealth: SystemStatus;
    uptime: number;
    availability: number;
    reliability: number;
    totalAlerts: number;
    criticalIncidents: number;
    meanTimeToRecovery: number;
    systemEfficiency: number;
  };
  
  // Detailed analysis
  analysis: {
    systemPerformance: SystemPerformanceAnalysis;
    componentAnalysis: ComponentAnalysis;
    securityAnalysis: SecurityAnalysis;
    infrastructureAnalysis: InfrastructureAnalysis;
    incidentAnalysis: IncidentAnalysis;
  };
  
  // Trends and predictions
  trends: {
    healthTrends: HealthTrend[];
    performanceTrends: PerformanceTrend[];
    usageTrends: UsageTrend[];
    predictions: SystemPrediction[];
  };
  
  // Recommendations
  recommendations: MonitoringRecommendation[];
}

export interface SystemPerformanceAnalysis {
  averageResponseTime: number;
  responseTimeDistribution: Record<string, number>;
  throughputAnalysis: {
    average: number;
    peak: number;
    trends: string[];
  };
  errorAnalysis: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    topErrors: Array<{ error: string; count: number }>;
  };
  availabilityAnalysis: {
    uptime: number;
    downtime: number;
    downtimeEvents: Array<{ start: number; end: number; reason: string }>;
  };
}

export interface ComponentAnalysis {
  components: Array<{
    name: string;
    health: SystemStatus;
    performance: {
      responseTime: number;
      throughput: number;
      errorRate: number;
      availability: number;
    };
    issues: string[];
    improvements: string[];
  }>;
  
  dependencies: Array<{
    component: string;
    dependencies: string[];
    healthScore: number;
    criticalPath: boolean;
  }>;
  
  reliability: {
    mostReliable: string[];
    leastReliable: string[];
    improvementAreas: string[];
  };
}

export interface SecurityAnalysis {
  threatLevel: SystemSeverity;
  threatsDetected: number;
  vulnerabilitiesFound: number;
  securityScore: number;
  
  incidents: Array<{
    type: string;
    severity: SystemSeverity;
    timestamp: number;
    resolved: boolean;
  }>;
  
  recommendations: string[];
}

export interface InfrastructureAnalysis {
  resourceUtilization: {
    memory: { average: number; peak: number; trend: string };
    cpu: { average: number; peak: number; trend: string };
    disk: { average: number; peak: number; trend: string };
    network: { average: number; peak: number; trend: string };
  };
  
  capacity: {
    current: number;
    projected: number;
    bottlenecks: string[];
    scalingNeeds: string[];
  };
  
  efficiency: {
    score: number;
    improvementAreas: string[];
    costOptimization: string[];
  };
}

export interface IncidentAnalysis {
  totalIncidents: number;
  incidentsByType: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  
  resolution: {
    averageTime: number;
    fastestResolution: number;
    slowestResolution: number;
    escalationRate: number;
  };
  
  patterns: Array<{
    pattern: string;
    frequency: number;
    impact: string;
  }>;
  
  prevention: string[];
}

export interface HealthTrend {
  component: string;
  metric: string;
  trend: 'improving' | 'degrading' | 'stable';
  changeRate: number;
  prediction: string;
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'degrading' | 'stable';
  changeRate: number;
  forecast: Array<{ timestamp: number; value: number }>;
}

export interface UsageTrend {
  resource: string;
  utilization: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  projected: Array<{ timestamp: number; value: number }>;
}

export interface SystemPrediction {
  type: 'capacity' | 'performance' | 'failure' | 'maintenance';
  component: string;
  prediction: string;
  confidence: number;
  timeframe: number;
  impact: string;
  recommendation: string;
}

export interface MonitoringRecommendation {
  id: string;
  category: 'performance' | 'reliability' | 'security' | 'capacity' | 'cost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  benefit: string;
  effort: string;
  implementation: string[];
  deadline?: number;
}

export class SystemMonitor {
  private config: SystemMonitorConfig;
  private logger: Logger;
  private connection: Connection;
  
  private isActive: boolean = false;
  private components: Map<string, ComponentHealth> = new Map();
  private alerts: SystemAlert[] = [];
  private events: SystemEvent[] = [];
  private healthHistory: SystemHealthStatus[] = [];
  
  // Monitoring intervals
  private systemCheckInterval?: NodeJS.Timeout;
  private componentCheckInterval?: NodeJS.Timeout;
  private networkCheckInterval?: NodeJS.Timeout;
  private securityCheckInterval?: NodeJS.Timeout;
  private alertProcessingInterval?: NodeJS.Timeout;
  
  // System metrics
  private startTime: number = Date.now();
  private lastHealthCheck: number = 0;

  constructor(
    config: SystemMonitorConfig,
    connection: Connection,
    logger: Logger
  ) {
    this.config = config;
    this.connection = connection;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('System monitor already active');
      return;
    }

    this.logger.info('Starting comprehensive system monitoring', {
      enableSystemMonitoring: this.config.enableSystemMonitoring,
      enableComponentMonitoring: this.config.enableComponentMonitoring,
      enableNetworkMonitoring: this.config.enableNetworkMonitoring,
      enableSecurityMonitoring: this.config.enableSecurityMonitoring,
    });

    try {
      // Initialize monitoring
      await this.initializeMonitoring();
      
      // Register default components
      await this.registerDefaultComponents();
      
      // Start monitoring cycles
      this.isActive = true;
      this.startTime = Date.now();
      this.startMonitoringCycles();

      // Record startup event
      await this.recordEvent({
        type: 'startup',
        component: 'system_monitor',
        description: 'System monitoring started successfully',
        details: { config: this.config },
        severity: 'info',
        automated: true,
      });

      this.logger.info('System monitoring started successfully', {
        registeredComponents: this.components.size,
        enabledAlerts: this.config.enableAlerts,
      });

    } catch (error) {
      this.logger.error('Failed to start system monitoring', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('System monitor not active');
      return;
    }

    this.logger.info('Stopping system monitoring');

    try {
      // Stop monitoring intervals
      if (this.systemCheckInterval) clearInterval(this.systemCheckInterval);
      if (this.componentCheckInterval) clearInterval(this.componentCheckInterval);
      if (this.networkCheckInterval) clearInterval(this.networkCheckInterval);
      if (this.securityCheckInterval) clearInterval(this.securityCheckInterval);
      if (this.alertProcessingInterval) clearInterval(this.alertProcessingInterval);

      this.isActive = false;
      
      // Record shutdown event
      await this.recordEvent({
        type: 'shutdown',
        component: 'system_monitor',
        description: 'System monitoring stopped',
        details: { 
          uptime: Date.now() - this.startTime,
          totalAlerts: this.alerts.length,
          totalEvents: this.events.length,
        },
        severity: 'info',
        automated: true,
      });

      this.logger.info('System monitoring stopped successfully', {
        uptime: Date.now() - this.startTime,
        totalAlerts: this.alerts.length,
        totalEvents: this.events.length,
      });

    } catch (error) {
      this.logger.error('Failed to stop system monitoring gracefully', error);
      this.isActive = false;
    }
  }

  async registerComponent(
    name: string,
    type: ComponentType,
    config: Partial<ComponentHealth['config']> = {}
  ): Promise<void> {
    const component: ComponentHealth = {
      name,
      type,
      status: 'healthy',
      lastCheck: 0,
      lastSuccess: 0,
      consecutiveFailures: 0,
      
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      
      memoryUsage: 0,
      cpuUsage: 0,
      
      healthChecks: [],
      dependencies: [],
      dependents: [],
      
      config: {
        enabled: true,
        autoRestart: false,
        maxRestarts: 3,
        timeout: 30,
        ...config,
      },
      
      version: '1.0.0',
      buildInfo: {},
      environment: 'production',
    };

    this.components.set(name, component);
    
    this.logger.info('Component registered for monitoring', {
      name,
      type,
      config: component.config,
    });

    await this.recordEvent({
      type: 'startup',
      component: name,
      description: `Component ${name} registered for monitoring`,
      details: { type, config },
      severity: 'info',
      automated: true,
    });
  }

  async unregisterComponent(name: string): Promise<void> {
    const component = this.components.get(name);
    if (!component) {
      this.logger.warn('Component not found for unregistration', { name });
      return;
    }

    this.components.delete(name);
    
    this.logger.info('Component unregistered from monitoring', { name });

    await this.recordEvent({
      type: 'shutdown',
      component: name,
      description: `Component ${name} unregistered from monitoring`,
      details: {},
      severity: 'info',
      automated: true,
    });
  }

  async addHealthCheck(
    componentName: string,
    healthCheck: Omit<HealthCheck, 'lastRun' | 'lastSuccess' | 'consecutiveFailures' | 'averageResponseTime' | 'successRate' | 'history'>
  ): Promise<void> {
    const component = this.components.get(componentName);
    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    const fullHealthCheck: HealthCheck = {
      ...healthCheck,
      lastRun: 0,
      lastSuccess: 0,
      consecutiveFailures: 0,
      averageResponseTime: 0,
      successRate: 100,
      history: [],
    };

    component.healthChecks.push(fullHealthCheck);
    
    this.logger.info('Health check added to component', {
      componentName,
      healthCheckId: healthCheck.id,
      type: healthCheck.type,
    });
  }

  async getSystemHealth(): Promise<SystemHealthStatus> {
    const now = Date.now();
    
    // Collect component health
    const componentHealth: Record<string, ComponentHealth> = {};
    for (const [name, component] of this.components) {
      componentHealth[name] = { ...component };
    }

    // Calculate overall metrics
    const allComponents = Array.from(this.components.values());
    const healthyComponents = allComponents.filter(c => c.status === 'healthy');
    const criticalComponents = allComponents.filter(c => c.status === 'critical');
    
    // Determine overall status
    let overallStatus: SystemStatus = 'healthy';
    if (criticalComponents.length > 0) {
      overallStatus = 'critical';
    } else if (healthyComponents.length < allComponents.length * 0.8) {
      overallStatus = 'degraded';
    }

    // Get active alerts
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);

    const health: SystemHealthStatus = {
      overall: overallStatus,
      timestamp: now,
      uptime: now - this.startTime,
      
      components: componentHealth,
      
      metrics: {
        responseTime: this.calculateAverageResponseTime(),
        throughput: this.calculateAverageThroughput(),
        errorRate: this.calculateAverageErrorRate(),
        availability: this.calculateAvailability(),
        reliability: this.calculateReliability(),
      },
      
      resources: await this.getResourceMetrics(),
      
      security: await this.getSecurityStatus(),
      
      activeAlerts,
      
      dependencies: await this.getDependencyHealth(),
    };

    this.lastHealthCheck = now;
    this.healthHistory.push(health);
    await this.applyHealthHistoryRetention();

    return health;
  }

  async createAlert(
    component: string,
    type: string,
    severity: SystemSeverity,
    title: string,
    description: string,
    details: SystemAlert['details'] = {}
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SystemAlert = {
      id: alertId,
      timestamp: Date.now(),
      severity,
      component,
      type,
      title,
      description,
      details,
      
      acknowledged: false,
      resolved: false,
      
      escalated: false,
      escalationLevel: 0,
      escalationHistory: [],
      
      tags: {},
      actions: this.generateAlertActions(severity, type),
    };

    this.alerts.push(alert);
    
    // Send notifications if alerts are enabled
    if (this.config.enableAlerts) {
      await this.sendAlertNotifications(alert);
    }

    // Check for escalation
    await this.checkEscalationRules(alert);

    this.logger.warn(`System alert created`, {
      alertId,
      severity,
      component,
      type,
      title,
    });

    await this.recordEvent({
      type: 'error',
      component,
      description: `Alert created: ${title}`,
      details: { alertId, severity, type },
      severity,
      automated: true,
    });

    return alertId;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    this.logger.info('Alert acknowledged', {
      alertId,
      acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt,
    });

    await this.recordEvent({
      type: 'warning',
      component: alert.component,
      description: `Alert acknowledged: ${alert.title}`,
      details: { alertId, acknowledgedBy },
      severity: 'info',
      user: acknowledgedBy,
      automated: false,
    });
  }

  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = Date.now();

    if (resolution) {
      alert.details.resolution = resolution;
    }

    this.logger.info('Alert resolved', {
      alertId,
      resolvedBy,
      resolvedAt: alert.resolvedAt,
      resolution,
    });

    await this.recordEvent({
      type: 'recovery',
      component: alert.component,
      description: `Alert resolved: ${alert.title}`,
      details: { alertId, resolvedBy, resolution },
      severity: 'info',
      user: resolvedBy,
      automated: false,
    });
  }

  async generateReport(period: { startTime: number; endTime: number }): Promise<MonitoringReport> {
    this.logger.info('Generating comprehensive monitoring report', period);

    try {
      const reportId = `monitoring_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Filter data for the period
      const periodAlerts = this.alerts.filter(a => 
        a.timestamp >= period.startTime && a.timestamp <= period.endTime
      );
      const periodEvents = this.events.filter(e => 
        e.timestamp >= period.startTime && e.timestamp <= period.endTime
      );
      const periodHealth = this.healthHistory.filter(h => 
        h.timestamp >= period.startTime && h.timestamp <= period.endTime
      );

      const report: MonitoringReport = {
        id: reportId,
        title: `System Monitoring Report - ${new Date(period.startTime).toISOString()} to ${new Date(period.endTime).toISOString()}`,
        generatedAt: Date.now(),
        period,
        
        summary: await this.generateReportSummary(periodAlerts, periodEvents, periodHealth),
        
        analysis: {
          systemPerformance: await this.generateSystemPerformanceAnalysis(periodHealth),
          componentAnalysis: await this.generateComponentAnalysis(periodHealth),
          securityAnalysis: await this.generateSecurityAnalysis(periodEvents, periodAlerts),
          infrastructureAnalysis: await this.generateInfrastructureAnalysis(periodHealth),
          incidentAnalysis: await this.generateIncidentAnalysis(periodAlerts, periodEvents),
        },
        
        trends: {
          healthTrends: await this.generateHealthTrends(periodHealth),
          performanceTrends: await this.generatePerformanceTrends(periodHealth),
          usageTrends: await this.generateUsageTrends(periodHealth),
          predictions: await this.generateSystemPredictions(periodHealth),
        },
        
        recommendations: await this.generateMonitoringRecommendations(periodAlerts, periodEvents, periodHealth),
      };

      this.logger.info('Monitoring report generated successfully', {
        reportId,
        period,
        alertsAnalyzed: periodAlerts.length,
        eventsAnalyzed: periodEvents.length,
        healthSnapshotsAnalyzed: periodHealth.length,
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate monitoring report', error);
      throw error;
    }
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getRecentEvents(limit: number = 100): SystemEvent[] {
    return this.events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getComponentHealth(componentName: string): ComponentHealth | null {
    return this.components.get(componentName) || null;
  }

  // Private implementation methods

  private async initializeMonitoring(): Promise<void> {
    // Initialize alert channels
    for (const channel of this.config.alertChannels) {
      if (channel.enabled) {
        await this.testAlertChannel(channel);
      }
    }
    
    this.logger.info('Monitoring system initialized');
  }

  private async registerDefaultComponents(): Promise<void> {
    // Register core system components
    const defaultComponents: Array<{ name: string; type: ComponentType }> = [
      { name: 'dex_aggregator', type: 'dex_aggregator' },
      { name: 'yield_optimizer', type: 'yield_optimizer' },
      { name: 'trading_interface', type: 'trading_interface' },
      { name: 'emergency_manager', type: 'emergency_manager' },
      { name: 'audit_trail', type: 'audit_trail' },
      { name: 'performance_monitor', type: 'performance_monitor' },
    ];

    for (const { name, type } of defaultComponents) {
      await this.registerComponent(name, type, {
        enabled: true,
        autoRestart: true,
        maxRestarts: 3,
        timeout: 30,
      });

      // Add basic health checks
      await this.addHealthCheck(name, {
        id: `${name}_health`,
        name: `${name} Health Check`,
        type: 'custom',
        enabled: true,
        interval: 60,
        timeout: 10,
        retries: 3,
        config: {
          customFunction: async () => {
            // Basic health check implementation
            return Math.random() > 0.1; // 90% success rate
          },
        },
      });
    }
  }

  private startMonitoringCycles(): void {
    // System health check cycle
    if (this.config.enableSystemMonitoring) {
      this.systemCheckInterval = setInterval(async () => {
        await this.performSystemHealthCheck();
      }, this.config.systemCheckInterval * 1000);
    }

    // Component health check cycle
    if (this.config.enableComponentMonitoring) {
      this.componentCheckInterval = setInterval(async () => {
        await this.performComponentHealthChecks();
      }, this.config.componentCheckInterval * 1000);
    }

    // Network monitoring cycle
    if (this.config.enableNetworkMonitoring) {
      this.networkCheckInterval = setInterval(async () => {
        await this.performNetworkCheck();
      }, this.config.networkCheckInterval * 1000);
    }

    // Security monitoring cycle
    if (this.config.enableSecurityMonitoring) {
      this.securityCheckInterval = setInterval(async () => {
        await this.performSecurityCheck();
      }, this.config.securityCheckInterval * 1000);
    }

    // Alert processing cycle
    this.alertProcessingInterval = setInterval(async () => {
      await this.processAlerts();
    }, 30 * 1000); // Every 30 seconds
  }

  private async performSystemHealthCheck(): Promise<void> {
    try {
      const health = await this.getSystemHealth();
      
      if (health.overall === 'critical') {
        await this.createAlert(
          'system',
          'system_health',
          'critical',
          'Critical System Health',
          'System health is in critical state',
          {
            metric: 'system_health',
            value: health.activeAlerts.length,
            impact: 'System may be unstable or degraded',
          }
        );
      }
    } catch (error) {
      this.logger.error('System health check failed', error);
    }
  }

  private async performComponentHealthChecks(): Promise<void> {
    for (const [name, component] of this.components) {
      if (!component.config.enabled) continue;

      try {
        await this.checkComponentHealth(name, component);
      } catch (error) {
        this.logger.error(`Component health check failed for ${name}`, error);
      }
    }
  }

  private async checkComponentHealth(name: string, component: ComponentHealth): Promise<void> {
    const now = Date.now();
    let overallSuccess = true;

    // Run all health checks for this component
    for (const healthCheck of component.healthChecks) {
      if (!healthCheck.enabled) continue;

      // Check if it's time to run this health check
      if (now - healthCheck.lastRun < healthCheck.interval * 1000) continue;

      const success = await this.runHealthCheck(healthCheck);
      
      if (success) {
        healthCheck.lastSuccess = now;
        healthCheck.consecutiveFailures = 0;
      } else {
        healthCheck.consecutiveFailures++;
        overallSuccess = false;
      }

      healthCheck.lastRun = now;
    }

    // Update component status
    const previousStatus = component.status;
    
    if (overallSuccess) {
      component.status = 'healthy';
      component.lastSuccess = now;
      component.consecutiveFailures = 0;
    } else {
      component.consecutiveFailures++;
      
      if (component.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        component.status = 'critical';
      } else {
        component.status = 'degraded';
      }
    }

    component.lastCheck = now;

    // Create alert if status changed to unhealthy
    if (previousStatus === 'healthy' && component.status !== 'healthy') {
      await this.createAlert(
        name,
        'component_health',
        component.status === 'critical' ? 'critical' : 'warning',
        `Component Health Degraded: ${name}`,
        `Component ${name} health status changed from ${previousStatus} to ${component.status}`,
        {
          metric: 'component_health',
          value: component.consecutiveFailures,
          threshold: this.config.maxConsecutiveFailures,
          impact: `Component ${name} may not be functioning properly`,
        }
      );
    }

    // Attempt automatic recovery if enabled
    if (component.status === 'critical' && 
        component.config.autoRestart && 
        this.config.enableAutomaticRecovery) {
      await this.attemptComponentRecovery(name, component);
    }
  }

  private async runHealthCheck(healthCheck: HealthCheck): Promise<boolean> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let details: Record<string, any> = {};

    try {
      switch (healthCheck.type) {
        case 'ping':
          success = await this.performPingCheck(healthCheck);
          break;
        case 'http':
          success = await this.performHttpCheck(healthCheck);
          break;
        case 'tcp':
          success = await this.performTcpCheck(healthCheck);
          break;
        case 'custom':
          if (healthCheck.config.customFunction) {
            success = await healthCheck.config.customFunction();
          }
          break;
        default:
          success = false;
          error = `Unknown health check type: ${healthCheck.type}`;
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : 'Unknown error';
    }

    const responseTime = Date.now() - startTime;

    // Update health check metrics
    healthCheck.averageResponseTime = healthCheck.averageResponseTime === 0
      ? responseTime
      : (healthCheck.averageResponseTime * 0.9) + (responseTime * 0.1);

    // Record result
    const result: HealthCheckResult = {
      timestamp: Date.now(),
      success,
      responseTime,
      error,
      details,
    };

    healthCheck.history.push(result);

    // Keep only recent history
    if (healthCheck.history.length > 100) {
      healthCheck.history = healthCheck.history.slice(-100);
    }

    // Update success rate
    const recentResults = healthCheck.history.slice(-20); // Last 20 results
    const recentSuccesses = recentResults.filter(r => r.success).length;
    healthCheck.successRate = (recentSuccesses / recentResults.length) * 100;

    return success;
  }

  private async performPingCheck(healthCheck: HealthCheck): Promise<boolean> {
    // Simplified ping check
    return Math.random() > 0.1; // 90% success rate
  }

  private async performHttpCheck(healthCheck: HealthCheck): Promise<boolean> {
    // Simplified HTTP check
    if (!healthCheck.config.url) return false;
    
    try {
      // In a real implementation, this would make an actual HTTP request
      const response = { status: 200, body: 'OK' };
      
      if (healthCheck.config.expectedStatus && 
          response.status !== healthCheck.config.expectedStatus) {
        return false;
      }
      
      if (healthCheck.config.expectedResponse && 
          response.body !== healthCheck.config.expectedResponse) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private async performTcpCheck(healthCheck: HealthCheck): Promise<boolean> {
    // Simplified TCP check
    return Math.random() > 0.05; // 95% success rate
  }

  private async performNetworkCheck(): Promise<void> {
    try {
      // Check Solana network connectivity
      const latency = await this.measureNetworkLatency();
      
      if (latency > 1000) { // 1 second threshold
        await this.createAlert(
          'network',
          'network_latency',
          'warning',
          'High Network Latency',
          `Network latency is ${latency}ms`,
          {
            metric: 'network_latency',
            value: latency,
            threshold: 1000,
            impact: 'Network operations may be slow',
          }
        );
      }
    } catch (error) {
      this.logger.error('Network check failed', error);
    }
  }

  private async measureNetworkLatency(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Measure connection latency to Solana network
      await this.connection.getLatestBlockhash();
      return Date.now() - startTime;
    } catch (error) {
      return -1; // Indicate failure
    }
  }

  private async performSecurityCheck(): Promise<void> {
    try {
      // Simplified security check
      const threats = await this.scanForThreats();
      
      if (threats.length > 0) {
        for (const threat of threats) {
          await this.createAlert(
            'security',
            'security_threat',
            threat.severity,
            `Security Threat Detected: ${threat.type}`,
            threat.description,
            {
              metric: 'security_threat',
              impact: 'Security may be compromised',
            }
          );
        }
      }
    } catch (error) {
      this.logger.error('Security check failed', error);
    }
  }

  private async scanForThreats(): Promise<ThreatInfo[]> {
    // Simplified threat detection
    const threats: ThreatInfo[] = [];
    
    // Random threat generation for demo
    if (Math.random() < 0.01) { // 1% chance
      threats.push({
        id: `threat_${Date.now()}`,
        type: 'suspicious_activity',
        severity: 'warning',
        description: 'Unusual network activity detected',
        source: 'network_monitor',
        timestamp: Date.now(),
        mitigated: false,
      });
    }
    
    return threats;
  }

  private async attemptComponentRecovery(name: string, component: ComponentHealth): Promise<void> {
    this.logger.warn(`Attempting automatic recovery for component: ${name}`);

    try {
      // Record recovery attempt
      await this.recordEvent({
        type: 'recovery',
        component: name,
        description: `Automatic recovery attempted for component ${name}`,
        details: { consecutiveFailures: component.consecutiveFailures },
        severity: 'warning',
        automated: true,
      });

      // Simulate recovery process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reset failure count on successful recovery
      component.consecutiveFailures = 0;
      component.status = 'healthy';
      component.lastSuccess = Date.now();

      this.logger.info(`Component recovery successful: ${name}`);

    } catch (error) {
      this.logger.error(`Component recovery failed for ${name}`, error);
    }
  }

  private async processAlerts(): Promise<void> {
    const unprocessedAlerts = this.alerts.filter(alert => 
      !alert.acknowledged && !alert.resolved
    );

    for (const alert of unprocessedAlerts) {
      try {
        // Check escalation rules
        await this.checkEscalationRules(alert);
        
        // Auto-resolve alerts if conditions are met
        await this.checkAutoResolution(alert);
      } catch (error) {
        this.logger.error('Alert processing failed', error, { alertId: alert.id });
      }
    }
  }

  private async checkEscalationRules(alert: SystemAlert): Promise<void> {
    for (const rule of this.config.escalationRules) {
      if (this.shouldEscalate(alert, rule)) {
        await this.escalateAlert(alert, rule);
      }
    }
  }

  private shouldEscalate(alert: SystemAlert, rule: EscalationRule): boolean {
    // Check if escalation conditions are met
    const alertAge = Date.now() - alert.timestamp;
    const ageThreshold = rule.condition.duration * 60 * 1000; // Convert to ms

    return (
      alert.severity === rule.condition.severity &&
      alertAge >= ageThreshold &&
      !alert.escalated &&
      alert.escalationLevel < rule.condition.consecutiveFailures
    );
  }

  private async escalateAlert(alert: SystemAlert, rule: EscalationRule): Promise<void> {
    alert.escalated = true;
    alert.escalationLevel++;

    const escalationEvent: EscalationEvent = {
      timestamp: Date.now(),
      level: alert.escalationLevel,
      action: rule.action.type,
      result: 'executed',
      details: rule.action.parameters,
    };

    alert.escalationHistory.push(escalationEvent);

    this.logger.warn(`Alert escalated`, {
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
      action: rule.action.type,
    });

    // Execute escalation action
    switch (rule.action.type) {
      case 'notify':
        await this.sendEscalationNotification(alert, rule);
        break;
      case 'restart':
        await this.restartComponent(alert.component);
        break;
      case 'failover':
        await this.initiateFailover(alert.component);
        break;
      case 'emergency_stop':
        await this.emergencyStop(alert.component);
        break;
    }
  }

  private async checkAutoResolution(alert: SystemAlert): Promise<void> {
    // Check if conditions that triggered the alert have been resolved
    const component = this.components.get(alert.component);
    if (component && component.status === 'healthy' && alert.type === 'component_health') {
      await this.resolveAlert(alert.id, 'system', 'Automatically resolved - component health restored');
    }
  }

  private async sendAlertNotifications(alert: SystemAlert): Promise<void> {
    for (const channel of this.config.alertChannels) {
      if (!channel.enabled) continue;
      if (!channel.severity.includes(alert.severity)) continue;
      if (channel.components.length > 0 && !channel.components.includes(alert.component)) continue;

      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        this.logger.error(`Failed to send alert notification via ${channel.type}`, error);
      }
    }
  }

  private async sendNotification(channel: AlertChannel, alert: SystemAlert): Promise<void> {
    // Simplified notification sending
    this.logger.info(`Sending alert notification via ${channel.type}`, {
      channelId: channel.id,
      alertId: alert.id,
      severity: alert.severity,
      endpoint: channel.endpoint,
    });
  }

  private async sendEscalationNotification(alert: SystemAlert, rule: EscalationRule): Promise<void> {
    // Send escalation notifications
    this.logger.warn(`Sending escalation notification for alert ${alert.id}`);
  }

  private async restartComponent(componentName: string): Promise<void> {
    this.logger.warn(`Restarting component: ${componentName}`);
    
    await this.recordEvent({
      type: 'restart',
      component: componentName,
      description: `Component ${componentName} restarted due to escalation`,
      details: {},
      severity: 'warning',
      automated: true,
    });
  }

  private async initiateFailover(componentName: string): Promise<void> {
    this.logger.error(`Initiating failover for component: ${componentName}`);
    
    await this.recordEvent({
      type: 'error',
      component: componentName,
      description: `Failover initiated for component ${componentName}`,
      details: {},
      severity: 'error',
      automated: true,
    });
  }

  private async emergencyStop(componentName: string): Promise<void> {
    this.logger.error(`Emergency stop for component: ${componentName}`);
    
    await this.recordEvent({
      type: 'error',
      component: componentName,
      description: `Emergency stop executed for component ${componentName}`,
      details: {},
      severity: 'critical',
      automated: true,
    });
  }

  private async testAlertChannel(channel: AlertChannel): Promise<void> {
    this.logger.info(`Testing alert channel: ${channel.id} (${channel.type})`);
    
    try {
      // Test the alert channel connectivity
      // Implementation would depend on channel type
      this.logger.info(`Alert channel test successful: ${channel.id}`);
    } catch (error) {
      this.logger.error(`Alert channel test failed: ${channel.id}`, error);
      throw error;
    }
  }

  private async recordEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: SystemEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event,
    };

    this.events.push(fullEvent);
    await this.applyEventRetention();

    this.logger.debug('System event recorded', {
      eventId: fullEvent.id,
      type: event.type,
      component: event.component,
      severity: event.severity,
    });
  }

  private generateAlertActions(severity: SystemSeverity, type: string): AlertAction[] {
    const actions: AlertAction[] = [
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        type: 'acknowledge',
        enabled: true,
        requiresConfirmation: false,
      },
      {
        id: 'resolve',
        label: 'Resolve',
        type: 'resolve',
        enabled: true,
        requiresConfirmation: false,
      },
    ];

    if (severity === 'critical') {
      actions.push({
        id: 'escalate',
        label: 'Escalate',
        type: 'escalate',
        enabled: true,
        requiresConfirmation: true,
      });
    }

    if (type === 'component_health') {
      actions.push({
        id: 'restart',
        label: 'Restart Component',
        type: 'restart',
        enabled: true,
        requiresConfirmation: true,
      });
    }

    return actions;
  }

  // Metric calculation methods

  private calculateAverageResponseTime(): number {
    const allComponents = Array.from(this.components.values());
    const responseTimes = allComponents.map(c => c.responseTime).filter(rt => rt > 0);
    
    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length 
      : 0;
  }

  private calculateAverageThroughput(): number {
    const allComponents = Array.from(this.components.values());
    const throughputs = allComponents.map(c => c.throughput).filter(tp => tp > 0);
    
    return throughputs.length > 0 
      ? throughputs.reduce((sum, tp) => sum + tp, 0) / throughputs.length 
      : 0;
  }

  private calculateAverageErrorRate(): number {
    const allComponents = Array.from(this.components.values());
    const errorRates = allComponents.map(c => c.errorRate);
    
    return errorRates.length > 0 
      ? errorRates.reduce((sum, er) => sum + er, 0) / errorRates.length 
      : 0;
  }

  private calculateAvailability(): number {
    const allComponents = Array.from(this.components.values());
    const healthyComponents = allComponents.filter(c => c.status === 'healthy').length;
    
    return allComponents.length > 0 
      ? (healthyComponents / allComponents.length) * 100 
      : 100;
  }

  private calculateReliability(): number {
    // Calculate system reliability based on component reliability
    // This is a simplified calculation
    const allComponents = Array.from(this.components.values());
    const reliabilities = allComponents.map(c => {
      const successfulChecks = c.healthChecks.reduce((sum, hc) => sum + hc.successRate, 0);
      const totalChecks = c.healthChecks.length * 100;
      return totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;
    });
    
    return reliabilities.length > 0 
      ? reliabilities.reduce((sum, r) => sum + r, 0) / reliabilities.length 
      : 100;
  }

  private async getResourceMetrics(): Promise<SystemHealthStatus['resources']> {
    // Get system resource metrics
    return {
      memory: {
        current: 65,
        max: 100,
        utilization: 65,
        trend: 'stable',
        thresholds: { warning: 80, critical: 90 },
      },
      cpu: {
        current: 45,
        max: 100,
        utilization: 45,
        trend: 'stable',
        thresholds: { warning: 70, critical: 85 },
      },
      disk: {
        current: 50,
        max: 100,
        utilization: 50,
        trend: 'increasing',
        thresholds: { warning: 80, critical: 90 },
      },
      network: {
        current: 30,
        max: 100,
        utilization: 30,
        trend: 'stable',
        thresholds: { warning: 70, critical: 85 },
      },
    };
  }

  private async getSecurityStatus(): Promise<SystemHealthStatus['security']> {
    return {
      status: 'healthy',
      threats: [],
      vulnerabilities: [],
      lastSecurityScan: Date.now() - 3600000, // 1 hour ago
    };
  }

  private async getDependencyHealth(): Promise<DependencyHealth[]> {
    return [
      {
        name: 'solana_network',
        type: 'external',
        endpoint: 'https://api.mainnet-beta.solana.com',
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 150,
        availability: 99.9,
        serviceInfo: {
          provider: 'Solana',
          version: '1.17.0',
          region: 'global',
          rateLimit: 1000,
        },
      },
    ];
  }

  // Report generation methods (simplified implementations)

  private async generateReportSummary(
    alerts: SystemAlert[],
    events: SystemEvent[],
    healthSnapshots: SystemHealthStatus[]
  ): Promise<MonitoringReport['summary']> {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const uptime = Date.now() - this.startTime;
    const resolvedAlerts = alerts.filter(a => a.resolved);
    const mttr = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, a) => sum + (a.resolvedAt! - a.timestamp), 0) / resolvedAlerts.length / 1000 / 60 // minutes
      : 0;

    return {
      overallHealth: healthSnapshots.length > 0 ? healthSnapshots[healthSnapshots.length - 1].overall : 'healthy',
      uptime,
      availability: this.calculateAvailability(),
      reliability: this.calculateReliability(),
      totalAlerts: alerts.length,
      criticalIncidents: criticalAlerts.length,
      meanTimeToRecovery: mttr,
      systemEfficiency: 95, // Simplified calculation
    };
  }

  private async generateSystemPerformanceAnalysis(healthSnapshots: SystemHealthStatus[]): Promise<SystemPerformanceAnalysis> {
    return {
      averageResponseTime: 150,
      responseTimeDistribution: {
        '0-100ms': 30,
        '100-200ms': 50,
        '200-500ms': 15,
        '500ms+': 5,
      },
      throughputAnalysis: {
        average: 1000,
        peak: 2000,
        trends: ['Increasing during business hours', 'Stable overnight'],
      },
      errorAnalysis: {
        totalErrors: 10,
        errorRate: 0.5,
        errorsByType: {
          'network_error': 4,
          'timeout_error': 3,
          'validation_error': 3,
        },
        topErrors: [
          { error: 'Network timeout', count: 5 },
          { error: 'Validation failed', count: 3 },
        ],
      },
      availabilityAnalysis: {
        uptime: 99.9,
        downtime: 0.1,
        downtimeEvents: [],
      },
    };
  }

  private async generateComponentAnalysis(healthSnapshots: SystemHealthStatus[]): Promise<ComponentAnalysis> {
    return {
      components: [],
      dependencies: [],
      reliability: {
        mostReliable: ['dex_aggregator', 'audit_trail'],
        leastReliable: ['external_api'],
        improvementAreas: ['Network connectivity', 'Error handling'],
      },
    };
  }

  private async generateSecurityAnalysis(events: SystemEvent[], alerts: SystemAlert[]): Promise<SecurityAnalysis> {
    const securityEvents = events.filter(e => e.component === 'security');
    const securityAlerts = alerts.filter(a => a.component === 'security');

    return {
      threatLevel: 'info',
      threatsDetected: 0,
      vulnerabilitiesFound: 0,
      securityScore: 95,
      incidents: [],
      recommendations: ['Enable additional monitoring', 'Update security policies'],
    };
  }

  private async generateInfrastructureAnalysis(healthSnapshots: SystemHealthStatus[]): Promise<InfrastructureAnalysis> {
    return {
      resourceUtilization: {
        memory: { average: 65, peak: 80, trend: 'stable' },
        cpu: { average: 45, peak: 70, trend: 'stable' },
        disk: { average: 50, peak: 60, trend: 'increasing' },
        network: { average: 30, peak: 50, trend: 'stable' },
      },
      capacity: {
        current: 60,
        projected: 75,
        bottlenecks: ['Disk space'],
        scalingNeeds: ['Additional storage'],
      },
      efficiency: {
        score: 85,
        improvementAreas: ['Resource optimization', 'Caching'],
        costOptimization: ['Right-size instances', 'Use reserved capacity'],
      },
    };
  }

  private async generateIncidentAnalysis(alerts: SystemAlert[], events: SystemEvent[]): Promise<IncidentAnalysis> {
    const incidents = alerts.filter(a => a.severity === 'critical' || a.severity === 'error');
    const resolvedIncidents = incidents.filter(i => i.resolved);

    return {
      totalIncidents: incidents.length,
      incidentsByType: {},
      incidentsBySeverity: {},
      resolution: {
        averageTime: resolvedIncidents.length > 0 
          ? resolvedIncidents.reduce((sum, i) => sum + (i.resolvedAt! - i.timestamp), 0) / resolvedIncidents.length / 1000 / 60
          : 0,
        fastestResolution: 5,
        slowestResolution: 120,
        escalationRate: 10,
      },
      patterns: [],
      prevention: ['Improve monitoring', 'Add automated recovery'],
    };
  }

  private async generateHealthTrends(healthSnapshots: SystemHealthStatus[]): Promise<HealthTrend[]> {
    return [];
  }

  private async generatePerformanceTrends(healthSnapshots: SystemHealthStatus[]): Promise<PerformanceTrend[]> {
    return [];
  }

  private async generateUsageTrends(healthSnapshots: SystemHealthStatus[]): Promise<UsageTrend[]> {
    return [];
  }

  private async generateSystemPredictions(healthSnapshots: SystemHealthStatus[]): Promise<SystemPrediction[]> {
    return [];
  }

  private async generateMonitoringRecommendations(
    alerts: SystemAlert[],
    events: SystemEvent[],
    healthSnapshots: SystemHealthStatus[]
  ): Promise<MonitoringRecommendation[]> {
    return [
      {
        id: 'improve_monitoring',
        category: 'performance',
        priority: 'medium',
        title: 'Enhance Component Monitoring',
        description: 'Add more detailed health checks for critical components',
        benefit: 'Earlier detection of issues',
        effort: '1-2 weeks',
        implementation: ['Add custom health checks', 'Increase monitoring frequency'],
      },
    ];
  }

  // Data retention methods

  private async applyEventRetention(): Promise<void> {
    const cutoff = Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000);
    const originalCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    
    const removedCount = originalCount - this.events.length;
    if (removedCount > 0) {
      this.logger.debug('Applied event retention policy', {
        removedEvents: removedCount,
        remainingEvents: this.events.length,
      });
    }
  }

  private async applyHealthHistoryRetention(): Promise<void> {
    if (this.healthHistory.length > this.config.maxDataPoints) {
      const toRemove = this.healthHistory.length - this.config.maxDataPoints;
      this.healthHistory.splice(0, toRemove);
      
      this.logger.debug('Applied health history retention policy', {
        removedSnapshots: toRemove,
        remainingSnapshots: this.healthHistory.length,
      });
    }
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): SystemMonitorConfig {
    return { ...this.config };
  }

  getComponents(): ComponentHealth[] {
    return Array.from(this.components.values());
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

export default SystemMonitor;