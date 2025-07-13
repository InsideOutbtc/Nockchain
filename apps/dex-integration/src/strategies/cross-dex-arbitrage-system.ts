// Cross-DEX Arbitrage System - Automated profit capture opportunities
// Detects and executes arbitrage across Orca, Jupiter, and Raydium with advanced risk management

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import { RiskManager } from './risk-manager';
import {
  ArbitrageOpportunity,
  DexQuote,
  DexTrade,
} from '../types/dex-types';

export interface ArbitrageConfig {
  // Detection parameters
  minProfitBps: number; // Minimum profit in basis points
  maxLatency: number; // Maximum execution latency in ms
  minTradeSize: BN; // Minimum trade size
  maxTradeSize: BN; // Maximum single trade size
  
  // Risk management
  maxSlippageTotal: number; // Max total slippage across both trades
  maxPriceImpact: number; // Max price impact per trade
  gasBuffer: number; // Gas cost buffer multiplier
  maxConcurrentTrades: number; // Max simultaneous arbitrage trades
  
  // Market making
  inventoryManagement: boolean; // Enable inventory rebalancing
  maxInventoryImbalance: number; // Max % imbalance before rebalancing
  targetInventoryRatio: number; // Target ratio between tokens
  
  // Advanced features
  flashLoanIntegration: boolean; // Use flash loans for larger arbitrage
  mevProtection: boolean; // MEV protection strategies
  priorityFeeBidding: boolean; // Dynamic priority fee bidding
  sandwichProtection: boolean; // Protection against sandwich attacks
}

export interface ArbitragePath {
  id: string;
  tokenA: PublicKey;
  tokenB: PublicKey;
  buyDex: 'orca' | 'jupiter' | 'raydium';
  sellDex: 'orca' | 'jupiter' | 'raydium';
  buyQuote: DexQuote;
  sellQuote: DexQuote;
  
  // Profitability analysis
  grossProfit: BN;
  netProfit: BN; // After gas and fees
  profitBps: number; // Profit in basis points
  gasEstimate: BN;
  
  // Risk metrics
  totalSlippage: number;
  priceImpactBuy: number;
  priceImpactSell: number;
  executionRisk: number; // 0-100 risk score
  
  // Timing
  detectedAt: number;
  validUntil: number; // When opportunity expires
  estimatedExecutionTime: number;
}

export interface ArbitrageExecution {
  path: ArbitragePath;
  buyTrade: DexTrade;
  sellTrade: DexTrade;
  actualProfit: BN;
  totalGasCost: BN;
  executionTime: number;
  successful: boolean;
  failureReason?: string;
}

export interface FlashLoanArbitrage {
  loanAmount: BN;
  loanToken: PublicKey;
  arbitragePath: ArbitragePath;
  repaymentAmount: BN;
  flashLoanFee: BN;
  netProfit: BN;
  loanProvider: 'solend' | 'port' | 'custom';
}

export interface InventoryState {
  tokenBalances: Map<string, BN>;
  totalValueUSD: number;
  imbalanceScore: number; // 0-100, 0 = perfect balance
  targetAllocations: Map<string, number>; // Target % for each token
  rebalanceNeeded: boolean;
  suggestedTrades: {
    token: PublicKey;
    action: 'buy' | 'sell';
    amount: BN;
    reasoning: string;
  }[];
}

export interface ArbitrageMetrics {
  totalOpportunities: number;
  opportunitiesExecuted: number;
  totalProfitGenerated: BN;
  averageProfitPerTrade: BN;
  successRate: number;
  averageExecutionTime: number;
  gasSpent: BN;
  netProfitAfterGas: BN;
  
  // Performance by DEX pair
  dexPairPerformance: Map<string, {
    trades: number;
    profit: BN;
    successRate: number;
  }>;
  
  // Risk metrics
  maxDrawdown: BN;
  sharpeRatio: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  lastTradeTime: number;
}

export class CrossDexArbitrageSystem {
  private config: ArbitrageConfig;
  private aggregator: DexAggregator;
  private riskManager: RiskManager;
  private logger: Logger;
  
  // Opportunity tracking
  private activeOpportunities: Map<string, ArbitragePath> = new Map();
  private executionQueue: ArbitragePath[] = [];
  private recentExecutions: ArbitrageExecution[] = [];
  private metrics: ArbitrageMetrics;
  
  // Market state
  private tokenPrices: Map<string, number> = new Map();
  private inventoryState: InventoryState;
  private gasTracker: { price: number; priority: number; timestamp: number };
  
  // Control flags
  private isRunning: boolean = false;
  private isExecuting: boolean = false;
  private concurrentTrades: number = 0;
  private emergencyStop: boolean = false;
  
  // Background processes
  private opportunityScanner?: NodeJS.Timeout;
  private executionEngine?: NodeJS.Timeout;
  private inventoryManager?: NodeJS.Timeout;
  private metricsUpdater?: NodeJS.Timeout;

  constructor(
    config: ArbitrageConfig,
    aggregator: DexAggregator,
    riskManager: RiskManager,
    logger: Logger
  ) {
    this.config = config;
    this.aggregator = aggregator;
    this.riskManager = riskManager;
    this.logger = logger;
    
    this.metrics = {
      totalOpportunities: 0,
      opportunitiesExecuted: 0,
      totalProfitGenerated: new BN(0),
      averageProfitPerTrade: new BN(0),
      successRate: 100,
      averageExecutionTime: 0,
      gasSpent: new BN(0),
      netProfitAfterGas: new BN(0),
      dexPairPerformance: new Map(),
      maxDrawdown: new BN(0),
      sharpeRatio: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastTradeTime: Date.now(),
    };
    
    this.inventoryState = {
      tokenBalances: new Map(),
      totalValueUSD: 0,
      imbalanceScore: 0,
      targetAllocations: new Map(),
      rebalanceNeeded: false,
      suggestedTrades: [],
    };
    
    this.gasTracker = {
      price: 0.000005, // Default SOL per compute unit
      priority: 1000, // Default priority fee
      timestamp: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cross-DEX arbitrage system already running');
      return;
    }

    this.logger.info('Starting cross-DEX arbitrage system', {
      minProfitBps: this.config.minProfitBps,
      maxConcurrentTrades: this.config.maxConcurrentTrades,
      inventoryManagement: this.config.inventoryManagement,
    });

    try {
      // Initialize inventory state
      await this.initializeInventory();
      
      // Start background processes
      this.isRunning = true;
      this.startOpportunityScanning();
      this.startExecutionEngine();
      this.startInventoryManagement();
      this.startMetricsUpdating();
      
      this.logger.info('Cross-DEX arbitrage system started successfully', {
        initialInventoryValue: this.inventoryState.totalValueUSD,
        trackingTokens: this.inventoryState.tokenBalances.size,
      });

    } catch (error) {
      this.logger.error('Failed to start cross-DEX arbitrage system', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Cross-DEX arbitrage system not running');
      return;
    }

    this.logger.info('Stopping cross-DEX arbitrage system');

    try {
      // Stop background processes
      if (this.opportunityScanner) clearInterval(this.opportunityScanner);
      if (this.executionEngine) clearInterval(this.executionEngine);
      if (this.inventoryManager) clearInterval(this.inventoryManager);
      if (this.metricsUpdater) clearInterval(this.metricsUpdater);

      // Wait for ongoing executions to complete
      while (this.isExecuting || this.concurrentTrades > 0) {
        this.logger.info('Waiting for executions to complete...', {
          isExecuting: this.isExecuting,
          concurrentTrades: this.concurrentTrades,
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.isRunning = false;

      this.logger.info('Cross-DEX arbitrage system stopped successfully', {
        totalOpportunities: this.metrics.totalOpportunities,
        successfulTrades: this.metrics.opportunitiesExecuted,
        totalProfit: this.metrics.totalProfitGenerated.toString(),
        successRate: this.metrics.successRate,
      });

    } catch (error) {
      this.logger.error('Failed to stop cross-DEX arbitrage system gracefully', error);
      this.isRunning = false;
    }
  }

  // Core arbitrage detection
  async scanForOpportunities(): Promise<ArbitragePath[]> {
    if (this.emergencyStop) return [];

    this.logger.debug('Scanning for cross-DEX arbitrage opportunities');

    try {
      const opportunities: ArbitragePath[] = [];
      
      // Get all tracked token pairs
      const tokenPairs = await this.getTrackedTokenPairs();
      
      for (const pair of tokenPairs) {
        try {
          const pathOpportunities = await this.findArbitragePathsForPair(pair.tokenA, pair.tokenB);
          opportunities.push(...pathOpportunities);
        } catch (error) {
          this.logger.debug(`Failed to scan pair ${pair.tokenA.toString()}-${pair.tokenB.toString()}`, error);
        }
      }
      
      // Filter and rank opportunities
      const validOpportunities = opportunities
        .filter(opp => this.validateOpportunity(opp))
        .sort((a, b) => b.profitBps - a.profitBps);
      
      // Update opportunity tracking
      this.updateOpportunityTracking(validOpportunities);
      
      this.logger.debug(`Found ${validOpportunities.length} valid arbitrage opportunities`, {
        topProfit: validOpportunities[0]?.profitBps || 0,
        totalScanned: opportunities.length,
      });
      
      return validOpportunities;

    } catch (error) {
      this.logger.error('Failed to scan for arbitrage opportunities', error);
      return [];
    }
  }

  async findArbitragePathsForPair(
    tokenA: PublicKey,
    tokenB: PublicKey
  ): Promise<ArbitragePath[]> {
    const paths: ArbitragePath[] = [];
    const amount = this.calculateOptimalTradeSize(tokenA, tokenB);
    
    try {
      // Get quotes from all DEXs
      const quotes = await this.aggregator.getAllQuotes(tokenA, tokenB, amount);
      
      if (quotes.length < 2) return paths;
      
      // Find arbitrage opportunities between all DEX pairs
      for (let i = 0; i < quotes.length; i++) {
        for (let j = 0; j < quotes.length; j++) {
          if (i === j) continue;
          
          const buyQuote = quotes[i];
          const sellQuote = quotes[j];
          
          // Calculate reverse quote for selling
          const sellAmount = new BN(buyQuote.outputAmount);
          const reverseSellQuotes = await this.aggregator.getAllQuotes(tokenB, tokenA, sellAmount);
          const actualSellQuote = reverseSellQuotes.find(q => q.dex === sellQuote.dex);
          
          if (!actualSellQuote) continue;
          
          // Calculate profitability
          const path = await this.calculateArbitragePath(
            tokenA,
            tokenB,
            buyQuote,
            actualSellQuote,
            amount
          );
          
          if (path && path.profitBps >= this.config.minProfitBps) {
            paths.push(path);
          }
        }
      }
      
    } catch (error) {
      this.logger.debug(`Failed to find arbitrage paths for ${tokenA.toString()}-${tokenB.toString()}`, error);
    }
    
    return paths;
  }

  async executeArbitrage(path: ArbitragePath): Promise<ArbitrageExecution> {
    if (this.concurrentTrades >= this.config.maxConcurrentTrades) {
      throw new Error('Maximum concurrent trades reached');
    }

    this.concurrentTrades++;
    const startTime = Date.now();

    this.logger.info('Executing arbitrage opportunity', {
      pathId: path.id,
      buyDex: path.buyDex,
      sellDex: path.sellDex,
      expectedProfit: path.netProfit.toString(),
      profitBps: path.profitBps,
    });

    try {
      // Pre-execution validation
      await this.validateExecutionConditions(path);
      
      // Check if flash loan is beneficial
      const useFlashLoan = this.shouldUseFlashLoan(path);
      
      let execution: ArbitrageExecution;
      
      if (useFlashLoan && this.config.flashLoanIntegration) {
        execution = await this.executeFlashLoanArbitrage(path);
      } else {
        execution = await this.executeSpotArbitrage(path);
      }
      
      // Update metrics
      this.updateExecutionMetrics(execution);
      
      // Store execution history
      this.recentExecutions.push(execution);
      if (this.recentExecutions.length > 1000) {
        this.recentExecutions = this.recentExecutions.slice(-1000);
      }
      
      this.logger.info('Arbitrage execution completed', {
        pathId: path.id,
        successful: execution.successful,
        actualProfit: execution.actualProfit.toString(),
        executionTime: execution.executionTime,
      });
      
      return execution;

    } catch (error) {
      this.logger.error('Arbitrage execution failed', error);
      
      const failedExecution: ArbitrageExecution = {
        path,
        buyTrade: {} as DexTrade,
        sellTrade: {} as DexTrade,
        actualProfit: new BN(0),
        totalGasCost: new BN(0),
        executionTime: Date.now() - startTime,
        successful: false,
        failureReason: error.message,
      };
      
      this.updateExecutionMetrics(failedExecution);
      return failedExecution;

    } finally {
      this.concurrentTrades--;
    }
  }

  // Flash loan arbitrage
  async executeFlashLoanArbitrage(path: ArbitragePath): Promise<ArbitrageExecution> {
    this.logger.debug('Executing flash loan arbitrage', { pathId: path.id });
    
    const startTime = Date.now();
    
    try {
      // Calculate optimal loan amount
      const loanAmount = this.calculateOptimalLoanAmount(path);
      
      // Build flash loan transaction
      const flashLoanTx = await this.buildFlashLoanTransaction(path, loanAmount);
      
      // Execute transaction
      const signature = await this.executeTransaction(flashLoanTx);
      
      // Parse results
      const execution = await this.parseFlashLoanExecution(signature, path, startTime);
      
      return execution;

    } catch (error) {
      this.logger.error('Flash loan arbitrage failed', error);
      throw error;
    }
  }

  async executeSpotArbitrage(path: ArbitragePath): Promise<ArbitrageExecution> {
    this.logger.debug('Executing spot arbitrage', { pathId: path.id });
    
    const startTime = Date.now();
    
    try {
      // Execute buy trade
      const buyTrade = await this.executeBuyTrade(path);
      
      if (!buyTrade.successful) {
        throw new Error(`Buy trade failed: ${buyTrade.error}`);
      }
      
      // Execute sell trade
      const sellTrade = await this.executeSellTrade(path, new BN(buyTrade.outputAmount));
      
      // Calculate results
      const actualProfit = sellTrade.successful 
        ? new BN(sellTrade.outputAmount).sub(new BN(path.buyQuote.inputAmount))
        : new BN(0);
      
      const totalGasCost = new BN(buyTrade.gasUsed).add(new BN(sellTrade.gasUsed));
      
      const execution: ArbitrageExecution = {
        path,
        buyTrade,
        sellTrade,
        actualProfit,
        totalGasCost,
        executionTime: Date.now() - startTime,
        successful: buyTrade.successful && sellTrade.successful,
        failureReason: !sellTrade.successful ? sellTrade.error : undefined,
      };
      
      return execution;

    } catch (error) {
      this.logger.error('Spot arbitrage failed', error);
      throw error;
    }
  }

  // Inventory management
  async rebalanceInventory(): Promise<void> {
    if (!this.config.inventoryManagement) return;

    this.logger.debug('Rebalancing inventory');

    try {
      await this.updateInventoryState();
      
      if (!this.inventoryState.rebalanceNeeded) {
        this.logger.debug('Inventory rebalancing not needed');
        return;
      }
      
      // Execute suggested rebalancing trades
      for (const trade of this.inventoryState.suggestedTrades) {
        try {
          await this.executeInventoryTrade(trade);
        } catch (error) {
          this.logger.error(`Failed to execute inventory trade for ${trade.token.toString()}`, error);
        }
      }
      
      // Update inventory state after rebalancing
      await this.updateInventoryState();
      
      this.logger.info('Inventory rebalanced successfully', {
        newImbalanceScore: this.inventoryState.imbalanceScore,
        totalValue: this.inventoryState.totalValueUSD,
      });

    } catch (error) {
      this.logger.error('Failed to rebalance inventory', error);
    }
  }

  // Risk management and validation
  private validateOpportunity(path: ArbitragePath): boolean {
    // Profit threshold
    if (path.profitBps < this.config.minProfitBps) return false;
    
    // Slippage limits
    if (path.totalSlippage > this.config.maxSlippageTotal) return false;
    
    // Price impact limits
    if (path.priceImpactBuy > this.config.maxPriceImpact) return false;
    if (path.priceImpactSell > this.config.maxPriceImpact) return false;
    
    // Gas cost validation
    const gasThreshold = path.grossProfit.muln(this.config.gasBuffer);
    if (path.gasEstimate.gt(gasThreshold)) return false;
    
    // Timing validation
    if (Date.now() > path.validUntil) return false;
    
    // Risk score threshold
    if (path.executionRisk > 80) return false; // Max 80% risk
    
    return true;
  }

  private async validateExecutionConditions(path: ArbitragePath): Promise<void> {
    // Re-validate opportunity is still valid
    if (!this.validateOpportunity(path)) {
      throw new Error('Opportunity no longer valid');
    }
    
    // Check inventory constraints
    if (this.config.inventoryManagement) {
      const hasEnoughInventory = await this.checkInventoryForTrade(path);
      if (!hasEnoughInventory) {
        throw new Error('Insufficient inventory for trade');
      }
    }
    
    // Check risk limits
    const riskCheck = await this.riskManager.validateTrade({
      amount: new BN(path.buyQuote.inputAmount),
      token: path.tokenA,
      type: 'arbitrage',
    } as any);
    
    if (!riskCheck.approved) {
      throw new Error(`Risk validation failed: ${riskCheck.reason}`);
    }
    
    // MEV protection
    if (this.config.mevProtection) {
      const mevRisk = await this.assessMEVRisk(path);
      if (mevRisk > 0.5) { // 50% MEV risk threshold
        throw new Error('High MEV risk detected');
      }
    }
  }

  // Calculation methods
  private async calculateArbitragePath(
    tokenA: PublicKey,
    tokenB: PublicKey,
    buyQuote: DexQuote,
    sellQuote: DexQuote,
    amount: BN
  ): Promise<ArbitragePath | null> {
    try {
      const grossProfit = new BN(sellQuote.outputAmount).sub(new BN(buyQuote.inputAmount));
      
      if (grossProfit.lte(new BN(0))) return null;
      
      // Calculate gas estimate
      const gasEstimate = new BN(1000000 * 2); // Rough estimate for two trades
      
      // Calculate net profit
      const gasCost = gasEstimate.muln(this.gasTracker.price * 1000000); // Convert to lamports
      const tradingFees = new BN(buyQuote.fee).add(new BN(sellQuote.fee));
      const netProfit = grossProfit.sub(gasCost).sub(tradingFees);
      
      if (netProfit.lte(new BN(0))) return null;
      
      // Calculate profit in basis points
      const profitBps = netProfit.muln(10000).div(new BN(buyQuote.inputAmount)).toNumber();
      
      // Calculate risk metrics
      const totalSlippage = buyQuote.priceImpact + sellQuote.priceImpact;
      const executionRisk = this.calculateExecutionRisk(buyQuote, sellQuote);
      
      const path: ArbitragePath = {
        id: `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenA,
        tokenB,
        buyDex: buyQuote.dex,
        sellDex: sellQuote.dex,
        buyQuote,
        sellQuote,
        grossProfit,
        netProfit,
        profitBps,
        gasEstimate,
        totalSlippage,
        priceImpactBuy: buyQuote.priceImpact,
        priceImpactSell: sellQuote.priceImpact,
        executionRisk,
        detectedAt: Date.now(),
        validUntil: Date.now() + this.config.maxLatency,
        estimatedExecutionTime: this.estimateExecutionTime(buyQuote.dex, sellQuote.dex),
      };
      
      return path;

    } catch (error) {
      this.logger.debug('Failed to calculate arbitrage path', error);
      return null;
    }
  }

  private calculateOptimalTradeSize(tokenA: PublicKey, tokenB: PublicKey): BN {
    // Get inventory balance for the token
    const balanceA = this.inventoryState.tokenBalances.get(tokenA.toString()) || new BN(0);
    
    // Use a fraction of available balance or default size
    const inventoryFraction = balanceA.divn(4); // 25% of inventory
    const defaultSize = this.config.minTradeSize.muln(10); // 10x minimum
    
    return BN.max(
      BN.min(inventoryFraction, this.config.maxTradeSize),
      this.config.minTradeSize
    );
  }

  private calculateExecutionRisk(buyQuote: DexQuote, sellQuote: DexQuote): number {
    // Risk factors (0-100 scale)
    const latencyRisk = Math.min(100, (Date.now() - buyQuote.timestamp) / 1000 * 10);
    const slippageRisk = (buyQuote.priceImpact + sellQuote.priceImpact) * 10;
    const liquidityRisk = buyQuote.route.length > 2 ? 20 : 0; // Multi-hop risk
    
    return Math.min(100, latencyRisk + slippageRisk + liquidityRisk);
  }

  private shouldUseFlashLoan(path: ArbitragePath): boolean {
    if (!this.config.flashLoanIntegration) return false;
    
    const tradeSize = new BN(path.buyQuote.inputAmount);
    const inventory = this.inventoryState.tokenBalances.get(path.tokenA.toString()) || new BN(0);
    
    // Use flash loan if trade size exceeds available inventory
    return tradeSize.gt(inventory);
  }

  private calculateOptimalLoanAmount(path: ArbitragePath): BN {
    // Calculate the amount needed for the arbitrage
    return new BN(path.buyQuote.inputAmount);
  }

  private estimateExecutionTime(buyDex: string, sellDex: string): number {
    // Estimate based on DEX characteristics
    const dexLatency = { orca: 1000, jupiter: 1500, raydium: 1200 }; // ms
    return (dexLatency[buyDex] || 1000) + (dexLatency[sellDex] || 1000);
  }

  // Execution methods
  private async executeBuyTrade(path: ArbitragePath): Promise<DexTrade> {
    const amount = new BN(path.buyQuote.inputAmount);
    const minReceived = new BN(path.buyQuote.minimumReceived);
    
    switch (path.buyDex) {
      case 'orca':
        return this.aggregator.executeDexTrade('orca', path.tokenA, path.tokenB, amount);
      case 'jupiter':
        return this.aggregator.executeDexTrade('jupiter', path.tokenA, path.tokenB, amount);
      case 'raydium':
        return this.aggregator.executeDexTrade('raydium', path.tokenA, path.tokenB, amount);
      default:
        throw new Error(`Unsupported DEX: ${path.buyDex}`);
    }
  }

  private async executeSellTrade(path: ArbitragePath, amount: BN): Promise<DexTrade> {
    switch (path.sellDex) {
      case 'orca':
        return this.aggregator.executeDexTrade('orca', path.tokenB, path.tokenA, amount);
      case 'jupiter':
        return this.aggregator.executeDexTrade('jupiter', path.tokenB, path.tokenA, amount);
      case 'raydium':
        return this.aggregator.executeDexTrade('raydium', path.tokenB, path.tokenA, amount);
      default:
        throw new Error(`Unsupported DEX: ${path.sellDex}`);
    }
  }

  private async buildFlashLoanTransaction(path: ArbitragePath, loanAmount: BN): Promise<Transaction> {
    // Build complex transaction with flash loan
    // This would integrate with flash loan providers like Solend or Port
    
    const transaction = new Transaction();
    // Add flash loan instructions
    // Add arbitrage instructions
    // Add repayment instructions
    
    return transaction;
  }

  private async executeTransaction(transaction: Transaction): Promise<string> {
    // Execute transaction with appropriate priority fees
    // This is a simplified implementation
    return 'transaction_signature';
  }

  private async parseFlashLoanExecution(
    signature: string,
    path: ArbitragePath,
    startTime: number
  ): Promise<ArbitrageExecution> {
    // Parse transaction results and calculate actual profit
    // This would analyze the transaction logs
    
    return {
      path,
      buyTrade: {} as DexTrade,
      sellTrade: {} as DexTrade,
      actualProfit: path.netProfit,
      totalGasCost: path.gasEstimate,
      executionTime: Date.now() - startTime,
      successful: true,
    };
  }

  // Inventory management methods
  private async initializeInventory(): Promise<void> {
    try {
      const balances = await this.aggregator.getAllBalances();
      
      this.inventoryState.tokenBalances.clear();
      let totalValueUSD = 0;
      
      for (const balance of balances) {
        this.inventoryState.tokenBalances.set(balance.mint, new BN(balance.amount));
        
        // Get USD value (simplified)
        const price = this.tokenPrices.get(balance.mint) || 1;
        totalValueUSD += balance.uiAmount * price;
      }
      
      this.inventoryState.totalValueUSD = totalValueUSD;
      
      // Set target allocations (equal weight for simplicity)
      const numTokens = this.inventoryState.tokenBalances.size;
      const targetPercent = 100 / numTokens;
      
      for (const [token] of this.inventoryState.tokenBalances) {
        this.inventoryState.targetAllocations.set(token, targetPercent);
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize inventory', error);
    }
  }

  private async updateInventoryState(): Promise<void> {
    await this.initializeInventory(); // Refresh balances
    
    // Calculate imbalance score
    this.inventoryState.imbalanceScore = this.calculateImbalanceScore();
    
    // Check if rebalancing is needed
    this.inventoryState.rebalanceNeeded = 
      this.inventoryState.imbalanceScore > this.config.maxInventoryImbalance;
    
    // Generate rebalancing suggestions
    if (this.inventoryState.rebalanceNeeded) {
      this.inventoryState.suggestedTrades = this.generateRebalancingTrades();
    }
  }

  private calculateImbalanceScore(): number {
    let totalImbalance = 0;
    const totalValue = this.inventoryState.totalValueUSD;
    
    if (totalValue === 0) return 0;
    
    for (const [token, balance] of this.inventoryState.tokenBalances) {
      const price = this.tokenPrices.get(token) || 1;
      const currentValue = balance.toNumber() * price;
      const currentPercent = (currentValue / totalValue) * 100;
      
      const targetPercent = this.inventoryState.targetAllocations.get(token) || 0;
      const deviation = Math.abs(currentPercent - targetPercent);
      
      totalImbalance += deviation;
    }
    
    return totalImbalance;
  }

  private generateRebalancingTrades(): any[] {
    const trades = [];
    const totalValue = this.inventoryState.totalValueUSD;
    
    for (const [token, balance] of this.inventoryState.tokenBalances) {
      const price = this.tokenPrices.get(token) || 1;
      const currentValue = balance.toNumber() * price;
      const currentPercent = (currentValue / totalValue) * 100;
      
      const targetPercent = this.inventoryState.targetAllocations.get(token) || 0;
      const deviation = currentPercent - targetPercent;
      
      if (Math.abs(deviation) > 5) { // 5% threshold
        trades.push({
          token: new PublicKey(token),
          action: deviation > 0 ? 'sell' : 'buy',
          amount: new BN(Math.abs(deviation) * totalValue / price / 100),
          reasoning: `Rebalance ${deviation > 0 ? 'excess' : 'deficit'} of ${Math.abs(deviation).toFixed(2)}%`,
        });
      }
    }
    
    return trades;
  }

  private async executeInventoryTrade(trade: any): Promise<void> {
    // Execute rebalancing trade
    this.logger.debug('Executing inventory rebalancing trade', {
      token: trade.token.toString(),
      action: trade.action,
      amount: trade.amount.toString(),
    });
    
    // Implementation would execute the actual trade
  }

  private async checkInventoryForTrade(path: ArbitragePath): Promise<boolean> {
    const requiredAmount = new BN(path.buyQuote.inputAmount);
    const available = this.inventoryState.tokenBalances.get(path.tokenA.toString()) || new BN(0);
    
    return available.gte(requiredAmount);
  }

  // Helper methods
  private async getTrackedTokenPairs(): Promise<Array<{ tokenA: PublicKey; tokenB: PublicKey }>> {
    // Return list of token pairs to monitor for arbitrage
    // This would be configurable based on trading strategy
    
    return [
      {
        tokenA: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
        tokenB: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
      },
      // Add more pairs...
    ];
  }

  private updateOpportunityTracking(opportunities: ArbitragePath[]): void {
    // Update active opportunities
    this.activeOpportunities.clear();
    opportunities.forEach(opp => {
      this.activeOpportunities.set(opp.id, opp);
    });
    
    // Update metrics
    this.metrics.totalOpportunities += opportunities.length;
  }

  private updateExecutionMetrics(execution: ArbitrageExecution): void {
    if (execution.successful) {
      this.metrics.opportunitiesExecuted++;
      this.metrics.totalProfitGenerated = this.metrics.totalProfitGenerated.add(execution.actualProfit);
      this.metrics.consecutiveWins++;
      this.metrics.consecutiveLosses = 0;
    } else {
      this.metrics.consecutiveLosses++;
      this.metrics.consecutiveWins = 0;
    }
    
    this.metrics.gasSpent = this.metrics.gasSpent.add(execution.totalGasCost);
    this.metrics.netProfitAfterGas = this.metrics.totalProfitGenerated.sub(this.metrics.gasSpent);
    
    // Update success rate
    this.metrics.successRate = (this.metrics.opportunitiesExecuted / 
      Math.max(1, this.metrics.opportunitiesExecuted + this.metrics.consecutiveLosses)) * 100;
    
    // Update average profit per trade
    if (this.metrics.opportunitiesExecuted > 0) {
      this.metrics.averageProfitPerTrade = this.metrics.totalProfitGenerated.divn(this.metrics.opportunitiesExecuted);
    }
    
    // Update DEX pair performance
    const pairKey = `${execution.path.buyDex}-${execution.path.sellDex}`;
    const pairStats = this.metrics.dexPairPerformance.get(pairKey) || {
      trades: 0,
      profit: new BN(0),
      successRate: 0,
    };
    
    pairStats.trades++;
    if (execution.successful) {
      pairStats.profit = pairStats.profit.add(execution.actualProfit);
    }
    pairStats.successRate = (pairStats.trades > 0) ? 
      (pairStats.profit.gt(new BN(0)) ? 100 : 0) : 0; // Simplified
    
    this.metrics.dexPairPerformance.set(pairKey, pairStats);
    
    this.metrics.lastTradeTime = Date.now();
  }

  private async assessMEVRisk(path: ArbitragePath): Promise<number> {
    // Assess MEV risk for the arbitrage opportunity
    // This would analyze mempool activity, gas prices, etc.
    return 0.1; // 10% risk (placeholder)
  }

  // Background process methods
  private startOpportunityScanning(): void {
    this.opportunityScanner = setInterval(async () => {
      try {
        const opportunities = await this.scanForOpportunities();
        
        // Add profitable opportunities to execution queue
        for (const opp of opportunities) {
          if (this.executionQueue.length < 10) { // Limit queue size
            this.executionQueue.push(opp);
          }
        }
      } catch (error) {
        this.logger.error('Opportunity scanning failed', error);
      }
    }, 1000); // Scan every second
  }

  private startExecutionEngine(): void {
    this.executionEngine = setInterval(async () => {
      try {
        if (this.executionQueue.length > 0 && !this.isExecuting && !this.emergencyStop) {
          this.isExecuting = true;
          
          const opportunity = this.executionQueue.shift()!;
          await this.executeArbitrage(opportunity);
          
          this.isExecuting = false;
        }
      } catch (error) {
        this.logger.error('Execution engine failed', error);
        this.isExecuting = false;
      }
    }, 100); // Check every 100ms
  }

  private startInventoryManagement(): void {
    if (!this.config.inventoryManagement) return;
    
    this.inventoryManager = setInterval(async () => {
      try {
        await this.rebalanceInventory();
      } catch (error) {
        this.logger.error('Inventory management failed', error);
      }
    }, 300000); // Every 5 minutes
  }

  private startMetricsUpdating(): void {
    this.metricsUpdater = setInterval(async () => {
      try {
        await this.updateMetrics();
      } catch (error) {
        this.logger.error('Metrics update failed', error);
      }
    }, 60000); // Every minute
  }

  private async updateMetrics(): Promise<void> {
    // Update various performance metrics
    this.metrics.averageExecutionTime = this.recentExecutions.length > 0
      ? this.recentExecutions.reduce((sum, ex) => sum + ex.executionTime, 0) / this.recentExecutions.length
      : 0;
      
    // Update gas tracker
    await this.updateGasTracker();
  }

  private async updateGasTracker(): Promise<void> {
    // Update current gas prices and priority fees
    // This would query recent blocks for gas price data
    this.gasTracker.timestamp = Date.now();
  }

  // Public getters
  getMetrics(): ArbitrageMetrics {
    return { ...this.metrics };
  }

  getActiveOpportunities(): ArbitragePath[] {
    return Array.from(this.activeOpportunities.values());
  }

  getRecentExecutions(): ArbitrageExecution[] {
    return [...this.recentExecutions];
  }

  getInventoryState(): InventoryState {
    return { ...this.inventoryState };
  }

  emergencyStopArbitrage(): void {
    this.emergencyStop = true;
    this.logger.warn('Emergency stop activated - arbitrage halted');
  }

  resumeArbitrage(): void {
    this.emergencyStop = false;
    this.logger.info('Arbitrage resumed');
  }
}

export default CrossDexArbitrageSystem;