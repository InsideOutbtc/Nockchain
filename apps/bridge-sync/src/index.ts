// NOCK Bridge State Synchronization Service
// Entry point for cross-chain state synchronization and monitoring

import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Logger } from './utils/logger';
import { RedisClient } from './utils/redis';
import { StateDatabase } from './storage/database';
import { StateSynchronizer } from './core/state-sync';
import { RealTimeMonitor } from './monitoring/real-time';
import path from 'path';

// Load environment variables
config();

interface CliArgs {
  solanaRpc?: string;
  nockchainRpc?: string;
  redisUrl?: string;
  dataPath?: string;
  syncInterval?: number;
  batchSize?: number;
  wsPort?: number;
  ioPort?: number;
  logLevel?: string;
  configFile?: string;
}

interface SyncConfiguration {
  solanaRpcUrl: string;
  nockchainRpcUrl: string;
  redisUrl: string;
  dataPath: string;
  syncInterval: number;
  batchSize: number;
  confirmationBlocks: {
    nockchain: number;
    solana: number;
  };
  retryAttempts: number;
  retryDelay: number;
  stateVerificationInterval: number;
  emergencyThresholds: {
    syncDelay: number;
    errorRate: number;
    blockGap: number;
  };
  monitoring: {
    wsPort: number;
    ioPort: number;
    alertThresholds: {
      blockTimeDeviation: number;
      transactionFailureRate: number;
      syncDelay: number;
      liquidityThreshold: number;
      bridgeHealthThreshold: number;
    };
    metricsRetentionDays: number;
    alertRetentionDays: number;
    notificationChannels: {
      email: string[];
      slack: string;
      webhook: string[];
    };
  };
  database: {
    maxCacheSize: number;
    compressionEnabled: boolean;
    backupInterval: number;
    retentionPeriod: number;
  };
}

class BridgeSyncService {
  private logger: Logger;
  private config: SyncConfiguration;
  private redis: RedisClient;
  private database: StateDatabase;
  private stateSynchronizer: StateSynchronizer;
  private realTimeMonitor: RealTimeMonitor;
  private isRunning = false;

  constructor(config: SyncConfiguration) {
    this.config = config;
    this.logger = new Logger('bridge-sync-service');
    
    // Initialize components
    this.redis = new RedisClient({
      url: config.redisUrl,
      keyPrefix: 'bridge-sync:',
    }, this.logger);
    
    this.database = new StateDatabase({
      dataPath: config.dataPath,
      maxCacheSize: config.database.maxCacheSize,
      compressionEnabled: config.database.compressionEnabled,
      backupInterval: config.database.backupInterval,
      retentionPeriod: config.database.retentionPeriod,
    }, this.logger);
    
    this.stateSynchronizer = new StateSynchronizer(
      {
        nockchainRpcUrl: config.nockchainRpcUrl,
        solanaRpcUrl: config.solanaRpcUrl,
        syncInterval: config.syncInterval,
        batchSize: config.batchSize,
        confirmationBlocks: config.confirmationBlocks,
        retryAttempts: config.retryAttempts,
        retryDelay: config.retryDelay,
        stateVerificationInterval: config.stateVerificationInterval,
        emergencyThresholds: config.emergencyThresholds,
      },
      this.logger,
      this.redis,
      this.database
    );
    
    this.realTimeMonitor = new RealTimeMonitor(
      {
        alertThresholds: config.monitoring.alertThresholds,
        metricsRetentionDays: config.monitoring.metricsRetentionDays,
        alertRetentionDays: config.monitoring.alertRetentionDays,
        realTimeEndpoints: {
          websocket: `ws://localhost:${config.monitoring.wsPort}`,
          socketio: `http://localhost:${config.monitoring.ioPort}`,
        },
        notificationChannels: config.monitoring.notificationChannels,
      },
      this.logger,
      this.redis,
      this.stateSynchronizer,
      config.solanaRpcUrl,
      config.nockchainRpcUrl
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Bridge sync service already running');
      return;
    }

    this.logger.info('Starting NOCK Bridge State Synchronization Service', {
      solanaRpc: this.config.solanaRpcUrl,
      nockchainRpc: this.config.nockchainRpcUrl,
      syncInterval: this.config.syncInterval,
      batchSize: this.config.batchSize,
    });

    try {
      // Initialize database
      await this.database.open();
      
      // Connect to Redis
      await this.redis.connect();
      
      // Start state synchronizer
      await this.stateSynchronizer.start();
      
      // Start real-time monitor
      await this.realTimeMonitor.start();
      
      this.isRunning = true;
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.logger.info('Bridge sync service started successfully', {
        wsEndpoint: `ws://localhost:${this.config.monitoring.wsPort}`,
        ioEndpoint: `http://localhost:${this.config.monitoring.ioPort}`,
        dataPath: this.config.dataPath,
      });
      
    } catch (error) {
      this.logger.error('Failed to start bridge sync service', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping bridge sync service...');
    this.isRunning = false;

    try {
      // Stop real-time monitor
      await this.realTimeMonitor.stop();
      
      // Stop state synchronizer
      await this.stateSynchronizer.stop();
      
      // Disconnect from Redis
      await this.redis.disconnect();
      
      // Close database
      await this.database.close();
      
      this.logger.info('Bridge sync service stopped successfully');
      
    } catch (error) {
      this.logger.error('Error stopping bridge sync service', error);
    }
  }

  async getStatus(): Promise<{
    isRunning: boolean;
    syncMetrics: any;
    chainStates: any;
    alerts: any[];
    databaseStats: any;
  }> {
    return {
      isRunning: this.isRunning,
      syncMetrics: this.stateSynchronizer.getSyncMetrics(),
      chainStates: {
        solana: this.stateSynchronizer.getChainState('solana'),
        nockchain: this.stateSynchronizer.getChainState('nockchain'),
      },
      alerts: this.realTimeMonitor.getActiveAlerts(),
      databaseStats: await this.database.getDatabaseStatistics(),
    };
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }

  private static loadConfiguration(args: CliArgs): SyncConfiguration {
    return {
      solanaRpcUrl: args.solanaRpc || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      nockchainRpcUrl: args.nockchainRpc || process.env.NOCKCHAIN_RPC_URL || 'http://localhost:8545',
      redisUrl: args.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      dataPath: args.dataPath || process.env.DATA_PATH || path.join(process.cwd(), 'data'),
      syncInterval: args.syncInterval || parseInt(process.env.SYNC_INTERVAL || '10000'),
      batchSize: args.batchSize || parseInt(process.env.BATCH_SIZE || '100'),
      confirmationBlocks: {
        nockchain: parseInt(process.env.NOCKCHAIN_CONFIRMATIONS || '12'),
        solana: parseInt(process.env.SOLANA_CONFIRMATIONS || '32'),
      },
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.RETRY_DELAY || '5000'),
      stateVerificationInterval: parseInt(process.env.STATE_VERIFICATION_INTERVAL || '60000'),
      emergencyThresholds: {
        syncDelay: parseInt(process.env.EMERGENCY_SYNC_DELAY || '300'), // 5 minutes
        errorRate: parseFloat(process.env.EMERGENCY_ERROR_RATE || '0.1'), // 10%
        blockGap: parseInt(process.env.EMERGENCY_BLOCK_GAP || '100'),
      },
      monitoring: {
        wsPort: args.wsPort || parseInt(process.env.WS_PORT || '8081'),
        ioPort: args.ioPort || parseInt(process.env.IO_PORT || '8080'),
        alertThresholds: {
          blockTimeDeviation: parseFloat(process.env.BLOCK_TIME_THRESHOLD || '30'), // seconds
          transactionFailureRate: parseFloat(process.env.TX_FAILURE_THRESHOLD || '5'), // percent
          syncDelay: parseInt(process.env.SYNC_DELAY_THRESHOLD || '60'), // seconds
          liquidityThreshold: parseFloat(process.env.LIQUIDITY_THRESHOLD || '80'), // percent
          bridgeHealthThreshold: parseInt(process.env.BRIDGE_HEALTH_THRESHOLD || '70'), // 0-100
        },
        metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7'),
        alertRetentionDays: parseInt(process.env.ALERT_RETENTION_DAYS || '30'),
        notificationChannels: {
          email: process.env.NOTIFICATION_EMAILS?.split(',') || [],
          slack: process.env.SLACK_WEBHOOK || '',
          webhook: process.env.NOTIFICATION_WEBHOOKS?.split(',') || [],
        },
      },
      database: {
        maxCacheSize: parseInt(process.env.DB_CACHE_SIZE || '100'), // MB
        compressionEnabled: process.env.DB_COMPRESSION === 'true',
        backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '3600'), // seconds
        retentionPeriod: parseInt(process.env.DB_RETENTION_PERIOD || '30'), // days
      },
    };
  }
}

// CLI Command definitions
const argv = yargs(hideBin(process.argv))
  .command(
    'start',
    'Start the bridge state synchronization service',
    (yargs) => {
      return yargs
        .option('solana-rpc', {
          alias: 's',
          type: 'string',
          description: 'Solana RPC endpoint URL',
          default: 'https://api.mainnet-beta.solana.com',
        })
        .option('nockchain-rpc', {
          alias: 'n',
          type: 'string',
          description: 'Nockchain RPC endpoint URL',
          default: 'http://localhost:8545',
        })
        .option('redis-url', {
          alias: 'r',
          type: 'string',
          description: 'Redis connection URL',
          default: 'redis://localhost:6379',
        })
        .option('data-path', {
          alias: 'd',
          type: 'string',
          description: 'Database storage path',
          default: './data',
        })
        .option('sync-interval', {
          alias: 'i',
          type: 'number',
          description: 'Synchronization interval in milliseconds',
          default: 10000,
        })
        .option('batch-size', {
          alias: 'b',
          type: 'number',
          description: 'Block processing batch size',
          default: 100,
        })
        .option('ws-port', {
          type: 'number',
          description: 'WebSocket server port',
          default: 8081,
        })
        .option('io-port', {
          type: 'number',
          description: 'Socket.IO server port',
          default: 8080,
        })
        .option('log-level', {
          alias: 'l',
          type: 'string',
          choices: ['debug', 'info', 'warn', 'error'],
          description: 'Logging level',
          default: 'info',
        });
    },
    async (argv) => {
      // Set log level
      process.env.LOG_LEVEL = argv.logLevel;
      
      const config = BridgeSyncService.loadConfiguration(argv as CliArgs);
      const service = new BridgeSyncService(config);
      
      try {
        await service.start();
        
        // Keep process alive
        process.on('SIGTERM', async () => {
          await service.stop();
          process.exit(0);
        });
        
        process.on('SIGINT', async () => {
          await service.stop();
          process.exit(0);
        });
        
      } catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
      }
    }
  )
  .command(
    'status',
    'Get service status and metrics',
    (yargs) => {
      return yargs
        .option('redis-url', {
          alias: 'r',
          type: 'string',
          description: 'Redis connection URL',
          default: 'redis://localhost:6379',
        })
        .option('format', {
          alias: 'f',
          type: 'string',
          choices: ['json', 'table'],
          description: 'Output format',
          default: 'json',
        });
    },
    async (argv) => {
      const redis = new RedisClient(argv.redisUrl);
      
      try {
        await redis.connect();
        
        // Get recent metrics
        const syncMetrics = await redis.getRecentMetrics('sync_engine', 1);
        const monitorMetrics = await redis.getRecentMetrics('real_time_monitor', 1);
        
        const status = {
          timestamp: new Date().toISOString(),
          sync: {
            metrics: syncMetrics,
            lastUpdate: syncMetrics.length > 0 ? new Date(syncMetrics[syncMetrics.length - 1].timestamp).toISOString() : 'N/A',
          },
          monitor: {
            metrics: monitorMetrics,
            lastUpdate: monitorMetrics.length > 0 ? new Date(monitorMetrics[monitorMetrics.length - 1].timestamp).toISOString() : 'N/A',
          },
        };
        
        if (argv.format === 'json') {
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log('\n🌉 Bridge Sync Service Status');
          console.log('================================');
          console.log(`Timestamp: ${status.timestamp}`);
          console.log(`Sync Last Update: ${status.sync.lastUpdate}`);
          console.log(`Monitor Last Update: ${status.monitor.lastUpdate}`);
          console.log(`Sync Metrics: ${syncMetrics.length} records`);
          console.log(`Monitor Metrics: ${monitorMetrics.length} records`);
        }
        
        await redis.disconnect();
        
      } catch (error) {
        console.error('Failed to get status:', error.message);
        process.exit(1);
      }
    }
  )
  .command(
    'verify',
    'Verify cross-chain state consistency',
    (yargs) => {
      return yargs
        .option('data-path', {
          alias: 'd',
          type: 'string',
          description: 'Database storage path',
          default: './data',
        });
    },
    async (argv) => {
      const logger = new Logger('verify-command');
      const database = new StateDatabase({
        dataPath: argv.dataPath,
        maxCacheSize: 100,
        compressionEnabled: false,
        backupInterval: 0,
        retentionPeriod: 30,
      }, logger);
      
      try {
        await database.open();
        
        const solanaState = await database.getChainState('solana');
        const nockchainState = await database.getChainState('nockchain');
        
        console.log('\n🔍 Cross-Chain State Verification');
        console.log('=====================================');
        
        if (!solanaState) {
          console.log('❌ Solana state not found');
        } else {
          console.log(`✅ Solana - Block: ${solanaState.blockHeight}, Balance: ${solanaState.bridgeBalance}`);
        }
        
        if (!nockchainState) {
          console.log('❌ Nockchain state not found');
        } else {
          console.log(`✅ Nockchain - Block: ${nockchainState.blockHeight}, Balance: ${nockchainState.bridgeBalance}`);
        }
        
        if (solanaState && nockchainState) {
          const balanceMatch = solanaState.bridgeBalance === nockchainState.bridgeBalance;
          const emergencyMatch = solanaState.emergencyMode === nockchainState.emergencyMode;
          
          console.log(`\nConsistency Check:`);
          console.log(`Balance Match: ${balanceMatch ? '✅' : '❌'}`);
          console.log(`Emergency Mode Match: ${emergencyMatch ? '✅' : '❌'}`);
          
          if (!balanceMatch || !emergencyMatch) {
            console.log('\n⚠️  State inconsistency detected!');
            process.exit(1);
          } else {
            console.log('\n✅ All consistency checks passed!');
          }
        }
        
        await database.close();
        
      } catch (error) {
        console.error('Failed to verify state:', error.message);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .alias('help', 'h')
  .version('1.0.0')
  .epilogue('For more information, visit: https://nockchain.com/bridge')
  .parseAsync();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export { BridgeSyncService };
export default BridgeSyncService;