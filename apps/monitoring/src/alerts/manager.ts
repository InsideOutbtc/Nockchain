// Intelligent alert management system with configurable thresholds
// Supports multiple notification channels and alert correlation

import { EventEmitter } from 'events'
import { createClient } from 'redis'
import { Logger } from '../utils/logger'
import { NotificationService } from '../notifications/service'

const logger = Logger.getInstance()

export interface Alert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  category: 'pool' | 'system' | 'security' | 'business'
  timestamp: number
  status: 'active' | 'resolved' | 'acknowledged'
  source: string
  metadata: Record<string, any>
  acknowledgedBy?: string
  acknowledgedAt?: number
  resolvedAt?: number
}

export interface AlertRule {
  id: string
  name: string
  description: string
  category: string
  severity: 'critical' | 'warning' | 'info'
  enabled: boolean
  conditions: AlertCondition[]
  cooldownPeriod: number // seconds
  notificationChannels: string[]
}

export interface AlertCondition {
  metric: string
  operator: '>' | '<' | '>=' | '<=' | '==' | '!='
  threshold: number
  duration: number // seconds - how long condition must persist
}

export class AlertManager extends EventEmitter {
  private redisClient: any
  private isRunning = false
  private evaluationInterval: NodeJS.Timeout | null = null
  private notificationService: NotificationService | null = null

  private activeAlerts = new Map<string, Alert>()
  private alertRules = new Map<string, AlertRule>()
  private alertHistory: Alert[] = []
  private lastAlertTimes = new Map<string, number>()

  constructor() {
    super()
    this.setupDefaultRules()
  }

  public async start() {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('Starting alert manager...')

    // Setup Redis connection
    await this.setupRedisClient()

    // Load existing alerts and rules
    await this.loadAlertsFromStorage()
    await this.loadRulesFromStorage()

    // Start alert evaluation loop
    this.evaluationInterval = setInterval(async () => {
      await this.evaluateAlerts()
    }, 30000) // Evaluate every 30 seconds

    logger.info('Alert manager started')
  }

  public async stop() {
    this.isRunning = false

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }

    if (this.redisClient) {
      await this.redisClient.quit()
    }

    logger.info('Alert manager stopped')
  }

  private async setupRedisClient() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      })

      this.redisClient.on('error', (error: any) => {
        logger.error('Redis connection error in alert manager', error)
      })

      await this.redisClient.connect()
      logger.info('Alert manager connected to Redis')
    } catch (error) {
      logger.error('Failed to connect to Redis in alert manager', error)
      throw error
    }
  }

  private setupDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu_usage',
        name: 'High CPU Usage',
        description: 'CPU usage is above 80% for more than 5 minutes',
        category: 'system',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'system_cpu_usage_percentage',
            operator: '>',
            threshold: 80,
            duration: 300
          }
        ],
        cooldownPeriod: 900, // 15 minutes
        notificationChannels: ['email', 'webhook']
      },
      {
        id: 'critical_cpu_usage',
        name: 'Critical CPU Usage',
        description: 'CPU usage is above 95% for more than 2 minutes',
        category: 'system',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            metric: 'system_cpu_usage_percentage',
            operator: '>',
            threshold: 95,
            duration: 120
          }
        ],
        cooldownPeriod: 600, // 10 minutes
        notificationChannels: ['email', 'webhook', 'slack']
      },
      {
        id: 'low_hashrate',
        name: 'Low Pool Hashrate',
        description: 'Pool hashrate has dropped below threshold',
        category: 'pool',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'pool_hashrate_total',
            operator: '<',
            threshold: 1000000, // 1 MH/s
            duration: 300
          }
        ],
        cooldownPeriod: 600,
        notificationChannels: ['email', 'webhook']
      },
      {
        id: 'no_active_miners',
        name: 'No Active Miners',
        description: 'No miners are currently active',
        category: 'pool',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            metric: 'active_miners_total',
            operator: '<=',
            threshold: 0,
            duration: 180
          }
        ],
        cooldownPeriod: 300,
        notificationChannels: ['email', 'webhook', 'slack']
      },
      {
        id: 'low_pool_efficiency',
        name: 'Low Pool Efficiency',
        description: 'Pool efficiency has dropped below 90%',
        category: 'pool',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'pool_efficiency_percentage',
            operator: '<',
            threshold: 90,
            duration: 600
          }
        ],
        cooldownPeriod: 1800,
        notificationChannels: ['email']
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        description: 'Memory usage is above 85%',
        category: 'system',
        severity: 'warning',
        enabled: true,
        conditions: [
          {
            metric: 'system_memory_usage_percentage',
            operator: '>',
            threshold: 85,
            duration: 300
          }
        ],
        cooldownPeriod: 900,
        notificationChannels: ['email', 'webhook']
      },
      {
        id: 'failed_payouts',
        name: 'Failed Payouts Detected',
        description: 'Multiple payout failures detected',
        category: 'business',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            metric: 'failed_payouts_count',
            operator: '>=',
            threshold: 3,
            duration: 600
          }
        ],
        cooldownPeriod: 1800,
        notificationChannels: ['email', 'webhook', 'slack']
      }
    ]

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule)
    })
  }

  public async evaluateAlerts() {
    try {
      // Get current metrics
      const metricsData = await this.redisClient.get('pool:metrics')
      const systemData = await this.redisClient.get('system:metrics')

      if (!metricsData && !systemData) {
        return // No data to evaluate
      }

      const poolMetrics = metricsData ? JSON.parse(metricsData) : {}
      const systemMetrics = systemData ? JSON.parse(systemData) : {}

      // Combine all metrics
      const allMetrics = {
        ...poolMetrics,
        ...systemMetrics,
        timestamp: Date.now()
      }

      // Evaluate each rule
      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue

        await this.evaluateRule(rule, allMetrics)
      }

    } catch (error) {
      logger.error('Error evaluating alerts', error)
    }
  }

  private async evaluateRule(rule: AlertRule, metrics: any) {
    try {
      // Check if rule is in cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0
      const now = Date.now()
      
      if (now - lastAlertTime < rule.cooldownPeriod * 1000) {
        return // Still in cooldown
      }

      // Evaluate all conditions
      let allConditionsMet = true
      
      for (const condition of rule.conditions) {
        const metricValue = this.getMetricValue(metrics, condition.metric)
        
        if (metricValue === null || metricValue === undefined) {
          allConditionsMet = false
          break
        }

        const conditionMet = this.evaluateCondition(metricValue, condition)
        
        if (!conditionMet) {
          allConditionsMet = false
          break
        }
      }

      // If all conditions are met, create alert
      if (allConditionsMet) {
        await this.createAlert(rule, metrics)
        this.lastAlertTimes.set(rule.id, now)
      }

    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}`, error)
    }
  }

  private getMetricValue(metrics: any, metricPath: string): number | null {
    // Handle nested metric paths like 'system.cpu_usage'
    const parts = metricPath.split('.')
    let value = metrics

    for (const part of parts) {
      value = value?.[part]
      if (value === undefined || value === null) {
        return null
      }
    }

    return typeof value === 'number' ? value : null
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold
      case '<':
        return value < condition.threshold
      case '>=':
        return value >= condition.threshold
      case '<=':
        return value <= condition.threshold
      case '==':
        return value === condition.threshold
      case '!=':
        return value !== condition.threshold
      default:
        return false
    }
  }

  private async createAlert(rule: AlertRule, metrics: any) {
    const alertId = `${rule.id}_${Date.now()}`
    
    const alert: Alert = {
      id: alertId,
      title: rule.name,
      description: this.generateAlertDescription(rule, metrics),
      severity: rule.severity,
      category: rule.category as any,
      timestamp: Date.now(),
      status: 'active',
      source: 'alert_manager',
      metadata: {
        ruleId: rule.id,
        conditions: rule.conditions,
        metrics: metrics
      }
    }

    // Store alert
    this.activeAlerts.set(alertId, alert)
    this.alertHistory.push(alert)

    // Persist to Redis
    await this.saveAlertToStorage(alert)

    // Send notifications
    await this.sendNotifications(alert, rule.notificationChannels)

    // Emit event
    this.emit('alert_created', alert)

    logger.warn(`Alert created: ${alert.title}`, {
      id: alertId,
      severity: alert.severity,
      category: alert.category
    })
  }

  private generateAlertDescription(rule: AlertRule, metrics: any): string {
    let description = rule.description

    // Add current metric values to description
    for (const condition of rule.conditions) {
      const value = this.getMetricValue(metrics, condition.metric)
      if (value !== null) {
        description += ` Current value: ${value}`
      }
    }

    return description
  }

  private async sendNotifications(alert: Alert, channels: string[]) {
    if (!this.notificationService) {
      this.notificationService = new NotificationService()
    }

    for (const channel of channels) {
      try {
        await this.notificationService.sendAlert(alert, channel)
      } catch (error) {
        logger.error(`Failed to send alert via ${channel}`, error)
      }
    }
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    
    if (!alert) {
      return false
    }

    alert.status = 'acknowledged'
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = Date.now()

    await this.saveAlertToStorage(alert)
    this.emit('alert_acknowledged', alert)

    logger.info(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`)
    return true
  }

  public async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId)
    
    if (!alert) {
      return false
    }

    alert.status = 'resolved'
    alert.resolvedAt = Date.now()

    this.activeAlerts.delete(alertId)
    await this.saveAlertToStorage(alert)
    this.emit('alert_resolved', alert)

    logger.info(`Alert resolved: ${alertId}`)
    return true
  }

  public async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
  }

  public async getAlertHistory(limit = 100): Promise<Alert[]> {
    return this.alertHistory.slice(-limit)
  }

  public async processWebhook(data: any): Promise<void> {
    // Process external webhook alerts (e.g., from Grafana, Prometheus)
    logger.info('Processing webhook alert', data)

    const alert: Alert = {
      id: `webhook_${Date.now()}`,
      title: data.title || 'External Alert',
      description: data.description || 'Alert received via webhook',
      severity: data.severity || 'warning',
      category: 'external' as any,
      timestamp: Date.now(),
      status: 'active',
      source: 'webhook',
      metadata: data
    }

    this.activeAlerts.set(alert.id, alert)
    await this.saveAlertToStorage(alert)
    this.emit('alert_created', alert)
  }

  private async saveAlertToStorage(alert: Alert) {
    try {
      await this.redisClient.setEx(
        `alert:${alert.id}`,
        86400, // 24 hours
        JSON.stringify(alert)
      )
    } catch (error) {
      logger.error('Failed to save alert to storage', error)
    }
  }

  private async loadAlertsFromStorage() {
    try {
      const keys = await this.redisClient.keys('alert:*')
      
      for (const key of keys) {
        const alertData = await this.redisClient.get(key)
        if (alertData) {
          const alert: Alert = JSON.parse(alertData)
          if (alert.status === 'active') {
            this.activeAlerts.set(alert.id, alert)
          }
          this.alertHistory.push(alert)
        }
      }

      logger.info(`Loaded ${this.activeAlerts.size} active alerts from storage`)
    } catch (error) {
      logger.error('Failed to load alerts from storage', error)
    }
  }

  private async loadRulesFromStorage() {
    // In a production system, rules would be loaded from a database
    // For now, we use the default rules
    logger.info(`Loaded ${this.alertRules.size} alert rules`)
  }

  public async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values())
  }

  public async updateAlertRule(rule: AlertRule): Promise<void> {
    this.alertRules.set(rule.id, rule)
    // In production, save to database
    logger.info(`Updated alert rule: ${rule.id}`)
  }
}