// Mining types
export * from './mining'

// Bridge types  
export * from './bridge'

// User types
export * from './user'

// API types
export * from './api'

// Common utility types
export type Timestamp = Date
export type UUID = string
export type Address = string
export type Hash = string
export type Amount = number
export type Percentage = number

// Response wrapper types
export interface SuccessResponse<T = any> {
  success: true
  data: T
  timestamp: Timestamp
  requestId?: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: Timestamp
  requestId?: string
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter types
export interface DateFilter {
  from?: Date
  to?: Date
}

export interface AmountFilter {
  min?: number
  max?: number
}

// WebSocket types
export interface WebSocketEvent<T = any> {
  type: string
  payload: T
  timestamp: Timestamp
  requestId?: string
}

// Real-time data types
export interface RealtimeData<T = any> {
  current: T
  previous?: T
  change?: number
  changePercent?: number
  timestamp: Timestamp
}

// Chart data types
export interface ChartDataPoint {
  timestamp: number
  value: number
  label?: string
}

export interface TimeSeriesData {
  label: string
  data: ChartDataPoint[]
  color?: string
}

// Performance metrics
export interface PerformanceMetrics {
  latency: number
  throughput: number
  errorRate: number
  uptime: number
  timestamp: Timestamp
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency?: number
    error?: string
    timestamp: Timestamp
  }>
  timestamp: Timestamp
}

// Configuration types
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  maxConnections?: number
  connectionTimeout?: number
}

export interface RedisConfig {
  host: string
  port: number
  password?: string
  database?: number
  keyPrefix?: string
  ttl?: number
}

export interface SolanaConfig {
  rpcUrl: string
  wsUrl: string
  commitment: 'processed' | 'confirmed' | 'finalized'
  programId: string
  wallet: {
    secretKey: string
    publicKey: string
  }
}

export interface NockchainConfig {
  rpcUrl: string
  wsUrl: string
  networkId: string
  wallet: {
    privateKey: string
    address: string
  }
}