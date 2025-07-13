// Main entry point for DEX integration service

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { DexAggregator, AggregatorConfig } from './core/dex-aggregator';
import { MarketMaker } from './strategies/market-maker';
import { LiquidityManager } from './strategies/liquidity-manager';
import {
  DexIntegrationConfig,
  MarketMakingConfig,
} from './types/dex-types';

// Load environment variables
dotenv.config();

export class DexIntegrationService {
  private aggregator?: DexAggregator;
  private marketMaker?: MarketMaker;
  private liquidityManager?: LiquidityManager;
  private logger = createLogger({
    level: (process.env.LOG_LEVEL as any) || 'info',
    enableConsole: true,
    enableFile: !!process.env.LOG_FILE,
    logFile: process.env.LOG_FILE,
  });

  private config: DexIntegrationConfig = {
    orca: {
      enabled: process.env.ORCA_ENABLED === 'true',
      whirlpoolProgram: process.env.ORCA_WHIRLPOOL_PROGRAM || 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
      slippageTolerance: parseInt(process.env.ORCA_SLIPPAGE_TOLERANCE || '100'), // 1%
      maxPriceImpact: parseInt(process.env.ORCA_MAX_PRICE_IMPACT || '300'), // 3%
    },
    jupiter: {
      enabled: process.env.JUPITER_ENABLED === 'true',
      apiUrl: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
      slippageBps: parseInt(process.env.JUPITER_SLIPPAGE_BPS || '50'), // 0.5%
      maxAccounts: parseInt(process.env.JUPITER_MAX_ACCOUNTS || '20'),
      onlyDirectRoutes: process.env.JUPITER_ONLY_DIRECT === 'true',
    },
    raydium: {
      enabled: process.env.RAYDIUM_ENABLED === 'true',
      slippageTolerance: parseInt(process.env.RAYDIUM_SLIPPAGE_TOLERANCE || '100'), // 1%
      maxPriceImpact: parseInt(process.env.RAYDIUM_MAX_PRICE_IMPACT || '300'), // 3%
    },
    arbitrage: {
      enabled: process.env.ARBITRAGE_ENABLED === 'true',
      minProfitBps: parseInt(process.env.ARBITRAGE_MIN_PROFIT_BPS || '50'), // 0.5%
      maxGasCost: parseInt(process.env.ARBITRAGE_MAX_GAS_COST || '100000'),
      checkInterval: parseInt(process.env.ARBITRAGE_CHECK_INTERVAL || '60000'), // 1 minute
    },
    marketMaking: {
      enabled: process.env.MARKET_MAKING_ENABLED === 'true',
      strategies: [],
    },
    yieldFarming: {
      enabled: process.env.YIELD_FARMING_ENABLED === 'true',
      autoCompound: process.env.YIELD_AUTO_COMPOUND === 'true',
      compoundThreshold: process.env.YIELD_COMPOUND_THRESHOLD || '1000000', // 1 token
    },
  };

  async initialize(): Promise<void> {
    this.logger.info('Initializing DEX Integration Service');

    try {
      // Validate environment
      await this.validateEnvironment();

      // Initialize connection and wallet
      const connection = new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const wallet = this.loadWallet();

      // Initialize aggregator
      const aggregatorConfig: AggregatorConfig = {
        connection,
        wallet,
        wnockMint: new PublicKey(process.env.WNOCK_MINT || ''),
        usdcMint: new PublicKey(process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
        solMint: new PublicKey(process.env.SOL_MINT || 'So11111111111111111111111111111111111111112'),
        config: this.config,
      };

      this.aggregator = new DexAggregator(aggregatorConfig, this.logger);
      await this.aggregator.initialize();

      // Initialize strategies if enabled
      await this.initializeStrategies();

      this.logger.info('DEX Integration Service initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize DEX Integration Service', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    this.logger.info('Starting DEX Integration Service');

    try {
      // Start market maker if enabled
      if (this.marketMaker) {
        await this.marketMaker.start();
      }

      // Start liquidity manager if enabled
      if (this.liquidityManager) {
        await this.liquidityManager.start();
      }

      this.logger.info('DEX Integration Service started successfully');

    } catch (error) {
      this.logger.error('Failed to start DEX Integration Service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping DEX Integration Service');

    try {
      // Stop market maker
      if (this.marketMaker) {
        await this.marketMaker.stop();
      }

      // Stop liquidity manager
      if (this.liquidityManager) {
        await this.liquidityManager.stop();
      }

      this.logger.info('DEX Integration Service stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop DEX Integration Service gracefully', error);
    }
  }

  // Public API methods
  async getOptimalSwapQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageTolerance?: number
  ) {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return await this.aggregator.getBestQuote(
      new PublicKey(inputMint),
      new PublicKey(outputMint),
      new BN(amount),
      slippageTolerance
    );
  }

  async executeOptimalSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageTolerance?: number
  ) {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return await this.aggregator.executeOptimalSwap(
      new PublicKey(inputMint),
      new PublicKey(outputMint),
      new BN(amount),
      slippageTolerance
    );
  }

  async findArbitrageOpportunities(tokens: string[], minProfitBps?: number) {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    const tokenPubkeys = tokens.map(token => new PublicKey(token));
    return await this.aggregator.findArbitrageOpportunities(tokenPubkeys, minProfitBps);
  }

  async getCrossChainAnalytics() {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return await this.aggregator.getCrossChainAnalytics();
  }

  async getAllBalances() {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return await this.aggregator.getAllBalances();
  }

  async getAllPositions() {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return await this.aggregator.getAllPositions();
  }

  getMetrics() {
    if (!this.aggregator) {
      throw new Error('Service not initialized');
    }

    return {
      aggregator: this.aggregator.getAggregatorMetrics(),
      marketMaker: this.marketMaker?.getMetrics(),
      liquidityManager: this.liquidityManager?.getMetrics(),
      logger: this.logger.getMetrics(),
    };
  }

  // Private helper methods
  private async validateEnvironment(): Promise<void> {
    const required = [
      'SOLANA_RPC_URL',
      'WALLET_PRIVATE_KEY',
      'WNOCK_MINT',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate wallet private key format
    try {
      const privateKeyArray = JSON.parse(process.env.WALLET_PRIVATE_KEY || '[]');
      if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
        throw new Error('Invalid wallet private key format');
      }
    } catch (error) {
      throw new Error('Invalid wallet private key format');
    }
  }

  private loadWallet(): Keypair {
    try {
      const privateKeyArray = JSON.parse(process.env.WALLET_PRIVATE_KEY || '[]');
      return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    } catch (error) {
      throw new Error('Failed to load wallet from private key');
    }
  }

  private async initializeStrategies(): Promise<void> {
    if (!this.aggregator) return;

    // Initialize market maker if enabled
    if (this.config.marketMaking.enabled) {
      const marketMakingConfig: MarketMakingConfig = {
        tokenPair: {
          base: process.env.WNOCK_MINT || '',
          quote: process.env.USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
        dex: 'orca', // Default to Orca
        spreadBps: parseInt(process.env.MM_SPREAD_BPS || '100'), // 1%
        orderSize: process.env.MM_ORDER_SIZE || '1000000', // 1 token
        maxInventory: process.env.MM_MAX_INVENTORY || '10000000', // 10 tokens
        riskParameters: {
          maxPriceImpact: parseFloat(process.env.MM_MAX_PRICE_IMPACT || '2'),
          inventoryLimit: parseFloat(process.env.MM_INVENTORY_LIMIT || '50'),
          stopLoss: parseFloat(process.env.MM_STOP_LOSS || '-1000'),
        },
        rebalanceFrequency: parseInt(process.env.MM_REBALANCE_FREQUENCY || '60'), // minutes
      };

      this.marketMaker = new MarketMaker(marketMakingConfig, this.aggregator, this.logger);
    }

    // Initialize liquidity manager if enabled
    if (this.config.yieldFarming.enabled) {
      const liquidityConfig = {
        minLiquidityThreshold: new BN(process.env.LM_MIN_LIQUIDITY || '100000'),
        maxLiquidityPerPool: new BN(process.env.LM_MAX_LIQUIDITY_PER_POOL || '10000000'),
        targetAPY: parseFloat(process.env.LM_TARGET_APY || '15'),
        rebalanceThreshold: parseFloat(process.env.LM_REBALANCE_THRESHOLD || '5'),
        maxSlippage: parseInt(process.env.LM_MAX_SLIPPAGE || '100'),
        emergencyExitThreshold: parseFloat(process.env.LM_EMERGENCY_EXIT_THRESHOLD || '10'),
        compoundingFrequency: parseInt(process.env.LM_COMPOUNDING_FREQUENCY || '24'),
      };

      this.liquidityManager = new LiquidityManager(liquidityConfig, this.aggregator, this.logger);
    }
  }
}

// CLI and standalone execution
if (require.main === module) {
  const service = new DexIntegrationService();

  async function main() {
    try {
      await service.initialize();
      await service.start();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down gracefully...');
        await service.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        await service.stop();
        process.exit(0);
      });

      console.log('DEX Integration Service is running...');

    } catch (error) {
      console.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  main().catch(console.error);
}

export { DexIntegrationService as default };
export * from './core/dex-aggregator';
export * from './strategies/market-maker';
export * from './strategies/liquidity-manager';
export * from './types/dex-types';
export * from './utils/logger';