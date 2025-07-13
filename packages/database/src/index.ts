// Nockchain Database Package - Enterprise-grade database client
// Optimized for high-performance mining pool operations

import { PrismaClient } from '@prisma/client'

// Database configuration for different environments
const databaseConfig = {
  development: {
    log: ['query', 'info', 'warn', 'error'] as const,
    errorFormat: 'pretty' as const,
  },
  test: {
    log: ['warn', 'error'] as const,
    errorFormat: 'minimal' as const,
  },
  production: {
    log: ['error'] as const,
    errorFormat: 'minimal' as const,
  },
}

const environment = (process.env.NODE_ENV || 'development') as keyof typeof databaseConfig

// Create and configure Prisma client with optimizations
export const prisma = new PrismaClient({
  ...databaseConfig[environment],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Connection pool optimization
export const optimizedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const start = Date.now()
        try {
          const result = await query(args)
          const duration = Date.now() - start
          
          // Log slow queries in production
          if (duration > 1000 && environment === 'production') {
            console.warn(`Slow query detected: ${model}.${operation} took ${duration}ms`)
          }
          
          return result
        } catch (error) {
          console.error(`Database error in ${model}.${operation}:`, error)
          throw error
        }
      }
    }
  }
})

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  latency: number
  error?: string
}> {
  const start = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    
    return {
      status: 'healthy',
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await prisma.$disconnect()
}

// Database utilities for mining pool operations
export class MiningPoolDatabase {
  static async getMinerStats(minerId: string, period: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH') {
    return prisma.miningStats.findMany({
      where: {
        minerId,
        period,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 100,
    })
  }

  static async getPoolHashrate(since: Date) {
    const result = await prisma.$queryRaw<Array<{ hashrate: string; timestamp: Date }>>`
      SELECT 
        SUM(hashrate) as hashrate,
        DATE_TRUNC('hour', timestamp) as timestamp
      FROM mining_stats 
      WHERE timestamp >= ${since}
        AND period = 'HOUR'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY timestamp DESC
    `
    
    return result.map(row => ({
      hashrate: parseFloat(row.hashrate),
      timestamp: row.timestamp,
    }))
  }

  static async getActiveMiners() {
    return prisma.miner.count({
      where: {
        isActive: true,
        lastSeen: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes
        },
      },
    })
  }

  static async getPendingPayouts() {
    return prisma.payout.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        miner: true,
        user: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  static async createShare(data: {
    minerId: string
    difficulty: number
    target: string
    nonce: string
    isValid: boolean
    blockHeight?: number
    rewardAmount?: number
  }) {
    return prisma.share.create({
      data: {
        ...data,
        difficulty: data.difficulty.toString(),
        rewardAmount: data.rewardAmount?.toString(),
      },
    })
  }

  static async updateMinerActivity(minerId: string, isActive: boolean) {
    return prisma.miner.update({
      where: { id: minerId },
      data: {
        isActive,
        lastSeen: new Date(),
      },
    })
  }
}

// Database utilities for bridge operations
export class BridgeDatabase {
  static async createBridgeTransaction(data: {
    userId?: string
    sourceChain: 'NOCKCHAIN' | 'SOLANA'
    destinationChain: 'NOCKCHAIN' | 'SOLANA'
    sourceAddress: string
    destinationAddress: string
    amount: number
    fee: number
    estimatedTime: number
    requiredSignatures: number
  }) {
    return prisma.bridgeTransaction.create({
      data: {
        ...data,
        amount: data.amount.toString(),
        fee: data.fee.toString(),
      },
    })
  }

  static async updateTransactionStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED',
    transactionHash?: string
  ) {
    return prisma.bridgeTransaction.update({
      where: { id },
      data: {
        status,
        sourceTransactionHash: transactionHash,
        processedAt: status === 'PROCESSING' ? new Date() : undefined,
        completedAt: status === 'CONFIRMED' ? new Date() : undefined,
      },
    })
  }

  static async getBridgeVolume(since: Date) {
    const result = await prisma.$queryRaw<Array<{ volume: string; chain: string }>>`
      SELECT 
        SUM(amount) as volume,
        source_chain as chain
      FROM bridge_transactions 
      WHERE created_at >= ${since}
        AND status = 'CONFIRMED'
      GROUP BY source_chain
    `
    
    return result.map(row => ({
      volume: parseFloat(row.volume),
      chain: row.chain,
    }))
  }

  static async getLiquidityUtilization() {
    return prisma.bridgeLiquidity.findMany({
      orderBy: {
        timestamp: 'desc',
      },
      take: 1,
    })
  }
}

// Export Prisma types for use in other packages
export * from '@prisma/client'
export type { Prisma } from '@prisma/client'

// Export the default client
export default optimizedPrisma