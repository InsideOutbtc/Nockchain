// System health monitoring with comprehensive service checks
// Monitors database connections, external APIs, and service dependencies

import axios from 'axios'
import { createClient } from 'redis'
import { Logger } from '../utils/logger'

const logger = Logger.getInstance()

export interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  lastChecked: number
  responseTime: number
  error?: string
  metadata?: Record<string, any>
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: number
  uptime: number
  checks: HealthCheck[]
  summary: {
    healthy: number
    unhealthy: number
    degraded: number
    total: number
  }
}

export class HealthMonitor {
  private redisClient: any
  private isRunning = false
  private checkInterval: NodeJS.Timeout | null = null
  private healthChecks: Map<string, HealthCheck> = new Map()
  private startTime = Date.now()

  private readonly checkConfigs = [
    {
      name: 'redis',
      url: null,
      timeout: 5000,
      critical: true,
      interval: 30000
    },
    {
      name: 'mining_pool_api',
      url: 'http://localhost:3000/api/v1/pool/stats',
      timeout: 10000,
      critical: true,
      interval: 30000
    },
    {
      name: 'mining_pool_websocket',
      url: 'ws://localhost:3000/ws',
      timeout: 5000,
      critical: true,
      interval: 60000
    },
    {
      name: 'database_connection',
      url: 'http://localhost:3000/api/v1/health/database',
      timeout: 10000,
      critical: true,
      interval: 60000
    },
    {
      name: 'external_blockchain_api',
      url: 'https://api.nockchain.org/v1/stats', // Hypothetical endpoint
      timeout: 15000,
      critical: false,
      interval: 120000
    }
  ]

  public async start() {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('Starting health monitor...')

    // Setup Redis connection
    await this.setupRedisClient()

    // Perform initial health checks
    await this.performAllHealthChecks()

    // Schedule periodic health checks
    this.checkInterval = setInterval(async () => {
      await this.performAllHealthChecks()
    }, 30000) // Check every 30 seconds

    logger.info('Health monitor started')
  }

  public async stop() {
    this.isRunning = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    if (this.redisClient) {
      await this.redisClient.quit()
    }

    logger.info('Health monitor stopped')
  }

  private async setupRedisClient() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      })

      this.redisClient.on('error', (error: any) => {
        logger.error('Redis connection error in health monitor', error)
      })

      await this.redisClient.connect()
      logger.info('Health monitor connected to Redis')
    } catch (error) {
      logger.error('Failed to connect to Redis in health monitor', error)
      // Don't throw - health monitor should work without Redis
    }
  }

  private async performAllHealthChecks() {
    const checkPromises = this.checkConfigs.map(config => 
      this.performHealthCheck(config)
    )

    await Promise.allSettled(checkPromises)
    await this.updateOverallHealth()
  }

  private async performHealthCheck(config: any) {
    const startTime = Date.now()
    let check: HealthCheck

    try {
      switch (config.name) {
        case 'redis':
          check = await this.checkRedis()
          break
        case 'mining_pool_websocket':
          check = await this.checkWebSocket(config)
          break
        default:
          check = await this.checkHttpEndpoint(config)
          break
      }
    } catch (error) {
      check = {
        name: config.name,
        status: 'unhealthy',
        lastChecked: Date.now(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }

    this.healthChecks.set(config.name, check)
    
    // Log status changes
    const previousCheck = this.healthChecks.get(config.name)
    if (!previousCheck || previousCheck.status !== check.status) {
      logger.info(`Health check status changed: ${config.name} = ${check.status}`)
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      if (!this.redisClient) {
        throw new Error('Redis client not initialized')
      }

      // Test Redis connection with a simple ping
      const result = await this.redisClient.ping()
      const responseTime = Date.now() - startTime

      if (result === 'PONG') {
        return {
          name: 'redis',
          status: 'healthy',
          lastChecked: Date.now(),
          responseTime,
          metadata: {
            command: 'PING',
            response: result
          }
        }
      } else {
        throw new Error(`Unexpected Redis response: ${result}`)
      }
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        lastChecked: Date.now(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async checkHttpEndpoint(config: any): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      const response = await axios.get(config.url, {
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // Accept 4xx as degraded, not unhealthy
      })

      const responseTime = Date.now() - startTime
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

      if (response.status >= 400) {
        status = 'degraded'
      }

      return {
        name: config.name,
        status,
        lastChecked: Date.now(),
        responseTime,
        metadata: {
          statusCode: response.status,
          contentLength: response.headers['content-length'],
          url: config.url
        }
      }
    } catch (error) {
      let status: 'unhealthy' | 'degraded' = 'unhealthy'
      
      // Network timeouts might be temporary
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        status = 'degraded'
      }

      return {
        name: config.name,
        status,
        lastChecked: Date.now(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          url: config.url
        }
      }
    }
  }

  private async checkWebSocket(config: any): Promise<HealthCheck> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      try {
        // Import WebSocket dynamically
        import('ws').then(({ default: WebSocket }) => {
          const ws = new WebSocket(config.url)
          let resolved = false

          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true
              ws.close()
              resolve({
                name: config.name,
                status: 'unhealthy',
                lastChecked: Date.now(),
                responseTime: Date.now() - startTime,
                error: 'Connection timeout',
                metadata: { url: config.url }
              })
            }
          }, config.timeout)

          ws.on('open', () => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              ws.close()
              resolve({
                name: config.name,
                status: 'healthy',
                lastChecked: Date.now(),
                responseTime: Date.now() - startTime,
                metadata: { url: config.url }
              })
            }
          })

          ws.on('error', (error) => {
            if (!resolved) {
              resolved = true
              clearTimeout(timeout)
              resolve({
                name: config.name,
                status: 'unhealthy',
                lastChecked: Date.now(),
                responseTime: Date.now() - startTime,
                error: error.message,
                metadata: { url: config.url }
              })
            }
          })
        }).catch((error) => {
          resolve({
            name: config.name,
            status: 'unhealthy',
            lastChecked: Date.now(),
            responseTime: Date.now() - startTime,
            error: 'Failed to import WebSocket module'
          })
        })
      } catch (error) {
        resolve({
          name: config.name,
          status: 'unhealthy',
          lastChecked: Date.now(),
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })
  }

  private async updateOverallHealth() {
    const checks = Array.from(this.healthChecks.values())
    
    let healthy = 0
    let unhealthy = 0
    let degraded = 0

    for (const check of checks) {
      switch (check.status) {
        case 'healthy':
          healthy++
          break
        case 'unhealthy':
          unhealthy++
          break
        case 'degraded':
          degraded++
          break
      }
    }

    // Determine overall status
    let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    if (unhealthy > 0) {
      // Check if any critical services are unhealthy
      const criticalUnhealthy = checks.some(check => 
        check.status === 'unhealthy' && 
        this.checkConfigs.find(config => config.name === check.name)?.critical
      )
      
      overall = criticalUnhealthy ? 'unhealthy' : 'degraded'
    } else if (degraded > 0) {
      overall = 'degraded'
    }

    const systemHealth: SystemHealth = {
      overall,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      checks,
      summary: {
        healthy,
        unhealthy,
        degraded,
        total: checks.length
      }
    }

    // Store in Redis for API access
    if (this.redisClient) {
      try {
        await this.redisClient.setEx('system:health', 300, JSON.stringify(systemHealth))
      } catch (error) {
        logger.warn('Failed to store health data in Redis', error)
      }
    }

    // Log overall status changes
    const previousHealth = await this.getSystemHealth()
    if (!previousHealth || previousHealth.overall !== overall) {
      logger.info(`System health status changed: ${overall}`, {
        healthy,
        unhealthy,
        degraded,
        total: checks.length
      })
    }
  }

  public async getSystemHealth(): Promise<SystemHealth> {
    try {
      if (this.redisClient) {
        const healthData = await this.redisClient.get('system:health')
        if (healthData) {
          return JSON.parse(healthData)
        }
      }
    } catch (error) {
      logger.warn('Failed to get health data from Redis', error)
    }

    // Fallback to current state
    const checks = Array.from(this.healthChecks.values())
    
    let healthy = 0
    let unhealthy = 0
    let degraded = 0

    for (const check of checks) {
      switch (check.status) {
        case 'healthy':
          healthy++
          break
        case 'unhealthy':
          unhealthy++
          break
        case 'degraded':
          degraded++
          break
      }
    }

    let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (unhealthy > 0) {
      overall = 'unhealthy'
    } else if (degraded > 0) {
      overall = 'degraded'
    }

    return {
      overall,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      checks,
      summary: {
        healthy,
        unhealthy,
        degraded,
        total: checks.length
      }
    }
  }

  public async getHealthCheck(name: string): Promise<HealthCheck | null> {
    return this.healthChecks.get(name) || null
  }

  public async getAllHealthChecks(): Promise<HealthCheck[]> {
    return Array.from(this.healthChecks.values())
  }

  public async forceHealthCheck(name?: string) {
    if (name) {
      const config = this.checkConfigs.find(c => c.name === name)
      if (config) {
        await this.performHealthCheck(config)
        await this.updateOverallHealth()
      }
    } else {
      await this.performAllHealthChecks()
    }
  }
}