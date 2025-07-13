import { EventEmitter } from 'events';
import { Logger } from '../../../shared/utils/logger';
import { MonitoringAlert, ProactiveIntervention, UserExperience, TouchPoint } from '../types/support-types';
import { TechnicalSupportEngine } from '../agent-core/technical-support-engine';

export class ProactiveMonitoringSystem extends EventEmitter {
  private logger: Logger;
  private technicalSupportEngine: TechnicalSupportEngine;
  private monitoringInterval: NodeJS.Timer;
  private alertThresholds: Map<string, any>;
  private activeAlerts: Map<string, MonitoringAlert>;
  private interventionHistory: ProactiveIntervention[];
  private userExperiences: Map<string, UserExperience>;
  private systemMetrics: Map<string, any>;
  private isActive: boolean;

  constructor(supportEngine: TechnicalSupportEngine) {
    super();
    this.logger = new Logger('ProactiveMonitoringSystem');
    this.technicalSupportEngine = supportEngine;
    this.alertThresholds = new Map();
    this.activeAlerts = new Map();
    this.interventionHistory = [];
    this.userExperiences = new Map();
    this.systemMetrics = new Map();
    this.isActive = false;
    this.initializeThresholds();
  }

  /**
   * Initialize monitoring thresholds
   */
  private initializeThresholds(): void {
    const thresholds = {
      'system-performance': {
        cpu_usage: { warning: 70, critical: 85 },
        memory_usage: { warning: 80, critical: 90 },
        disk_usage: { warning: 85, critical: 95 },
        response_time: { warning: 2000, critical: 5000 } // milliseconds
      },
      'mining-operations': {
        hashrate_drop: { warning: 15, critical: 25 }, // percentage drop
        pool_disconnections: { warning: 3, critical: 5 }, // count per hour
        rejected_shares: { warning: 5, critical: 10 }, // percentage
        difficulty_adjustment: { warning: 20, critical: 35 } // percentage change
      },
      'bridge-operations': {
        transaction_delays: { warning: 30, critical: 60 }, // minutes
        validator_consensus: { warning: 80, critical: 70 }, // percentage
        bridge_liquidity: { warning: 500000, critical: 100000 }, // USD
        failed_transactions: { warning: 2, critical: 5 } // percentage
      },
      'dex-operations': {
        liquidity_shortage: { warning: 100000, critical: 50000 }, // USD
        price_slippage: { warning: 3, critical: 5 }, // percentage
        trading_volume_drop: { warning: 30, critical: 50 }, // percentage
        yield_rates: { warning: 5, critical: 2 } // percentage APY
      },
      'user-experience': {
        page_load_time: { warning: 3000, critical: 5000 }, // milliseconds
        error_rate: { warning: 2, critical: 5 }, // percentage
        user_satisfaction: { warning: 3.5, critical: 3.0 }, // out of 5
        support_ticket_volume: { warning: 50, critical: 100 } // tickets per hour
      },
      'security': {
        failed_login_attempts: { warning: 10, critical: 20 }, // per IP per hour
        suspicious_transactions: { warning: 5, critical: 10 }, // count
        api_abuse: { warning: 1000, critical: 2000 }, // requests per minute
        wallet_balance_changes: { warning: 10000, critical: 50000 } // USD
      }
    };

    Object.entries(thresholds).forEach(([category, categoryThresholds]) => {
      this.alertThresholds.set(category, categoryThresholds);
    });
  }

  /**
   * Start proactive monitoring
   */
  startMonitoring(): void {
    if (this.isActive) {
      this.logger.warn('Monitoring system is already active');
      return;
    }

    this.isActive = true;
    this.logger.info('Starting proactive monitoring system');

    // Start monitoring intervals
    this.monitoringInterval = setInterval(() => {
      this.performSystemCheck();
    }, 60000); // Check every minute

    // Start real-time event monitoring
    this.startRealTimeMonitoring();
  }

  /**
   * Stop proactive monitoring
   */
  stopMonitoring(): void {
    this.isActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.logger.info('Proactive monitoring system stopped');
  }

  /**
   * Perform comprehensive system check
   */
  private async performSystemCheck(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Check system performance
      await this.checkSystemPerformance();
      
      // Check mining operations
      await this.checkMiningOperations();
      
      // Check bridge operations
      await this.checkBridgeOperations();
      
      // Check DeFi operations
      await this.checkDeFiOperations();
      
      // Check user experience metrics
      await this.checkUserExperience();
      
      // Check security metrics
      await this.checkSecurityMetrics();
      
      // Process any triggered alerts
      await this.processTriggeredAlerts();
      
    } catch (error) {
      this.logger.error('Error during system check:', error);
    }
  }

  /**
   * Check system performance metrics
   */
  private async checkSystemPerformance(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    const thresholds = this.alertThresholds.get('system-performance');

    // CPU Usage Check
    if (metrics.cpu_usage > thresholds.cpu_usage.critical) {
      await this.triggerAlert('system-performance', 'critical', 'High CPU Usage', 
        `CPU usage at ${metrics.cpu_usage}% (Critical threshold: ${thresholds.cpu_usage.critical}%)`);
    } else if (metrics.cpu_usage > thresholds.cpu_usage.warning) {
      await this.triggerAlert('system-performance', 'medium', 'Elevated CPU Usage', 
        `CPU usage at ${metrics.cpu_usage}% (Warning threshold: ${thresholds.cpu_usage.warning}%)`);
    }

    // Memory Usage Check
    if (metrics.memory_usage > thresholds.memory_usage.critical) {
      await this.triggerAlert('system-performance', 'critical', 'High Memory Usage', 
        `Memory usage at ${metrics.memory_usage}% (Critical threshold: ${thresholds.memory_usage.critical}%)`);
    } else if (metrics.memory_usage > thresholds.memory_usage.warning) {
      await this.triggerAlert('system-performance', 'medium', 'Elevated Memory Usage', 
        `Memory usage at ${metrics.memory_usage}% (Warning threshold: ${thresholds.memory_usage.warning}%)`);
    }

    // Response Time Check
    if (metrics.response_time > thresholds.response_time.critical) {
      await this.triggerAlert('system-performance', 'critical', 'High Response Time', 
        `Average response time: ${metrics.response_time}ms (Critical threshold: ${thresholds.response_time.critical}ms)`);
    } else if (metrics.response_time > thresholds.response_time.warning) {
      await this.triggerAlert('system-performance', 'medium', 'Elevated Response Time', 
        `Average response time: ${metrics.response_time}ms (Warning threshold: ${thresholds.response_time.warning}ms)`);
    }
  }

  /**
   * Check mining operations
   */
  private async checkMiningOperations(): Promise<void> {
    const metrics = await this.collectMiningMetrics();
    const thresholds = this.alertThresholds.get('mining-operations');

    // Hashrate Drop Check
    if (metrics.hashrate_drop > thresholds.hashrate_drop.critical) {
      await this.triggerAlert('mining-operations', 'critical', 'Critical Hashrate Drop', 
        `Hashrate dropped by ${metrics.hashrate_drop}% in the last hour`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('mining-hashrate-recovery', 
        `Detected critical hashrate drop of ${metrics.hashrate_drop}%`);
    }

    // Pool Disconnections Check
    if (metrics.pool_disconnections > thresholds.pool_disconnections.critical) {
      await this.triggerAlert('mining-operations', 'high', 'High Pool Disconnection Rate', 
        `${metrics.pool_disconnections} pool disconnections in the last hour`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('mining-pool-stabilization', 
        `High pool disconnection rate detected: ${metrics.pool_disconnections} disconnections/hour`);
    }

    // Rejected Shares Check
    if (metrics.rejected_shares > thresholds.rejected_shares.critical) {
      await this.triggerAlert('mining-operations', 'high', 'High Share Rejection Rate', 
        `${metrics.rejected_shares}% of shares rejected in the last hour`);
    }
  }

  /**
   * Check bridge operations
   */
  private async checkBridgeOperations(): Promise<void> {
    const metrics = await this.collectBridgeMetrics();
    const thresholds = this.alertThresholds.get('bridge-operations');

    // Transaction Delays Check
    if (metrics.avg_transaction_delay > thresholds.transaction_delays.critical) {
      await this.triggerAlert('bridge-operations', 'critical', 'Critical Bridge Delays', 
        `Average transaction delay: ${metrics.avg_transaction_delay} minutes`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('bridge-transaction-acceleration', 
        `Critical bridge delays detected: ${metrics.avg_transaction_delay} minutes average`);
    }

    // Validator Consensus Check
    if (metrics.validator_consensus < thresholds.validator_consensus.critical) {
      await this.triggerAlert('bridge-operations', 'critical', 'Low Validator Consensus', 
        `Validator consensus at ${metrics.validator_consensus}%`);
    }

    // Bridge Liquidity Check
    if (metrics.bridge_liquidity < thresholds.bridge_liquidity.critical) {
      await this.triggerAlert('bridge-operations', 'critical', 'Low Bridge Liquidity', 
        `Bridge liquidity at $${metrics.bridge_liquidity.toLocaleString()}`);
    }
  }

  /**
   * Check DeFi operations
   */
  private async checkDeFiOperations(): Promise<void> {
    const metrics = await this.collectDeFiMetrics();
    const thresholds = this.alertThresholds.get('dex-operations');

    // Liquidity Shortage Check
    if (metrics.total_liquidity < thresholds.liquidity_shortage.critical) {
      await this.triggerAlert('dex-operations', 'critical', 'Critical Liquidity Shortage', 
        `Total liquidity: $${metrics.total_liquidity.toLocaleString()}`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('liquidity-emergency-rebalancing', 
        `Critical liquidity shortage: $${metrics.total_liquidity.toLocaleString()}`);
    }

    // Price Slippage Check
    if (metrics.avg_slippage > thresholds.price_slippage.critical) {
      await this.triggerAlert('dex-operations', 'high', 'High Price Slippage', 
        `Average slippage: ${metrics.avg_slippage}%`);
    }

    // Trading Volume Drop Check
    if (metrics.volume_drop > thresholds.trading_volume_drop.critical) {
      await this.triggerAlert('dex-operations', 'high', 'Significant Trading Volume Drop', 
        `Trading volume dropped by ${metrics.volume_drop}% in the last 24 hours`);
    }
  }

  /**
   * Check user experience metrics
   */
  private async checkUserExperience(): Promise<void> {
    const metrics = await this.collectUserExperienceMetrics();
    const thresholds = this.alertThresholds.get('user-experience');

    // Page Load Time Check
    if (metrics.avg_page_load_time > thresholds.page_load_time.critical) {
      await this.triggerAlert('user-experience', 'high', 'Slow Page Load Times', 
        `Average page load time: ${metrics.avg_page_load_time}ms`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('performance-optimization', 
        `Slow page load times detected: ${metrics.avg_page_load_time}ms average`);
    }

    // Error Rate Check
    if (metrics.error_rate > thresholds.error_rate.critical) {
      await this.triggerAlert('user-experience', 'critical', 'High Error Rate', 
        `Error rate: ${metrics.error_rate}% of requests`);
    }

    // User Satisfaction Check
    if (metrics.user_satisfaction < thresholds.user_satisfaction.critical) {
      await this.triggerAlert('user-experience', 'high', 'Low User Satisfaction', 
        `User satisfaction score: ${metrics.user_satisfaction}/5.0`);
    }
  }

  /**
   * Check security metrics
   */
  private async checkSecurityMetrics(): Promise<void> {
    const metrics = await this.collectSecurityMetrics();
    const thresholds = this.alertThresholds.get('security');

    // Failed Login Attempts Check
    if (metrics.failed_login_attempts > thresholds.failed_login_attempts.critical) {
      await this.triggerAlert('security', 'critical', 'High Failed Login Attempts', 
        `${metrics.failed_login_attempts} failed login attempts from single IP`);
      
      // Trigger proactive intervention
      await this.triggerProactiveIntervention('security-threat-mitigation', 
        `High failed login attempts detected: ${metrics.failed_login_attempts} attempts`);
    }

    // Suspicious Transactions Check
    if (metrics.suspicious_transactions > thresholds.suspicious_transactions.critical) {
      await this.triggerAlert('security', 'critical', 'Suspicious Transaction Activity', 
        `${metrics.suspicious_transactions} suspicious transactions detected`);
    }

    // API Abuse Check
    if (metrics.api_requests_per_minute > thresholds.api_abuse.critical) {
      await this.triggerAlert('security', 'high', 'Potential API Abuse', 
        `${metrics.api_requests_per_minute} API requests per minute from single source`);
    }
  }

  /**
   * Trigger monitoring alert
   */
  private async triggerAlert(
    type: string, 
    severity: 'low' | 'medium' | 'high' | 'critical', 
    title: string, 
    description: string
  ): Promise<void> {
    const alertId = this.generateAlertId();
    
    const alert: MonitoringAlert = {
      id: alertId,
      type: type as any,
      severity,
      title,
      description,
      affectedSystems: this.identifyAffectedSystems(type),
      detectedAt: new Date(),
      metadata: {
        monitoringSystem: 'ProactiveMonitoringSystem',
        threshold: this.alertThresholds.get(type)
      }
    };

    this.activeAlerts.set(alertId, alert);
    this.emit('alert-triggered', alert);
    
    this.logger.warn(`Alert triggered: ${title} (${severity})`);
    
    // Auto-escalate critical alerts
    if (severity === 'critical') {
      await this.escalateCriticalAlert(alert);
    }
  }

  /**
   * Trigger proactive intervention
   */
  private async triggerProactiveIntervention(
    type: string, 
    description: string
  ): Promise<void> {
    const interventionId = this.generateInterventionId();
    
    const intervention: ProactiveIntervention = {
      id: interventionId,
      type: type as any,
      trigger: 'monitoring-system',
      description,
      automaticActions: this.getAutomaticActions(type),
      userNotification: this.shouldNotifyUser(type),
      preventedIssues: this.getPreventedIssues(type),
      confidence: this.calculateInterventionConfidence(type),
      timestamp: new Date()
    };

    this.interventionHistory.push(intervention);
    this.emit('intervention-triggered', intervention);
    
    this.logger.info(`Proactive intervention triggered: ${type}`);
    
    // Execute automatic actions
    await this.executeAutomaticActions(intervention);
  }

  /**
   * Execute automatic actions for intervention
   */
  private async executeAutomaticActions(intervention: ProactiveIntervention): Promise<void> {
    for (const action of intervention.automaticActions) {
      try {
        await this.executeAction(action, intervention);
      } catch (error) {
        this.logger.error(`Failed to execute automatic action: ${action}`, error);
      }
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: string, intervention: ProactiveIntervention): Promise<void> {
    switch (action) {
      case 'restart-mining-service':
        await this.restartMiningService();
        break;
      case 'rebalance-liquidity':
        await this.rebalanceLiquidity();
        break;
      case 'accelerate-bridge-transactions':
        await this.accelerateBridgeTransactions();
        break;
      case 'optimize-performance':
        await this.optimizePerformance();
        break;
      case 'block-suspicious-ip':
        await this.blockSuspiciousIP();
        break;
      case 'create-support-ticket':
        await this.createProactiveTicket(intervention);
        break;
      default:
        this.logger.warn(`Unknown action: ${action}`);
    }
  }

  /**
   * Restart mining service
   */
  private async restartMiningService(): Promise<void> {
    this.logger.info('Restarting mining service...');
    // Simulate mining service restart
    await new Promise(resolve => setTimeout(resolve, 3000));
    this.logger.info('Mining service restarted successfully');
  }

  /**
   * Rebalance liquidity
   */
  private async rebalanceLiquidity(): Promise<void> {
    this.logger.info('Rebalancing liquidity across pools...');
    // Simulate liquidity rebalancing
    await new Promise(resolve => setTimeout(resolve, 5000));
    this.logger.info('Liquidity rebalanced successfully');
  }

  /**
   * Accelerate bridge transactions
   */
  private async accelerateBridgeTransactions(): Promise<void> {
    this.logger.info('Accelerating bridge transactions...');
    // Simulate bridge transaction acceleration
    await new Promise(resolve => setTimeout(resolve, 4000));
    this.logger.info('Bridge transactions accelerated');
  }

  /**
   * Optimize performance
   */
  private async optimizePerformance(): Promise<void> {
    this.logger.info('Optimizing system performance...');
    // Simulate performance optimization
    await new Promise(resolve => setTimeout(resolve, 6000));
    this.logger.info('Performance optimization completed');
  }

  /**
   * Block suspicious IP
   */
  private async blockSuspiciousIP(): Promise<void> {
    this.logger.info('Blocking suspicious IP addresses...');
    // Simulate IP blocking
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.info('Suspicious IP addresses blocked');
  }

  /**
   * Create proactive support ticket
   */
  private async createProactiveTicket(intervention: ProactiveIntervention): Promise<void> {
    const ticket = await this.technicalSupportEngine.processSupportRequest({
      userId: 'system-proactive',
      title: `Proactive Intervention: ${intervention.type}`,
      description: `Proactive monitoring detected: ${intervention.description}`,
      category: 'Performance',
      severity: 'medium',
      createdAt: new Date()
    });

    this.logger.info(`Proactive support ticket created: ${ticket.id}`);
  }

  /**
   * Start real-time event monitoring
   */
  private startRealTimeMonitoring(): void {
    // Listen for system events
    this.on('user-interaction', (interaction) => {
      this.trackUserInteraction(interaction);
    });

    this.on('system-error', (error) => {
      this.handleSystemError(error);
    });

    this.on('performance-degradation', (metrics) => {
      this.handlePerformanceDegradation(metrics);
    });
  }

  /**
   * Track user interaction
   */
  private trackUserInteraction(interaction: any): void {
    const userId = interaction.userId;
    const touchPoint: TouchPoint = {
      type: interaction.type,
      timestamp: new Date(),
      duration: interaction.duration || 0,
      success: interaction.success,
      details: interaction.details
    };

    if (!this.userExperiences.has(userId)) {
      this.userExperiences.set(userId, {
        userId,
        sessionId: interaction.sessionId,
        touchpoints: [],
        satisfaction: 0,
        completedTasks: 0,
        failedTasks: 0,
        totalTime: 0,
        issuesEncountered: [],
        timestamp: new Date()
      });
    }

    const userExperience = this.userExperiences.get(userId)!;
    userExperience.touchpoints.push(touchPoint);
    userExperience.totalTime += touchPoint.duration;

    if (touchPoint.success) {
      userExperience.completedTasks++;
    } else {
      userExperience.failedTasks++;
      userExperience.issuesEncountered.push(touchPoint.type);
    }

    this.userExperiences.set(userId, userExperience);
  }

  /**
   * Handle system error
   */
  private handleSystemError(error: any): void {
    this.logger.error('System error detected:', error);
    
    // Trigger alert for critical errors
    if (error.severity === 'critical') {
      this.triggerAlert('error', 'critical', 'Critical System Error', error.message);
    }
  }

  /**
   * Handle performance degradation
   */
  private handlePerformanceDegradation(metrics: any): void {
    this.logger.warn('Performance degradation detected:', metrics);
    
    // Trigger proactive intervention
    this.triggerProactiveIntervention('performance-optimization', 
      `Performance degradation detected: ${metrics.metric} at ${metrics.value}`);
  }

  /**
   * Collect system metrics (simulated)
   */
  private async collectSystemMetrics(): Promise<any> {
    // Simulate metric collection
    return {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      disk_usage: Math.random() * 100,
      response_time: Math.random() * 3000 + 500
    };
  }

  /**
   * Collect mining metrics (simulated)
   */
  private async collectMiningMetrics(): Promise<any> {
    return {
      hashrate_drop: Math.random() * 30,
      pool_disconnections: Math.floor(Math.random() * 8),
      rejected_shares: Math.random() * 15,
      difficulty_change: Math.random() * 40 - 20
    };
  }

  /**
   * Collect bridge metrics (simulated)
   */
  private async collectBridgeMetrics(): Promise<any> {
    return {
      avg_transaction_delay: Math.random() * 90,
      validator_consensus: Math.random() * 30 + 70,
      bridge_liquidity: Math.random() * 1000000 + 100000,
      failed_transactions: Math.random() * 8
    };
  }

  /**
   * Collect DeFi metrics (simulated)
   */
  private async collectDeFiMetrics(): Promise<any> {
    return {
      total_liquidity: Math.random() * 500000 + 50000,
      avg_slippage: Math.random() * 8,
      volume_drop: Math.random() * 60,
      yield_rates: Math.random() * 10 + 2
    };
  }

  /**
   * Collect user experience metrics (simulated)
   */
  private async collectUserExperienceMetrics(): Promise<any> {
    return {
      avg_page_load_time: Math.random() * 4000 + 1000,
      error_rate: Math.random() * 10,
      user_satisfaction: Math.random() * 2 + 3,
      support_tickets_per_hour: Math.floor(Math.random() * 150)
    };
  }

  /**
   * Collect security metrics (simulated)
   */
  private async collectSecurityMetrics(): Promise<any> {
    return {
      failed_login_attempts: Math.floor(Math.random() * 30),
      suspicious_transactions: Math.floor(Math.random() * 15),
      api_requests_per_minute: Math.floor(Math.random() * 3000),
      wallet_balance_changes: Math.random() * 100000
    };
  }

  /**
   * Process triggered alerts
   */
  private async processTriggeredAlerts(): Promise<void> {
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (!alert.resolvedAt) {
        // Check if alert condition is still active
        const isStillActive = await this.isAlertStillActive(alert);
        
        if (!isStillActive) {
          alert.resolvedAt = new Date();
          alert.resolution = 'Condition normalized automatically';
          this.activeAlerts.set(alertId, alert);
          this.emit('alert-resolved', alert);
        }
      }
    }
  }

  /**
   * Check if alert condition is still active
   */
  private async isAlertStillActive(alert: MonitoringAlert): Promise<boolean> {
    // Simulate alert condition checking
    return Math.random() > 0.7; // 30% chance alert is resolved
  }

  /**
   * Escalate critical alert
   */
  private async escalateCriticalAlert(alert: MonitoringAlert): Promise<void> {
    this.logger.error(`Escalating critical alert: ${alert.title}`);
    
    // Create high-priority support ticket
    await this.technicalSupportEngine.processSupportRequest({
      userId: 'system-critical',
      title: `CRITICAL ALERT: ${alert.title}`,
      description: `Critical system alert: ${alert.description}`,
      category: 'Performance',
      severity: 'critical',
      createdAt: new Date()
    });
  }

  /**
   * Helper methods
   */
  private generateAlertId(): string {
    return `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInterventionId(): string {
    return `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private identifyAffectedSystems(type: string): string[] {
    const systemMap: { [key: string]: string[] } = {
      'system-performance': ['web-server', 'database', 'cache'],
      'mining-operations': ['mining-pool', 'stratum-server', 'payout-system'],
      'bridge-operations': ['bridge-validators', 'oracle-network', 'custody-contracts'],
      'dex-operations': ['amm-contracts', 'liquidity-pools', 'trading-engine'],
      'user-experience': ['web-interface', 'mobile-app', 'api-gateway'],
      'security': ['authentication-system', 'firewall', 'monitoring-system']
    };
    
    return systemMap[type] || ['unknown'];
  }

  private getAutomaticActions(type: string): string[] {
    const actionMap: { [key: string]: string[] } = {
      'mining-hashrate-recovery': ['restart-mining-service', 'create-support-ticket'],
      'mining-pool-stabilization': ['restart-mining-service', 'check-network-connectivity'],
      'bridge-transaction-acceleration': ['accelerate-bridge-transactions', 'notify-validators'],
      'liquidity-emergency-rebalancing': ['rebalance-liquidity', 'notify-liquidity-providers'],
      'performance-optimization': ['optimize-performance', 'scale-resources'],
      'security-threat-mitigation': ['block-suspicious-ip', 'notify-security-team']
    };
    
    return actionMap[type] || ['create-support-ticket'];
  }

  private shouldNotifyUser(type: string): boolean {
    const notificationTypes = [
      'performance-optimization',
      'security-threat-mitigation',
      'liquidity-emergency-rebalancing'
    ];
    
    return notificationTypes.includes(type);
  }

  private getPreventedIssues(type: string): string[] {
    const preventionMap: { [key: string]: string[] } = {
      'mining-hashrate-recovery': ['mining-pool-outage', 'revenue-loss'],
      'bridge-transaction-acceleration': ['transaction-timeout', 'user-frustration'],
      'liquidity-emergency-rebalancing': ['price-slippage', 'trading-failures'],
      'performance-optimization': ['system-downtime', 'user-experience-degradation'],
      'security-threat-mitigation': ['data-breach', 'unauthorized-access']
    };
    
    return preventionMap[type] || ['system-issues'];
  }

  private calculateInterventionConfidence(type: string): number {
    const confidenceMap: { [key: string]: number } = {
      'mining-hashrate-recovery': 0.85,
      'bridge-transaction-acceleration': 0.78,
      'liquidity-emergency-rebalancing': 0.82,
      'performance-optimization': 0.90,
      'security-threat-mitigation': 0.95
    };
    
    return confidenceMap[type] || 0.75;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): any {
    return {
      activeAlerts: this.activeAlerts.size,
      totalInterventions: this.interventionHistory.length,
      recentInterventions: this.interventionHistory.slice(-10),
      alertsByType: this.getAlertsByType(),
      interventionsByType: this.getInterventionsByType(),
      systemHealth: this.calculateSystemHealth(),
      userExperienceScore: this.calculateUserExperienceScore()
    };
  }

  private getAlertsByType(): any {
    const types: any = {};
    this.activeAlerts.forEach(alert => {
      types[alert.type] = (types[alert.type] || 0) + 1;
    });
    return types;
  }

  private getInterventionsByType(): any {
    const types: any = {};
    this.interventionHistory.forEach(intervention => {
      types[intervention.type] = (types[intervention.type] || 0) + 1;
    });
    return types;
  }

  private calculateSystemHealth(): number {
    const totalAlerts = this.activeAlerts.size;
    const criticalAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical').length;
    
    return Math.max(0, 100 - (criticalAlerts * 20) - (totalAlerts * 5));
  }

  private calculateUserExperienceScore(): number {
    const experiences = Array.from(this.userExperiences.values());
    if (experiences.length === 0) return 100;
    
    const totalSatisfaction = experiences.reduce((sum, exp) => sum + exp.satisfaction, 0);
    return (totalSatisfaction / experiences.length) * 20; // Convert to 0-100 scale
  }
}

export default ProactiveMonitoringSystem;