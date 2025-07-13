// NOCK Bridge Validator - Military-grade multi-sig validator with 5-of-9 security
// Entry point for validator network deployment

import { config } from 'dotenv';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import BridgeValidator, { ValidatorConfig } from './validator';
import { Logger } from './utils/logger';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Load environment variables
config();

interface CliArgs {
  validatorId: string;
  privateKey?: string;
  keyFile?: string;
  solanaRpc?: string;
  nockchainRpc?: string;
  redisUrl?: string;
  port?: number;
  threshold?: number;
  totalValidators?: number;
  emergencyContacts?: string;
  securityLevel?: 'standard' | 'enhanced' | 'military';
  configFile?: string;
}

class ValidatorLauncher {
  private logger: Logger;
  private validator?: BridgeValidator;

  constructor() {
    this.logger = new Logger('validator-launcher');
  }

  async start(args: CliArgs): Promise<void> {
    try {
      this.logger.info('Starting NOCK Bridge Validator', {
        validatorId: args.validatorId,
        securityLevel: args.securityLevel || 'military',
        port: args.port || 8080,
      });

      // Load configuration
      const config = await this.loadConfiguration(args);

      // Validate configuration
      this.validateConfiguration(config);

      // Initialize validator
      this.validator = new BridgeValidator(config);

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start validator
      await this.validator.start();

      this.logger.info('NOCK Bridge Validator started successfully', {
        validatorId: config.validatorId,
        endpoint: `ws://localhost:${config.port}`,
      });

      // Keep process alive
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start validator', error);
      process.exit(1);
    }
  }

  private async loadConfiguration(args: CliArgs): Promise<ValidatorConfig> {
    let config: Partial<ValidatorConfig> = {};

    // Load from config file if specified
    if (args.configFile) {
      config = this.loadConfigFile(args.configFile);
    }

    // Override with command line arguments
    const privateKey = await this.resolvePrivateKey(args);
    const emergencyContacts = args.emergencyContacts 
      ? args.emergencyContacts.split(',')
      : process.env.EMERGENCY_CONTACTS?.split(',') || [];

    return {
      validatorId: args.validatorId,
      privateKey,
      solanaRpcUrl: args.solanaRpc || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      nockchainRpcUrl: args.nockchainRpc || process.env.NOCKCHAIN_RPC_URL || 'http://localhost:8545',
      redisUrl: args.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      port: args.port || parseInt(process.env.VALIDATOR_PORT || '8080'),
      threshold: args.threshold || parseInt(process.env.CONSENSUS_THRESHOLD || '5'),
      totalValidators: args.totalValidators || parseInt(process.env.TOTAL_VALIDATORS || '9'),
      emergencyContacts,
      securityLevel: args.securityLevel || 'military',
      ...config,
    };
  }

  private loadConfigFile(configPath: string): Partial<ValidatorConfig> {
    try {
      if (!existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
      }

      const configData = readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      this.logger.error(`Failed to load config file: ${configPath}`, error);
      throw error;
    }
  }

  private async resolvePrivateKey(args: CliArgs): Promise<string> {
    // Priority: CLI arg > key file > environment variable
    if (args.privateKey) {
      return args.privateKey;
    }

    if (args.keyFile) {
      try {
        const keyData = readFileSync(args.keyFile, 'utf8').trim();
        return keyData;
      } catch (error) {
        this.logger.error(`Failed to read key file: ${args.keyFile}`, error);
        throw error;
      }
    }

    const envKey = process.env.VALIDATOR_PRIVATE_KEY;
    if (envKey) {
      return envKey;
    }

    throw new Error('Private key must be provided via --private-key, --key-file, or VALIDATOR_PRIVATE_KEY environment variable');
  }

  private validateConfiguration(config: ValidatorConfig): void {
    const requiredFields = [
      'validatorId',
      'privateKey',
      'solanaRpcUrl',
      'nockchainRpcUrl',
      'redisUrl',
      'port',
      'threshold',
      'totalValidators',
    ];

    for (const field of requiredFields) {
      if (!config[field as keyof ValidatorConfig]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate private key format
    try {
      const keyBytes = bs58.decode(config.privateKey);
      if (keyBytes.length !== 64) {
        throw new Error('Invalid private key length');
      }
      Keypair.fromSecretKey(keyBytes);
    } catch (error) {
      throw new Error(`Invalid private key format: ${error.message}`);
    }

    // Validate threshold
    if (config.threshold <= 0 || config.threshold > config.totalValidators) {
      throw new Error(`Invalid threshold: ${config.threshold}. Must be between 1 and ${config.totalValidators}`);
    }

    // Validate Byzantine fault tolerance (threshold > 2/3 of total)
    const minThreshold = Math.ceil((config.totalValidators * 2) / 3);
    if (config.threshold < minThreshold) {
      this.logger.warn(`Threshold ${config.threshold} is below Byzantine fault tolerance minimum of ${minThreshold}`);
    }

    // Validate port
    if (config.port < 1024 || config.port > 65535) {
      throw new Error(`Invalid port: ${config.port}. Must be between 1024 and 65535`);
    }

    this.logger.info('Configuration validation passed', {
      validatorId: config.validatorId,
      threshold: config.threshold,
      totalValidators: config.totalValidators,
      securityLevel: config.securityLevel,
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown...`);
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
  }

  private async shutdown(): Promise<void> {
    try {
      if (this.validator) {
        this.logger.info('Stopping validator...');
        await this.validator.stop();
        this.logger.info('Validator stopped successfully');
      }
    } catch (error) {
      this.logger.error('Error during shutdown', error);
    }
  }
}

// CLI Command definitions
const argv = yargs(hideBin(process.argv))
  .command(
    'start',
    'Start the bridge validator',
    (yargs) => {
      return yargs
        .option('validator-id', {
          alias: 'id',
          type: 'string',
          demandOption: true,
          description: 'Unique identifier for this validator',
        })
        .option('private-key', {
          alias: 'k',
          type: 'string',
          description: 'Base58 encoded private key for the validator',
        })
        .option('key-file', {
          alias: 'f',
          type: 'string',
          description: 'Path to file containing the private key',
        })
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
        .option('port', {
          alias: 'p',
          type: 'number',
          description: 'WebSocket port for validator communication',
          default: 8080,
        })
        .option('threshold', {
          alias: 't',
          type: 'number',
          description: 'Minimum signatures required for consensus',
          default: 5,
        })
        .option('total-validators', {
          alias: 'v',
          type: 'number',
          description: 'Total number of validators in the network',
          default: 9,
        })
        .option('emergency-contacts', {
          alias: 'e',
          type: 'string',
          description: 'Comma-separated list of emergency contact addresses',
        })
        .option('security-level', {
          alias: 'l',
          type: 'string',
          choices: ['standard', 'enhanced', 'military'],
          description: 'Security level for the validator',
          default: 'military',
        })
        .option('config-file', {
          alias: 'c',
          type: 'string',
          description: 'Path to JSON configuration file',
        })
        .check((argv) => {
          if (!argv.privateKey && !argv.keyFile && !process.env.VALIDATOR_PRIVATE_KEY) {
            throw new Error('Private key must be provided via --private-key, --key-file, or VALIDATOR_PRIVATE_KEY environment variable');
          }
          return true;
        });
    },
    async (argv) => {
      const launcher = new ValidatorLauncher();
      await launcher.start(argv as CliArgs);
    }
  )
  .command(
    'keygen',
    'Generate a new validator keypair',
    (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file for the private key',
        })
        .option('format', {
          alias: 'f',
          type: 'string',
          choices: ['base58', 'json'],
          description: 'Output format for the keypair',
          default: 'base58',
        });
    },
    (argv) => {
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      const privateKey = bs58.encode(keypair.secretKey);

      if (argv.format === 'json') {
        const keyData = {
          publicKey,
          privateKey,
          secretKey: Array.from(keypair.secretKey),
        };
        
        if (argv.output) {
          require('fs').writeFileSync(argv.output, JSON.stringify(keyData, null, 2));
          console.log(`Keypair saved to: ${argv.output}`);
        } else {
          console.log(JSON.stringify(keyData, null, 2));
        }
      } else {
        if (argv.output) {
          require('fs').writeFileSync(argv.output, privateKey);
          console.log(`Private key saved to: ${argv.output}`);
          console.log(`Public key: ${publicKey}`);
        } else {
          console.log(`Public key: ${publicKey}`);
          console.log(`Private key: ${privateKey}`);
        }
      }

      console.log('\n⚠️  SECURITY WARNING:');
      console.log('Keep your private key secure and never share it!');
      console.log('This key controls validator funds and consensus participation.');
    }
  )
  .command(
    'health',
    'Check validator health and connectivity',
    (yargs) => {
      return yargs
        .option('validator-id', {
          alias: 'id',
          type: 'string',
          demandOption: true,
          description: 'Validator ID to check',
        })
        .option('redis-url', {
          alias: 'r',
          type: 'string',
          description: 'Redis connection URL',
          default: 'redis://localhost:6379',
        });
    },
    async (argv) => {
      const { RedisClient } = await import('./utils/redis');
      const redis = new RedisClient(argv.redisUrl);
      
      try {
        await redis.connect();
        
        const validatorInfo = await redis.getValidatorInfo(argv.validatorId);
        const networkState = await redis.getNetworkState(argv.validatorId);
        const isActive = await redis.sIsMember('active_validators', argv.validatorId);
        
        console.log('\n🏥 Validator Health Check');
        console.log('========================');
        console.log(`Validator ID: ${argv.validatorId}`);
        console.log(`Active: ${isActive ? '✅' : '❌'}`);
        
        if (validatorInfo) {
          console.log(`Endpoint: ${validatorInfo.endpoint}`);
          console.log(`Last Seen: ${new Date(validatorInfo.timestamp).toISOString()}`);
          console.log(`Capabilities: ${JSON.stringify(validatorInfo.capabilities, null, 2)}`);
        } else {
          console.log('❌ Validator not found in registry');
        }
        
        if (networkState) {
          console.log(`\nNetwork State:`);
          console.log(`- Block Height: ${networkState.blockHeight}`);
          console.log(`- Consensus Round: ${networkState.consensusRound}`);
          console.log(`- Network Health: ${networkState.networkHealth}%`);
          console.log(`- Last Sync: ${new Date(networkState.lastSyncTime).toISOString()}`);
        }
        
        await redis.disconnect();
      } catch (error) {
        console.error('❌ Health check failed:', error.message);
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

export default ValidatorLauncher;