// NOCK Bridge Agent Monitoring and Logging System
// Comprehensive monitoring, alerting, and observability for autonomous agents

import { EventEmitter } from 'events';
import { Logger, createProductionLogger } from '../shared/utils/logger';
import { 
  AgentHealth, 
  AgentPerformanceMetrics, 
  SystemAlert, 
  TaskResult 
} from '../shared/types/agent-types';

export interface MonitoringConfig {
  health_monitoring: {
    enabled: boolean;
    check_interval: number;
    thresholds: {
      cpu_warning: number;
      cpu_critical: number;
      memory_warning: number;
      memory_critical: number;
      error_rate_warning: number;
      error_rate_critical: number;
      response_time_warning: number;
      response_time_critical: number;
    };
  };
  performance_monitoring: {
    enabled: boolean;
    metrics_retention_period: number;
    performance_baseline_period: number;
    anomaly_detection: boolean;
    trend_analysis: boolean;
  };
  alerting: {
    enabled: boolean;
    alert_channels: ('log' | 'webhook' | 'email')[];
    webhook_url?: string;
    email_config?: {
      host: string;
      port: number;
      username: string;
      password: string;
      to: string[];
    };
    alert_throttling: {
      enabled: boolean;
      window_size: number;
      max_alerts_per_window: number;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured_logging: boolean;
    log_aggregation: boolean;
    log_retention_days: number;
    performance_logging: boolean;
  };
  dashboards: {
    enabled: boolean;
    metrics_export: boolean;
    real_time_updates: boolean;
    historical_analysis: boolean;
  };
}

export interface AgentMonitoringData {
  agent_id: string;
  timestamp: number;
  health: AgentHealth;
  performance: AgentPerformanceMetrics;
  task_results: TaskResult[];
  resource_usage: {
    cpu_percent: number;
    memory_bytes: number;
    network_bytes: number;
    disk_io_bytes: number;
  };
  custom_metrics: Record<string, number>;
}

export interface SystemMonitoringData {
  timestamp: number;
  system_health: 'healthy' | 'warning' | 'critical';
  total_agents: number;
  active_agents: number;
  system_resource_usage: {
    cpu_percent: number;
    memory_bytes: number;
    disk_usage_percent: number;
    network_throughput: number;
  };
  agent_data: Map<string, AgentMonitoringData>;
  alerts: SystemAlert[];
  performance_summary: {
    average_response_time: number;
    total_tasks_executed: number;
    success_rate: number;
    error_rate: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    duration_ms: number;
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  actions: ('log' | 'webhook' | 'email' | 'restart_agent')[];
  throttling: {
    enabled: boolean;
    cooldown_period: number;
  };
}

export class AgentMonitoringSystem extends EventEmitter {
  private config: MonitoringConfig;
  private logger: Logger;
  private isRunning: boolean = false;

  // Monitoring data storage
  private agentData: Map<string, AgentMonitoringData[]> = new Map();
  private systemData: SystemMonitoringData[] = [];
  private activeAlerts: Map<string, SystemAlert> = new Map();
  private alertHistory: SystemAlert[] = [];

  // Alert rules and management
  private alertRules: Map<string, AlertRule> = new Map();
  private alertThrottling: Map<string, number> = new Map();

  // Monitoring loops
  private healthMonitor?: NodeJS.Timeout;
  private performanceCollector?: NodeJS.Timeout;
  private alertProcessor?: NodeJS.Timeout;
  private dataRetentionCleaner?: NodeJS.Timeout;

  // Performance baselines and anomaly detection
  private performanceBaselines: Map<string, any> = new Map();
  private anomalyDetector?: NodeJS.Timeout;

  // Metrics aggregation
  private metricsBuffer: Map<string, any[]> = new Map();

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.logger = createProductionLogger('/Users/Patrick/Nockchain/logs/agent-monitoring.log');
    
    this.initializeDefaultAlertRules();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Agent monitoring system already running');
      return;
    }

    this.logger.info('Starting NOCKCHAIN agent monitoring system', {
      health_monitoring: this.config.health_monitoring.enabled,
      performance_monitoring: this.config.performance_monitoring.enabled,
      alerting: this.config.alerting.enabled,
      anomaly_detection: this.config.performance_monitoring.anomaly_detection,
    });

    try {
      this.isRunning = true;

      // Start monitoring loops
      if (this.config.health_monitoring.enabled) {
        this.startHealthMonitoring();
      }

      if (this.config.performance_monitoring.enabled) {
        this.startPerformanceMonitoring();
      }

      if (this.config.alerting.enabled) {
        this.startAlertProcessing();
      }

      this.startDataRetentionCleaning();

      if (this.config.performance_monitoring.anomaly_detection) {
        this.startAnomalyDetection();
      }

      this.logger.info('Agent monitoring system started successfully');
      this.emit('monitoring_started');

    } catch (error) {
      this.logger.error('Failed to start agent monitoring system', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Agent monitoring system not running');
      return;
    }

    this.logger.info('Stopping agent monitoring system');

    try {
      // Stop all monitoring loops
      if (this.healthMonitor) clearInterval(this.healthMonitor);
      if (this.performanceCollector) clearInterval(this.performanceCollector);
      if (this.alertProcessor) clearInterval(this.alertProcessor);
      if (this.dataRetentionCleaner) clearInterval(this.dataRetentionCleaner);
      if (this.anomalyDetector) clearInterval(this.anomalyDetector);

      // Process remaining data
      await this.processRemainingMetrics();

      this.isRunning = false;
      this.logger.info('Agent monitoring system stopped successfully');
      this.emit('monitoring_stopped');

    } catch (error) {
      this.logger.error('Failed to stop agent monitoring system gracefully', error);
      this.isRunning = false;
    }
  }

  // Agent registration and data collection
  async registerAgent(agentId: string): Promise<void> {
    this.logger.info('Registering agent with monitoring system', { agent_id: agentId });

    if (!this.agentData.has(agentId)) {
      this.agentData.set(agentId, []);
      this.metricsBuffer.set(agentId, []);
    }

    this.emit('agent_registered', { agent_id: agentId });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    this.logger.info('Unregistering agent from monitoring system', { agent_id: agentId });

    // Archive final data before removal
    await this.archiveAgentData(agentId);

    this.agentData.delete(agentId);
    this.metricsBuffer.delete(agentId);

    this.emit('agent_unregistered', { agent_id: agentId });
  }

  async recordAgentHealth(agentId: string, health: AgentHealth): Promise<void> {
    const monitoringData = this.getOrCreateAgentData(agentId);
    
    monitoringData.health = health;
    monitoringData.timestamp = Date.now();

    // Check health thresholds
    await this.checkHealthThresholds(agentId, health);

    this.emit('agent_health_recorded', { agent_id: agentId, health });
  }

  async recordAgentPerformance(agentId: string, performance: AgentPerformanceMetrics): Promise<void> {
    const monitoringData = this.getOrCreateAgentData(agentId);
    
    monitoringData.performance = performance;
    monitoringData.timestamp = Date.now();

    // Add to metrics buffer for aggregation
    const buffer = this.metricsBuffer.get(agentId) || [];
    buffer.push({
      timestamp: Date.now(),
      metrics: performance,
    });
    this.metricsBuffer.set(agentId, buffer);

    // Check performance thresholds
    await this.checkPerformanceThresholds(agentId, performance);

    this.emit('agent_performance_recorded', { agent_id: agentId, performance });
  }

  async recordTaskResult(agentId: string, taskResult: TaskResult): Promise<void> {
    const monitoringData = this.getOrCreateAgentData(agentId);
    
    monitoringData.task_results.push(taskResult);
    monitoringData.timestamp = Date.now();

    // Analyze task result for anomalies
    await this.analyzeTaskResult(agentId, taskResult);

    this.emit('task_result_recorded', { agent_id: agentId, task_result: taskResult });
  }

  // Health monitoring
  private startHealthMonitoring(): void {
    this.healthMonitor = setInterval(async () => {
      try {
        await this.performHealthChecks();
        await this.updateSystemHealth();
      } catch (error) {
        this.logger.error('Health monitoring error', error);
      }
    }, this.config.health_monitoring.check_interval);

    this.logger.info('Health monitoring started');
  }

  private async performHealthChecks(): Promise<void> {
    for (const [agentId, dataArray] of this.agentData) {
      if (dataArray.length === 0) continue;

      const latestData = dataArray[dataArray.length - 1];
      const health = latestData.health;

      // Check if agent is responsive
      const timeSinceLastUpdate = Date.now() - latestData.timestamp;
      const isResponsive = timeSinceLastUpdate < this.config.health_monitoring.check_interval * 2;

      if (!isResponsive) {
        await this.createAlert(
          `agent_unresponsive_${agentId}`,
          'Agent Unresponsive',
          `Agent ${agentId} has not reported health in ${timeSinceLastUpdate}ms`,
          'high',
          agentId
        );
      }

      // Check resource usage
      if (health.resource_usage.cpu_percent > this.config.health_monitoring.thresholds.cpu_critical) {
        await this.createAlert(
          `cpu_critical_${agentId}`,
          'Critical CPU Usage',
          `Agent ${agentId} CPU usage: ${health.resource_usage.cpu_percent}%`,
          'critical',
          agentId
        );
      } else if (health.resource_usage.cpu_percent > this.config.health_monitoring.thresholds.cpu_warning) {
        await this.createAlert(
          `cpu_warning_${agentId}`,
          'High CPU Usage',
          `Agent ${agentId} CPU usage: ${health.resource_usage.cpu_percent}%`,
          'medium',
          agentId
        );
      }

      // Check memory usage
      if (health.resource_usage.memory_percent > this.config.health_monitoring.thresholds.memory_critical) {
        await this.createAlert(
          `memory_critical_${agentId}`,
          'Critical Memory Usage',
          `Agent ${agentId} memory usage: ${health.resource_usage.memory_percent}%`,
          'critical',
          agentId
        );
      } else if (health.resource_usage.memory_percent > this.config.health_monitoring.thresholds.memory_warning) {
        await this.createAlert(
          `memory_warning_${agentId}`,
          'High Memory Usage',
          `Agent ${agentId} memory usage: ${health.resource_usage.memory_percent}%`,
          'medium',
          agentId
        );
      }

      // Check error count
      if (health.error_count > 10) {
        await this.createAlert(
          `high_error_count_${agentId}`,
          'High Error Count',
          `Agent ${agentId} has ${health.error_count} errors`,
          'high',
          agentId
        );
      }
    }
  }

  private async updateSystemHealth(): Promise<void> {
    const systemData: SystemMonitoringData = {
      timestamp: Date.now(),
      system_health: this.calculateSystemHealth(),
      total_agents: this.agentData.size,
      active_agents: this.countActiveAgents(),
      system_resource_usage: await this.getSystemResourceUsage(),
      agent_data: new Map(Array.from(this.agentData.entries()).map(([agentId, dataArray]) => [agentId, dataArray[dataArray.length - 1]])),
      alerts: Array.from(this.activeAlerts.values()),
      performance_summary: this.calculatePerformanceSummary(),
    };

    this.systemData.push(systemData);

    // Keep only recent system data
    if (this.systemData.length > 1000) {
      this.systemData = this.systemData.slice(-500);
    }

    this.emit('system_health_updated', systemData);
  }

  // Performance monitoring
  private startPerformanceMonitoring(): void {
    this.performanceCollector = setInterval(async () => {
      try {
        await this.collectPerformanceMetrics();
        await this.aggregateMetrics();
        await this.updatePerformanceBaselines();
      } catch (error) {
        this.logger.error('Performance monitoring error', error);
      }
    }, 60000); // Collect every minute

    this.logger.info('Performance monitoring started');
  }

  private async collectPerformanceMetrics(): Promise<void> {
    const systemMetrics = {
      timestamp: Date.now(),
      cpu_usage: process.cpuUsage(),
      memory_usage: process.memoryUsage(),
      resource_usage: await this.getDetailedResourceUsage(),
    };

    // Add to system metrics
    this.emit('system_metrics_collected', systemMetrics);
  }

  private async aggregateMetrics(): Promise<void> {
    for (const [agentId, buffer] of this.metricsBuffer) {
      if (buffer.length === 0) continue;

      const aggregated = this.aggregateAgentMetrics(buffer);
      
      // Store aggregated metrics
      const agentData = this.agentData.get(agentId) || [];
      agentData.push({
        agent_id: agentId,
        timestamp: Date.now(),
        health: {} as AgentHealth, // Will be filled by health monitoring
        performance: aggregated,
        task_results: [],
        resource_usage: {
          cpu_percent: 0,
          memory_bytes: 0,
          network_bytes: 0,
          disk_io_bytes: 0,
        },
        custom_metrics: {},
      });

      // Clear buffer
      this.metricsBuffer.set(agentId, []);

      this.emit('metrics_aggregated', { agent_id: agentId, metrics: aggregated });
    }
  }

  private aggregateAgentMetrics(buffer: any[]): AgentPerformanceMetrics {
    const period = {
      start: buffer[0]?.timestamp || Date.now(),
      end: Date.now(),
    };

    const tasksCompleted = buffer.reduce((sum, item) => sum + (item.metrics.metrics?.tasks_completed || 0), 0);
    const tasksFailed = buffer.reduce((sum, item) => sum + (item.metrics.metrics?.tasks_failed || 0), 0);
    const totalTasks = tasksCompleted + tasksFailed;

    return {
      agent_id: buffer[0]?.metrics.agent_id || 'unknown',
      period,
      metrics: {
        tasks_completed: tasksCompleted,
        tasks_failed: tasksFailed,
        success_rate: totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 100,
        average_execution_time: buffer.reduce((sum, item) => 
          sum + (item.metrics.metrics?.average_execution_time || 0), 0) / buffer.length,
        resource_utilization: {
          cpu_average: buffer.reduce((sum, item) => 
            sum + (item.metrics.metrics?.resource_utilization?.cpu_average || 0), 0) / buffer.length,
          memory_average: buffer.reduce((sum, item) => 
            sum + (item.metrics.metrics?.resource_utilization?.memory_average || 0), 0) / buffer.length,
          storage_used: Math.max(...buffer.map(item => 
            item.metrics.metrics?.resource_utilization?.storage_used || 0)),
        },
        quality_scores: buffer.map(item => item.metrics.metrics?.quality_scores || []).flat(),
        collaboration_score: buffer.reduce((sum, item) => 
          sum + (item.metrics.metrics?.collaboration_score || 0), 0) / buffer.length,
      },
    };
  }

  // Alert management
  private startAlertProcessing(): void {
    this.alertProcessor = setInterval(async () => {
      try {
        await this.processAlertRules();
        await this.cleanupResolvedAlerts();
        await this.processAlertThrottling();
      } catch (error) {
        this.logger.error('Alert processing error', error);
      }
    }, 30000); // Process every 30 seconds

    this.logger.info('Alert processing started');
  }

  private async createAlert(
    alertId: string,
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Check if alert is throttled
    if (this.isAlertThrottled(alertId)) {
      return;
    }

    const alert: SystemAlert = {
      id: alertId,
      type: 'error',
      severity,
      source,
      title,
      description,
      timestamp: Date.now(),
      resolved: false,
      metadata,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // Apply throttling
    this.applyAlertThrottling(alertId);

    // Send alert through configured channels
    await this.sendAlert(alert);

    this.logger.warn('Alert created', {
      alert_id: alertId,
      title,
      severity,
      source,
    });

    this.emit('alert_created', alert);
  }

  private async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    
    if (alert) {
      alert.resolved = true;
      alert.resolution = resolution;
      this.activeAlerts.delete(alertId);

      this.logger.info('Alert resolved', {
        alert_id: alertId,
        resolution,
      });

      this.emit('alert_resolved', alert);
    }
  }

  private async sendAlert(alert: SystemAlert): Promise<void> {
    for (const channel of this.config.alerting.alert_channels) {
      try {
        switch (channel) {
          case 'log':
            this.logger.error(`ALERT: ${alert.title}`, {
              alert_id: alert.id,
              severity: alert.severity,
              description: alert.description,
              source: alert.source,
            });
            break;

          case 'webhook':
            if (this.config.alerting.webhook_url) {
              await this.sendWebhookAlert(alert);
            }
            break;

          case 'email':
            if (this.config.alerting.email_config) {
              await this.sendEmailAlert(alert);
            }
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send alert via ${channel}`, error);
      }
    }
  }

  private async sendWebhookAlert(alert: SystemAlert): Promise<void> {
    // In a real implementation, this would send HTTP POST to webhook URL
    this.logger.debug('Webhook alert sent', { alert_id: alert.id });
  }

  private async sendEmailAlert(alert: SystemAlert): Promise<void> {
    // In a real implementation, this would send email via SMTP
    this.logger.debug('Email alert sent', { alert_id: alert.id });
  }

  // Anomaly detection
  private startAnomalyDetection(): void {
    this.anomalyDetector = setInterval(async () => {
      try {
        await this.detectPerformanceAnomalies();
        await this.detectBehaviorAnomalies();
      } catch (error) {
        this.logger.error('Anomaly detection error', error);
      }
    }, 300000); // Check every 5 minutes

    this.logger.info('Anomaly detection started');
  }

  private async detectPerformanceAnomalies(): Promise<void> {
    for (const [agentId, dataArray] of this.agentData) {
      if (dataArray.length < 10) continue; // Need baseline data

      const recent = dataArray.slice(-5);
      const baseline = this.performanceBaselines.get(agentId);

      if (!baseline) continue;

      // Check for performance degradation
      const avgResponseTime = recent.reduce((sum, data) => 
        sum + (data.performance.metrics.average_execution_time || 0), 0) / recent.length;

      if (avgResponseTime > baseline.response_time * 2) {
        await this.createAlert(
          `performance_anomaly_${agentId}`,
          'Performance Anomaly Detected',
          `Agent ${agentId} response time increased significantly: ${avgResponseTime}ms vs baseline ${baseline.response_time}ms`,
          'high',
          agentId,
          { anomaly_type: 'performance_degradation' }
        );
      }

      // Check for unusual error rates
      const avgErrorRate = recent.reduce((sum, data) => {
        const total = data.performance.metrics.tasks_completed + data.performance.metrics.tasks_failed;
        return sum + (total > 0 ? (data.performance.metrics.tasks_failed / total) * 100 : 0);
      }, 0) / recent.length;

      if (avgErrorRate > (baseline.error_rate || 5) * 3) {
        await this.createAlert(
          `error_anomaly_${agentId}`,
          'Error Rate Anomaly Detected',
          `Agent ${agentId} error rate increased: ${avgErrorRate}% vs baseline ${baseline.error_rate}%`,
          'high',
          agentId,
          { anomaly_type: 'error_rate_spike' }
        );
      }
    }
  }

  private async detectBehaviorAnomalies(): Promise<void> {
    // Detect unusual agent behavior patterns
    for (const [agentId, dataArray] of this.agentData) {
      if (dataArray.length < 20) continue;

      const recent = dataArray.slice(-10);
      const historical = dataArray.slice(-20, -10);

      // Check for unusual task execution patterns
      const recentTaskCount = recent.reduce((sum, data) => 
        sum + data.performance.metrics.tasks_completed, 0);
      const historicalTaskCount = historical.reduce((sum, data) => 
        sum + data.performance.metrics.tasks_completed, 0);

      const taskCountChange = Math.abs(recentTaskCount - historicalTaskCount) / historicalTaskCount;

      if (taskCountChange > 0.5) { // 50% change
        await this.createAlert(
          `behavior_anomaly_${agentId}`,
          'Behavior Anomaly Detected',
          `Agent ${agentId} task execution pattern changed significantly`,
          'medium',
          agentId,
          { 
            anomaly_type: 'task_pattern_change',
            recent_tasks: recentTaskCount,
            historical_tasks: historicalTaskCount,
          }
        );
      }
    }
  }

  // Utility methods
  private getOrCreateAgentData(agentId: string): AgentMonitoringData {
    let dataArray = this.agentData.get(agentId);
    
    if (!dataArray) {
      dataArray = [];
      this.agentData.set(agentId, dataArray);
    }

    // Get or create latest data entry
    let latestData = dataArray[dataArray.length - 1];
    
    if (!latestData || Date.now() - latestData.timestamp > 60000) {
      latestData = {
        agent_id: agentId,
        timestamp: Date.now(),
        health: {} as AgentHealth,
        performance: {} as AgentPerformanceMetrics,
        task_results: [],
        resource_usage: {
          cpu_percent: 0,
          memory_bytes: 0,
          network_bytes: 0,
          disk_io_bytes: 0,
        },
        custom_metrics: {},
      };
      dataArray.push(latestData);
    }

    return latestData;
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'Agent CPU usage exceeds threshold',
        enabled: true,
        conditions: [
          {
            metric: 'cpu_percent',
            operator: '>',
            threshold: 80,
            duration_ms: 300000,
          },
        ],
        severity: 'high',
        actions: ['log', 'webhook'],
        throttling: {
          enabled: true,
          cooldown_period: 600000,
        },
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Agent memory usage exceeds threshold',
        enabled: true,
        conditions: [
          {
            metric: 'memory_percent',
            operator: '>',
            threshold: 85,
            duration_ms: 300000,
          },
        ],
        severity: 'high',
        actions: ['log', 'webhook'],
        throttling: {
          enabled: true,
          cooldown_period: 600000,
        },
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Agent error rate exceeds threshold',
        enabled: true,
        conditions: [
          {
            metric: 'error_rate',
            operator: '>',
            threshold: 10,
            duration_ms: 600000,
          },
        ],
        severity: 'critical',
        actions: ['log', 'webhook', 'email'],
        throttling: {
          enabled: true,
          cooldown_period: 1800000,
        },
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  private async checkHealthThresholds(agentId: string, health: AgentHealth): Promise<void> {
    const thresholds = this.config.health_monitoring.thresholds;

    // CPU threshold check
    if (health.resource_usage.cpu_percent > thresholds.cpu_critical) {
      await this.createAlert(
        `cpu_critical_${agentId}`,
        'Critical CPU Usage',
        `Agent ${agentId} CPU: ${health.resource_usage.cpu_percent}%`,
        'critical',
        agentId
      );
    }

    // Memory threshold check
    if (health.resource_usage.memory_percent > thresholds.memory_critical) {
      await this.createAlert(
        `memory_critical_${agentId}`,
        'Critical Memory Usage',
        `Agent ${agentId} Memory: ${health.resource_usage.memory_percent}%`,
        'critical',
        agentId
      );
    }

    // Response time check
    if (health.response_time > thresholds.response_time_critical) {
      await this.createAlert(
        `response_time_critical_${agentId}`,
        'Critical Response Time',
        `Agent ${agentId} Response Time: ${health.response_time}ms`,
        'critical',
        agentId
      );
    }
  }

  private async checkPerformanceThresholds(agentId: string, performance: AgentPerformanceMetrics): Promise<void> {
    const thresholds = this.config.health_monitoring.thresholds;

    // Error rate check
    const errorRate = performance.metrics.tasks_failed / 
      (performance.metrics.tasks_completed + performance.metrics.tasks_failed) * 100;

    if (errorRate > thresholds.error_rate_critical) {
      await this.createAlert(
        `error_rate_critical_${agentId}`,
        'Critical Error Rate',
        `Agent ${agentId} Error Rate: ${errorRate.toFixed(2)}%`,
        'critical',
        agentId
      );
    }
  }

  private async analyzeTaskResult(agentId: string, taskResult: TaskResult): Promise<void> {
    // Analyze task execution patterns for anomalies
    if (taskResult.status === 'failure') {
      this.logger.warn('Task execution failed', {
        agent_id: agentId,
        task_id: taskResult.task_id,
        error: taskResult.error_details?.error_message,
      });
    }

    // Check for unusual execution times
    if (taskResult.metadata.execution_time > 60000) { // 1 minute
      this.logger.warn('Long task execution detected', {
        agent_id: agentId,
        task_id: taskResult.task_id,
        execution_time: taskResult.metadata.execution_time,
      });
    }
  }

  private calculateSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const activeAgents = this.countActiveAgents();
    const totalAgents = this.agentData.size;
    const activeRatio = totalAgents > 0 ? activeAgents / totalAgents : 1;

    const criticalAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical').length;

    if (criticalAlerts > 0 || activeRatio < 0.5) {
      return 'critical';
    } else if (activeRatio < 0.8 || this.activeAlerts.size > 5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private countActiveAgents(): number {
    let activeCount = 0;
    const now = Date.now();

    for (const [_, dataArray] of this.agentData) {
      if (dataArray.length > 0) {
        const latestData = dataArray[dataArray.length - 1];
        const timeSinceUpdate = now - latestData.timestamp;
        
        if (timeSinceUpdate < this.config.health_monitoring.check_interval * 2) {
          activeCount++;
        }
      }
    }

    return activeCount;
  }

  private async getSystemResourceUsage(): Promise<any> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpu_percent: (cpuUsage.user + cpuUsage.system) / 1000000,
      memory_bytes: memoryUsage.heapUsed,
      disk_usage_percent: 0, // Would implement actual disk usage check
      network_throughput: 0, // Would implement actual network monitoring
    };
  }

  private async getDetailedResourceUsage(): Promise<any> {
    return {
      cpu_detailed: process.cpuUsage(),
      memory_detailed: process.memoryUsage(),
      uptime: process.uptime(),
      platform: process.platform,
      version: process.version,
    };
  }

  private calculatePerformanceSummary(): any {
    let totalTasks = 0;
    let successfulTasks = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [_, dataArray] of this.agentData) {
      for (const data of dataArray) {
        if (data.performance.metrics) {
          totalTasks += data.performance.metrics.tasks_completed + data.performance.metrics.tasks_failed;
          successfulTasks += data.performance.metrics.tasks_completed;
          
          if (data.performance.metrics.average_execution_time > 0) {
            totalResponseTime += data.performance.metrics.average_execution_time;
            responseTimeCount++;
          }
        }
      }
    }

    return {
      average_response_time: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      total_tasks_executed: totalTasks,
      success_rate: totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 100,
      error_rate: totalTasks > 0 ? ((totalTasks - successfulTasks) / totalTasks) * 100 : 0,
    };
  }

  private isAlertThrottled(alertId: string): boolean {
    if (!this.config.alerting.alert_throttling.enabled) {
      return false;
    }

    const lastAlert = this.alertThrottling.get(alertId);
    const now = Date.now();
    const windowSize = this.config.alerting.alert_throttling.window_size;

    return lastAlert !== undefined && (now - lastAlert) < windowSize;
  }

  private applyAlertThrottling(alertId: string): void {
    if (this.config.alerting.alert_throttling.enabled) {
      this.alertThrottling.set(alertId, Date.now());
    }
  }

  private async processAlertRules(): Promise<void> {
    // Process custom alert rules
    for (const [_, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // Check rule conditions against current data
      await this.evaluateAlertRule(rule);
    }
  }

  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    // Simplified rule evaluation - in production, this would be more sophisticated
    for (const [agentId, dataArray] of this.agentData) {
      if (dataArray.length === 0) continue;

      const latestData = dataArray[dataArray.length - 1];
      
      for (const condition of rule.conditions) {
        const metricValue = this.extractMetricValue(latestData, condition.metric);
        
        if (this.evaluateCondition(metricValue, condition)) {
          await this.createAlert(
            `${rule.id}_${agentId}`,
            rule.name,
            `${rule.description} for agent ${agentId}`,
            rule.severity,
            agentId,
            { rule_id: rule.id }
          );
        }
      }
    }
  }

  private extractMetricValue(data: AgentMonitoringData, metric: string): number {
    switch (metric) {
      case 'cpu_percent':
        return data.health.resource_usage?.cpu_percent || 0;
      case 'memory_percent':
        return data.health.resource_usage?.memory_percent || 0;
      case 'error_rate':
        const total = data.performance.metrics?.tasks_completed + data.performance.metrics?.tasks_failed;
        return total > 0 ? (data.performance.metrics.tasks_failed / total) * 100 : 0;
      default:
        return 0;
    }
  }

  private evaluateCondition(value: number, condition: any): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold;
      case '<':
        return value < condition.threshold;
      case '>=':
        return value >= condition.threshold;
      case '<=':
        return value <= condition.threshold;
      case '=':
        return value === condition.threshold;
      default:
        return false;
    }
  }

  private async cleanupResolvedAlerts(): Promise<void> {
    // Auto-resolve alerts that are no longer applicable
    for (const [alertId, alert] of this.activeAlerts) {
      if (this.shouldAutoResolveAlert(alert)) {
        await this.resolveAlert(alertId, 'Auto-resolved: condition no longer met');
      }
    }
  }

  private shouldAutoResolveAlert(alert: SystemAlert): boolean {
    // Simple auto-resolution logic - in production, this would be more sophisticated
    const age = Date.now() - alert.timestamp;
    return age > 3600000; // Auto-resolve after 1 hour
  }

  private async processAlertThrottling(): Promise<void> {
    const now = Date.now();
    const windowSize = this.config.alerting.alert_throttling.window_size;

    // Clean up old throttling entries
    for (const [alertId, timestamp] of this.alertThrottling) {
      if (now - timestamp > windowSize) {
        this.alertThrottling.delete(alertId);
      }
    }
  }

  private startDataRetentionCleaning(): void {
    this.dataRetentionCleaner = setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        this.logger.error('Data retention cleanup error', error);
      }
    }, 3600000); // Clean every hour
  }

  private async cleanupOldData(): Promise<void> {
    const retentionPeriod = this.config.performance_monitoring.metrics_retention_period;
    const cutoff = Date.now() - retentionPeriod;

    // Clean up agent data
    for (const [agentId, dataArray] of this.agentData) {
      const recentData = dataArray.filter(data => data.timestamp > cutoff);
      this.agentData.set(agentId, recentData);
    }

    // Clean up system data
    this.systemData = this.systemData.filter(data => data.timestamp > cutoff);

    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
  }

  private async updatePerformanceBaselines(): Promise<void> {
    if (!this.config.performance_monitoring.trend_analysis) return;

    const baselinePeriod = this.config.performance_monitoring.performance_baseline_period;
    const cutoff = Date.now() - baselinePeriod;

    for (const [agentId, dataArray] of this.agentData) {
      const baselineData = dataArray.filter(data => data.timestamp > cutoff);
      
      if (baselineData.length < 5) continue; // Need minimum data for baseline

      const baseline = {
        response_time: baselineData.reduce((sum, data) => 
          sum + (data.performance.metrics?.average_execution_time || 0), 0) / baselineData.length,
        error_rate: baselineData.reduce((sum, data) => {
          const total = data.performance.metrics?.tasks_completed + data.performance.metrics?.tasks_failed;
          return sum + (total > 0 ? (data.performance.metrics.tasks_failed / total) * 100 : 0);
        }, 0) / baselineData.length,
        success_rate: baselineData.reduce((sum, data) => 
          sum + (data.performance.metrics?.success_rate || 100), 0) / baselineData.length,
      };

      this.performanceBaselines.set(agentId, baseline);
    }
  }

  private async archiveAgentData(agentId: string): Promise<void> {
    const data = this.agentData.get(agentId);
    if (data && data.length > 0) {
      this.logger.info('Archiving agent data', {
        agent_id: agentId,
        data_points: data.length,
      });

      // In a real implementation, this would archive to persistent storage
    }
  }

  private async processRemainingMetrics(): Promise<void> {
    // Process any remaining metrics in buffers
    await this.aggregateMetrics();
  }

  // Public getters
  getMonitoringData(agentId?: string): AgentMonitoringData[] | Map<string, AgentMonitoringData[]> {
    if (agentId) {
      return this.agentData.get(agentId) || [];
    }
    return new Map(this.agentData);
  }

  getSystemData(): SystemMonitoringData[] {
    return [...this.systemData];
  }

  getActiveAlerts(): SystemAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(limit?: number): SystemAlert[] {
    return limit ? this.alertHistory.slice(-limit) : [...this.alertHistory];
  }

  getPerformanceBaselines(): Map<string, any> {
    return new Map(this.performanceBaselines);
  }

  isMonitoringRunning(): boolean {
    return this.isRunning;
  }
}

export default AgentMonitoringSystem;