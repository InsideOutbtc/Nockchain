// Concentrated Liquidity Management - Advanced LP position optimization
// Manages concentrated liquidity positions across Orca Whirlpools and Raydium CLMM

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import { RiskManager } from './risk-manager';
import {
  ConcentratedLiquidityPosition,
  DexPosition,
} from '../types/dex-types';

export interface ConcentratedLiquidityConfig {
  // Position management
  maxPositionsPerPool: number;
  minLiquidityPerPosition: BN;
  maxTickSpread: number; // Maximum tick range
  
  // Rebalancing parameters
  rebalanceThreshold: number; // % out of range to trigger rebalance
  feeTierOptimization: boolean; // Optimize for fee collection
  rangeTightness: 'conservative' | 'moderate' | 'aggressive';
  
  // Risk management
  maxImpermanentLoss: number; // Maximum acceptable IL %
  maxSinglePositionExposure: number; // Max % of total in one position
  stopLossThreshold: number; // Emergency exit threshold
  
  // Automation settings
  autoRebalance: boolean;
  rebalanceFrequency: number; // minutes
  compoundFees: boolean;
  feeCompoundThreshold: BN; // Minimum fees to compound
  
  // Advanced features
  volatilityBasedRanging: boolean; // Adjust ranges based on volatility
  volumeWeightedOptimization: boolean; // Optimize for volume
  gasOptimization: boolean; // Consider gas costs in decisions
}

export interface PositionAnalysis {
  position: ConcentratedLiquidityPosition;
  inRange: boolean;
  utilizationRate: number; // % of liquidity in range
  feeEarnRate: number; // Current fee earning rate
  impermanentLoss: number; // Current IL %
  timeOutOfRange: number; // Time spent out of range (hours)
  capitalEfficiency: number; // Capital efficiency score
  recommendation: 'hold' | 'rebalance' | 'close' | 'compound';
  suggestedRange?: {
    tickLower: number;
    tickUpper: number;
    reasoning: string;
  };
}

export interface RangeOptimization {
  poolId: string;
  currentPrice: number;
  volatility: number; // Historical volatility
  volume24h: BN;
  feeRate: number;
  
  // Optimal ranges for different strategies
  conservative: { tickLower: number; tickUpper: number; expectedAPY: number };
  moderate: { tickLower: number; tickUpper: number; expectedAPY: number };
  aggressive: { tickLower: number; tickUpper: number; expectedAPY: number };
  
  // Risk metrics
  maxDrawdown: number;
  impermanentLossRisk: number;
  liquidityConcentration: number;
}

export interface LiquidityDistribution {
  poolId: string;
  totalLiquidity: BN;
  distributions: {
    tickLower: number;
    tickUpper: number;
    liquidity: BN;
    feeEarnings: BN;
    utilization: number;
  }[];
  optimalDistribution: {
    ranges: { tickLower: number; tickUpper: number; allocation: number }[];
    expectedAPY: number;
    riskScore: number;
  };
}

export interface CLMMMetrics {
  totalPositions: number;
  totalValueLocked: BN;
  totalFeesEarned: BN;
  averageAPY: number;
  averageUtilization: number;
  totalImpermanentLoss: BN;
  rebalanceCount: number;
  positionsInRange: number;
  capitalEfficiency: number;
  feeCompoundEvents: number;
  lastOptimization: number;
}

export class ConcentratedLiquidityManager {
  private config: ConcentratedLiquidityConfig;
  private aggregator: DexAggregator;
  private riskManager: RiskManager;
  private logger: Logger;
  
  // Position tracking
  private positions: Map<string, ConcentratedLiquidityPosition> = new Map();
  private positionAnalyses: Map<string, PositionAnalysis> = new Map();
  private poolOptimizations: Map<string, RangeOptimization> = new Map();
  private metrics: CLMMMetrics;
  
  // Market data
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>> = new Map();
  private volatilityCache: Map<string, number> = new Map();
  private volumeCache: Map<string, BN> = new Map();
  
  // Control flags
  private isRunning: boolean = false;
  private isOptimizing: boolean = false;
  
  // Background processes
  private positionMonitor?: NodeJS.Timeout;
  private rangeOptimizer?: NodeJS.Timeout;
  private feeCompounder?: NodeJS.Timeout;
  private metricsUpdater?: NodeJS.Timeout;

  constructor(
    config: ConcentratedLiquidityConfig,
    aggregator: DexAggregator,
    riskManager: RiskManager,
    logger: Logger
  ) {
    this.config = config;
    this.aggregator = aggregator;
    this.riskManager = riskManager;
    this.logger = logger;
    
    this.metrics = {
      totalPositions: 0,
      totalValueLocked: new BN(0),
      totalFeesEarned: new BN(0),
      averageAPY: 0,
      averageUtilization: 0,
      totalImpermanentLoss: new BN(0),
      rebalanceCount: 0,
      positionsInRange: 0,
      capitalEfficiency: 0,
      feeCompoundEvents: 0,
      lastOptimization: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Concentrated liquidity manager already running');
      return;
    }

    this.logger.info('Starting concentrated liquidity manager', {
      maxPositions: this.config.maxPositionsPerPool,
      rangeTightness: this.config.rangeTightness,
      autoRebalance: this.config.autoRebalance,
    });

    try {
      // Load existing positions
      await this.loadExistingPositions();
      
      // Perform initial analysis
      await this.analyzeAllPositions();
      
      // Start background processes
      this.isRunning = true;
      this.startPositionMonitoring();
      this.startRangeOptimization();
      this.startFeeCompounding();
      this.startMetricsUpdating();
      
      this.logger.info('Concentrated liquidity manager started successfully', {
        totalPositions: this.metrics.totalPositions,
        totalValueLocked: this.metrics.totalValueLocked.toString(),
        positionsInRange: this.metrics.positionsInRange,
      });

    } catch (error) {
      this.logger.error('Failed to start concentrated liquidity manager', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Concentrated liquidity manager not running');
      return;
    }

    this.logger.info('Stopping concentrated liquidity manager');

    try {
      // Stop background processes
      if (this.positionMonitor) clearInterval(this.positionMonitor);
      if (this.rangeOptimizer) clearInterval(this.rangeOptimizer);
      if (this.feeCompounder) clearInterval(this.feeCompounder);
      if (this.metricsUpdater) clearInterval(this.metricsUpdater);

      // Wait for any ongoing optimization to complete
      while (this.isOptimizing) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.isRunning = false;

      this.logger.info('Concentrated liquidity manager stopped successfully', {
        finalPositions: this.metrics.totalPositions,
        totalFeesEarned: this.metrics.totalFeesEarned.toString(),
        averageAPY: this.metrics.averageAPY,
        rebalanceCount: this.metrics.rebalanceCount,
      });

    } catch (error) {
      this.logger.error('Failed to stop concentrated liquidity manager gracefully', error);
      this.isRunning = false;
    }
  }

  // Core position management
  async createConcentratedPosition(
    poolId: string,
    tokenAAmount: BN,
    tokenBAmount: BN,
    strategy?: 'conservative' | 'moderate' | 'aggressive'
  ): Promise<ConcentratedLiquidityPosition> {
    this.logger.info('Creating concentrated liquidity position', {
      poolId,
      tokenAAmount: tokenAAmount.toString(),
      tokenBAmount: tokenBAmount.toString(),
      strategy: strategy || this.config.rangeTightness,
    });

    try {
      // Get optimal tick range for the strategy
      const optimization = await this.calculateOptimalRange(poolId);
      const rangeStrategy = strategy || this.config.rangeTightness;
      const optimalRange = optimization[rangeStrategy];
      
      // Validate position size
      const totalValue = tokenAAmount.add(tokenBAmount); // Simplified
      if (totalValue.lt(this.config.minLiquidityPerPosition)) {
        throw new Error('Position size below minimum threshold');
      }
      
      // Check exposure limits
      const currentExposure = this.calculatePoolExposure(poolId);
      const maxAllowed = this.config.maxSinglePositionExposure;
      if (currentExposure > maxAllowed) {
        throw new Error(`Pool exposure exceeds maximum allowed (${currentExposure}% > ${maxAllowed}%)`);
      }
      
      // Create position through aggregator
      const position = await this.executePositionCreation(
        poolId,
        tokenAAmount,
        tokenBAmount,
        optimalRange.tickLower,
        optimalRange.tickUpper
      );
      
      // Store and track position
      this.positions.set(position.positionId, position);
      await this.analyzePosition(position);
      
      // Update metrics
      this.metrics.totalPositions++;
      this.metrics.totalValueLocked = this.metrics.totalValueLocked.add(totalValue);
      
      this.logger.info('Concentrated position created successfully', {
        positionId: position.positionId,
        tickRange: `${optimalRange.tickLower}-${optimalRange.tickUpper}`,
        expectedAPY: optimalRange.expectedAPY,
      });
      
      return position;

    } catch (error) {
      this.logger.error('Failed to create concentrated position', error);
      throw error;
    }
  }

  async optimizePositionRange(positionId: string): Promise<ConcentratedLiquidityPosition> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    this.logger.info('Optimizing position range', {
      positionId,
      currentRange: `${position.tickLower}-${position.tickUpper}`,
      inRange: position.inRange,
    });

    try {
      // Analyze current position
      const analysis = await this.analyzePosition(position);
      
      // Check if optimization is needed
      if (analysis.recommendation !== 'rebalance') {
        this.logger.debug('Position optimization not needed', {
          positionId,
          recommendation: analysis.recommendation,
        });
        return position;
      }
      
      // Calculate new optimal range
      const optimization = await this.calculateOptimalRange(position.poolId);
      const newRange = optimization[this.config.rangeTightness];
      
      // Validate new range is significantly different
      const rangeDifference = Math.abs(newRange.tickLower - position.tickLower) + 
                             Math.abs(newRange.tickUpper - position.tickUpper);
      
      if (rangeDifference < 10) { // Minimum tick difference
        this.logger.debug('New range too similar to current, skipping optimization');
        return position;
      }
      
      // Execute rebalance
      const optimizedPosition = await this.executeRangeRebalance(
        position,
        newRange.tickLower,
        newRange.tickUpper
      );
      
      // Update tracking
      this.positions.set(positionId, optimizedPosition);
      await this.analyzePosition(optimizedPosition);
      
      // Update metrics
      this.metrics.rebalanceCount++;
      
      this.logger.info('Position range optimized successfully', {
        positionId,
        oldRange: `${position.tickLower}-${position.tickUpper}`,
        newRange: `${newRange.tickLower}-${newRange.tickUpper}`,
        expectedImprovement: `${newRange.expectedAPY - analysis.feeEarnRate}% APY`,
      });
      
      return optimizedPosition;

    } catch (error) {
      this.logger.error('Failed to optimize position range', error);
      throw error;
    }
  }

  async compoundPositionFees(positionId: string): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    this.logger.debug('Compounding position fees', {
      positionId,
      feeA: position.tokensOwed.tokenA.toString(),
      feeB: position.tokensOwed.tokenB.toString(),
    });

    try {
      // Check if fees meet compound threshold
      const totalFees = position.tokensOwed.tokenA.add(position.tokensOwed.tokenB);
      if (totalFees.lt(this.config.feeCompoundThreshold)) {
        this.logger.debug('Fees below compound threshold, skipping');
        return;
      }
      
      // Execute fee collection and reinvestment
      await this.executeFeeCompounding(position);
      
      // Update metrics
      this.metrics.feeCompoundEvents++;
      this.metrics.totalFeesEarned = this.metrics.totalFeesEarned.add(totalFees);
      
      this.logger.info('Position fees compounded successfully', {
        positionId,
        compoundedFees: totalFees.toString(),
      });

    } catch (error) {
      this.logger.error('Failed to compound position fees', error);
      throw error;
    }
  }

  // Position analysis and optimization
  async analyzePosition(position: ConcentratedLiquidityPosition): Promise<PositionAnalysis> {
    this.logger.debug('Analyzing concentrated position', {
      positionId: position.positionId,
      poolId: position.poolId,
    });

    try {
      // Calculate position metrics
      const currentPrice = position.currentPrice;
      const lowerPrice = position.priceRange.lower;
      const upperPrice = position.priceRange.upper;
      
      // Check if position is in range
      const inRange = currentPrice >= lowerPrice && currentPrice <= upperPrice;
      
      // Calculate utilization rate
      const utilizationRate = this.calculateUtilizationRate(position);
      
      // Calculate fee earning rate
      const feeEarnRate = this.calculateFeeEarningRate(position);
      
      // Calculate impermanent loss
      const impermanentLoss = this.calculateImpermanentLoss(position);
      
      // Calculate time out of range
      const timeOutOfRange = this.calculateTimeOutOfRange(position);
      
      // Calculate capital efficiency
      const capitalEfficiency = this.calculateCapitalEfficiency(position);
      
      // Generate recommendation
      const recommendation = this.generatePositionRecommendation(
        position,
        inRange,
        utilizationRate,
        impermanentLoss,
        timeOutOfRange
      );
      
      // Suggest new range if rebalancing is recommended
      let suggestedRange;
      if (recommendation === 'rebalance') {
        suggestedRange = await this.suggestOptimalRange(position);
      }
      
      const analysis: PositionAnalysis = {
        position,
        inRange,
        utilizationRate,
        feeEarnRate,
        impermanentLoss,
        timeOutOfRange,
        capitalEfficiency,
        recommendation,
        suggestedRange,
      };
      
      // Store analysis
      this.positionAnalyses.set(position.positionId, analysis);
      
      return analysis;

    } catch (error) {
      this.logger.error('Failed to analyze position', error);
      throw error;
    }
  }

  async calculateOptimalRange(poolId: string): Promise<RangeOptimization> {
    this.logger.debug('Calculating optimal range for pool', { poolId });

    try {
      // Get current market data
      const currentPrice = await this.getCurrentPrice(poolId);
      const volatility = await this.calculateVolatility(poolId);
      const volume24h = await this.getVolume24h(poolId);
      const feeRate = await this.getFeeRate(poolId);
      
      // Calculate ranges for different strategies
      const conservative = this.calculateConservativeRange(currentPrice, volatility);
      const moderate = this.calculateModerateRange(currentPrice, volatility);
      const aggressive = this.calculateAggressiveRange(currentPrice, volatility);
      
      // Calculate risk metrics
      const maxDrawdown = this.calculateMaxDrawdown(poolId);
      const impermanentLossRisk = this.calculateILRisk(volatility);
      const liquidityConcentration = this.calculateLiquidityConcentration(poolId);
      
      const optimization: RangeOptimization = {
        poolId,
        currentPrice,
        volatility,
        volume24h,
        feeRate,
        conservative,
        moderate,
        aggressive,
        maxDrawdown,
        impermanentLossRisk,
        liquidityConcentration,
      };
      
      // Cache optimization
      this.poolOptimizations.set(poolId, optimization);
      
      return optimization;

    } catch (error) {
      this.logger.error('Failed to calculate optimal range', error);
      throw error;
    }
  }

  async analyzeAllPositions(): Promise<PositionAnalysis[]> {
    this.logger.debug('Analyzing all concentrated positions');
    
    const analyses: PositionAnalysis[] = [];
    
    for (const position of this.positions.values()) {
      try {
        const analysis = await this.analyzePosition(position);
        analyses.push(analysis);
      } catch (error) {
        this.logger.error(`Failed to analyze position ${position.positionId}`, error);
      }
    }
    
    // Update aggregate metrics
    this.updateAggregateMetrics(analyses);
    
    return analyses;
  }

  // Range calculation methods
  private calculateConservativeRange(
    currentPrice: number,
    volatility: number
  ): { tickLower: number; tickUpper: number; expectedAPY: number } {
    // Wide range (±30-50% of current price)
    const rangeMultiplier = Math.max(0.3, volatility * 2);
    const lowerPrice = currentPrice * (1 - rangeMultiplier);
    const upperPrice = currentPrice * (1 + rangeMultiplier);
    
    return {
      tickLower: this.priceToTick(lowerPrice),
      tickUpper: this.priceToTick(upperPrice),
      expectedAPY: 15, // Conservative APY estimate
    };
  }

  private calculateModerateRange(
    currentPrice: number,
    volatility: number
  ): { tickLower: number; tickUpper: number; expectedAPY: number } {
    // Medium range (±15-25% of current price)
    const rangeMultiplier = Math.max(0.15, volatility * 1.5);
    const lowerPrice = currentPrice * (1 - rangeMultiplier);
    const upperPrice = currentPrice * (1 + rangeMultiplier);
    
    return {
      tickLower: this.priceToTick(lowerPrice),
      tickUpper: this.priceToTick(upperPrice),
      expectedAPY: 25, // Moderate APY estimate
    };
  }

  private calculateAggressiveRange(
    currentPrice: number,
    volatility: number
  ): { tickLower: number; tickUpper: number; expectedAPY: number } {
    // Tight range (±5-15% of current price)
    const rangeMultiplier = Math.max(0.05, volatility);
    const lowerPrice = currentPrice * (1 - rangeMultiplier);
    const upperPrice = currentPrice * (1 + rangeMultiplier);
    
    return {
      tickLower: this.priceToTick(lowerPrice),
      tickUpper: this.priceToTick(upperPrice),
      expectedAPY: 45, // Aggressive APY estimate
    };
  }

  // Calculation helper methods
  private calculateUtilizationRate(position: ConcentratedLiquidityPosition): number {
    if (!position.inRange) return 0;
    
    // Calculate what percentage of the position is actively earning fees
    const currentPrice = position.currentPrice;
    const lowerPrice = position.priceRange.lower;
    const upperPrice = position.priceRange.upper;
    
    // Simple calculation - in production this would be more sophisticated
    return position.inRange ? 100 : 0;
  }

  private calculateFeeEarningRate(position: ConcentratedLiquidityPosition): number {
    // Calculate annualized fee earning rate
    const totalFees = position.tokensOwed.tokenA.add(position.tokensOwed.tokenB);
    const liquidity = position.liquidity;
    
    if (liquidity.eq(new BN(0))) return 0;
    
    // Simplified calculation - would need time tracking for accuracy
    return totalFees.toNumber() / liquidity.toNumber() * 365; // Annualized
  }

  private calculateImpermanentLoss(position: ConcentratedLiquidityPosition): number {
    // Calculate current impermanent loss
    return position.impermanentLoss;
  }

  private calculateTimeOutOfRange(position: ConcentratedLiquidityPosition): number {
    // Would track this with historical data
    return position.inRange ? 0 : 1; // Simplified
  }

  private calculateCapitalEfficiency(position: ConcentratedLiquidityPosition): number {
    // Calculate capital efficiency score (0-100)
    const utilization = this.calculateUtilizationRate(position);
    const feeRate = this.calculateFeeEarningRate(position);
    
    return (utilization * 0.6) + (Math.min(feeRate, 100) * 0.4);
  }

  private generatePositionRecommendation(
    position: ConcentratedLiquidityPosition,
    inRange: boolean,
    utilizationRate: number,
    impermanentLoss: number,
    timeOutOfRange: number
  ): 'hold' | 'rebalance' | 'close' | 'compound' {
    // Emergency exit conditions
    if (impermanentLoss > this.config.maxImpermanentLoss) {
      return 'close';
    }
    
    // Rebalancing conditions
    if (!inRange && timeOutOfRange > 24) { // Out of range for >24 hours
      return 'rebalance';
    }
    
    if (utilizationRate < this.config.rebalanceThreshold) {
      return 'rebalance';
    }
    
    // Fee compounding
    const totalFees = position.tokensOwed.tokenA.add(position.tokensOwed.tokenB);
    if (totalFees.gte(this.config.feeCompoundThreshold)) {
      return 'compound';
    }
    
    return 'hold';
  }

  private async suggestOptimalRange(
    position: ConcentratedLiquidityPosition
  ): Promise<{ tickLower: number; tickUpper: number; reasoning: string }> {
    const optimization = await this.calculateOptimalRange(position.poolId);
    const optimalRange = optimization[this.config.rangeTightness];
    
    return {
      tickLower: optimalRange.tickLower,
      tickUpper: optimalRange.tickUpper,
      reasoning: `Optimized for ${this.config.rangeTightness} strategy with ${optimalRange.expectedAPY}% expected APY`,
    };
  }

  // Market data methods
  private async getCurrentPrice(poolId: string): Promise<number> {
    // Get current price from aggregator
    return 1.0; // Placeholder
  }

  private async calculateVolatility(poolId: string): Promise<number> {
    // Calculate historical volatility
    const cached = this.volatilityCache.get(poolId);
    if (cached && Date.now() - cached < 300000) { // 5 minute cache
      return cached;
    }
    
    const history = this.priceHistory.get(poolId) || [];
    if (history.length < 24) return 0.1; // Default 10% volatility
    
    // Calculate standard deviation of returns
    const returns = [];
    for (let i = 1; i < history.length; i++) {
      const ret = (history[i].price - history[i-1].price) / history[i-1].price;
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 24 * 365); // Annualized
    
    this.volatilityCache.set(poolId, volatility);
    return volatility;
  }

  private async getVolume24h(poolId: string): Promise<BN> {
    return this.volumeCache.get(poolId) || new BN(0);
  }

  private async getFeeRate(poolId: string): Promise<number> {
    return 0.003; // 0.3% default
  }

  private calculateMaxDrawdown(poolId: string): number {
    return 0.2; // 20% default
  }

  private calculateILRisk(volatility: number): number {
    return volatility * 0.5; // Simplified IL risk calculation
  }

  private calculateLiquidityConcentration(poolId: string): number {
    return 0.1; // 10% default concentration
  }

  // Execution methods
  private async executePositionCreation(
    poolId: string,
    tokenAAmount: BN,
    tokenBAmount: BN,
    tickLower: number,
    tickUpper: number
  ): Promise<ConcentratedLiquidityPosition> {
    // Execute through aggregator
    // This would call the appropriate DEX (Orca/Raydium) integration
    
    // Placeholder implementation
    const position: ConcentratedLiquidityPosition = {
      positionId: `pos_${Date.now()}`,
      poolId,
      tokenA: new PublicKey('11111111111111111111111111111111'),
      tokenB: new PublicKey('11111111111111111111111111111111'),
      tickLower,
      tickUpper,
      liquidity: tokenAAmount.add(tokenBAmount),
      feeGrowthInside: { tokenA: new BN(0), tokenB: new BN(0) },
      tokensOwed: { tokenA: new BN(0), tokenB: new BN(0) },
      currentPrice: 1.0,
      priceRange: { lower: 0.9, upper: 1.1 },
      inRange: true,
      roi: 0,
      apy: 0,
      impermanentLoss: 0,
    };
    
    return position;
  }

  private async executeRangeRebalance(
    position: ConcentratedLiquidityPosition,
    newTickLower: number,
    newTickUpper: number
  ): Promise<ConcentratedLiquidityPosition> {
    // Close existing position and open new one
    // This would be implemented through the DEX integrations
    
    return {
      ...position,
      tickLower: newTickLower,
      tickUpper: newTickUpper,
      priceRange: {
        lower: this.tickToPrice(newTickLower),
        upper: this.tickToPrice(newTickUpper),
      },
    };
  }

  private async executeFeeCompounding(position: ConcentratedLiquidityPosition): Promise<void> {
    // Collect fees and reinvest into the position
    // Implementation would depend on the specific DEX
  }

  // Utility methods
  private priceToTick(price: number): number {
    // Convert price to tick (simplified)
    return Math.floor(Math.log(price) / Math.log(1.0001));
  }

  private tickToPrice(tick: number): number {
    // Convert tick to price (simplified)
    return Math.pow(1.0001, tick);
  }

  private calculatePoolExposure(poolId: string): number {
    const totalValue = this.metrics.totalValueLocked.toNumber();
    if (totalValue === 0) return 0;
    
    let poolValue = 0;
    for (const position of this.positions.values()) {
      if (position.poolId === poolId) {
        poolValue += position.liquidity.toNumber();
      }
    }
    
    return (poolValue / totalValue) * 100;
  }

  private updateAggregateMetrics(analyses: PositionAnalysis[]): void {
    if (analyses.length === 0) return;
    
    // Update metrics based on analyses
    this.metrics.positionsInRange = analyses.filter(a => a.inRange).length;
    this.metrics.averageUtilization = analyses.reduce((sum, a) => sum + a.utilizationRate, 0) / analyses.length;
    this.metrics.capitalEfficiency = analyses.reduce((sum, a) => sum + a.capitalEfficiency, 0) / analyses.length;
    this.metrics.averageAPY = analyses.reduce((sum, a) => sum + a.feeEarnRate, 0) / analyses.length;
  }

  // Background process methods
  private startPositionMonitoring(): void {
    this.positionMonitor = setInterval(async () => {
      try {
        await this.analyzeAllPositions();
        
        // Auto-rebalance if enabled
        if (this.config.autoRebalance && !this.isOptimizing) {
          await this.performAutoRebalancing();
        }
      } catch (error) {
        this.logger.error('Position monitoring failed', error);
      }
    }, 60000); // Every minute
  }

  private startRangeOptimization(): void {
    this.rangeOptimizer = setInterval(async () => {
      try {
        if (this.config.autoRebalance && !this.isOptimizing) {
          this.isOptimizing = true;
          await this.optimizeAllPositions();
          this.isOptimizing = false;
        }
      } catch (error) {
        this.logger.error('Range optimization failed', error);
        this.isOptimizing = false;
      }
    }, this.config.rebalanceFrequency * 60 * 1000);
  }

  private startFeeCompounding(): void {
    if (!this.config.compoundFees) return;
    
    this.feeCompounder = setInterval(async () => {
      try {
        await this.compoundAllFees();
      } catch (error) {
        this.logger.error('Fee compounding failed', error);
      }
    }, 3600000); // Every hour
  }

  private startMetricsUpdating(): void {
    this.metricsUpdater = setInterval(async () => {
      try {
        await this.updateMetrics();
      } catch (error) {
        this.logger.error('Metrics update failed', error);
      }
    }, 300000); // Every 5 minutes
  }

  // Auto-optimization methods
  private async performAutoRebalancing(): Promise<void> {
    const analyses = Array.from(this.positionAnalyses.values());
    const rebalanceNeeded = analyses.filter(a => a.recommendation === 'rebalance');
    
    for (const analysis of rebalanceNeeded) {
      try {
        await this.optimizePositionRange(analysis.position.positionId);
      } catch (error) {
        this.logger.error(`Failed to auto-rebalance position ${analysis.position.positionId}`, error);
      }
    }
  }

  private async optimizeAllPositions(): Promise<void> {
    this.logger.debug('Optimizing all positions');
    
    for (const position of this.positions.values()) {
      try {
        await this.optimizePositionRange(position.positionId);
        
        // Small delay to prevent RPC overload
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed to optimize position ${position.positionId}`, error);
      }
    }
  }

  private async compoundAllFees(): Promise<void> {
    const compoundNeeded = Array.from(this.positionAnalyses.values())
      .filter(a => a.recommendation === 'compound');
    
    for (const analysis of compoundNeeded) {
      try {
        await this.compoundPositionFees(analysis.position.positionId);
      } catch (error) {
        this.logger.error(`Failed to compound fees for position ${analysis.position.positionId}`, error);
      }
    }
  }

  private async loadExistingPositions(): Promise<void> {
    try {
      // Load positions from aggregator
      const allPositions = await this.aggregator.getAllPositions();
      const clPositions = allPositions.filter(p => 
        p.dex === 'orca' || p.dex === 'raydium'
      );
      
      let totalValue = new BN(0);
      for (const position of clPositions) {
        // Convert to ConcentratedLiquidityPosition format
        const clPosition: ConcentratedLiquidityPosition = {
          positionId: position.id,
          poolId: position.poolAddress,
          tokenA: new PublicKey(position.tokenA),
          tokenB: new PublicKey(position.tokenB),
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: new BN(position.liquidity),
          feeGrowthInside: { tokenA: new BN(0), tokenB: new BN(0) },
          tokensOwed: { tokenA: new BN(0), tokenB: new BN(0) },
          currentPrice: 1.0, // Would fetch real price
          priceRange: { lower: 0.9, upper: 1.1 }, // Would calculate from ticks
          inRange: true, // Would calculate
          roi: 0,
          apy: position.apy,
          impermanentLoss: 0,
        };
        
        this.positions.set(clPosition.positionId, clPosition);
        totalValue = totalValue.add(new BN(position.value));
      }
      
      this.metrics.totalPositions = this.positions.size;
      this.metrics.totalValueLocked = totalValue;
      
    } catch (error) {
      this.logger.error('Failed to load existing positions', error);
    }
  }

  private async updateMetrics(): Promise<void> {
    // Update performance metrics
    this.metrics.lastOptimization = Date.now();
    
    // Calculate uptime
    const uptime = this.isRunning ? 100 : 0;
    this.metrics.uptime = uptime;
  }

  // Public getters
  getMetrics(): CLMMMetrics {
    return { ...this.metrics };
  }

  getPositions(): ConcentratedLiquidityPosition[] {
    return Array.from(this.positions.values());
  }

  getPositionAnalyses(): PositionAnalysis[] {
    return Array.from(this.positionAnalyses.values());
  }

  getPoolOptimizations(): RangeOptimization[] {
    return Array.from(this.poolOptimizations.values());
  }

  isOptimizationRunning(): boolean {
    return this.isOptimizing;
  }
}

export default ConcentratedLiquidityManager;