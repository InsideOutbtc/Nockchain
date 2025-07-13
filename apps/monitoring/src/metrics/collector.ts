// Advanced metrics collection system with Prometheus integration
// Monitors mining pool performance, system health, and business metrics

import { register, collectDefaultMetrics, Gauge, Counter, Histogram, Summary } from 'prom-client'
import { createClient } from 'redis'
import axios from 'axios'
import { Logger } from '../utils/logger'

const logger = Logger.getInstance()

export interface PoolMetrics {
  totalHashrate: number
  activeMiners: number
  blocksFound: number
  shareRate: number
  efficiency: number
  uptime: number
  networkDifficulty: number
  poolDifficulty: number
}

export interface SystemMetrics {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  activeConnections: number
  responseTime: number
}

export class MetricsCollector {
  private redisClient: any
  private isRunning = false
  private collectInterval: NodeJS.Timeout | null = null

  // Prometheus metrics
  private poolHashrateGauge: Gauge<string>
  private activeMinersGauge: Gauge<string>
  private blocksFoundCounter: Counter<string>
  private shareRateGauge: Gauge<string>
  private poolEfficiencyGauge: Gauge<string>
  private uptimeGauge: Gauge<string>
  private difficultyGauge: Gauge<string>
  
  private responseTimeHistogram: Histogram<string>
  private requestCounter: Counter<string>
  private errorCounter: Counter<string>
  private connectionGauge: Gauge<string>
  
  private systemCpuGauge: Gauge<string>
  private systemMemoryGauge: Gauge<string>
  private systemDiskGauge: Gauge<string>
  private systemNetworkGauge: Gauge<string>

  private alertsCounter: Counter<string>
  private payoutSummary: Summary<string>

  constructor() {
    this.initializeMetrics()
    this.setupRedisClient()
  }

  private initializeMetrics() {
    // Pool-specific metrics
    this.poolHashrateGauge = new Gauge({
      name: 'nockchain_pool_hashrate_total',
      help: 'Total hashrate of the mining pool in H/s',
      labelNames: ['pool_id']
    })

    this.activeMinersGauge = new Gauge({
      name: 'nockchain_active_miners_total',
      help: 'Number of active miners connected to the pool',
      labelNames: ['pool_id']
    })

    this.blocksFoundCounter = new Counter({
      name: 'nockchain_blocks_found_total',
      help: 'Total number of blocks found by the pool',
      labelNames: ['pool_id', 'miner_id']
    })

    this.shareRateGauge = new Gauge({
      name: 'nockchain_share_rate_per_second',
      help: 'Rate of valid shares submitted per second',
      labelNames: ['pool_id']
    })

    this.poolEfficiencyGauge = new Gauge({
      name: 'nockchain_pool_efficiency_percentage',
      help: 'Pool efficiency as percentage of valid shares',
      labelNames: ['pool_id']
    })

    this.uptimeGauge = new Gauge({
      name: 'nockchain_pool_uptime_percentage',
      help: 'Pool uptime percentage',
      labelNames: ['pool_id']
    })

    this.difficultyGauge = new Gauge({
      name: 'nockchain_network_difficulty',
      help: 'Current network difficulty',
      labelNames: ['network']
    })

    // System performance metrics
    this.responseTimeHistogram = new Histogram({
      name: 'nockchain_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
    })

    this.requestCounter = new Counter({
      name: 'nockchain_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    })

    this.errorCounter = new Counter({
      name: 'nockchain_errors_total',
      help: 'Total number of errors',
      labelNames: ['service', 'error_type']
    })

    this.connectionGauge = new Gauge({
      name: 'nockchain_active_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['connection_type']
    })

    // System resource metrics
    this.systemCpuGauge = new Gauge({
      name: 'nockchain_system_cpu_usage_percentage',
      help: 'System CPU usage percentage',
      labelNames: ['instance']
    })

    this.systemMemoryGauge = new Gauge({
      name: 'nockchain_system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['instance', 'type']
    })

    this.systemDiskGauge = new Gauge({
      name: 'nockchain_system_disk_usage_bytes',
      help: 'System disk usage in bytes',
      labelNames: ['instance', 'mount_point']
    })

    this.systemNetworkGauge = new Gauge({
      name: 'nockchain_system_network_bytes',
      help: 'System network traffic in bytes',
      labelNames: ['instance', 'direction']
    })

    // Business metrics
    this.alertsCounter = new Counter({
      name: 'nockchain_alerts_total',
      help: 'Total number of alerts generated',
      labelNames: ['severity', 'type']
    })

    this.payoutSummary = new Summary({
      name: 'nockchain_payout_amount_nock',
      help: 'Summary of payout amounts in NOCK',
      labelNames: ['miner_id', 'payout_type'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99]
    })

    // Register default Node.js metrics
    collectDefaultMetrics({ register })
  }

  private async setupRedisClient() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      })

      this.redisClient.on('error', (error: any) => {
        logger.error('Redis connection error', error)
      })

      await this.redisClient.connect()
      logger.info('Connected to Redis for metrics collection')
    } catch (error) {
      logger.error('Failed to connect to Redis', error)
      throw error
    }
  }

  public async start() {
    if (this.isRunning) return

    this.isRunning = true
    logger.info('Starting metrics collection...')

    // Collect metrics every 10 seconds
    this.collectInterval = setInterval(async () => {
      await this.collectMetrics()
    }, 10000)

    // Initial collection
    await this.collectMetrics()
  }

  public async stop() {
    this.isRunning = false
    
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
      this.collectInterval = null
    }

    if (this.redisClient) {
      await this.redisClient.quit()
    }

    logger.info('Metrics collection stopped')
  }

  private async collectMetrics() {
    try {
      await Promise.all([
        this.collectPoolMetrics(),
        this.collectSystemMetrics(),
        this.collectBusinessMetrics()
      ])
    } catch (error) {
      logger.error('Error collecting metrics', error)
      this.errorCounter.inc({ service: 'metrics_collector', error_type: 'collection_error' })
    }
  }

  private async collectPoolMetrics() {
    try {
      // Fetch pool statistics from mining pool API
      const poolStatsResponse = await axios.get('http://localhost:3000/api/v1/pool/stats', {
        timeout: 5000
      })
      
      const poolStats = poolStatsResponse.data

      // Update Prometheus metrics
      this.poolHashrateGauge.set({ pool_id: 'main' }, poolStats.totalHashrate || 0)
      this.activeMinersGauge.set({ pool_id: 'main' }, poolStats.activeMiners || 0)
      this.shareRateGauge.set({ pool_id: 'main' }, poolStats.shareRate || 0)
      this.poolEfficiencyGauge.set({ pool_id: 'main' }, poolStats.efficiency || 0)
      this.uptimeGauge.set({ pool_id: 'main' }, poolStats.uptime || 0)
      this.difficultyGauge.set({ network: 'nockchain' }, poolStats.networkDifficulty || 0)

      // Store in Redis for real-time access
      await this.redisClient.setEx('pool:metrics', 300, JSON.stringify(poolStats))

    } catch (error) {
      logger.warn('Failed to collect pool metrics', error)
      this.errorCounter.inc({ service: 'metrics_collector', error_type: 'pool_metrics_error' })
    }
  }

  private async collectSystemMetrics() {
    try {
      const systemMetrics = await this.getSystemMetrics()

      // Update Prometheus metrics
      this.systemCpuGauge.set({ instance: 'mining_pool' }, systemMetrics.cpuUsage)
      this.systemMemoryGauge.set({ instance: 'mining_pool', type: 'used' }, systemMetrics.memoryUsage)
      this.systemDiskGauge.set({ instance: 'mining_pool', mount_point: '/' }, systemMetrics.diskUsage)
      this.systemNetworkGauge.set({ instance: 'mining_pool', direction: 'in' }, systemMetrics.networkIn)
      this.systemNetworkGauge.set({ instance: 'mining_pool', direction: 'out' }, systemMetrics.networkOut)
      this.connectionGauge.set({ connection_type: 'websocket' }, systemMetrics.activeConnections)

      // Store in Redis
      await this.redisClient.setEx('system:metrics', 300, JSON.stringify(systemMetrics))

    } catch (error) {
      logger.warn('Failed to collect system metrics', error)
      this.errorCounter.inc({ service: 'metrics_collector', error_type: 'system_metrics_error' })
    }
  }

  private async collectBusinessMetrics() {
    try {
      // Collect payout statistics
      const payoutStatsResponse = await axios.get('http://localhost:3000/api/v1/payouts/stats', {
        timeout: 5000
      })
      
      const payoutStats = payoutStatsResponse.data

      // Update business metrics
      if (payoutStats.recentPayouts) {
        for (const payout of payoutStats.recentPayouts) {
          this.payoutSummary.observe(
            { miner_id: payout.minerId, payout_type: payout.type },
            payout.amount
          )
        }
      }

      // Store business metrics
      await this.redisClient.setEx('business:metrics', 300, JSON.stringify(payoutStats))

    } catch (error) {
      logger.warn('Failed to collect business metrics', error)
      this.errorCounter.inc({ service: 'metrics_collector', error_type: 'business_metrics_error' })
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const os = await import('os')
    const fs = await import('fs')
    const { promisify } = await import('util')
    const stat = promisify(fs.stat)

    // CPU usage calculation
    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type]
      }
      totalIdle += cpu.times.idle
    })

    const cpuUsage = 100 - (totalIdle / totalTick * 100)

    // Memory usage
    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const memoryUsage = totalMemory - freeMemory

    // Disk usage (simplified)
    let diskUsage = 0
    try {
      const stats = await stat('/')
      diskUsage = stats.size
    } catch (error) {
      // Fallback for disk usage calculation
      diskUsage = 0
    }

    return {
      cpuUsage: Math.round(cpuUsage * 100) / 100,
      memoryUsage,
      diskUsage,
      networkIn: 0, // Would need more complex calculation
      networkOut: 0, // Would need more complex calculation
      activeConnections: 0, // Would be provided by WebSocket server
      responseTime: 0 // Would be calculated from request timing
    }
  }

  public async getPrometheusMetrics(): Promise<string> {
    return register.metrics()
  }

  public async getCurrentMetrics() {
    try {
      const [poolMetrics, systemMetrics, businessMetrics] = await Promise.all([
        this.redisClient.get('pool:metrics'),
        this.redisClient.get('system:metrics'),
        this.redisClient.get('business:metrics')
      ])

      return {
        pool: poolMetrics ? JSON.parse(poolMetrics) : null,
        system: systemMetrics ? JSON.parse(systemMetrics) : null,
        business: businessMetrics ? JSON.parse(businessMetrics) : null,
        timestamp: Date.now()
      }
    } catch (error) {
      logger.error('Failed to get current metrics', error)
      throw error
    }
  }

  // Public methods for updating metrics from other services
  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.requestCounter.inc({ method, route, status_code: statusCode.toString() })
    this.responseTimeHistogram.observe(
      { method, route, status_code: statusCode.toString() },
      duration / 1000
    )
  }

  public recordError(service: string, errorType: string) {
    this.errorCounter.inc({ service, error_type: errorType })
  }

  public recordAlert(severity: string, type: string) {
    this.alertsCounter.inc({ severity, type })
  }

  public recordBlockFound(poolId: string, minerId: string) {
    this.blocksFoundCounter.inc({ pool_id: poolId, miner_id: minerId })
  }

  public updateActiveConnections(connectionType: string, count: number) {
    this.connectionGauge.set({ connection_type: connectionType }, count)
  }
}