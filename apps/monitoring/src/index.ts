// Enterprise monitoring and alerting service for Nockchain mining pool
// Provides Prometheus metrics, real-time alerting, and health monitoring

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { config } from 'dotenv'
import { MetricsCollector } from './metrics/collector'
import { AlertManager } from './alerts/manager'
import { HealthMonitor } from './health/monitor'
import { Logger } from './utils/logger'
import { Dashboard } from './dashboard/server'
import { NotificationService } from './notifications/service'

config()

const logger = Logger.getInstance()

class MonitoringService {
  private app: express.Application
  private server: any
  private wsServer: WebSocketServer
  private metricsCollector: MetricsCollector
  private alertManager: AlertManager
  private healthMonitor: HealthMonitor
  private dashboard: Dashboard
  private notificationService: NotificationService

  constructor() {
    this.app = express()
    this.setupMiddleware()
    this.initializeComponents()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(helmet())
    this.app.use(cors())
    this.app.use(compression())
    this.app.use(express.json({ limit: '10mb' }))
  }

  private async initializeComponents() {
    // Initialize metrics collection
    this.metricsCollector = new MetricsCollector()
    
    // Initialize alert management
    this.alertManager = new AlertManager()
    
    // Initialize health monitoring
    this.healthMonitor = new HealthMonitor()
    
    // Initialize notification service
    this.notificationService = new NotificationService()
    
    // Initialize dashboard
    this.dashboard = new Dashboard(this.metricsCollector, this.alertManager)
  }

  private setupRoutes() {
    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsCollector.getPrometheusMetrics()
        res.set('Content-Type', 'text/plain')
        res.send(metrics)
      } catch (error) {
        logger.error('Failed to generate metrics', error)
        res.status(500).json({ error: 'Failed to generate metrics' })
      }
    })

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const health = await this.healthMonitor.getSystemHealth()
        res.json(health)
      } catch (error) {
        logger.error('Health check failed', error)
        res.status(503).json({ error: 'Health check failed' })
      }
    })

    // Alerts endpoint
    this.app.get('/alerts', async (req, res) => {
      try {
        const alerts = await this.alertManager.getActiveAlerts()
        res.json(alerts)
      } catch (error) {
        logger.error('Failed to retrieve alerts', error)
        res.status(500).json({ error: 'Failed to retrieve alerts' })
      }
    })

    // Dashboard endpoints
    this.app.use('/dashboard', this.dashboard.getRouter())

    // Webhook for external alerts
    this.app.post('/webhook/alerts', async (req, res) => {
      try {
        await this.alertManager.processWebhook(req.body)
        res.json({ status: 'processed' })
      } catch (error) {
        logger.error('Failed to process webhook', error)
        res.status(500).json({ error: 'Failed to process webhook' })
      }
    })
  }

  public async start() {
    const port = process.env.MONITORING_PORT || 3001

    // Create HTTP server
    this.server = createServer(this.app)

    // Setup WebSocket server for real-time monitoring
    this.wsServer = new WebSocketServer({ server: this.server })
    
    this.wsServer.on('connection', (ws) => {
      logger.info('New monitoring client connected')
      
      // Send initial metrics
      this.sendMetricsUpdate(ws)
      
      // Setup periodic updates
      const interval = setInterval(() => {
        this.sendMetricsUpdate(ws)
      }, 5000)

      ws.on('close', () => {
        clearInterval(interval)
        logger.info('Monitoring client disconnected')
      })
    })

    // Start all components
    await this.metricsCollector.start()
    await this.alertManager.start()
    await this.healthMonitor.start()
    await this.notificationService.start()

    // Start server
    this.server.listen(port, () => {
      logger.info(`Monitoring service started on port ${port}`)
      logger.info(`Metrics available at http://localhost:${port}/metrics`)
      logger.info(`Dashboard available at http://localhost:${port}/dashboard`)
    })

    // Setup graceful shutdown
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
  }

  private async sendMetricsUpdate(ws: any) {
    try {
      if (ws.readyState === ws.OPEN) {
        const metrics = await this.metricsCollector.getCurrentMetrics()
        const alerts = await this.alertManager.getActiveAlerts()
        const health = await this.healthMonitor.getSystemHealth()

        ws.send(JSON.stringify({
          type: 'metrics_update',
          data: {
            metrics,
            alerts,
            health,
            timestamp: Date.now()
          }
        }))
      }
    } catch (error) {
      logger.error('Failed to send metrics update', error)
    }
  }

  private async shutdown() {
    logger.info('Shutting down monitoring service...')

    try {
      await this.metricsCollector.stop()
      await this.alertManager.stop()
      await this.healthMonitor.stop()
      await this.notificationService.stop()

      this.wsServer.close()
      this.server.close()

      logger.info('Monitoring service shutdown complete')
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown', error)
      process.exit(1)
    }
  }
}

// Start the monitoring service
const monitoringService = new MonitoringService()
monitoringService.start().catch((error) => {
  logger.error('Failed to start monitoring service', error)
  process.exit(1)
})