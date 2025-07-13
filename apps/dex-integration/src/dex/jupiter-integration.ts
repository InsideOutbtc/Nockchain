// Jupiter aggregator integration for optimal wNOCK routing and price discovery

import { Connection, PublicKey, Keypair, VersionedTransaction } from '@solana/web3.js';
import { Jupiter, RouteInfo, SwapResult } from '@jup-ag/core';
import axios from 'axios';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexQuote, DexTrade, DexBalance } from '../types/dex-types';

export interface JupiterConfig {
  connection: Connection;
  wallet: Keypair;
  wnockMint: PublicKey;
  usdcMint: PublicKey;
  solMint: PublicKey;
  apiUrl: string;
  slippageBps: number;
  maxAccounts: number;
  onlyDirectRoutes: boolean;
}

export interface JupiterRoute {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: 'ExactIn' | 'ExactOut';
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: {
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }[];
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
  lastTradedAt: number;
  diff24h: number;
  volume24h: number;
  marketCap: number;
}

export class JupiterIntegration {
  private config: JupiterConfig;
  private logger: Logger;
  private jupiter?: Jupiter;
  
  // Route and price caching
  private routeCache: Map<string, { route: JupiterRoute; timestamp: number }> = new Map();
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private marketData: Map<string, JupiterPriceData> = new Map();
  
  // Performance tracking
  private routeStats = {
    totalRequests: 0,
    successfulRoutes: 0,
    failedRoutes: 0,
    averageResponseTime: 0,
    cacheHits: 0,
  };

  constructor(config: JupiterConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Jupiter aggregator integration');
    
    try {
      // Initialize Jupiter instance
      this.jupiter = await Jupiter.load({
        connection: this.config.connection,
        cluster: 'mainnet-beta',
        user: this.config.wallet,
        wrapUnwrapSOL: true,
        ammsToExclude: [], // Can exclude specific AMMs if needed
        ammsToInclude: [], // Can include only specific AMMs
      });
      
      // Start price tracking
      this.startPriceTracking();
      
      // Start route cache cleanup
      this.startCacheCleanup();
      
      this.logger.info('Jupiter integration initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Jupiter integration', error);
      throw error;
    }
  }

  // Route discovery and quoting
  async getSwapQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageBps?: number
  ): Promise<DexQuote> {
    const startTime = Date.now();
    this.routeStats.totalRequests++;
    
    try {
      const cacheKey = `${inputMint.toString()}_${outputMint.toString()}_${amount.toString()}`;
      
      // Check cache first
      const cached = this.routeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
        this.routeStats.cacheHits++;
        return this.convertRouteToQuote(cached.route);
      }
      
      // Get quote from Jupiter API
      const response = await axios.get(`${this.config.apiUrl}/quote`, {
        params: {
          inputMint: inputMint.toString(),
          outputMint: outputMint.toString(),
          amount: amount.toString(),
          slippageBps: slippageBps || this.config.slippageBps,
          onlyDirectRoutes: this.config.onlyDirectRoutes,
          maxAccounts: this.config.maxAccounts,
        },
        timeout: 10000,
      });
      
      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'No route found');
      }
      
      const route: JupiterRoute = response.data;
      
      // Cache the route
      this.routeCache.set(cacheKey, {
        route,
        timestamp: Date.now(),
      });
      
      this.routeStats.successfulRoutes++;
      this.routeStats.averageResponseTime = 
        (this.routeStats.averageResponseTime * (this.routeStats.totalRequests - 1) + 
         (Date.now() - startTime)) / this.routeStats.totalRequests;
      
      return this.convertRouteToQuote(route);
      
    } catch (error) {
      this.routeStats.failedRoutes++;
      this.logger.error('Failed to get Jupiter quote', error);
      throw error;
    }
  }

  async getBestRoute(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    maxRoutes: number = 3
  ): Promise<DexQuote[]> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/quote`, {
        params: {
          inputMint: inputMint.toString(),
          outputMint: outputMint.toString(),
          amount: amount.toString(),
          slippageBps: this.config.slippageBps,
          onlyDirectRoutes: false,
          maxAccounts: this.config.maxAccounts,
          maxSplits: 3,
          swapMode: 'ExactIn',
        },
        timeout: 15000,
      });
      
      if (!response.data) {
        throw new Error('No routes found');
      }
      
      // Jupiter typically returns the best route, but we can request alternatives
      const routes = Array.isArray(response.data) ? response.data : [response.data];
      
      return routes
        .slice(0, maxRoutes)
        .map((route: JupiterRoute) => this.convertRouteToQuote(route));
        
    } catch (error) {
      this.logger.error('Failed to get Jupiter best routes', error);
      throw error;
    }
  }

  async executeSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageBps?: number,
    priorityFee?: number
  ): Promise<DexTrade> {
    const startTime = Date.now();
    
    try {
      // Get quote first
      const quote = await this.getSwapQuote(inputMint, outputMint, amount, slippageBps);
      
      if (!quote.valid) {
        throw new Error('Quote is not valid for execution');
      }
      
      // Get swap transaction
      const swapResponse = await axios.post(`${this.config.apiUrl}/swap`, {
        quoteResponse: quote.route, // The original route data
        userPublicKey: this.config.wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: priorityFee || 0,
        dynamicComputeUnitLimit: true,
        skipUserAccountsRpcCalls: true,
      });
      
      if (!swapResponse.data || swapResponse.data.error) {
        throw new Error(swapResponse.data?.error || 'Failed to get swap transaction');
      }
      
      // Deserialize and execute transaction
      const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      
      // Sign transaction
      transaction.sign([this.config.wallet]);
      
      // Send transaction with retry logic
      let signature: string;
      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          signature = await this.config.connection.sendTransaction(transaction, {
            maxRetries: 3,
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          break;
        } catch (error) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw error;
          }
          this.logger.warn(`Transaction attempt ${attempt} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      // Wait for confirmation
      const confirmation = await this.config.connection.confirmTransaction({
        signature: signature!,
        blockhash: transaction.message.recentBlockhash!,
        lastValidBlockHeight: (await this.config.connection.getLatestBlockhash()).lastValidBlockHeight,
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      // Get transaction details
      const txData = await this.config.connection.getTransaction(signature!, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      
      const actualOutputAmount = this.extractSwapAmounts(txData);
      
      const trade: DexTrade = {
        dex: 'jupiter',
        signature: signature!,
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        inputAmount: amount.toString(),
        outputAmount: actualOutputAmount.toString(),
        fee: this.calculateTotalFees(quote),
        priceImpact: parseFloat(quote.priceImpact.toString()),
        executionPrice: this.calculateExecutionPrice(amount, actualOutputAmount),
        gasUsed: txData?.meta?.fee || 0,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
        successful: true,
        route: quote.route,
      };
      
      this.logger.info('Jupiter swap executed successfully', {
        signature: signature!,
        inputAmount: amount.toString(),
        outputAmount: actualOutputAmount.toString(),
        route: quote.route.length,
        priceImpact: quote.priceImpact,
      });
      
      return trade;
      
    } catch (error) {
      this.logger.error('Failed to execute Jupiter swap', error);
      
      return {
        dex: 'jupiter',
        signature: '',
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        inputAmount: amount.toString(),
        outputAmount: '0',
        fee: '0',
        priceImpact: 0,
        executionPrice: 0,
        gasUsed: 0,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
        successful: false,
        error: error.message,
      };
    }
  }

  // Price discovery and market data
  async getPrice(mint: PublicKey, vsMint?: PublicKey): Promise<number> {
    try {
      const vsMintStr = vsMint?.toString() || this.config.usdcMint.toString();
      const cacheKey = `${mint.toString()}_${vsMintStr}`;
      
      // Check cache
      const cached = this.priceCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.price;
      }
      
      // Get price from Jupiter API
      const response = await axios.get(`${this.config.apiUrl}/price`, {
        params: {
          ids: mint.toString(),
          vsToken: vsMintStr,
        },
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Price data not available');
      }
      
      const priceData = response.data.data[mint.toString()];
      if (!priceData) {
        throw new Error('Token price not found');
      }
      
      const price = priceData.price;
      
      // Cache the price
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now(),
      });
      
      return price;
      
    } catch (error) {
      this.logger.error('Failed to get price from Jupiter', error);
      throw error;
    }
  }

  async getMarketData(mint: PublicKey): Promise<JupiterPriceData | null> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/price`, {
        params: {
          ids: mint.toString(),
          showExtraInfo: true,
        },
      });
      
      if (!response.data || !response.data.data) {
        return null;
      }
      
      const data = response.data.data[mint.toString()];
      if (!data) {
        return null;
      }
      
      const marketData: JupiterPriceData = {
        id: mint.toString(),
        mintSymbol: data.mintSymbol || 'UNKNOWN',
        vsToken: data.vsToken || this.config.usdcMint.toString(),
        vsTokenSymbol: data.vsTokenSymbol || 'USDC',
        price: data.price,
        lastTradedAt: data.lastTradedAt || Date.now(),
        diff24h: data.diff24h || 0,
        volume24h: data.volume24h || 0,
        marketCap: data.marketCap || 0,
      };
      
      this.marketData.set(mint.toString(), marketData);
      return marketData;
      
    } catch (error) {
      this.logger.error('Failed to get market data from Jupiter', error);
      return null;
    }
  }

  async getTokenList(): Promise<Array<{ address: string; symbol: string; name: string; decimals: number }>> {
    try {
      const response = await axios.get(`${this.config.apiUrl}/tokens`);
      
      if (!response.data) {
        throw new Error('Failed to get token list');
      }
      
      return response.data.map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      }));
      
    } catch (error) {
      this.logger.error('Failed to get token list from Jupiter', error);
      throw error;
    }
  }

  // Analytics and monitoring
  getRouteStats(): typeof this.routeStats {
    return { ...this.routeStats };
  }

  getCachedPrices(): Array<{ mint: string; price: number; age: number }> {
    const result = [];
    const now = Date.now();
    
    for (const [mint, data] of this.priceCache) {
      result.push({
        mint,
        price: data.price,
        age: now - data.timestamp,
      });
    }
    
    return result;
  }

  getMarketDataCache(): JupiterPriceData[] {
    return Array.from(this.marketData.values());
  }

  // Utility methods
  async findOptimalRoute(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    criteria: 'best_price' | 'lowest_impact' | 'fastest' = 'best_price'
  ): Promise<DexQuote> {
    const routes = await this.getBestRoute(inputMint, outputMint, amount, 5);
    
    if (routes.length === 0) {
      throw new Error('No routes found');
    }
    
    switch (criteria) {
      case 'best_price':
        return routes.reduce((best, current) => 
          parseFloat(current.outputAmount) > parseFloat(best.outputAmount) ? current : best
        );
        
      case 'lowest_impact':
        return routes.reduce((best, current) => 
          current.priceImpact < best.priceImpact ? current : best
        );
        
      case 'fastest':
        // For Jupiter, all routes have similar execution time
        // Return the one with fewest hops
        return routes.reduce((best, current) => 
          current.route.length < best.route.length ? current : best
        );
        
      default:
        return routes[0];
    }
  }

  async simulateSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN
  ): Promise<{
    expectedOutput: BN;
    priceImpact: number;
    minimumReceived: BN;
    route: string[];
    fees: BN;
  }> {
    const quote = await this.getSwapQuote(inputMint, outputMint, amount);
    
    return {
      expectedOutput: new BN(quote.outputAmount),
      priceImpact: quote.priceImpact,
      minimumReceived: new BN(quote.minimumReceived),
      route: quote.route,
      fees: new BN(quote.fee),
    };
  }

  // Private helper methods
  private convertRouteToQuote(route: JupiterRoute): DexQuote {
    const routeSteps = route.routePlan.map(step => 
      `${step.swapInfo.label} (${step.percent}%)`
    );
    
    return {
      dex: 'jupiter',
      inputMint: route.inputMint,
      outputMint: route.outputMint,
      inputAmount: route.inAmount,
      outputAmount: route.outAmount,
      priceImpact: parseFloat(route.priceImpactPct),
      fee: this.calculateRouteFees(route),
      route: routeSteps,
      executionPrice: parseFloat(route.outAmount) / parseFloat(route.inAmount),
      minimumReceived: route.otherAmountThreshold,
      valid: parseFloat(route.priceImpactPct) <= 10, // 10% max impact
      timestamp: Date.now(),
      metadata: {
        contextSlot: route.contextSlot,
        timeTaken: route.timeTaken,
        swapMode: route.swapMode,
      },
    };
  }

  private calculateRouteFees(route: JupiterRoute): string {
    let totalFees = new BN(0);
    
    for (const step of route.routePlan) {
      totalFees = totalFees.add(new BN(step.swapInfo.feeAmount));
    }
    
    if (route.platformFee) {
      totalFees = totalFees.add(new BN(route.platformFee.amount));
    }
    
    return totalFees.toString();
  }

  private calculateTotalFees(quote: DexQuote): string {
    return quote.fee;
  }

  private calculateExecutionPrice(inputAmount: BN, outputAmount: BN): number {
    return parseFloat(outputAmount.toString()) / parseFloat(inputAmount.toString());
  }

  private extractSwapAmounts(txData: any): BN {
    // Extract actual swap amounts from transaction data
    // This would parse the transaction logs
    if (txData?.meta?.postTokenBalances && txData?.meta?.preTokenBalances) {
      // Calculate the difference in token balances
      // This is a simplified version - real implementation would be more complex
    }
    return new BN(0); // Placeholder
  }

  private startPriceTracking(): void {
    setInterval(async () => {
      try {
        // Update prices for tracked tokens
        await this.updatePriceCache();
      } catch (error) {
        this.logger.error('Failed to update price cache', error);
      }
    }, 60000); // Update every minute
  }

  private async updatePriceCache(): Promise<void> {
    const trackedMints = [this.config.wnockMint, this.config.usdcMint, this.config.solMint];
    
    for (const mint of trackedMints) {
      try {
        await this.getPrice(mint);
        await this.getMarketData(mint);
      } catch (error) {
        this.logger.error(`Failed to update price for ${mint.toString()}`, error);
      }
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCaches();
    }, 300000); // Cleanup every 5 minutes
  }

  private cleanupCaches(): void {
    const now = Date.now();
    
    // Clean route cache (30 seconds)
    for (const [key, value] of this.routeCache) {
      if (now - value.timestamp > 30000) {
        this.routeCache.delete(key);
      }
    }
    
    // Clean price cache (5 minutes)
    for (const [key, value] of this.priceCache) {
      if (now - value.timestamp > 300000) {
        this.priceCache.delete(key);
      }
    }
    
    this.logger.debug('Cache cleanup completed', {
      routeCacheSize: this.routeCache.size,
      priceCacheSize: this.priceCache.size,
    });
  }
}

export default JupiterIntegration;