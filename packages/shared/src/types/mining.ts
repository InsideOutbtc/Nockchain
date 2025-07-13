import { z } from 'zod'

// Mining Pool Types
export const MinerSchema = z.object({
  id: z.string().uuid(),
  address: z.string(),
  name: z.string().optional(),
  workerName: z.string(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  isActive: z.boolean(),
  lastSeen: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ShareSchema = z.object({
  id: z.string().uuid(),
  minerId: z.string().uuid(),
  difficulty: z.number().positive(),
  target: z.string(),
  nonce: z.string(),
  timestamp: z.date(),
  isValid: z.boolean(),
  blockHeight: z.number().int().nonnegative().optional(),
  rewardAmount: z.number().nonnegative().optional(),
})

export const PayoutSchema = z.object({
  id: z.string().uuid(),
  minerId: z.string().uuid(),
  amount: z.number().positive(),
  transactionHash: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  failureReason: z.string().optional(),
})

export const MiningStatsSchema = z.object({
  minerId: z.string().uuid(),
  hashrate: z.number().nonnegative(),
  validShares: z.number().int().nonnegative(),
  staleShares: z.number().int().nonnegative(),
  invalidShares: z.number().int().nonnegative(),
  efficiency: z.number().min(0).max(1),
  estimatedEarnings: z.number().nonnegative(),
  actualEarnings: z.number().nonnegative(),
  uptime: z.number().min(0).max(1),
  lastShareTime: z.date().optional(),
  period: z.enum(['hour', 'day', 'week', 'month']),
  timestamp: z.date(),
})

export const PoolStatsSchema = z.object({
  totalHashrate: z.number().nonnegative(),
  activeMiners: z.number().int().nonnegative(),
  blocksFound: z.number().int().nonnegative(),
  totalShares: z.number().int().nonnegative(),
  validShares: z.number().int().nonnegative(),
  luck: z.number().positive(),
  effort: z.number().positive(),
  networkDifficulty: z.number().positive(),
  networkHashrate: z.number().nonnegative(),
  poolFee: z.number().min(0).max(1),
  payoutScheme: z.enum(['PPS', 'PPLNS', 'SOLO', 'HYBRID']),
  minimumPayout: z.number().positive(),
  timestamp: z.date(),
})

export const BlockSchema = z.object({
  id: z.string().uuid(),
  height: z.number().int().positive(),
  hash: z.string(),
  previousHash: z.string(),
  timestamp: z.date(),
  difficulty: z.number().positive(),
  reward: z.number().positive(),
  foundBy: z.string().uuid().optional(), // miner ID
  confirmations: z.number().int().nonnegative(),
  status: z.enum(['pending', 'confirmed', 'orphaned']),
  effort: z.number().positive(),
  luck: z.number().positive(),
})

// Hardware Monitoring Types
export const HardwareStatsSchema = z.object({
  minerId: z.string().uuid(),
  cpuUsage: z.number().min(0).max(100),
  memoryUsage: z.number().min(0).max(100),
  temperature: z.number().optional(),
  powerConsumption: z.number().nonnegative().optional(),
  fanSpeed: z.number().nonnegative().optional(),
  hashrate: z.number().nonnegative(),
  acceptedShares: z.number().int().nonnegative(),
  rejectedShares: z.number().int().nonnegative(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  timestamp: z.date(),
})

// API Response Types
export const MiningPoolResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
})

// WebSocket Message Types
export const WebSocketMessageSchema = z.object({
  type: z.enum([
    'subscribe',
    'unsubscribe',
    'hashrate_update',
    'share_submitted',
    'block_found',
    'payout_sent',
    'miner_connected',
    'miner_disconnected',
    'stats_update',
    'error',
  ]),
  payload: z.any(),
  timestamp: z.date(),
})

// Export TypeScript types
export type Miner = z.infer<typeof MinerSchema>
export type Share = z.infer<typeof ShareSchema>
export type Payout = z.infer<typeof PayoutSchema>
export type MiningStats = z.infer<typeof MiningStatsSchema>
export type PoolStats = z.infer<typeof PoolStatsSchema>
export type Block = z.infer<typeof BlockSchema>
export type HardwareStats = z.infer<typeof HardwareStatsSchema>
export type MiningPoolResponse = z.infer<typeof MiningPoolResponseSchema>
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// Utility types
export type HashratePeriod = 'realtime' | '1h' | '24h' | '7d' | '30d'
export type PayoutScheme = 'PPS' | 'PPLNS' | 'SOLO' | 'HYBRID'
export type MinerStatus = 'online' | 'offline' | 'idle' | 'mining'
export type ShareStatus = 'valid' | 'stale' | 'invalid'
export type BlockStatus = 'pending' | 'confirmed' | 'orphaned'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'