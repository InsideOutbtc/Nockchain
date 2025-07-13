// Common types for DEX integration across Orca, Jupiter, and Raydium

export interface DexQuote {
  dex: 'orca' | 'jupiter' | 'raydium';
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number; // percentage
  fee: string;
  route: string[]; // Pool addresses or route descriptions
  executionPrice: number;
  minimumReceived: string;
  valid: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface DexTrade {
  dex: 'orca' | 'jupiter' | 'raydium';
  signature: string;
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  fee: string;
  priceImpact: number;
  executionPrice: number;
  gasUsed: number;
  timestamp: number;
  latency: number; // milliseconds
  successful: boolean;
  error?: string;
  route?: string[];
}

export interface DexPosition {
  dex: 'orca' | 'jupiter' | 'raydium';
  id: string;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  liquidity: string;
  tickLower?: number; // For concentrated liquidity (Orca)
  tickUpper?: number; // For concentrated liquidity (Orca)
  fee: number; // Accumulated fees
  apy: number; // Annual percentage yield
  value: number; // USD value
  createdAt: number;
  lastUpdated: number;
}

export interface DexBalance {
  mint: string;
  symbol: string;
  amount: string;
  uiAmount: number;
  decimals: number;
}

export interface DexPoolInfo {
  dex: 'orca' | 'jupiter' | 'raydium';
  address: string;
  tokenA: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    mint: string;
    symbol: string;
    decimals: number;
  };
  liquidity: string;
  volume24h: number;
  fees24h: number;
  apy: number;
  tvl: number;
  feeRate: number; // basis points
}

export interface DexMetrics {
  dex: 'orca' | 'jupiter' | 'raydium';
  timestamp: number;
  totalTrades: number;
  successfulTrades: number;
  totalVolume: string;
  totalFees: string;
  averageLatency: number;
  averagePriceImpact: number;
  uniquePools: number;
  activePositions: number;
}

export interface ArbitrageOpportunity {
  tokenA: string;
  tokenB: string;
  buyDex: 'orca' | 'jupiter' | 'raydium';
  sellDex: 'orca' | 'jupiter' | 'raydium';
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  maxAmount: string;
  estimatedProfit: string;
  gasEstimate: number;
  timestamp: number;
  valid: boolean;
}

export interface LiquidityStrategy {
  id: string;
  name: string;
  description: string;
  dexes: ('orca' | 'jupiter' | 'raydium')[];
  tokens: string[];
  minLiquidity: string;
  maxLiquidity: string;
  targetApy: number;
  riskLevel: 'low' | 'medium' | 'high';
  autoRebalance: boolean;
  rebalanceThreshold: number; // percentage
}

export interface MarketMakingConfig {
  tokenPair: {
    base: string;
    quote: string;
  };
  dex: 'orca' | 'jupiter' | 'raydium';
  spreadBps: number; // basis points
  orderSize: string;
  maxInventory: string;
  riskParameters: {
    maxPriceImpact: number;
    inventoryLimit: number;
    stopLoss: number;
  };
  rebalanceFrequency: number; // minutes
}

export interface YieldFarmingPosition {
  dex: 'raydium'; // Primary yield farming on Raydium
  farmId: string;
  poolId: string;
  stakedAmount: string;
  rewardTokens: {
    mint: string;
    symbol: string;
    pendingRewards: string;
    apr: number;
  }[];
  totalValue: number;
  entryTime: number;
  lockupPeriod?: number;
}

export interface CrossDexAnalytics {
  timestamp: number;
  priceData: {
    [tokenMint: string]: {
      orca?: number;
      jupiter?: number;
      raydium?: number;
      spread: number;
      volume24h: number;
    };
  };
  liquidityData: {
    [tokenMint: string]: {
      totalTvl: number;
      dexDistribution: {
        orca: number;
        jupiter: number;
        raydium: number;
      };
    };
  };
  arbitrageOpportunities: ArbitrageOpportunity[];
  optimalRoutes: {
    [tokenPair: string]: {
      bestDex: 'orca' | 'jupiter' | 'raydium';
      price: number;
      liquidity: string;
    };
  };
}

export interface DexIntegrationConfig {
  orca: {
    enabled: boolean;
    whirlpoolProgram: string;
    slippageTolerance: number;
    maxPriceImpact: number;
  };
  jupiter: {
    enabled: boolean;
    apiUrl: string;
    slippageBps: number;
    maxAccounts: number;
    onlyDirectRoutes: boolean;
  };
  raydium: {
    enabled: boolean;
    slippageTolerance: number;
    maxPriceImpact: number;
  };
  arbitrage: {
    enabled: boolean;
    minProfitBps: number;
    maxGasCost: number;
    checkInterval: number;
  };
  marketMaking: {
    enabled: boolean;
    strategies: MarketMakingConfig[];
  };
  yieldFarming: {
    enabled: boolean;
    autoCompound: boolean;
    compoundThreshold: string;
  };
}

export enum TradeType {
  SWAP = 'swap',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  HARVEST = 'harvest',
  ARBITRAGE = 'arbitrage',
  MARKET_MAKE = 'market_make',
}

export enum PositionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending',
  ERROR = 'error',
}

export interface TradeHistory {
  id: string;
  type: TradeType;
  dex: 'orca' | 'jupiter' | 'raydium';
  status: PositionStatus;
  timestamp: number;
  inputToken: {
    mint: string;
    amount: string;
    symbol: string;
  };
  outputToken: {
    mint: string;
    amount: string;
    symbol: string;
  };
  fee: string;
  priceImpact: number;
  signature?: string;
  error?: string;
}

export interface DexHealthCheck {
  dex: 'orca' | 'jupiter' | 'raydium';
  timestamp: number;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
  successRate: number;
  errorRate: number;
  lastError?: string;
  endpoints: {
    rpc: boolean;
    api: boolean;
    websocket: boolean;
  };
}

export interface PriceAlert {
  id: string;
  tokenMint: string;
  targetPrice: number;
  condition: 'above' | 'below';
  dex?: 'orca' | 'jupiter' | 'raydium';
  enabled: boolean;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface LiquidityAlert {
  id: string;
  poolAddress: string;
  dex: 'orca' | 'jupiter' | 'raydium';
  metric: 'tvl' | 'volume' | 'apy';
  threshold: number;
  condition: 'above' | 'below';
  enabled: boolean;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}