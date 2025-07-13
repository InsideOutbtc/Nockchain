// Automated market making strategy across multiple DEXs

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import {
  MarketMakingConfig,
  DexQuote,
  DexTrade,
  TradeType,
} from '../types/dex-types';

export interface MarketMakerState {
  isActive: boolean;
  baseInventory: BN;
  quoteInventory: BN;
  targetBaseInventory: BN;
  targetQuoteInventory: BN;
  totalValue: number;
  pnl: number;
  activeBids: DexQuote[];
  activeAsks: DexQuote[];
  lastRebalance: number;
}

export interface MarketMakerMetrics {
  totalTrades: number;
  successfulTrades: number;
  totalVolume: BN;
  totalFees: BN;
  totalPnL: number;
  averageSpread: number;
  inventoryTurnover: number;
  uptimePercentage: number;
  startTime: number;
}

export class MarketMaker {
  private config: MarketMakingConfig;
  private aggregator: DexAggregator;
  private logger: Logger;
  private state: MarketMakerState;
  private metrics: MarketMakerMetrics;
  private isRunning: boolean = false;
  private rebalanceInterval?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    config: MarketMakingConfig,
    aggregator: DexAggregator,
    logger: Logger
  ) {
    this.config = config;
    this.aggregator = aggregator;
    this.logger = logger;

    this.state = {
      isActive: false,
      baseInventory: new BN(0),
      quoteInventory: new BN(0),
      targetBaseInventory: new BN(0),
      targetQuoteInventory: new BN(0),
      totalValue: 0,
      pnl: 0,
      activeBids: [],
      activeAsks: [],
      lastRebalance: 0,
    };

    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      totalVolume: new BN(0),
      totalFees: new BN(0),
      totalPnL: 0,
      averageSpread: 0,
      inventoryTurnover: 0,
      uptimePercentage: 0,
      startTime: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Market maker already running');
      return;
    }

    this.logger.info('Starting market maker', {
      tokenPair: this.config.tokenPair,
      dex: this.config.dex,
      spreadBps: this.config.spreadBps,
    });

    try {
      // Initialize inventories
      await this.initializeInventories();

      // Calculate target inventories
      this.calculateTargetInventories();

      // Start market making
      this.isRunning = true;
      this.state.isActive = true;

      // Start background processes
      this.startRebalancing();
      this.startMonitoring();

      this.logger.info('Market maker started successfully', {
        baseInventory: this.state.baseInventory.toString(),
        quoteInventory: this.state.quoteInventory.toString(),
      });

    } catch (error) {
      this.logger.error('Failed to start market maker', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Market maker not running');
      return;
    }

    this.logger.info('Stopping market maker');

    try {
      // Stop background processes
      if (this.rebalanceInterval) {
        clearInterval(this.rebalanceInterval);
      }
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }

      // Cancel all active orders
      await this.cancelAllOrders();

      // Final rebalance if needed
      await this.rebalanceInventory();

      this.isRunning = false;
      this.state.isActive = false;

      this.logger.info('Market maker stopped successfully', {
        finalPnL: this.metrics.totalPnL,
        totalTrades: this.metrics.totalTrades,
        successRate: this.metrics.successfulTrades / this.metrics.totalTrades,
      });

    } catch (error) {
      this.logger.error('Failed to stop market maker gracefully', error);
      this.isRunning = false;
      this.state.isActive = false;
    }
  }

  async makeMarket(): Promise<void> {
    if (!this.state.isActive) return;

    try {
      // Get current market price
      const marketPrice = await this.getCurrentMarketPrice();
      if (!marketPrice) {
        this.logger.warn('Unable to get market price, skipping market making cycle');
        return;
      }

      // Calculate bid/ask prices
      const spreadSize = (this.config.spreadBps / 10000) * marketPrice;
      const bidPrice = marketPrice - spreadSize / 2;
      const askPrice = marketPrice + spreadSize / 2;

      // Check if we need to place new orders
      await this.manageBidOrders(bidPrice);
      await this.manageAskOrders(askPrice);

      // Check for execution opportunities
      await this.checkArbitrageOpportunities();

      this.logger.debug('Market making cycle completed', {
        marketPrice,
        bidPrice,
        askPrice,
        activeOrders: this.state.activeBids.length + this.state.activeAsks.length,
      });

    } catch (error) {
      this.logger.error('Market making cycle failed', error);
    }
  }

  private async initializeInventories(): Promise<void> {
    // Get current balances
    const balances = await this.aggregator.getAllBalances();
    
    const baseBalance = balances.find(b => b.mint === this.config.tokenPair.base);
    const quoteBalance = balances.find(b => b.mint === this.config.tokenPair.quote);

    if (!baseBalance || !quoteBalance) {
      throw new Error('Insufficient token balances for market making');
    }

    this.state.baseInventory = new BN(baseBalance.amount);
    this.state.quoteInventory = new BN(quoteBalance.amount);

    this.logger.info('Inventories initialized', {
      baseInventory: this.state.baseInventory.toString(),
      quoteInventory: this.state.quoteInventory.toString(),
    });
  }

  private calculateTargetInventories(): void {
    // Target 50/50 split by value
    const totalValue = this.state.totalValue;
    const targetValuePerAsset = totalValue / 2;

    // These would be calculated based on current prices
    // For now, using simple 50/50 split
    this.state.targetBaseInventory = this.state.baseInventory.divn(2);
    this.state.targetQuoteInventory = this.state.quoteInventory.divn(2);
  }

  private async getCurrentMarketPrice(): Promise<number | null> {
    try {
      // Get quotes from multiple DEXs and average them
      const quotes = await this.aggregator.getAllQuotes(
        new PublicKey(this.config.tokenPair.base),
        new PublicKey(this.config.tokenPair.quote),
        new BN(1000000) // 1 token with 6 decimals
      );

      if (quotes.length === 0) return null;

      const totalPrice = quotes.reduce((sum, quote) => sum + quote.executionPrice, 0);
      return totalPrice / quotes.length;

    } catch (error) {
      this.logger.error('Failed to get current market price', error);
      return null;
    }
  }

  private async manageBidOrders(targetBidPrice: number): Promise<void> {
    // Check if we need to place or update bid orders
    const needsNewBid = this.state.activeBids.length === 0 || 
      this.shouldUpdateOrder(this.state.activeBids[0], targetBidPrice);

    if (needsNewBid && this.canPlaceBid()) {
      await this.placeBidOrder(targetBidPrice);
    }
  }

  private async manageAskOrders(targetAskPrice: number): Promise<void> {
    // Check if we need to place or update ask orders
    const needsNewAsk = this.state.activeAsks.length === 0 || 
      this.shouldUpdateOrder(this.state.activeAsks[0], targetAskPrice);

    if (needsNewAsk && this.canPlaceAsk()) {
      await this.placeAskOrder(targetAskPrice);
    }
  }

  private shouldUpdateOrder(order: DexQuote, targetPrice: number): boolean {
    const priceDeviation = Math.abs(order.executionPrice - targetPrice) / targetPrice;
    return priceDeviation > 0.01; // Update if price deviates by more than 1%
  }

  private canPlaceBid(): boolean {
    const minQuoteBalance = new BN(this.config.orderSize);
    return this.state.quoteInventory.gte(minQuoteBalance);
  }

  private canPlaceAsk(): boolean {
    const minBaseBalance = new BN(this.config.orderSize);
    return this.state.baseInventory.gte(minBaseBalance);
  }

  private async placeBidOrder(price: number): Promise<void> {
    try {
      // Calculate order amount
      const orderAmount = new BN(this.config.orderSize);
      
      // In a real implementation, this would place a limit order
      // For now, we'll simulate with a market order check
      const quote = await this.aggregator.getBestQuote(
        new PublicKey(this.config.tokenPair.quote),
        new PublicKey(this.config.tokenPair.base),
        orderAmount
      );

      if (quote.quote.executionPrice <= price * 1.01) { // Within 1% tolerance
        // Execute the trade
        const trade = await this.aggregator.executeOptimalSwap(
          new PublicKey(this.config.tokenPair.quote),
          new PublicKey(this.config.tokenPair.base),
          orderAmount
        );

        if (trade.successful) {
          await this.updateInventoriesAfterTrade(trade, 'buy');
          this.updateMetricsAfterTrade(trade);
          this.logger.tradeExecuted(trade.dex, trade);
        }
      }

    } catch (error) {
      this.logger.error('Failed to place bid order', error);
    }
  }

  private async placeAskOrder(price: number): Promise<void> {
    try {
      // Calculate order amount
      const orderAmount = new BN(this.config.orderSize);
      
      const quote = await this.aggregator.getBestQuote(
        new PublicKey(this.config.tokenPair.base),
        new PublicKey(this.config.tokenPair.quote),
        orderAmount
      );

      if (quote.quote.executionPrice >= price * 0.99) { // Within 1% tolerance
        // Execute the trade
        const trade = await this.aggregator.executeOptimalSwap(
          new PublicKey(this.config.tokenPair.base),
          new PublicKey(this.config.tokenPair.quote),
          orderAmount
        );

        if (trade.successful) {
          await this.updateInventoriesAfterTrade(trade, 'sell');
          this.updateMetricsAfterTrade(trade);
          this.logger.tradeExecuted(trade.dex, trade);
        }
      }

    } catch (error) {
      this.logger.error('Failed to place ask order', error);
    }
  }

  private async updateInventoriesAfterTrade(trade: DexTrade, side: 'buy' | 'sell'): Promise<void> {
    const inputAmount = new BN(trade.inputAmount);
    const outputAmount = new BN(trade.outputAmount);

    if (side === 'buy') {
      // Bought base with quote
      this.state.quoteInventory = this.state.quoteInventory.sub(inputAmount);
      this.state.baseInventory = this.state.baseInventory.add(outputAmount);
    } else {
      // Sold base for quote
      this.state.baseInventory = this.state.baseInventory.sub(inputAmount);
      this.state.quoteInventory = this.state.quoteInventory.add(outputAmount);
    }
  }

  private updateMetricsAfterTrade(trade: DexTrade): void {
    this.metrics.totalTrades++;
    if (trade.successful) {
      this.metrics.successfulTrades++;
    }

    this.metrics.totalVolume = this.metrics.totalVolume.add(new BN(trade.inputAmount));
    this.metrics.totalFees = this.metrics.totalFees.add(new BN(trade.fee));

    // Calculate PnL (simplified)
    const tradePnL = parseFloat(trade.outputAmount) - parseFloat(trade.inputAmount);
    this.metrics.totalPnL += tradePnL;
  }

  private async checkArbitrageOpportunities(): Promise<void> {
    try {
      const opportunities = await this.aggregator.findArbitrageOpportunities([
        new PublicKey(this.config.tokenPair.base),
        new PublicKey(this.config.tokenPair.quote),
      ]);

      for (const opportunity of opportunities) {
        if (this.shouldExecuteArbitrage(opportunity)) {
          await this.executeArbitrage(opportunity);
        }
      }

    } catch (error) {
      this.logger.error('Failed to check arbitrage opportunities', error);
    }
  }

  private shouldExecuteArbitrage(opportunity: any): boolean {
    // Only execute if profit is above minimum threshold
    return opportunity.profitPercentage > 0.5 && // 0.5% minimum
           opportunity.valid &&
           opportunity.gasEstimate < 100000; // Reasonable gas cost
  }

  private async executeArbitrage(opportunity: any): Promise<void> {
    try {
      const result = await this.aggregator.executeArbitrage(opportunity);
      
      if (result.successful) {
        this.logger.info('Arbitrage executed successfully', {
          profit: result.profit.toString(),
          buyDex: opportunity.buyDex,
          sellDex: opportunity.sellDex,
        });

        this.metrics.totalPnL += parseFloat(result.profit.toString());
      }

    } catch (error) {
      this.logger.error('Failed to execute arbitrage', error);
    }
  }

  private async rebalanceInventory(): Promise<void> {
    if (!this.needsRebalancing()) return;

    this.logger.info('Starting inventory rebalance');

    try {
      // Calculate rebalance amounts
      const baseImbalance = this.state.baseInventory.sub(this.state.targetBaseInventory);
      const quoteImbalance = this.state.quoteInventory.sub(this.state.targetQuoteInventory);

      // Rebalance if significant imbalance
      if (baseImbalance.abs().gt(new BN(this.config.orderSize).muln(2))) {
        await this.rebalanceAsset('base', baseImbalance);
      }

      if (quoteImbalance.abs().gt(new BN(this.config.orderSize).muln(2))) {
        await this.rebalanceAsset('quote', quoteImbalance);
      }

      this.state.lastRebalance = Date.now();

    } catch (error) {
      this.logger.error('Inventory rebalancing failed', error);
    }
  }

  private needsRebalancing(): boolean {
    const timeSinceLastRebalance = Date.now() - this.state.lastRebalance;
    const rebalanceFrequency = this.config.rebalanceFrequency * 60 * 1000; // Convert to ms
    
    return timeSinceLastRebalance > rebalanceFrequency;
  }

  private async rebalanceAsset(asset: 'base' | 'quote', imbalance: BN): Promise<void> {
    // Implementation would depend on the specific rebalancing strategy
    // Could involve trades, liquidity provision/removal, etc.
    this.logger.debug('Rebalancing asset', { asset, imbalance: imbalance.toString() });
  }

  private async cancelAllOrders(): Promise<void> {
    // In a real implementation, this would cancel all pending orders
    this.state.activeBids = [];
    this.state.activeAsks = [];
    this.logger.info('All orders cancelled');
  }

  private startRebalancing(): void {
    const intervalMs = this.config.rebalanceFrequency * 60 * 1000;
    this.rebalanceInterval = setInterval(async () => {
      await this.rebalanceInventory();
    }, intervalMs);
  }

  private startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      await this.checkRiskLimits();
      await this.makeMarket();
    }, 30000);
  }

  private async updateMetrics(): Promise<void> {
    const uptime = Date.now() - this.metrics.startTime;
    this.metrics.uptimePercentage = this.state.isActive ? 100 : 0;
    
    // Update other metrics as needed
    this.logger.debug('Market maker metrics updated', {
      totalTrades: this.metrics.totalTrades,
      totalPnL: this.metrics.totalPnL,
      uptime,
    });
  }

  private async checkRiskLimits(): Promise<void> {
    // Check inventory limits
    const maxInventory = new BN(this.config.maxInventory);
    
    if (this.state.baseInventory.gt(maxInventory) || this.state.quoteInventory.gt(maxInventory)) {
      this.logger.warn('Inventory limit exceeded', {
        baseInventory: this.state.baseInventory.toString(),
        quoteInventory: this.state.quoteInventory.toString(),
        maxInventory: maxInventory.toString(),
      });
    }

    // Check PnL limits
    if (this.metrics.totalPnL < this.config.riskParameters.stopLoss) {
      this.logger.error('Stop loss triggered, stopping market maker', {
        currentPnL: this.metrics.totalPnL,
        stopLoss: this.config.riskParameters.stopLoss,
      });
      
      await this.stop();
    }
  }

  // Public getters
  getState(): MarketMakerState {
    return { ...this.state };
  }

  getMetrics(): MarketMakerMetrics {
    return { ...this.metrics };
  }

  isActive(): boolean {
    return this.isRunning && this.state.isActive;
  }
}

export default MarketMaker;