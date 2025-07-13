// Comprehensive emergency service orchestrating all emergency management components

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { EmergencyManager, EmergencyManagerConfig } from '../emergency/emergency-manager';
import { CircuitBreaker, CircuitBreakerConfig } from '../emergency/circuit-breaker';
import { EmergencyGovernance, EmergencyGovernanceConfig } from '../emergency/emergency-governance';
import { DexAggregator } from '../core/dex-aggregator';
import { YieldOptimizationService } from './yield-optimization-service';
import { ProfessionalTradingService } from './professional-trading-service';

export interface EmergencyServiceConfig {
  // Core configuration
  connection: Connection;
  wallet: Keypair;
  
  // Component configurations
  emergencyManager: EmergencyManagerConfig;
  circuitBreaker: CircuitBreakerConfig;
  governance: EmergencyGovernanceConfig;
  
  // Service integration
  enableAutomaticResponses: boolean;
  enableGovernanceOverride: boolean;
  emergencyContactWebhook?: string;
  
  // Monitoring settings
  healthCheckInterval: number; // seconds
  alertThresholds: {
    systemHealth: 'warning' | 'critical';
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    failureCount: number;
  };
}

export interface EmergencyServiceState {
  isActive: boolean;
  systemStatus: 'normal' | 'warning' | 'critical' | 'emergency';
  emergencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  
  // Component status
  emergencyManager: {
    isMonitoring: boolean;
    isPaused: boolean;
    pauseLevel: string;
    activeActions: number;
  };
  circuitBreaker: {
    state: string;
    isMonitoring: boolean;
    failureCount: number;
    successRate: number;
  };
  governance: {
    isActive: boolean;
    activeProposals: number;
    pendingSignatures: number;
    isPaused: boolean;
  };
  
  // System metrics
  uptime: number;
  lastEmergencyAction: number;
  totalEmergencyActions: number;
  falseAlarms: number;
  recoveryTime: number;
}

export interface EmergencyAlert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: 'emergency_manager' | 'circuit_breaker' | 'governance' | 'system';
  title: string;
  message: string;
  details: any;
  acknowledged: boolean;
  resolvedAt?: number;
  actions: {
    id: string;
    label: string;
    action: string;
    destructive: boolean;
  }[];
}

export interface EmergencyResponse {
  id: string;
  triggeredBy: string;
  timestamp: number;
  responseType: 'automatic' | 'manual' | 'governance';
  actions: EmergencyActionExecution[];
  success: boolean;
  duration: number;
  impact: {
    assetsSecured: BN;
    positionsExited: number;
    servicesAffected: string[];
    estimatedLoss: BN;
  };
}

export interface EmergencyActionExecution {
  id: string;
  action: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
  result?: any;
}

export class EmergencyService {
  private config: EmergencyServiceConfig;
  private logger: Logger;
  
  // Core components
  private emergencyManager: EmergencyManager;
  private circuitBreaker: CircuitBreaker;
  private governance: EmergencyGovernance;
  
  // Service references
  private dexAggregator: DexAggregator;
  private yieldService: YieldOptimizationService;
  private tradingService: ProfessionalTradingService;
  
  // Service state
  private state: EmergencyServiceState;
  private alerts: Map<string, EmergencyAlert> = new Map();
  private responses: EmergencyResponse[] = [];
  private isActive: boolean = false;
  
  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private alertProcessingInterval?: NodeJS.Timeout;
  private metricsUpdateInterval?: NodeJS.Timeout;

  constructor(
    config: EmergencyServiceConfig,
    dexAggregator: DexAggregator,
    yieldService: YieldOptimizationService,
    tradingService: ProfessionalTradingService,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.dexAggregator = dexAggregator;
    this.yieldService = yieldService;
    this.tradingService = tradingService;

    // Initialize components
    this.initializeComponents();

    // Initialize state
    this.state = {
      isActive: false,
      systemStatus: 'normal',
      emergencyLevel: 'none',
      emergencyManager: {
        isMonitoring: false,
        isPaused: false,
        pauseLevel: 'none',
        activeActions: 0,
      },
      circuitBreaker: {
        state: 'closed',
        isMonitoring: false,
        failureCount: 0,
        successRate: 100,
      },
      governance: {
        isActive: false,
        activeProposals: 0,
        pendingSignatures: 0,
        isPaused: false,
      },
      uptime: 0,
      lastEmergencyAction: 0,
      totalEmergencyActions: 0,
      falseAlarms: 0,
      recoveryTime: 0,
    };
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Emergency service already active');
      return;
    }

    this.logger.info('Starting comprehensive emergency service', {
      enableAutomaticResponses: this.config.enableAutomaticResponses,
      enableGovernanceOverride: this.config.enableGovernanceOverride,
      healthCheckInterval: this.config.healthCheckInterval,
    });

    try {
      // Start all emergency components
      await this.startEmergencyComponents();

      // Initialize service monitoring
      this.isActive = true;
      this.state.isActive = true;
      this.state.uptime = Date.now();
      this.startServiceMonitoring();

      this.logger.info('Emergency service started successfully', {
        emergencyManager: this.emergencyManager.isMonitoringActive(),
        circuitBreaker: this.circuitBreaker.isMonitoringActive(),
        governance: this.governance.isActive(),
      });

    } catch (error) {
      this.logger.error('Failed to start emergency service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Emergency service not active');
      return;
    }

    this.logger.info('Stopping emergency service');

    try {
      // Stop monitoring intervals
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.alertProcessingInterval) clearInterval(this.alertProcessingInterval);
      if (this.metricsUpdateInterval) clearInterval(this.metricsUpdateInterval);

      // Stop emergency components
      await this.stopEmergencyComponents();

      this.isActive = false;
      this.state.isActive = false;

      // Calculate final uptime
      this.state.uptime = Date.now() - this.state.uptime;

      this.logger.info('Emergency service stopped successfully', {
        uptime: this.state.uptime,
        totalEmergencyActions: this.state.totalEmergencyActions,
        falseAlarms: this.state.falseAlarms,
      });

    } catch (error) {
      this.logger.error('Failed to stop emergency service gracefully', error);
      this.isActive = false;
    }
  }

  async triggerEmergencyPause(reason: string, level: 'partial' | 'full' | 'emergency', triggeredBy: string): Promise<boolean> {
    this.logger.error('EMERGENCY PAUSE TRIGGERED', {
      reason,
      level,
      triggeredBy,
    });

    try {
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      const response: EmergencyResponse = {
        id: responseId,
        triggeredBy,
        timestamp: startTime,
        responseType: 'automatic',
        actions: [],
        success: false,
        duration: 0,
        impact: {
          assetsSecured: new BN(0),
          positionsExited: 0,
          servicesAffected: [],
          estimatedLoss: new BN(0),
        },
      };

      // Execute emergency pause through emergency manager
      const pauseAction = await this.executeEmergencyAction(
        'emergency_pause',
        { reason, level },
        'Emergency pause triggered'
      );
      response.actions.push(pauseAction);

      const success = await this.emergencyManager.pauseOperations(reason, level, triggeredBy);

      response.success = success;
      response.duration = Date.now() - startTime;

      // Update emergency level
      this.updateEmergencyLevel(level);

      // Record response
      this.responses.push(response);
      this.state.totalEmergencyActions++;
      this.state.lastEmergencyAction = Date.now();

      // Send emergency notification
      await this.sendEmergencyNotification(reason, level, success);

      return success;

    } catch (error) {
      this.logger.error('Emergency pause execution failed', error);
      return false;
    }
  }

  async initiateRecovery(initiatedBy: string, planId: string, requireGovernance: boolean = true): Promise<boolean> {
    this.logger.info('Initiating emergency recovery', {
      initiatedBy,
      planId,
      requireGovernance,
    });

    try {
      if (requireGovernance && this.config.enableGovernanceOverride) {
        // Create governance proposal for recovery
        const proposalId = await this.governance.createProposal(
          new PublicKey(initiatedBy),
          'Emergency Recovery',
          `Initiate emergency recovery using plan: ${planId}`,
          'recovery',
          { planId },
          false // Not an emergency proposal
        );

        this.logger.info('Recovery proposal created', { proposalId });
        return true; // Proposal created, recovery will happen after voting

      } else {
        // Direct recovery without governance
        const success = await this.emergencyManager.initiateRecovery(initiatedBy, planId);
        
        if (success) {
          this.updateEmergencyLevel('low');
          this.createAlert(
            'info',
            'system',
            'Recovery Initiated',
            `Emergency recovery initiated by ${initiatedBy}`,
            { planId }
          );
        }

        return success;
      }

    } catch (error) {
      this.logger.error('Failed to initiate recovery', error);
      return false;
    }
  }

  async executeCircuitBreakerAction<T>(operation: () => Promise<T>, context?: any): Promise<T> {
    return await this.circuitBreaker.execute(operation, context);
  }

  async forceCircuitOpen(reason: string): Promise<void> {
    this.circuitBreaker.forceOpen(reason);
    
    this.createAlert(
      'warning',
      'circuit_breaker',
      'Circuit Breaker Forced Open',
      `Circuit breaker manually opened: ${reason}`,
      { reason }
    );
  }

  async createGovernanceProposal(
    proposer: PublicKey,
    title: string,
    description: string,
    actionType: any,
    parameters: any,
    isEmergency: boolean = false
  ): Promise<string> {
    return await this.governance.createProposal(
      proposer,
      title,
      description,
      actionType,
      parameters,
      isEmergency
    );
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.info('Alert acknowledged', { alertId });
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = Date.now();
      this.logger.info('Alert resolved', { alertId });
    }
  }

  async executeAlertAction(alertId: string, actionId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    const action = alert.actions.find(a => a.id === actionId);
    if (!action) {
      throw new Error('Action not found');
    }

    this.logger.info('Executing alert action', {
      alertId,
      actionId,
      action: action.action,
    });

    try {
      switch (action.action) {
        case 'emergency_pause':
          await this.triggerEmergencyPause('Alert action triggered', 'partial', 'alert_system');
          break;
        case 'emergency_exit':
          await this.emergencyManager.emergencyExit();
          break;
        case 'force_circuit_open':
          this.circuitBreaker.forceOpen('Alert action triggered');
          break;
        case 'create_governance_proposal':
          // Create emergency governance proposal
          break;
        default:
          this.logger.warn('Unknown alert action', { action: action.action });
      }

      alert.acknowledged = true;

    } catch (error) {
      this.logger.error('Failed to execute alert action', error, { alertId, actionId });
      throw error;
    }
  }

  getServiceState(): EmergencyServiceState {
    this.updateServiceState();
    return { ...this.state };
  }

  getActiveAlerts(): EmergencyAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getEmergencyHistory(): EmergencyResponse[] {
    return [...this.responses].sort((a, b) => b.timestamp - a.timestamp);
  }

  async generateEmergencyReport(): Promise<any> {
    const emergencyReport = await this.emergencyManager.generateEmergencyReport();
    const circuitBreakerMetrics = this.circuitBreaker.getMetrics();
    const governanceState = this.governance.getGovernanceState();

    return {
      timestamp: Date.now(),
      serviceState: this.getServiceState(),
      emergencyManager: emergencyReport,
      circuitBreaker: {
        metrics: circuitBreakerMetrics,
        state: this.circuitBreaker.getState(),
        events: this.circuitBreaker.getEvents(20),
      },
      governance: {
        state: governanceState,
        activeProposals: this.governance.getActiveProposals(),
        recentEvents: this.governance.getEvents(20),
      },
      alerts: {
        active: this.getActiveAlerts(),
        recent: Array.from(this.alerts.values())
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50),
      },
      responses: this.responses.slice(-20),
      recommendations: await this.generateEmergencyRecommendations(),
    };
  }

  // Private implementation methods

  private initializeComponents(): void {
    // Initialize emergency manager
    this.emergencyManager = new EmergencyManager(
      this.config.emergencyManager,
      this.config.connection,
      this.config.wallet,
      this.dexAggregator,
      this.yieldService,
      this.tradingService,
      this.logger
    );

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.config.circuitBreaker,
      this.logger
    );

    // Initialize governance
    this.governance = new EmergencyGovernance(
      this.config.governance,
      this.config.connection,
      this.logger
    );
  }

  private async startEmergencyComponents(): Promise<void> {
    // Start emergency manager
    await this.emergencyManager.startMonitoring();

    // Start circuit breaker
    this.circuitBreaker.startMonitoring();

    // Start governance
    await this.governance.start();

    this.logger.info('All emergency components started');
  }

  private async stopEmergencyComponents(): Promise<void> {
    // Stop components in reverse order
    await this.governance.stop();
    this.circuitBreaker.stopMonitoring();
    await this.emergencyManager.stopMonitoring();

    this.logger.info('All emergency components stopped');
  }

  private startServiceMonitoring(): void {
    // Health check cycle
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval * 1000);

    // Alert processing cycle
    this.alertProcessingInterval = setInterval(() => {
      this.processAlerts();
    }, 30 * 1000); // Every 30 seconds

    // Metrics update cycle
    this.metricsUpdateInterval = setInterval(() => {
      this.updateServiceState();
    }, 60 * 1000); // Every minute
  }

  private async performHealthCheck(): Promise<void> {
    try {
      // Check component health
      const emergencyManagerState = this.emergencyManager.getEmergencyState();
      const circuitBreakerState = this.circuitBreaker.getState();
      const governanceState = this.governance.getGovernanceState();

      // Check for critical conditions
      if (emergencyManagerState.isPaused && emergencyManagerState.pauseLevel === 'emergency') {
        this.updateSystemStatus('emergency');
      } else if (circuitBreakerState.state === 'open') {
        this.updateSystemStatus('critical');
      } else if (this.getActiveAlerts().filter(a => a.severity === 'critical').length > 0) {
        this.updateSystemStatus('warning');
      } else {
        this.updateSystemStatus('normal');
      }

      // Check circuit breaker metrics
      const metrics = this.circuitBreaker.getMetrics();
      if (metrics.errorRate > this.config.alertThresholds.errorRate) {
        this.createAlert(
          'warning',
          'circuit_breaker',
          'High Error Rate',
          `Circuit breaker error rate (${metrics.errorRate.toFixed(2)}%) exceeds threshold`,
          { errorRate: metrics.errorRate, threshold: this.config.alertThresholds.errorRate }
        );
      }

      if (metrics.averageResponseTime > this.config.alertThresholds.responseTime) {
        this.createAlert(
          'info',
          'circuit_breaker',
          'High Response Time',
          `Average response time (${metrics.averageResponseTime}ms) exceeds threshold`,
          { responseTime: metrics.averageResponseTime, threshold: this.config.alertThresholds.responseTime }
        );
      }

    } catch (error) {
      this.logger.error('Emergency service health check failed', error);
    }
  }

  private processAlerts(): void {
    const now = Date.now();
    
    // Process automatic responses
    if (this.config.enableAutomaticResponses) {
      for (const alert of this.alerts.values()) {
        if (!alert.acknowledged && alert.severity === 'critical' && !alert.resolvedAt) {
          this.processAutomaticResponse(alert);
        }
      }
    }

    // Clean up old resolved alerts
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(alertId);
      }
    }
  }

  private async processAutomaticResponse(alert: EmergencyAlert): Promise<void> {
    try {
      this.logger.info('Processing automatic response for critical alert', {
        alertId: alert.id,
        source: alert.source,
        title: alert.title,
      });

      // Trigger appropriate automatic response based on alert
      switch (alert.source) {
        case 'emergency_manager':
          if (alert.title.includes('Emergency Exit')) {
            await this.triggerEmergencyPause('Automatic response to critical alert', 'emergency', 'auto_response');
          }
          break;
        case 'circuit_breaker':
          if (alert.title.includes('Circuit Opened')) {
            await this.triggerEmergencyPause('Circuit breaker opened', 'partial', 'auto_response');
          }
          break;
      }

      alert.acknowledged = true;

    } catch (error) {
      this.logger.error('Automatic response failed', error, { alertId: alert.id });
    }
  }

  private updateServiceState(): void {
    // Update component states
    const emergencyState = this.emergencyManager.getEmergencyState();
    const circuitState = this.circuitBreaker.getState();
    const circuitMetrics = this.circuitBreaker.getMetrics();
    const governanceState = this.governance.getGovernanceState();

    this.state.emergencyManager = {
      isMonitoring: this.emergencyManager.isMonitoringActive(),
      isPaused: emergencyState.isPaused,
      pauseLevel: emergencyState.pauseLevel,
      activeActions: this.emergencyManager.getActiveActions().length,
    };

    this.state.circuitBreaker = {
      state: circuitState.state,
      isMonitoring: this.circuitBreaker.isMonitoringActive(),
      failureCount: circuitState.failureCount,
      successRate: circuitMetrics.successRate,
    };

    this.state.governance = {
      isActive: this.governance.isActive(),
      activeProposals: governanceState.activeProposals.size,
      pendingSignatures: this.governance.getPendingSignatures().length,
      isPaused: governanceState.isPaused,
    };
  }

  private updateSystemStatus(status: EmergencyServiceState['systemStatus']): void {
    if (this.state.systemStatus !== status) {
      this.logger.info('System status changed', {
        from: this.state.systemStatus,
        to: status,
      });

      this.state.systemStatus = status;

      // Create alert for status change
      if (status === 'critical' || status === 'emergency') {
        this.createAlert(
          'critical',
          'system',
          'System Status Critical',
          `System status changed to ${status}`,
          { previousStatus: this.state.systemStatus, newStatus: status }
        );
      }
    }
  }

  private updateEmergencyLevel(level: EmergencyServiceState['emergencyLevel']): void {
    if (this.state.emergencyLevel !== level) {
      this.logger.info('Emergency level changed', {
        from: this.state.emergencyLevel,
        to: level,
      });

      this.state.emergencyLevel = level;
    }
  }

  private createAlert(
    severity: EmergencyAlert['severity'],
    source: EmergencyAlert['source'],
    title: string,
    message: string,
    details: any
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: EmergencyAlert = {
      id: alertId,
      timestamp: Date.now(),
      severity,
      source,
      title,
      message,
      details,
      acknowledged: false,
      actions: this.generateAlertActions(severity, source),
    };

    this.alerts.set(alertId, alert);

    // Log based on severity
    switch (severity) {
      case 'critical':
        this.logger.error(`CRITICAL ALERT: ${title}`, { alertId, message, details });
        break;
      case 'error':
        this.logger.error(`ERROR ALERT: ${title}`, { alertId, message, details });
        break;
      case 'warning':
        this.logger.warn(`WARNING ALERT: ${title}`, { alertId, message, details });
        break;
      case 'info':
        this.logger.info(`INFO ALERT: ${title}`, { alertId, message, details });
        break;
    }
  }

  private generateAlertActions(severity: string, source: string): EmergencyAlert['actions'] {
    const actions: EmergencyAlert['actions'] = [];

    if (severity === 'critical') {
      actions.push({
        id: 'emergency_pause',
        label: 'Emergency Pause',
        action: 'emergency_pause',
        destructive: true,
      });

      if (source === 'emergency_manager') {
        actions.push({
          id: 'emergency_exit',
          label: 'Emergency Exit',
          action: 'emergency_exit',
          destructive: true,
        });
      }
    }

    if (source === 'circuit_breaker') {
      actions.push({
        id: 'force_circuit_open',
        label: 'Force Circuit Open',
        action: 'force_circuit_open',
        destructive: false,
      });
    }

    actions.push({
      id: 'create_proposal',
      label: 'Create Governance Proposal',
      action: 'create_governance_proposal',
      destructive: false,
    });

    return actions;
  }

  private async executeEmergencyAction(
    action: string,
    parameters: any,
    description: string
  ): Promise<EmergencyActionExecution> {
    const startTime = Date.now();
    
    const execution: EmergencyActionExecution = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: startTime,
      duration: 0,
      success: false,
    };

    try {
      // Execute the action (implementation depends on specific action)
      execution.success = true;
      execution.duration = Date.now() - startTime;

      this.logger.info('Emergency action executed', {
        actionId: execution.id,
        action,
        duration: execution.duration,
      });

    } catch (error) {
      execution.success = false;
      execution.duration = Date.now() - startTime;
      execution.error = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Emergency action failed', error, {
        actionId: execution.id,
        action,
      });
    }

    return execution;
  }

  private async sendEmergencyNotification(reason: string, level: string, success: boolean): Promise<void> {
    if (this.config.emergencyContactWebhook) {
      try {
        // Implementation would send webhook notification
        this.logger.info('Emergency notification sent', { reason, level, success });
      } catch (error) {
        this.logger.error('Failed to send emergency notification', error);
      }
    }
  }

  private async generateEmergencyRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const activeAlerts = this.getActiveAlerts();

    // Check alert severity
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`${criticalAlerts.length} critical alerts require immediate attention`);
    }

    // Check emergency state
    if (this.state.emergencyLevel !== 'none') {
      recommendations.push(`System is in ${this.state.emergencyLevel} emergency level - review recovery options`);
    }

    // Check component health
    if (this.state.circuitBreaker.state === 'open') {
      recommendations.push('Circuit breaker is open - investigate cause before resuming operations');
    }

    if (this.state.emergencyManager.isPaused) {
      recommendations.push(`System is paused at ${this.state.emergencyManager.pauseLevel} level - initiate recovery when safe`);
    }

    // Check governance
    if (this.state.governance.activeProposals > 0) {
      recommendations.push(`${this.state.governance.activeProposals} governance proposals pending - review and vote`);
    }

    return recommendations;
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): EmergencyServiceConfig {
    return { ...this.config };
  }

  getEmergencyManager(): EmergencyManager {
    return this.emergencyManager;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  getGovernance(): EmergencyGovernance {
    return this.governance;
  }
}

export default EmergencyService;