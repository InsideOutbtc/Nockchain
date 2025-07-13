// Multi-channel notification service for alerts and system events
// Supports email, Slack, Discord, webhooks, and SMS notifications

import nodemailer from 'nodemailer'
import axios from 'axios'
import { Logger } from '../utils/logger'
import { Alert } from '../alerts/manager'

const logger = Logger.getInstance()

export interface NotificationChannel {
  type: 'email' | 'slack' | 'discord' | 'webhook' | 'sms'
  name: string
  enabled: boolean
  config: Record<string, any>
  severityFilter?: ('critical' | 'warning' | 'info')[]
}

export interface NotificationTemplate {
  subject: string
  body: string
  format: 'text' | 'html' | 'markdown'
}

export class NotificationService {
  private emailTransporter: any
  private channels = new Map<string, NotificationChannel>()
  private isRunning = false

  public async start() {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('Starting notification service...')

    await this.setupEmailTransporter()
    this.setupDefaultChannels()

    logger.info('Notification service started')
  }

  public async stop() {
    this.isRunning = false
    logger.info('Notification service stopped')
  }

  private async setupEmailTransporter() {
    try {
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      }

      this.emailTransporter = nodemailer.createTransporter(emailConfig)

      // Verify email configuration
      if (process.env.SMTP_USER) {
        await this.emailTransporter.verify()
        logger.info('Email transporter configured successfully')
      }
    } catch (error) {
      logger.warn('Failed to setup email transporter', error)
    }
  }

  private setupDefaultChannels() {
    // Email channel
    if (process.env.ALERT_EMAIL_TO) {
      this.channels.set('email', {
        type: 'email',
        name: 'Email Alerts',
        enabled: true,
        config: {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.ALERT_EMAIL_TO.split(','),
          cc: process.env.ALERT_EMAIL_CC?.split(',') || []
        },
        severityFilter: ['critical', 'warning']
      })
    }

    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.set('slack', {
        type: 'slack',
        name: 'Slack Alerts',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'Nockchain Monitor',
          iconEmoji: ':warning:'
        },
        severityFilter: ['critical', 'warning']
      })
    }

    // Discord channel
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.channels.set('discord', {
        type: 'discord',
        name: 'Discord Alerts',
        enabled: true,
        config: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          username: 'Nockchain Monitor',
          avatarUrl: process.env.DISCORD_AVATAR_URL
        },
        severityFilter: ['critical', 'warning']
      })
    }

    // Custom webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        name: 'Custom Webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: process.env.ALERT_WEBHOOK_METHOD || 'POST',
          headers: process.env.ALERT_WEBHOOK_HEADERS ? 
            JSON.parse(process.env.ALERT_WEBHOOK_HEADERS) : 
            { 'Content-Type': 'application/json' }
        }
      })
    }

    logger.info(`Configured ${this.channels.size} notification channels`)
  }

  public async sendAlert(alert: Alert, channelName: string) {
    const channel = this.channels.get(channelName)
    
    if (!channel || !channel.enabled) {
      logger.warn(`Channel ${channelName} not found or disabled`)
      return
    }

    // Check severity filter
    if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
      return // Alert severity not configured for this channel
    }

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(alert, channel)
          break
        case 'slack':
          await this.sendSlackAlert(alert, channel)
          break
        case 'discord':
          await this.sendDiscordAlert(alert, channel)
          break
        case 'webhook':
          await this.sendWebhookAlert(alert, channel)
          break
        default:
          logger.warn(`Unsupported channel type: ${channel.type}`)
      }

      logger.info(`Alert sent via ${channel.name}: ${alert.title}`)
    } catch (error) {
      logger.error(`Failed to send alert via ${channel.name}`, error)
      throw error
    }
  }

  private async sendEmailAlert(alert: Alert, channel: NotificationChannel) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured')
    }

    const template = this.generateEmailTemplate(alert)
    
    const mailOptions = {
      from: channel.config.from,
      to: channel.config.to,
      cc: channel.config.cc,
      subject: template.subject,
      html: template.body
    }

    await this.emailTransporter.sendMail(mailOptions)
  }

  private async sendSlackAlert(alert: Alert, channel: NotificationChannel) {
    const color = this.getSeverityColor(alert.severity)
    
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      attachments: [
        {
          color,
          title: `🚨 ${alert.title}`,
          text: alert.description,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Category',
              value: alert.category,
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toISOString(),
              short: true
            }
          ],
          footer: 'Nockchain Mining Pool Monitor',
          ts: Math.floor(alert.timestamp / 1000)
        }
      ]
    }

    await axios.post(channel.config.webhookUrl, payload)
  }

  private async sendDiscordAlert(alert: Alert, channel: NotificationChannel) {
    const color = this.getDiscordColor(alert.severity)
    
    const payload = {
      username: channel.config.username,
      avatar_url: channel.config.avatarUrl,
      embeds: [
        {
          title: `🚨 ${alert.title}`,
          description: alert.description,
          color,
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Category',
              value: alert.category,
              inline: true
            },
            {
              name: 'Source',
              value: alert.source,
              inline: true
            }
          ],
          timestamp: new Date(alert.timestamp).toISOString(),
          footer: {
            text: 'Nockchain Mining Pool Monitor'
          }
        }
      ]
    }

    await axios.post(channel.config.webhookUrl, payload)
  }

  private async sendWebhookAlert(alert: Alert, channel: NotificationChannel) {
    const payload = {
      alert,
      timestamp: Date.now(),
      source: 'nockchain-monitoring'
    }

    await axios({
      method: channel.config.method,
      url: channel.config.url,
      headers: channel.config.headers,
      data: payload,
      timeout: 10000
    })
  }

  private generateEmailTemplate(alert: Alert): NotificationTemplate {
    const severityIcon = {
      critical: '🔥',
      warning: '⚠️',
      info: 'ℹ️'
    }[alert.severity]

    const subject = `${severityIcon} Nockchain Alert: ${alert.title}`
    
    const body = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${this.getSeverityColor(alert.severity)}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${severityIcon} Alert: ${alert.title}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6;">
            <p style="font-size: 16px; margin-bottom: 20px;"><strong>Description:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid ${this.getSeverityColor(alert.severity)};">
              ${alert.description}
            </p>
            
            <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Severity:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.severity.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Category:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Source:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${alert.source}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Time:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${new Date(alert.timestamp).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Alert ID:</strong></td>
                <td style="padding: 8px;">${alert.id}</td>
              </tr>
            </table>
            
            ${alert.metadata ? `
              <p style="margin-top: 20px;"><strong>Additional Information:</strong></p>
              <pre style="background: white; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(alert.metadata, null, 2)}
              </pre>
            ` : ''}
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
            <p>This alert was generated by Nockchain Mining Pool Monitor</p>
            <p>Alert ID: ${alert.id}</p>
          </div>
        </body>
      </html>
    `

    return {
      subject,
      body,
      format: 'html'
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#dc3545' // Red
      case 'warning':
        return '#ffc107' // Yellow
      case 'info':
        return '#17a2b8' // Blue
      default:
        return '#6c757d' // Gray
    }
  }

  private getDiscordColor(severity: string): number {
    switch (severity) {
      case 'critical':
        return 0xdc3545 // Red
      case 'warning':
        return 0xffc107 // Yellow
      case 'info':
        return 0x17a2b8 // Blue
      default:
        return 0x6c757d // Gray
    }
  }

  public async testNotification(channelName: string): Promise<boolean> {
    const testAlert: Alert = {
      id: `test_${Date.now()}`,
      title: 'Test Notification',
      description: 'This is a test notification to verify the channel configuration.',
      severity: 'info',
      category: 'system',
      timestamp: Date.now(),
      status: 'active',
      source: 'notification_test',
      metadata: {
        test: true,
        channel: channelName
      }
    }

    try {
      await this.sendAlert(testAlert, channelName)
      return true
    } catch (error) {
      logger.error(`Test notification failed for ${channelName}`, error)
      return false
    }
  }

  public getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values())
  }

  public addChannel(channelName: string, channel: NotificationChannel) {
    this.channels.set(channelName, channel)
    logger.info(`Added notification channel: ${channelName}`)
  }

  public removeChannel(channelName: string): boolean {
    const result = this.channels.delete(channelName)
    if (result) {
      logger.info(`Removed notification channel: ${channelName}`)
    }
    return result
  }

  public updateChannel(channelName: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(channelName)
    if (!channel) {
      return false
    }

    const updatedChannel = { ...channel, ...updates }
    this.channels.set(channelName, updatedChannel)
    logger.info(`Updated notification channel: ${channelName}`)
    return true
  }
}