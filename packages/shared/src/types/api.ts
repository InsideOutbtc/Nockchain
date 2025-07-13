import { z } from 'zod'

// Generic API Response Schema
export const ApiResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.any(),
    timestamp: z.date(),
    requestId: z.string().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }),
    timestamp: z.date(),
    requestId: z.string().optional(),
  }),
])

// Pagination Schema
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const PaginatedResponseSchema = z.object({
  items: z.array(z.any()),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

// Filter Schemas
export const DateFilterSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export const AmountFilterSchema = z.object({
  min: z.number().nonnegative().optional(),
  max: z.number().positive().optional(),
})

// Mining API Endpoints
export const GetMinersParamsSchema = z.object({
  status: z.enum(['online', 'offline', 'all']).default('all'),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
})

export const GetMinerStatsParamsSchema = z.object({
  minerId: z.string().uuid(),
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  ...DateFilterSchema.shape,
})

export const GetPoolStatsParamsSchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  ...DateFilterSchema.shape,
})

export const GetPayoutsParamsSchema = z.object({
  minerId: z.string().uuid().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'all']).default('all'),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
  ...AmountFilterSchema.shape,
})

export const GetBlocksParamsSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'orphaned', 'all']).default('all'),
  minerId: z.string().uuid().optional(),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
})

// Bridge API Endpoints
export const GetBridgeQuoteParamsSchema = z.object({
  sourceChain: z.enum(['nockchain', 'solana']),
  destinationChain: z.enum(['nockchain', 'solana']),
  amount: z.number().positive(),
  sourceAddress: z.string(),
  destinationAddress: z.string(),
})

export const ExecuteBridgeTransactionSchema = z.object({
  quoteId: z.string().uuid(),
  sourceAddress: z.string(),
  destinationAddress: z.string(),
  amount: z.number().positive(),
  signature: z.string(),
  nonce: z.string(),
})

export const GetBridgeTransactionsParamsSchema = z.object({
  sourceChain: z.enum(['nockchain', 'solana', 'all']).default('all'),
  destinationChain: z.enum(['nockchain', 'solana', 'all']).default('all'),
  status: z.enum(['pending', 'processing', 'confirmed', 'failed', 'refunded', 'all']).default('all'),
  address: z.string().optional(),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
  ...AmountFilterSchema.shape,
})

export const GetLiquidityPositionsParamsSchema = z.object({
  dex: z.enum(['orca', 'jupiter', 'raydium', 'serum', 'saber', 'all']).default('all'),
  ...PaginationParamsSchema.shape,
})

export const GetArbitrageOpportunitiesParamsSchema = z.object({
  sourceChain: z.enum(['nockchain', 'solana', 'all']).default('all'),
  destinationChain: z.enum(['nockchain', 'solana', 'all']).default('all'),
  minProfit: z.number().nonnegative().default(0),
  ...PaginationParamsSchema.shape,
})

// User API Endpoints
export const UpdateUserProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  preferences: z.record(z.any()).optional(),
})

export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    sms: z.boolean().optional(),
    mining: z.boolean().optional(),
    trading: z.boolean().optional(),
    security: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    profileVisible: z.boolean().optional(),
    statsVisible: z.boolean().optional(),
    activityVisible: z.boolean().optional(),
  }).optional(),
  trading: z.object({
    defaultSlippage: z.number().min(0).max(1).optional(),
    advancedMode: z.boolean().optional(),
    confirmTransactions: z.boolean().optional(),
    autoApproval: z.boolean().optional(),
    gasPreference: z.enum(['slow', 'standard', 'fast']).optional(),
  }).optional(),
  mining: z.object({
    autoCompound: z.boolean().optional(),
    payoutThreshold: z.number().positive().optional(),
    hardwareMonitoring: z.boolean().optional(),
    alertsEnabled: z.boolean().optional(),
  }).optional(),
})

export const AddWalletSchema = z.object({
  chain: z.enum(['nockchain', 'solana', 'ethereum']),
  address: z.string(),
  publicKey: z.string().optional(),
  label: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const GetUserActivityParamsSchema = z.object({
  type: z.enum([
    'login',
    'logout',
    'mining_start',
    'mining_stop',
    'bridge_transaction',
    'trade_executed',
    'withdrawal',
    'deposit',
    'settings_changed',
    'kyc_submitted',
    'password_changed',
    '2fa_enabled',
    '2fa_disabled',
    'all',
  ]).default('all'),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
})

export const GetNotificationsParamsSchema = z.object({
  type: z.enum([
    'mining_reward',
    'payout_sent',
    'bridge_completed',
    'trade_executed',
    'security_alert',
    'maintenance',
    'news',
    'referral_bonus',
    'all',
  ]).default('all'),
  read: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'all']).default('all'),
  ...PaginationParamsSchema.shape,
  ...DateFilterSchema.shape,
})

// Analytics API Endpoints
export const GetDashboardStatsParamsSchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  userId: z.string().uuid().optional(),
})

export const GetChartDataParamsSchema = z.object({
  type: z.enum([
    'hashrate',
    'earnings',
    'bridge_volume',
    'trading_volume',
    'price',
    'liquidity',
  ]),
  period: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  interval: z.enum(['minute', 'hour', 'day']).default('hour'),
  ...DateFilterSchema.shape,
})

// WebSocket API
export const WebSocketSubscribeSchema = z.object({
  channels: z.array(z.enum([
    'mining_stats',
    'pool_stats',
    'bridge_transactions',
    'price_updates',
    'notifications',
    'user_activity',
  ])),
  userId: z.string().uuid().optional(),
  minerId: z.string().uuid().optional(),
})

export const WebSocketUnsubscribeSchema = z.object({
  channels: z.array(z.string()),
})

// Error Codes
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Mining errors
  MINER_NOT_FOUND: 'MINER_NOT_FOUND',
  INVALID_SHARE: 'INVALID_SHARE',
  MINING_DISABLED: 'MINING_DISABLED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // Bridge errors
  BRIDGE_DISABLED: 'BRIDGE_DISABLED',
  INSUFFICIENT_LIQUIDITY: 'INSUFFICIENT_LIQUIDITY',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const

// Export TypeScript types
export type ApiResponse<T = any> = z.infer<typeof ApiResponseSchema> & { data: T }
export type PaginationParams = z.infer<typeof PaginationParamsSchema>
export type PaginatedResponse<T> = z.infer<typeof PaginatedResponseSchema> & { items: T[] }
export type DateFilter = z.infer<typeof DateFilterSchema>
export type AmountFilter = z.infer<typeof AmountFilterSchema>

export type GetMinersParams = z.infer<typeof GetMinersParamsSchema>
export type GetMinerStatsParams = z.infer<typeof GetMinerStatsParamsSchema>
export type GetPoolStatsParams = z.infer<typeof GetPoolStatsParamsSchema>
export type GetPayoutsParams = z.infer<typeof GetPayoutsParamsSchema>
export type GetBlocksParams = z.infer<typeof GetBlocksParamsSchema>

export type GetBridgeQuoteParams = z.infer<typeof GetBridgeQuoteParamsSchema>
export type ExecuteBridgeTransaction = z.infer<typeof ExecuteBridgeTransactionSchema>
export type GetBridgeTransactionsParams = z.infer<typeof GetBridgeTransactionsParamsSchema>
export type GetLiquidityPositionsParams = z.infer<typeof GetLiquidityPositionsParamsSchema>
export type GetArbitrageOpportunitiesParams = z.infer<typeof GetArbitrageOpportunitiesParamsSchema>

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>
export type AddWallet = z.infer<typeof AddWalletSchema>
export type GetUserActivityParams = z.infer<typeof GetUserActivityParamsSchema>
export type GetNotificationsParams = z.infer<typeof GetNotificationsParamsSchema>

export type GetDashboardStatsParams = z.infer<typeof GetDashboardStatsParamsSchema>
export type GetChartDataParams = z.infer<typeof GetChartDataParamsSchema>

export type WebSocketSubscribe = z.infer<typeof WebSocketSubscribeSchema>
export type WebSocketUnsubscribe = z.infer<typeof WebSocketUnsubscribeSchema>

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]