import { z } from 'zod'

// Bridge Transaction Types
export const BridgeTransactionSchema = z.object({
  id: z.string().uuid(),
  sourceChain: z.enum(['nockchain', 'solana']),
  destinationChain: z.enum(['nockchain', 'solana']),
  sourceAddress: z.string(),
  destinationAddress: z.string(),
  amount: z.number().positive(),
  fee: z.number().nonnegative(),
  sourceTransactionHash: z.string().optional(),
  destinationTransactionHash: z.string().optional(),
  status: z.enum(['pending', 'processing', 'confirmed', 'failed', 'refunded']),
  confirmations: z.number().int().nonnegative(),
  requiredConfirmations: z.number().int().positive(),
  createdAt: z.date(),
  processedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failureReason: z.string().optional(),
  estimatedTime: z.number().int().positive(), // seconds
  validatorSignatures: z.array(z.string()),
  requiredSignatures: z.number().int().positive(),
})

export const ValidatorSchema = z.object({
  id: z.string().uuid(),
  address: z.string(),
  publicKey: z.string(),
  isActive: z.boolean(),
  stake: z.number().nonnegative(),
  reputation: z.number().min(0).max(1),
  lastActivity: z.date(),
  signaturesProvided: z.number().int().nonnegative(),
  uptime: z.number().min(0).max(1),
  slashingEvents: z.number().int().nonnegative(),
})

export const BridgeLiquiditySchema = z.object({
  chain: z.enum(['nockchain', 'solana']),
  totalLiquidity: z.number().nonnegative(),
  availableLiquidity: z.number().nonnegative(),
  lockedLiquidity: z.number().nonnegative(),
  utilizationRate: z.number().min(0).max(1),
  targetUtilization: z.number().min(0).max(1),
  rebalanceThreshold: z.number().min(0).max(1),
  lastRebalance: z.date().optional(),
  timestamp: z.date(),
})

export const CrossChainPriceSchema = z.object({
  nockPrice: z.number().positive(),
  wNockPrice: z.number().positive(),
  priceDifference: z.number(),
  arbitrageOpportunity: z.boolean(),
  minimumArbitrageAmount: z.number().positive(),
  maxArbitrageAmount: z.number().positive(),
  estimatedProfit: z.number().nonnegative(),
  slippage: z.number().min(0).max(1),
  timestamp: z.date(),
})

// DEX Integration Types
export const DEXPoolSchema = z.object({
  id: z.string(),
  dex: z.enum(['orca', 'jupiter', 'raydium', 'serum', 'saber']),
  tokenA: z.string(),
  tokenB: z.string(),
  liquidity: z.number().nonnegative(),
  volume24h: z.number().nonnegative(),
  fees24h: z.number().nonnegative(),
  apr: z.number().nonnegative(),
  price: z.number().positive(),
  priceChange24h: z.number(),
  lastUpdate: z.date(),
})

export const LiquidityPositionSchema = z.object({
  id: z.string().uuid(),
  poolId: z.string(),
  dex: z.enum(['orca', 'jupiter', 'raydium', 'serum', 'saber']),
  tokenA: z.string(),
  tokenB: z.string(),
  amountA: z.number().nonnegative(),
  amountB: z.number().nonnegative(),
  lpTokens: z.number().nonnegative(),
  entryPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  unrealizedPnL: z.number(),
  feesEarned: z.number().nonnegative(),
  impermanentLoss: z.number(),
  createdAt: z.date(),
  lastUpdate: z.date(),
})

export const ArbitrageOpportunitySchema = z.object({
  id: z.string().uuid(),
  sourceChain: z.enum(['nockchain', 'solana']),
  destinationChain: z.enum(['nockchain', 'solana']),
  sourcePrice: z.number().positive(),
  destinationPrice: z.number().positive(),
  priceDifference: z.number(),
  profitPercentage: z.number(),
  maxAmount: z.number().positive(),
  estimatedProfit: z.number().positive(),
  estimatedGasCost: z.number().nonnegative(),
  netProfit: z.number(),
  confidence: z.number().min(0).max(1),
  expiresAt: z.date(),
  createdAt: z.date(),
})

// Security and Monitoring Types
export const SecurityEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'suspicious_transaction',
    'large_withdrawal',
    'multiple_failed_attempts',
    'unusual_pattern',
    'validator_offline',
    'signature_mismatch',
    'slashing_event',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  details: z.record(z.any()),
  affected: z.array(z.string()),
  resolved: z.boolean(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
  createdAt: z.date(),
})

export const BridgeStatsSchema = z.object({
  totalVolume: z.number().nonnegative(),
  volume24h: z.number().nonnegative(),
  totalTransactions: z.number().int().nonnegative(),
  transactions24h: z.number().int().nonnegative(),
  averageTransactionSize: z.number().nonnegative(),
  successRate: z.number().min(0).max(1),
  averageProcessingTime: z.number().positive(), // seconds
  totalFeesCollected: z.number().nonnegative(),
  fees24h: z.number().nonnegative(),
  activeValidators: z.number().int().nonnegative(),
  liquidityUtilization: z.number().min(0).max(1),
  timestamp: z.date(),
})

// API Types
export const BridgeQuoteSchema = z.object({
  sourceChain: z.enum(['nockchain', 'solana']),
  destinationChain: z.enum(['nockchain', 'solana']),
  amount: z.number().positive(),
  estimatedFee: z.number().nonnegative(),
  estimatedTime: z.number().int().positive(), // seconds
  exchangeRate: z.number().positive(),
  outputAmount: z.number().positive(),
  priceImpact: z.number().min(0).max(1),
  route: z.array(z.string()),
  validUntil: z.date(),
  quoteId: z.string().uuid(),
})

export const BridgeExecuteRequestSchema = z.object({
  quoteId: z.string().uuid(),
  sourceAddress: z.string(),
  destinationAddress: z.string(),
  amount: z.number().positive(),
  signature: z.string(),
  nonce: z.string(),
})

// Export TypeScript types
export type BridgeTransaction = z.infer<typeof BridgeTransactionSchema>
export type Validator = z.infer<typeof ValidatorSchema>
export type BridgeLiquidity = z.infer<typeof BridgeLiquiditySchema>
export type CrossChainPrice = z.infer<typeof CrossChainPriceSchema>
export type DEXPool = z.infer<typeof DEXPoolSchema>
export type LiquidityPosition = z.infer<typeof LiquidityPositionSchema>
export type ArbitrageOpportunity = z.infer<typeof ArbitrageOpportunitySchema>
export type SecurityEvent = z.infer<typeof SecurityEventSchema>
export type BridgeStats = z.infer<typeof BridgeStatsSchema>
export type BridgeQuote = z.infer<typeof BridgeQuoteSchema>
export type BridgeExecuteRequest = z.infer<typeof BridgeExecuteRequestSchema>

// Utility types
export type ChainType = 'nockchain' | 'solana'
export type TransactionStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded'
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'
export type DEXProvider = 'orca' | 'jupiter' | 'raydium' | 'serum' | 'saber'