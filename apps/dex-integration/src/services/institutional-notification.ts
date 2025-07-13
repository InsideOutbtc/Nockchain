// Institutional notification and alert service for enterprise clients

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface NotificationConfig {
  // Core notification settings
  enableNotifications: boolean;
  enableRealTimeAlerts: boolean;
  enableDigestReports: boolean;
  enableEscalation: boolean;
  
  // Delivery channels
  channels: {
    email: EmailChannelConfig;
    sms: SMSChannelConfig;
    webhook: WebhookChannelConfig;
    slack: SlackChannelConfig;
    teams: TeamsChannelConfig;
    phone: PhoneChannelConfig;
  };
  
  // Alert classification
  alertTypes: AlertTypeConfig[];
  
  // Escalation rules
  escalationRules: EscalationRule[];
  
  // Rate limiting and batching
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerMinute: number;
    maxAlertsPerHour: number;
    batchingEnabled: boolean;
    batchWindow: number; // seconds
    maxBatchSize: number;
  };
  
  // Template management
  templates: NotificationTemplate[];
}

export interface EmailChannelConfig {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  username: string;
  enableTLS: boolean;
  fromAddress: string;
  replyToAddress: string;
  enableSignature: boolean;
  signatureTemplate: string;
}

export interface SMSChannelConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws_sns' | 'messagebird' | 'custom';
  apiKey: string;
  fromNumber: string;
  enableDeliveryReceipts: boolean;
}

export interface WebhookChannelConfig {
  enabled: boolean;
  endpoints: WebhookEndpoint[];
  enableRetries: boolean;
  maxRetries: number;
  retryBackoff: 'linear' | 'exponential';
  timeout: number; // seconds
}

export interface SlackChannelConfig {
  enabled: boolean;
  webhookUrl: string;
  defaultChannel: string;
  enableThreading: boolean;
  enableMentions: boolean;
  botToken?: string;
}

export interface TeamsChannelConfig {
  enabled: boolean;
  webhookUrl: string;
  enableCards: boolean;
  enableButtons: boolean;
}

export interface PhoneChannelConfig {
  enabled: boolean;
  provider: 'twilio' | 'aws_connect' | 'custom';
  apiKey: string;
  enableVoiceAlerts: boolean;
  voiceMessage: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  enableAuthentication: boolean;
  authType: 'bearer' | 'basic' | 'hmac' | 'custom';
  authCredentials: Record<string, string>;
}

export interface AlertTypeConfig {
  type: InstitutionalAlertType;
  severity: AlertSeverity;
  enabled: boolean;
  channels: string[];
  template: string;
  cooldownPeriod: number; // seconds
  requiresAcknowledgment: boolean;
}

export interface EscalationRule {
  id: string;
  trigger: {
    alertType: InstitutionalAlertType;
    severity: AlertSeverity;
    unacknowledgedDuration: number; // minutes
    consecutiveAlerts: number;
  };
  escalationLevels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  delay: number; // minutes
  channels: string[];
  recipients: string[];
  template: string;
  requiresResponse: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams' | 'phone';
  subject?: string;
  body: string;
  variables: string[];
  formatting: 'text' | 'html' | 'markdown' | 'json';
}

export type InstitutionalAlertType = 
  | 'custody_breach'
  | 'large_withdrawal'
  | 'failed_transaction'
  | 'api_rate_limit'
  | 'compliance_violation'
  | 'system_downtime'
  | 'performance_degradation'
  | 'security_incident'
  | 'vault_health'
  | 'bridge_status'
  | 'liquidity_warning'
  | 'price_movement'
  | 'settlement_delay'
  | 'regulatory_update';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical' | 'emergency';

export interface InstitutionalAlert {
  id: string;
  timestamp: number;
  type: InstitutionalAlertType;
  severity: AlertSeverity;
  
  // Alert details
  title: string;
  description: string;
  details: Record<string, any>;
  
  // Client context
  clientId: string;
  organizationId: string;
  accountId?: string;
  
  // Alert metadata
  source: string;
  category: string;
  tags: string[];
  
  // Handling status
  status: 'pending' | 'acknowledged' | 'escalated' | 'resolved' | 'dismissed';
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  
  // Delivery tracking
  deliveryAttempts: DeliveryAttempt[];
  deliveryStatus: Record<string, 'pending' | 'sent' | 'delivered' | 'failed'>;
  
  // Business impact
  impact: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedSystems: string[];
    estimatedDowntime?: number;
    financialImpact?: BN;
  };
}

export interface DeliveryAttempt {
  timestamp: number;
  channel: string;
  recipient: string;
  status: 'success' | 'failure' | 'retry';
  error?: string;
  deliveryTime?: number;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  type: 'individual' | 'group' | 'role';
  
  // Contact information
  email?: string;
  phone?: string;
  slackUserId?: string;
  teamsUserId?: string;
  
  // Preferences
  preferences: {
    channels: string[];
    alertTypes: InstitutionalAlertType[];
    severityLevels: AlertSeverity[];
    quietHours: QuietHours;
    timezone: string;
  };
  
  // Role-based settings
  role: 'admin' | 'operator' | 'compliance' | 'security' | 'executive';
  permissions: string[];
  
  // Status
  active: boolean;
  lastContactAttempt?: number;
  deliveryFailures: number;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  timezone: string;
  allowEmergency: boolean;
  allowedSeverities: AlertSeverity[];
}

export interface NotificationMetrics {
  // Delivery metrics
  totalNotificationsSent: number;
  successRate: number;
  averageDeliveryTime: number;
  
  // Channel performance
  channelMetrics: Record<string, {
    sent: number;
    delivered: number;
    failed: number;
    averageDeliveryTime: number;
  }>;
  
  // Alert metrics
  alertsByType: Record<InstitutionalAlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  escalationRate: number;
  acknowledgeRate: number;
  averageResponseTime: number;
  
  // System metrics
  systemUptime: number;
  queueDepth: number;
  processingLatency: number;
}

export class InstitutionalNotificationService {
  private config: NotificationConfig;
  private connection: Connection;
  private logger: Logger;
  private recipients: Map<string, NotificationRecipient> = new Map();
  private activeAlerts: Map<string, InstitutionalAlert> = new Map();
  private alertQueue: InstitutionalAlert[] = [];
  private deliveryQueue: { alert: InstitutionalAlert; channel: string; recipient: string }[] = [];
  private metrics: NotificationMetrics;
  private isRunning: boolean = false;

  constructor(config: NotificationConfig, connection: Connection) {
    this.config = config;
    this.connection = connection;
    this.logger = new Logger('InstitutionalNotificationService');
    this.initializeMetrics();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Notification service is already running');
    }

    this.logger.info('Starting institutional notification service');
    this.isRunning = true;

    // Start processing queues
    this.startQueueProcessing();
    
    this.logger.info('Institutional notification service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping institutional notification service');
    this.isRunning = false;
    
    // Process remaining items in queue
    await this.flushQueues();
    
    this.logger.info('Institutional notification service stopped');
  }

  async sendAlert(alert: Partial<InstitutionalAlert>): Promise<string> {
    const fullAlert: InstitutionalAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      status: 'pending',
      deliveryAttempts: [],
      deliveryStatus: {},
      impact: {
        severity: 'low',
        affectedSystems: []
      },
      ...alert
    } as InstitutionalAlert;

    // Apply rate limiting
    if (this.config.rateLimiting.enabled && !this.checkRateLimit(fullAlert)) {
      throw new Error('Rate limit exceeded for alert type');
    }

    // Store alert
    this.activeAlerts.set(fullAlert.id, fullAlert);

    // Determine recipients and channels
    const recipients = await this.getRecipientsForAlert(fullAlert);
    const channels = this.getChannelsForAlert(fullAlert);

    // Queue delivery
    for (const recipient of recipients) {
      for (const channel of channels) {
        if (this.shouldDeliverToRecipient(fullAlert, recipient, channel)) {
          this.deliveryQueue.push({ alert: fullAlert, channel, recipient: recipient.id });
        }
      }
    }

    this.logger.info(`Alert ${fullAlert.id} queued for delivery`, {
      type: fullAlert.type,
      severity: fullAlert.severity,
      recipients: recipients.length,
      channels: channels.length
    });

    return fullAlert.id;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;

    this.logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.resolvedBy = resolvedBy;

    this.logger.info(`Alert ${alertId} resolved by ${resolvedBy}`);
  }

  async getActiveAlerts(clientId?: string): Promise<InstitutionalAlert[]> {
    const alerts = Array.from(this.activeAlerts.values());
    
    if (clientId) {
      return alerts.filter(alert => alert.clientId === clientId);
    }
    
    return alerts;
  }

  async getMetrics(): Promise<NotificationMetrics> {
    return { ...this.metrics };
  }

  private async startQueueProcessing(): Promise<void> {
    // Process delivery queue
    setInterval(async () => {
      if (this.deliveryQueue.length > 0) {
        await this.processDeliveryQueue();
      }
    }, 1000);

    // Check for escalations
    setInterval(async () => {
      await this.checkEscalations();
    }, 30000);

    // Update metrics
    setInterval(async () => {
      await this.updateMetrics();
    }, 60000);
  }

  private async processDeliveryQueue(): Promise<void> {
    const batchSize = Math.min(this.deliveryQueue.length, 10);
    const batch = this.deliveryQueue.splice(0, batchSize);

    for (const delivery of batch) {
      try {
        await this.deliverAlert(delivery.alert, delivery.channel, delivery.recipient);
      } catch (error) {
        this.logger.error(`Failed to deliver alert ${delivery.alert.id}`, error);
      }
    }
  }

  private async deliverAlert(alert: InstitutionalAlert, channel: string, recipientId: string): Promise<void> {
    const recipient = this.recipients.get(recipientId);
    if (!recipient) {
      throw new Error(`Recipient ${recipientId} not found`);
    }

    const deliveryAttempt: DeliveryAttempt = {
      timestamp: Date.now(),
      channel,
      recipient: recipientId,
      status: 'success'
    };

    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, recipient);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, recipient);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, recipient);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, recipient);
          break;
        case 'teams':
          await this.sendTeamsAlert(alert, recipient);
          break;
        case 'phone':
          await this.sendPhoneAlert(alert, recipient);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      alert.deliveryStatus[`${channel}:${recipientId}`] = 'delivered';
      this.metrics.totalNotificationsSent++;
      
    } catch (error) {
      deliveryAttempt.status = 'failure';
      deliveryAttempt.error = error.message;
      alert.deliveryStatus[`${channel}:${recipientId}`] = 'failed';
    }

    alert.deliveryAttempts.push(deliveryAttempt);
  }

  private async sendEmailAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // Email delivery implementation
    this.logger.info(`Sending email alert to ${recipient.email}`);
  }

  private async sendSMSAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // SMS delivery implementation
    this.logger.info(`Sending SMS alert to ${recipient.phone}`);
  }

  private async sendWebhookAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // Webhook delivery implementation
    this.logger.info(`Sending webhook alert for ${alert.id}`);
  }

  private async sendSlackAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // Slack delivery implementation
    this.logger.info(`Sending Slack alert to ${recipient.slackUserId}`);
  }

  private async sendTeamsAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // Teams delivery implementation
    this.logger.info(`Sending Teams alert to ${recipient.teamsUserId}`);
  }

  private async sendPhoneAlert(alert: InstitutionalAlert, recipient: NotificationRecipient): Promise<void> {
    // Phone delivery implementation
    this.logger.info(`Sending phone alert to ${recipient.phone}`);
  }

  private async getRecipientsForAlert(alert: InstitutionalAlert): Promise<NotificationRecipient[]> {
    // Get recipients based on alert type, severity, and client context
    return Array.from(this.recipients.values()).filter(recipient => {
      return recipient.active &&
             recipient.preferences.alertTypes.includes(alert.type) &&
             recipient.preferences.severityLevels.includes(alert.severity);
    });
  }

  private getChannelsForAlert(alert: InstitutionalAlert): string[] {
    const alertConfig = this.config.alertTypes.find(config => config.type === alert.type);
    return alertConfig ? alertConfig.channels : [];
  }

  private shouldDeliverToRecipient(alert: InstitutionalAlert, recipient: NotificationRecipient, channel: string): boolean {
    // Check quiet hours
    if (recipient.preferences.quietHours.enabled && !this.isEmergency(alert)) {
      const now = new Date();
      const quietStart = this.parseTime(recipient.preferences.quietHours.startTime);
      const quietEnd = this.parseTime(recipient.preferences.quietHours.endTime);
      
      if (this.isInQuietHours(now, quietStart, quietEnd)) {
        return false;
      }
    }

    return recipient.preferences.channels.includes(channel);
  }

  private checkRateLimit(alert: InstitutionalAlert): boolean {
    // Rate limiting logic
    return true; // Simplified for now
  }

  private async checkEscalations(): Promise<void> {
    // Check for alerts that need escalation
    for (const alert of this.activeAlerts.values()) {
      if (alert.status === 'pending') {
        await this.checkAlertEscalation(alert);
      }
    }
  }

  private async checkAlertEscalation(alert: InstitutionalAlert): Promise<void> {
    const escalationRule = this.config.escalationRules.find(rule => 
      rule.trigger.alertType === alert.type && 
      rule.trigger.severity === alert.severity
    );

    if (!escalationRule) {
      return;
    }

    const alertAge = Date.now() - alert.timestamp;
    const escalationThreshold = escalationRule.trigger.unacknowledgedDuration * 60 * 1000;

    if (alertAge > escalationThreshold) {
      await this.escalateAlert(alert, escalationRule);
    }
  }

  private async escalateAlert(alert: InstitutionalAlert, rule: EscalationRule): Promise<void> {
    alert.status = 'escalated';
    
    this.logger.warn(`Escalating alert ${alert.id}`, {
      type: alert.type,
      severity: alert.severity,
      age: Date.now() - alert.timestamp
    });

    // Send escalation notifications
    for (const level of rule.escalationLevels) {
      setTimeout(async () => {
        await this.sendEscalationNotification(alert, level);
      }, level.delay * 60 * 1000);
    }
  }

  private async sendEscalationNotification(alert: InstitutionalAlert, level: EscalationLevel): Promise<void> {
    this.logger.info(`Sending escalation level ${level.level} for alert ${alert.id}`);
    // Escalation notification logic
  }

  private async flushQueues(): Promise<void> {
    while (this.deliveryQueue.length > 0) {
      await this.processDeliveryQueue();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async updateMetrics(): Promise<void> {
    // Update notification metrics
    this.metrics.queueDepth = this.deliveryQueue.length;
    
    // Calculate success rate
    const totalDeliveries = this.metrics.totalNotificationsSent;
    if (totalDeliveries > 0) {
      this.metrics.successRate = this.calculateSuccessRate();
    }
  }

  private calculateSuccessRate(): number {
    // Calculate success rate from delivery attempts
    let successful = 0;
    let total = 0;

    for (const alert of this.activeAlerts.values()) {
      for (const attempt of alert.deliveryAttempts) {
        total++;
        if (attempt.status === 'success') {
          successful++;
        }
      }
    }

    return total > 0 ? (successful / total) * 100 : 0;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalNotificationsSent: 0,
      successRate: 0,
      averageDeliveryTime: 0,
      channelMetrics: {},
      alertsByType: {} as Record<InstitutionalAlertType, number>,
      alertsBySeverity: {} as Record<AlertSeverity, number>,
      escalationRate: 0,
      acknowledgeRate: 0,
      averageResponseTime: 0,
      systemUptime: 0,
      queueDepth: 0,
      processingLatency: 0
    };
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  private isInQuietHours(now: Date, start: { hours: number; minutes: number }, end: { hours: number; minutes: number }): boolean {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  private isEmergency(alert: InstitutionalAlert): boolean {
    return alert.severity === 'emergency' || alert.severity === 'critical';
  }
}