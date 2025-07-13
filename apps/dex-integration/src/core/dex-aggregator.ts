// Multi-DEX aggregator for optimal routing and execution across Orca, Jupiter, and Raydium

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { OrcaIntegration } from '../dex/orca-integration';
import { JupiterIntegration } from '../dex/jupiter-integration';
import { RaydiumIntegration } from '../dex/raydium-integration';
import {
  DexQuote,
  DexTrade,
  DexPosition,
  DexBalance,
  ArbitrageOpportunity,
  CrossDexAnalytics,
  DexIntegrationConfig,
  TradeType,
  DexMetrics,
} from '../types/dex-types';

export interface AggregatorConfig {
  connection: Connection;
  wallet: Keypair;
  wnockMint: PublicKey;
  usdcMint: PublicKey;
  solMint: PublicKey;
  config: DexIntegrationConfig;
}

export interface OptimalRoute {
  dex: 'orca' | 'jupiter' | 'raydium';
  quote: DexQuote;
  score: number; // Composite score based on price, impact, and fees
  reasoning: string;
}

export interface ExecutionPlan {
  trades: {
    dex: 'orca' | 'jupiter' | 'raydium';
    quote: DexQuote;
    percentage: number; // Percentage of total amount
  }[];
  expectedOutput: BN;
  totalFees: BN;
  averagePriceImpact: number;
  estimatedGas: number;
}

export class DexAggregator {
  private config: AggregatorConfig;
  private logger: Logger;
  
  // DEX integrations
  private orca?: OrcaIntegration;
  private jupiter?: JupiterIntegration;
  private raydium?: RaydiumIntegration;
  
  // Analytics and tracking
  private metrics: Map<string, DexMetrics> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number; dex: string }> = new Map();
  private arbitrageHistory: ArbitrageOpportunity[] = [];
  
  // Performance tracking
  private routingStats = {
    totalQuotes: 0,
    successfulRoutes: 0,
    optimalSelections: { orca: 0, jupiter: 0, raydium: 0 },
    averageResponseTime: 0,
  };

  constructor(config: AggregatorConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing DEX aggregator');
    
    try {
      // Initialize enabled DEX integrations
      if (this.config.config.orca.enabled) {
        this.orca = new OrcaIntegration({
          connection: this.config.connection,
          wallet: this.config.wallet,
          wnockMint: this.config.wnockMint,
          usdcMint: this.config.usdcMint,
          solMint: this.config.solMint,
          whirlpoolProgram: new PublicKey(this.config.config.orca.whirlpoolProgram),
          slippageTolerance: this.config.config.orca.slippageTolerance,
          maxPriceImpact: this.config.config.orca.maxPriceImpact,
        }, this.logger);
        
        await this.orca.initialize();
        this.logger.info('Orca integration initialized');
      }
      
      if (this.config.config.jupiter.enabled) {
        this.jupiter = new JupiterIntegration({
          connection: this.config.connection,
          wallet: this.config.wallet,
          wnockMint: this.config.wnockMint,
          usdcMint: this.config.usdcMint,
          solMint: this.config.solMint,
          apiUrl: this.config.config.jupiter.apiUrl,
          slippageBps: this.config.config.jupiter.slippageBps,
          maxAccounts: this.config.config.jupiter.maxAccounts,
          onlyDirectRoutes: this.config.config.jupiter.onlyDirectRoutes,
        }, this.logger);
        
        await this.jupiter.initialize();
        this.logger.info('Jupiter integration initialized');
      }
      
      if (this.config.config.raydium.enabled) {
        this.raydium = new RaydiumIntegration({
          connection: this.config.connection,
          wallet: this.config.wallet,
          wnockMint: this.config.wnockMint,
          usdcMint: this.config.usdcMint,
          solMint: this.config.solMint,
          rayMint: new PublicKey('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'), // RAY token
          slippageTolerance: this.config.config.raydium.slippageTolerance,
          maxPriceImpact: this.config.config.raydium.maxPriceImpact,
        }, this.logger);
        
        await this.raydium.initialize();
        this.logger.info('Raydium integration initialized');
      }
      
      // Start background processes
      this.startArbitrageScanning();
      this.startMetricsCollection();
      this.startPriceTracking();
      
      this.logger.info('DEX aggregator initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize DEX aggregator', error);
      throw error;
    }
  }

  // Core routing and execution
  async getBestQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageTolerance?: number
  ): Promise<OptimalRoute> {
    const startTime = Date.now();
    this.routingStats.totalQuotes++;
    
    try {
      const quotes = await this.getAllQuotes(inputMint, outputMint, amount, slippageTolerance);
      
      if (quotes.length === 0) {
        throw new Error('No quotes available from any DEX');
      }
      
      // Score and rank quotes
      const scoredQuotes = quotes.map(quote => {
        const score = this.calculateQuoteScore(quote);
        return {
          dex: quote.dex,
          quote,
          score,
          reasoning: this.generateReasoning(quote, score),
        };
      });
      
      // Sort by score (highest first)
      scoredQuotes.sort((a, b) => b.score - a.score);
      
      const optimal = scoredQuotes[0];
      this.routingStats.optimalSelections[optimal.dex]++;
      this.routingStats.successfulRoutes++;
      this.routingStats.averageResponseTime = 
        (this.routingStats.averageResponseTime * (this.routingStats.totalQuotes - 1) + 
         (Date.now() - startTime)) / this.routingStats.totalQuotes;
      
      this.logger.info('Optimal route selected', {
        dex: optimal.dex,
        outputAmount: optimal.quote.outputAmount,
        priceImpact: optimal.quote.priceImpact,
        score: optimal.score,
      });
      
      return optimal;
      
    } catch (error) {
      this.logger.error('Failed to get best quote', error);
      throw error;
    }
  }

  async getAllQuotes(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageTolerance?: number
  ): Promise<DexQuote[]> {
    const quotes: DexQuote[] = [];
    const promises: Promise<DexQuote>[] = [];
    
    // Get quotes from all enabled DEXes in parallel
    if (this.orca) {
      promises.push(
        this.orca.getSwapQuote(inputMint, outputMint, amount, slippageTolerance)
          .catch(error => {
            this.logger.warn('Orca quote failed', error);
            return null;
          })
      );
    }
    
    if (this.jupiter) {
      promises.push(
        this.jupiter.getSwapQuote(inputMint, outputMint, amount, slippageTolerance)
          .catch(error => {
            this.logger.warn('Jupiter quote failed', error);
            return null;
          })
      );
    }
    
    if (this.raydium) {
      promises.push(
        this.raydium.getSwapQuote(inputMint, outputMint, amount, slippageTolerance)
          .catch(error => {
            this.logger.warn('Raydium quote failed', error);
            return null;
          })
      );
    }
    
    const results = await Promise.all(promises);
    
    // Filter out null results and add valid quotes
    for (const result of results) {
      if (result && result.valid) {
        quotes.push(result);
      }
    }
    
    return quotes;
  }

  async executeOptimalSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageTolerance?: number
  ): Promise<DexTrade> {
    try {
      const optimal = await this.getBestQuote(inputMint, outputMint, amount, slippageTolerance);
      
      // Execute on the optimal DEX
      let trade: DexTrade;
      
      switch (optimal.dex) {
        case 'orca':
          if (!this.orca) throw new Error('Orca not initialized');
          trade = await this.orca.executeSwap(
            inputMint,
            outputMint,
            amount,
            new BN(optimal.quote.minimumReceived),
            slippageTolerance
          );
          break;
          
        case 'jupiter':
          if (!this.jupiter) throw new Error('Jupiter not initialized');
          trade = await this.jupiter.executeSwap(
            inputMint,
            outputMint,
            amount,
            slippageTolerance
          );
          break;
          
        case 'raydium':
          if (!this.raydium) throw new Error('Raydium not initialized');
          trade = await this.raydium.executeSwap(
            inputMint,
            outputMint,
            amount,
            new BN(optimal.quote.minimumReceived),
            slippageTolerance
          );
          break;
          
        default:
          throw new Error(`Unsupported DEX: ${optimal.dex}`);
      }
      
      // Update metrics
      await this.updateTradeMetrics(trade);
      
      this.logger.info('Optimal swap executed successfully', {
        dex: optimal.dex,
        signature: trade.signature,
        inputAmount: trade.inputAmount,
        outputAmount: trade.outputAmount,
      });
      
      return trade;
      
    } catch (error) {
      this.logger.error('Failed to execute optimal swap', error);
      throw error;
    }
  }

  async executeSplitSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageTolerance?: number,
    maxSplits: number = 3
  ): Promise<DexTrade[]> {
    try {
      const plan = await this.createSplitExecutionPlan(
        inputMint,
        outputMint,
        amount,
        maxSplits,
        slippageTolerance
      );
      
      const trades: DexTrade[] = [];
      
      // Execute each part of the split
      for (const trade of plan.trades) {
        const tradeAmount = amount.muln(trade.percentage).divn(100);
        
        let result: DexTrade;
        
        switch (trade.dex) {
          case 'orca':
            if (!this.orca) throw new Error('Orca not initialized');
            result = await this.orca.executeSwap(
              inputMint,
              outputMint,
              tradeAmount,
              new BN(trade.quote.minimumReceived),
              slippageTolerance
            );
            break;
            
          case 'jupiter':
            if (!this.jupiter) throw new Error('Jupiter not initialized');
            result = await this.jupiter.executeSwap(
              inputMint,
              outputMint,
              tradeAmount,
              slippageTolerance
            );
            break;
            
          case 'raydium':
            if (!this.raydium) throw new Error('Raydium not initialized');
            result = await this.raydium.executeSwap(
              inputMint,
              outputMint,
              tradeAmount,
              new BN(trade.quote.minimumReceived),
              slippageTolerance
            );
            break;
            
          default:
            throw new Error(`Unsupported DEX: ${trade.dex}`);
        }
        
        trades.push(result);
        await this.updateTradeMetrics(result);
      }
      
      this.logger.info('Split swap executed successfully', {
        totalTrades: trades.length,
        successfulTrades: trades.filter(t => t.successful).length,
        totalOutput: trades.reduce((sum, t) => sum.add(new BN(t.outputAmount)), new BN(0)).toString(),
      });
      
      return trades;
      
    } catch (error) {
      this.logger.error('Failed to execute split swap', error);
      throw error;
    }
  }

  // Arbitrage and opportunity detection
  async findArbitrageOpportunities(
    tokens: PublicKey[],
    minProfitBps: number = 50
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      // Check all token pairs for arbitrage opportunities
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const tokenA = tokens[i];
          const tokenB = tokens[j];
          
          // Get prices from all DEXes
          const prices = await this.getTokenPairPrices(tokenA, tokenB);
          
          // Find arbitrage opportunities
          const arb = this.calculateArbitrage(tokenA, tokenB, prices, minProfitBps);
          if (arb) {
            opportunities.push(arb);
          }
        }
      }
      
      // Sort by profit percentage
      opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
      
      // Store in history
      this.arbitrageHistory.push(...opportunities);
      
      // Keep only last 1000 opportunities
      if (this.arbitrageHistory.length > 1000) {
        this.arbitrageHistory = this.arbitrageHistory.slice(-1000);
      }
      
      this.logger.debug(`Found ${opportunities.length} arbitrage opportunities`);
      
      return opportunities;
      
    } catch (error) {
      this.logger.error('Failed to find arbitrage opportunities', error);
      return [];
    }
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<{
    buyTrade: DexTrade;
    sellTrade: DexTrade;
    profit: BN;
    successful: boolean;
  }> {
    try {
      if (!opportunity.valid) {
        throw new Error('Arbitrage opportunity is no longer valid');
      }
      
      const amount = new BN(opportunity.maxAmount);
      
      // Execute buy trade
      const buyTrade = await this.executeDexTrade(
        opportunity.buyDex,
        new PublicKey(opportunity.tokenA),
        new PublicKey(opportunity.tokenB),
        amount
      );
      
      if (!buyTrade.successful) {
        throw new Error('Buy trade failed');
      }
      
      // Execute sell trade
      const sellAmount = new BN(buyTrade.outputAmount);
      const sellTrade = await this.executeDexTrade(
        opportunity.sellDex,
        new PublicKey(opportunity.tokenB),
        new PublicKey(opportunity.tokenA),
        sellAmount
      );
      
      // Calculate actual profit
      const profit = new BN(sellTrade.outputAmount).sub(amount);
      const successful = profit.gt(new BN(0)) && sellTrade.successful;
      
      this.logger.info('Arbitrage executed', {
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        profit: profit.toString(),
        successful,
      });
      
      return {
        buyTrade,
        sellTrade,
        profit,
        successful,
      };
      
    } catch (error) {
      this.logger.error('Failed to execute arbitrage', error);
      throw error;
    }
  }

  // Analytics and reporting
  async getCrossChainAnalytics(): Promise<CrossDexAnalytics> {
    const timestamp = Date.now();
    
    // Collect price data from all DEXes
    const priceData: CrossDexAnalytics['priceData'] = {};
    const liquidityData: CrossDexAnalytics['liquidityData'] = {};
    
    // Get tracked tokens
    const trackedTokens = [this.config.wnockMint, this.config.usdcMint, this.config.solMint];
    
    for (const token of trackedTokens) {
      const tokenMint = token.toString();
      
      // Get prices from each DEX
      const prices: any = {};
      let totalVolume = 0;
      
      try {
        if (this.orca) {
          // Get Orca price (placeholder implementation)
          prices.orca = 0;
        }
        
        if (this.jupiter) {
          prices.jupiter = await this.jupiter.getPrice(token);
        }
        
        if (this.raydium) {
          // Get Raydium price (placeholder implementation)
          prices.raydium = 0;
        }
        
        // Calculate spread
        const priceValues = Object.values(prices).filter(p => p > 0) as number[];
        const spread = priceValues.length > 1 
          ? ((Math.max(...priceValues) - Math.min(...priceValues)) / Math.min(...priceValues)) * 100
          : 0;
        
        priceData[tokenMint] = {
          ...prices,
          spread,
          volume24h: totalVolume,
        };
        
      } catch (error) {
        this.logger.error(`Failed to get analytics for token ${tokenMint}`, error);
      }
    }
    
    // Get recent arbitrage opportunities
    const recentArbitrage = this.arbitrageHistory.filter(
      opp => opp.timestamp > timestamp - 24 * 60 * 60 * 1000
    );
    
    return {
      timestamp,
      priceData,
      liquidityData,
      arbitrageOpportunities: recentArbitrage,
      optimalRoutes: {},
    };
  }

  getAggregatorMetrics(): {
    routingStats: typeof this.routingStats;
    dexMetrics: DexMetrics[];
    arbitrageHistory: ArbitrageOpportunity[];
  } {
    return {
      routingStats: { ...this.routingStats },
      dexMetrics: Array.from(this.metrics.values()),
      arbitrageHistory: [...this.arbitrageHistory],
    };
  }

  // Utility methods
  async getAllBalances(): Promise<DexBalance[]> {
    const allBalances: DexBalance[] = [];
    
    try {
      if (this.orca) {
        const orcaBalances = await this.orca.getBalances();
        allBalances.push(...orcaBalances);
      }
      
      if (this.jupiter) {
        // Jupiter doesn't hold balances, but we can get wallet balances
      }
      
      if (this.raydium) {
        const raydiumBalances = await this.raydium.getBalances();
        allBalances.push(...raydiumBalances);
      }
      
    } catch (error) {
      this.logger.error('Failed to get all balances', error);
    }
    
    return allBalances;
  }

  async getAllPositions(): Promise<DexPosition[]> {
    const allPositions: DexPosition[] = [];
    
    try {
      if (this.orca) {
        const orcaPositions = this.orca.getPositions();
        allPositions.push(...orcaPositions);
      }
      
      if (this.raydium) {
        const raydiumPositions = this.raydium.getPositions();
        allPositions.push(...raydiumPositions);
      }
      
    } catch (error) {
      this.logger.error('Failed to get all positions', error);
    }
    
    return allPositions;
  }

  // Private helper methods
  private calculateQuoteScore(quote: DexQuote): number {
    // Composite scoring algorithm
    // Higher output amount = better (weight: 50%)
    const outputScore = parseFloat(quote.outputAmount) / parseFloat(quote.inputAmount);
    
    // Lower price impact = better (weight: 30%)
    const impactScore = Math.max(0, 10 - quote.priceImpact) / 10;
    
    // Lower fees = better (weight: 20%)
    const feeScore = Math.max(0, 1 - parseFloat(quote.fee) / parseFloat(quote.inputAmount));
    
    return (outputScore * 0.5) + (impactScore * 0.3) + (feeScore * 0.2);
  }

  private generateReasoning(quote: DexQuote, score: number): string {
    const reasons = [];
    
    if (score > 0.8) {
      reasons.push('excellent price');
    } else if (score > 0.6) {
      reasons.push('good price');
    }
    
    if (quote.priceImpact < 0.5) {
      reasons.push('low impact');
    } else if (quote.priceImpact > 2) {
      reasons.push('high impact');
    }
    
    if (quote.route.length === 1) {
      reasons.push('direct route');
    } else {
      reasons.push('multi-hop route');
    }
    
    return reasons.join(', ');
  }

  private async createSplitExecutionPlan(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    maxSplits: number,
    slippageTolerance?: number
  ): Promise<ExecutionPlan> {
    const quotes = await this.getAllQuotes(inputMint, outputMint, amount, slippageTolerance);
    
    if (quotes.length === 0) {
      throw new Error('No quotes available for split execution');
    }
    
    // Simple split strategy: divide equally among available DEXes
    const splits = Math.min(quotes.length, maxSplits);
    const percentage = Math.floor(100 / splits);
    
    const trades = quotes.slice(0, splits).map((quote, index) => ({
      dex: quote.dex,
      quote,
      percentage: index === splits - 1 ? 100 - (percentage * (splits - 1)) : percentage,
    }));
    
    const expectedOutput = trades.reduce(
      (sum, trade) => sum.add(new BN(trade.quote.outputAmount).muln(trade.percentage).divn(100)),
      new BN(0)
    );
    
    const totalFees = trades.reduce(
      (sum, trade) => sum.add(new BN(trade.quote.fee).muln(trade.percentage).divn(100)),
      new BN(0)
    );
    
    const averagePriceImpact = trades.reduce(
      (sum, trade) => sum + (trade.quote.priceImpact * trade.percentage / 100),
      0
    );
    
    return {
      trades,
      expectedOutput,
      totalFees,
      averagePriceImpact,
      estimatedGas: trades.length * 1000000, // Rough estimate
    };
  }

  private async getTokenPairPrices(
    tokenA: PublicKey,
    tokenB: PublicKey
  ): Promise<{ [dex: string]: { buy: number; sell: number } }> {
    const prices: { [dex: string]: { buy: number; sell: number } } = {};
    
    // Get prices from all DEXes
    const amount = new BN(1000000); // 1 token with 6 decimals
    
    try {
      if (this.orca) {
        const quote = await this.orca.getSwapQuote(tokenA, tokenB, amount);
        prices.orca = {
          buy: quote.executionPrice,
          sell: 1 / quote.executionPrice,
        };
      }
    } catch (error) {
      this.logger.debug('Failed to get Orca prices for arbitrage', error);
    }
    
    try {
      if (this.jupiter) {
        const quote = await this.jupiter.getSwapQuote(tokenA, tokenB, amount);
        prices.jupiter = {
          buy: quote.executionPrice,
          sell: 1 / quote.executionPrice,
        };
      }
    } catch (error) {
      this.logger.debug('Failed to get Jupiter prices for arbitrage', error);
    }
    
    try {
      if (this.raydium) {
        const quote = await this.raydium.getSwapQuote(tokenA, tokenB, amount);
        prices.raydium = {
          buy: quote.executionPrice,
          sell: 1 / quote.executionPrice,
        };
      }
    } catch (error) {
      this.logger.debug('Failed to get Raydium prices for arbitrage', error);
    }
    
    return prices;
  }

  private calculateArbitrage(
    tokenA: PublicKey,
    tokenB: PublicKey,
    prices: { [dex: string]: { buy: number; sell: number } },
    minProfitBps: number
  ): ArbitrageOpportunity | null {
    const dexes = Object.keys(prices);
    
    for (let i = 0; i < dexes.length; i++) {
      for (let j = 0; j < dexes.length; j++) {
        if (i === j) continue;
        
        const buyDex = dexes[i];
        const sellDex = dexes[j];
        
        const buyPrice = prices[buyDex].buy;
        const sellPrice = prices[sellDex].sell;
        
        const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
        const profitBps = profitPercentage * 100;
        
        if (profitBps >= minProfitBps) {
          return {
            tokenA: tokenA.toString(),
            tokenB: tokenB.toString(),
            buyDex: buyDex as any,
            sellDex: sellDex as any,
            buyPrice,
            sellPrice,
            profitPercentage,
            maxAmount: '1000000', // 1 token
            estimatedProfit: (profitPercentage * 10000).toString(),
            gasEstimate: 2000000, // Rough estimate for two trades
            timestamp: Date.now(),
            valid: true,
          };
        }
      }
    }
    
    return null;
  }

  private async executeDexTrade(
    dex: 'orca' | 'jupiter' | 'raydium',
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN
  ): Promise<DexTrade> {
    switch (dex) {
      case 'orca':
        if (!this.orca) throw new Error('Orca not initialized');
        return await this.orca.executeSwap(inputMint, outputMint, amount, new BN(0));
        
      case 'jupiter':
        if (!this.jupiter) throw new Error('Jupiter not initialized');
        return await this.jupiter.executeSwap(inputMint, outputMint, amount);
        
      case 'raydium':
        if (!this.raydium) throw new Error('Raydium not initialized');
        return await this.raydium.executeSwap(inputMint, outputMint, amount, new BN(0));
        
      default:
        throw new Error(`Unsupported DEX: ${dex}`);
    }
  }

  private async updateTradeMetrics(trade: DexTrade): Promise<void> {
    const existing = this.metrics.get(trade.dex) || {
      dex: trade.dex,
      timestamp: Date.now(),
      totalTrades: 0,
      successfulTrades: 0,
      totalVolume: '0',
      totalFees: '0',
      averageLatency: 0,
      averagePriceImpact: 0,
      uniquePools: 0,
      activePositions: 0,
    };
    
    existing.totalTrades++;
    if (trade.successful) {
      existing.successfulTrades++;
    }
    
    existing.totalVolume = new BN(existing.totalVolume).add(new BN(trade.inputAmount)).toString();
    existing.totalFees = new BN(existing.totalFees).add(new BN(trade.fee)).toString();
    existing.averageLatency = (existing.averageLatency * (existing.totalTrades - 1) + trade.latency) / existing.totalTrades;
    existing.averagePriceImpact = (existing.averagePriceImpact * (existing.totalTrades - 1) + trade.priceImpact) / existing.totalTrades;
    existing.timestamp = Date.now();
    
    this.metrics.set(trade.dex, existing);
  }

  private startArbitrageScanning(): void {
    if (!this.config.config.arbitrage.enabled) return;
    
    setInterval(async () => {
      try {
        const tokens = [this.config.wnockMint, this.config.usdcMint, this.config.solMint];
        await this.findArbitrageOpportunities(tokens, this.config.config.arbitrage.minProfitBps);
      } catch (error) {
        this.logger.error('Arbitrage scanning failed', error);
      }
    }, this.config.config.arbitrage.checkInterval);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectAndLogMetrics();
    }, 60000); // Every minute
  }

  private startPriceTracking(): void {
    setInterval(async () => {
      await this.updatePriceCache();
    }, 30000); // Every 30 seconds
  }

  private collectAndLogMetrics(): void {
    this.logger.debug('DEX aggregator metrics', {
      routingStats: this.routingStats,
      metricsCount: this.metrics.size,
      arbitrageHistory: this.arbitrageHistory.length,
      priceCacheSize: this.priceCache.size,
    });
  }

  private async updatePriceCache(): Promise<void> {
    const tokens = [this.config.wnockMint, this.config.usdcMint, this.config.solMint];
    
    for (const token of tokens) {
      try {
        if (this.jupiter) {
          const price = await this.jupiter.getPrice(token);
          this.priceCache.set(token.toString(), {
            price,
            timestamp: Date.now(),
            dex: 'jupiter',
          });
        }
      } catch (error) {
        this.logger.debug(`Failed to update price cache for ${token.toString()}`, error);
      }
    }
  }
}

export default DexAggregator;