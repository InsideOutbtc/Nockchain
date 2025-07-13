// Configuration Templates - Production-ready configurations for all integration components

import { Connection, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { UnifiedIntegrationConfig } from './unified-main';

export class ConfigurationTemplates {
  
  static getProductionConfig(): UnifiedIntegrationConfig {
    return {
      // Core blockchain connections
      solana: {
        rpcEndpoint: 'https://api.mainnet-beta.solana.com',
        commitment: 'confirmed',
        confirmTransactions: true
      },
      
      // Bridge wallet configuration
      bridgeWallet: {
        privateKey: process.env.BRIDGE_WALLET_PRIVATE_KEY || '',
        enableHardwareWallet: true,
        hardwareWalletPath: process.env.HARDWARE_WALLET_PATH
      },
      
      // Mining Pool Bridge Configuration
      miningPoolBridge: {
        solanaConnection: new Connection('https://api.mainnet-beta.solana.com'),
        bridgeWallet: Keypair.generate(), // Replace with actual wallet
        
        miningPool: {
          apiEndpoint: process.env.MINING_POOL_API_ENDPOINT || 'https://pool.nockchain.com/api',
          websocketEndpoint: process.env.MINING_POOL_WS_ENDPOINT || 'wss://pool.nockchain.com/ws',
          apiKey: process.env.MINING_POOL_API_KEY || '',
          enableRewardBridging: true,
          enableCrossChainMining: true
        },
        
        database: {
          connectionString: process.env.DATABASE_URL || '',
          enableUnifiedTables: true,
          enableCrossChainTracking: true
        },
        
        bridge: {
          enableAutomaticBridging: true,
          minimumBridgeAmount: new BN(1000000), // 1 NOCK
          maxDailyBridgeAmount: new BN(1000000000000), // 1M NOCK
          bridgeFeePercentage: 0.5
        },
        
        payouts: {
          enableCrossChainPayouts: true,
          defaultPayoutChain: 'nockchain',
          enableChainSelection: true,
          minimumPayoutAmount: new BN(100000), // 0.1 NOCK
          processPayoutsAutomatically: true
        },
        
        liquidity: {
          enableMiningRewardLiquidity: true,
          liquidityContributionPercentage: 5, // 5% of rewards
          enableArbitrageSharing: true,
          shareMiningRevenue: true
        },
        
        userExperience: {
          enableUnifiedDashboard: true,
          enableCrossChainPortfolio: true,
          enableBridgeRecommendations: true,
          enableAutomatedOptimization: true
        },
        
        // Institutional configuration
        institutional: {
          connection: new Connection('https://api.mainnet-beta.solana.com'),
          wallet: Keypair.generate(),
          
          api: {
            enableInstitutionalFeatures: true,
            enableAdvancedSecurity: true,
            enableMultiTenancy: true,
            enableCustodyFeatures: true,
            
            auth: {
              enableMFA: true,
              enableSSO: true,
              enableApiKeys: true,
              enableJWT: true,
              tokenExpirationTime: 3600,
              maxFailedAttempts: 5,
              lockoutDuration: 1800,
              enableIPWhitelisting: true,
              allowedIPs: []
            },
            
            rateLimiting: {
              enabled: true,
              globalLimit: 10000,
              userLimit: 1000,
              institutionLimit: 5000,
              premiumMultiplier: 5,
              burstAllowance: 100
            },
            
            security: {
              enableEncryption: true,
              enableSignatureValidation: true,
              enableAuditLogging: true,
              enableThreatDetection: true,
              enableGeofencing: true,
              allowedCountries: ['US', 'EU', 'CA', 'AU', 'JP', 'SG'],
              enableDataMasking: true
            },
            
            custody: {
              enableMultiSig: true,
              requiredSignatures: 5,
              enableHardwareWallets: true,
              enableColdStorage: true,
              enableInsuranceFund: true,
              maxWithdrawalAmount: new BN(10000000000), // 10M NOCK
              withdrawalDelayPeriod: 24,
              enableWithdrawalWhitelist: true
            },
            
            compliance: {
              enableKYC: true,
              enableAML: true,
              enableCRS: true,
              enableFATCA: true,
              reportingJurisdictions: ['US', 'EU'],
              enableTransactionMonitoring: true,
              enableSanctionsScreening: true
            },
            
            infrastructure: {
              enableLoadBalancing: true,
              enableCaching: true,
              enableCDN: true,
              maxConcurrentConnections: 10000,
              timeoutDuration: 30,
              enableFailover: true,
              backupEndpoints: []
            }
          },
          
          custody: {
            enableMultiSig: true,
            requiredSignatures: 5,
            totalSigners: 9,
            enableHardwareSecurity: true,
            enableColdStorage: true,
            
            enableInsuranceFund: true,
            insuranceCoverageAmount: new BN(100000000000000), // 100M NOCK
            enableSlashingProtection: true,
            maxSlashingAmount: new BN(1000000000000), // 1M NOCK
            
            withdrawalLimits: {
              dailyLimit: new BN(10000000000), // 10M NOCK
              monthlyLimit: new BN(100000000000), // 100M NOCK
              singleTransactionLimit: new BN(1000000000), // 1M NOCK
              enableWhitelist: true,
              requireApproval: true
            },
            
            timeLocks: {
              enableTimeLock: true,
              minimumDelay: 24,
              maximumDelay: 168,
              emergencyDelay: 60
            },
            
            riskControls: {
              enableVelocityChecks: true,
              enableAnomalyDetection: true,
              enableGeoRestrictions: true,
              allowedJurisdictions: ['US', 'EU', 'CA', 'AU', 'JP', 'SG'],
              maxConcentrationRisk: 25
            },
            
            compliance: {
              enableAuditTrail: true,
              enableRealTimeReporting: true,
              enableRegulatorAccess: true,
              reportingFrequency: 'daily',
              enableSuspiciousActivityReporting: true
            },
            
            recovery: {
              enableRecoveryProcedures: true,
              enableShardedBackup: true,
              requiredRecoverySignatures: 7,
              emergencyRecoveryTimeout: 72,
              enableSocialRecovery: false
            }
          },
          
          gateway: {
            enableLoadBalancing: true,
            enableCaching: true,
            enableRateLimiting: true,
            enableCircuitBreaker: true,
            
            loadBalancing: {
              algorithm: 'least_connections',
              healthCheckInterval: 30,
              unhealthyThreshold: 3,
              healthyThreshold: 2,
              maxRetries: 3,
              retryDelay: 1000
            },
            
            backends: [],
            
            caching: {
              enableRedis: true,
              enableMemory: true,
              defaultTTL: 300,
              maxSize: 1024,
              compressionEnabled: true,
              cachingStrategies: []
            },
            
            rateLimiting: {
              windowSize: 60,
              requestLimit: 1000,
              enableDistributed: true,
              keyGenerator: 'api_key',
              enableBurstAllowance: true,
              burstSize: 100
            },
            
            circuitBreaker: {
              failureThreshold: 10,
              successThreshold: 5,
              timeout: 30000,
              monitoringPeriod: 60
            },
            
            security: {
              enableCORS: true,
              corsOrigins: ['https://nockchain.com'],
              enableRequestSigning: true,
              enableEncryption: true,
              enableDDoSProtection: true,
              maxRequestSize: 10485760, // 10MB
              enableSQLInjectionProtection: true,
              enableXSSProtection: true
            },
            
            monitoring: {
              enableMetrics: true,
              enableTracing: true,
              enableLogging: true,
              logLevel: 'info',
              metricsPort: 9090,
              tracingSampleRate: 0.1
            },
            
            websocket: {
              enabled: true,
              maxConnections: 10000,
              heartbeatInterval: 30,
              messageQueueSize: 1000,
              enableCompression: true
            }
          },
          
          notifications: {
            enableNotifications: true,
            enableRealTimeAlerts: true,
            enableDigestReports: true,
            enableEscalation: true,
            
            channels: {
              email: {
                enabled: true,
                smtpHost: process.env.SMTP_HOST || '',
                smtpPort: 587,
                username: process.env.SMTP_USERNAME || '',
                enableTLS: true,
                fromAddress: 'alerts@nockchain.com',
                replyToAddress: 'support@nockchain.com',
                enableSignature: true,
                signatureTemplate: 'NOCK Bridge Alert System'
              },
              
              sms: {
                enabled: true,
                provider: 'twilio',
                apiKey: process.env.TWILIO_API_KEY || '',
                fromNumber: process.env.TWILIO_FROM_NUMBER || '',
                enableDeliveryReceipts: true
              },
              
              webhook: {
                enabled: true,
                endpoints: [],
                enableRetries: true,
                maxRetries: 3,
                retryBackoff: 'exponential',
                timeout: 30
              },
              
              slack: {
                enabled: true,
                webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
                defaultChannel: '#alerts',
                enableThreading: true,
                enableMentions: true
              },
              
              teams: {
                enabled: false,
                webhookUrl: '',
                enableCards: true,
                enableButtons: true
              },
              
              phone: {
                enabled: false,
                provider: 'twilio',
                apiKey: '',
                enableVoiceAlerts: false,
                voiceMessage: 'Critical alert from NOCK Bridge system'
              }
            },
            
            alertTypes: [],
            escalationRules: [],
            
            rateLimiting: {
              enabled: true,
              maxAlertsPerMinute: 100,
              maxAlertsPerHour: 1000,
              batchingEnabled: true,
              batchWindow: 60,
              maxBatchSize: 10
            },
            
            templates: []
          },
          
          reporting: {
            enableReporting: true,
            enableRealTimeReports: true,
            enableScheduledReports: true,
            enableCustomReports: true,
            
            dataSources: {
              enableTradingData: true,
              enableCustodyData: true,
              enablePerformanceData: true,
              enableComplianceData: true,
              enableRiskData: true
            },
            
            generation: {
              enablePDFReports: true,
              enableExcelReports: true,
              enableCSVReports: true,
              enableJSONReports: true,
              enableDashboards: true,
              maxReportSize: 100,
              reportRetentionPeriod: 2555 // 7 years
            },
            
            scheduling: {
              enableAutomaticGeneration: true,
              defaultSchedules: [],
              enableCustomSchedules: true,
              maxConcurrentReports: 10
            },
            
            distribution: {
              enableEmailDistribution: true,
              enableAPIDistribution: true,
              enablePortalAccess: true,
              enableFTPDistribution: false,
              enableSecureDownload: true
            },
            
            security: {
              enableEncryption: true,
              enableDigitalSignatures: true,
              enableWatermarking: true,
              enableAccessLogging: true,
              retentionPolicy: {
                defaultRetentionDays: 2555,
                complianceRetentionDays: 2555,
                auditRetentionDays: 3650,
                enableAutomaticDeletion: false,
                enableArchiving: true,
                archiveLocation: 's3://nock-archive'
              }
            }
          },
          
          enableAllServices: true,
          enableServiceOrchestration: true,
          enableCrossServiceCommunication: true,
          enableUnifiedLogging: true,
          
          enterprise: {
            enableHighAvailability: true,
            enableLoadBalancing: true,
            enableFailover: true,
            enableDisasterRecovery: true,
            enableGlobalDistribution: true
          },
          
          compliance: {
            enableGlobalCompliance: true,
            enableDataGovernance: true,
            enablePrivacyControls: true,
            enableRegulatoryReporting: true,
            enableAuditTrail: true
          },
          
          monitoring: {
            enableUnifiedMonitoring: true,
            enablePerformanceTracking: true,
            enableHealthChecks: true,
            enableAlertCorrelation: true,
            metricsAggregationInterval: 60
          }
        }
      },
      
      // Dashboard Configuration
      dashboard: {
        theme: 'dark',
        layout: 'detailed',
        refreshInterval: 30,
        defaultTimeframe: 'daily',
        enableRealTimeUpdates: true,
        enableAdvancedCharts: true,
        enableCrossChainView: true,
        enableDesktopNotifications: true,
        enableSoundAlerts: false,
        alertThresholds: {
          hashrateDrop: 20,
          payoutReady: new BN(1000000),
          bridgeOpportunity: 2,
          systemDowntime: 300,
          liquidityLow: 10,
          priceMovement: 5
        },
        enableQuickActions: true,
        enablePredictiveAnalytics: true,
        enablePortfolioTracking: true,
        enableTaxReporting: true
      },
      
      // Cross-Chain Payout Configuration
      crossChainPayout: {
        solanaConnection: new Connection('https://api.mainnet-beta.solana.com'),
        payoutWallet: Keypair.generate(),
        
        payout: {
          enableCrossChainPayouts: true,
          defaultChain: 'nockchain',
          minimumPayoutAmount: new BN(100000),
          maximumPayoutAmount: new BN(1000000000000),
          payoutBatchSize: 100,
          payoutInterval: 300
        },
        
        bridge: {
          enableAutomaticBridging: true,
          bridgeThresholdAmount: new BN(1000000),
          maxBridgeSlippage: 2,
          bridgePriorityFee: new BN(5000)
        },
        
        fees: {
          nockchainPayoutFee: new BN(1000),
          solanaPayoutFee: new BN(5000),
          bridgeFeePercentage: 0.5,
          priorityFeeEnabled: true
        },
        
        riskManagement: {
          enableVelocityChecks: true,
          maxHourlyPayouts: new BN(100000000000),
          maxDailyPayouts: new BN(1000000000000),
          enableFraudDetection: true,
          enableWhitelisting: true
        },
        
        retry: {
          maxRetries: 3,
          retryDelaySeconds: 60,
          exponentialBackoff: true,
          enableFailsafe: true
        }
      },
      
      // Mining Pool API Configuration
      miningPoolAPI: {
        miningPoolEndpoint: process.env.MINING_POOL_ENDPOINT || 'https://api.pool.nockchain.com',
        apiKey: process.env.MINING_POOL_API_KEY || '',
        secretKey: process.env.MINING_POOL_SECRET_KEY || '',
        databaseUrl: process.env.MINING_POOL_DATABASE_URL || '',
        redisUrl: process.env.REDIS_URL || '',
        enableRealTimeSync: true,
        syncInterval: 30,
        enableWebhooks: true,
        webhookSecret: process.env.WEBHOOK_SECRET || '',
        maxConcurrentRequests: 100,
        requestTimeout: 30000,
        retryAttempts: 3,
        enableCaching: true,
        cacheExpiry: 300
      },
      
      // Database Sync Configuration
      databaseSync: {
        miningPoolDb: {
          host: process.env.MINING_POOL_DB_HOST || 'localhost',
          port: parseInt(process.env.MINING_POOL_DB_PORT || '5432'),
          database: process.env.MINING_POOL_DB_NAME || 'mining_pool',
          username: process.env.MINING_POOL_DB_USER || 'postgres',
          password: process.env.MINING_POOL_DB_PASS || '',
          ssl: true
        },
        
        bridgeDb: {
          host: process.env.BRIDGE_DB_HOST || 'localhost',
          port: parseInt(process.env.BRIDGE_DB_PORT || '5432'),
          database: process.env.BRIDGE_DB_NAME || 'bridge',
          username: process.env.BRIDGE_DB_USER || 'postgres',
          password: process.env.BRIDGE_DB_PASS || '',
          ssl: true
        },
        
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          database: 0
        },
        
        sync: {
          enableRealTimeSync: true,
          batchSize: 1000,
          syncInterval: 60,
          conflictResolution: 'merge',
          enableBackfill: true,
          maxRetries: 3
        },
        
        performance: {
          maxConnections: 20,
          connectionTimeout: 30000,
          queryTimeout: 30000,
          enableConnectionPooling: true,
          enableQueryCaching: true,
          cacheExpiry: 300
        },
        
        monitoring: {
          enableMetrics: true,
          enableAlerts: true,
          alertThresholds: {
            syncLag: 300,
            errorRate: 5,
            connectionFailures: 5
          }
        }
      },
      
      // Realtime Events Configuration
      realtimeEvents: {
        websocket: {
          port: parseInt(process.env.WEBSOCKET_PORT || '8080'),
          host: '0.0.0.0',
          enableSSL: process.env.NODE_ENV === 'production',
          certPath: process.env.SSL_CERT_PATH,
          keyPath: process.env.SSL_KEY_PATH,
          maxConnections: 10000,
          pingInterval: 30,
          connectionTimeout: 300
        },
        
        events: {
          enableFiltering: true,
          enableRateLimiting: true,
          maxEventsPerSecond: 1000,
          bufferSize: 10000,
          enableCompression: true
        },
        
        auth: {
          enableAuthentication: true,
          jwtSecret: process.env.JWT_SECRET || '',
          sessionTimeout: 3600,
          enableRoleBasedAccess: true
        },
        
        monitoring: {
          enableMetrics: true,
          enableLogging: true,
          logLevel: 'info',
          metricsInterval: 60
        },
        
        performance: {
          enableClustering: false,
          enableRedisAdapter: true,
          redisUrl: process.env.REDIS_URL,
          enableMessageQueue: false,
          queueUrl: process.env.MESSAGE_QUEUE_URL
        }
      },
      
      // Global Settings
      global: {
        environment: (process.env.NODE_ENV as any) || 'production',
        enableHealthChecks: true,
        healthCheckInterval: 30,
        enablePerformanceMonitoring: true,
        enableErrorReporting: true,
        errorReportingEndpoint: process.env.ERROR_REPORTING_ENDPOINT
      },
      
      // Security Settings
      security: {
        enableEncryption: true,
        encryptionKey: process.env.ENCRYPTION_KEY || '',
        enableAccessControl: true,
        adminApiKeys: (process.env.ADMIN_API_KEYS || '').split(','),
        enableAuditLogging: true,
        auditLogRetention: 2555 // 7 years
      },
      
      // Performance Optimization
      performance: {
        enableCaching: true,
        cacheSize: 1024, // 1GB
        enableConnectionPooling: true,
        maxConcurrentOperations: 1000,
        enableBatching: true,
        batchSize: 100
      },
      
      // Monitoring and Alerting
      monitoring: {
        enableMetrics: true,
        metricsPort: 9090,
        enableHealthEndpoint: true,
        healthEndpointPort: 8081,
        enableAlerts: true,
        alertWebhooks: (process.env.ALERT_WEBHOOKS || '').split(',').filter(Boolean)
      }
    };
  }

  static getTestingConfig(): UnifiedIntegrationConfig {
    const config = this.getProductionConfig();
    
    // Override for testing environment
    config.solana.rpcEndpoint = 'https://api.devnet.solana.com';
    config.global.environment = 'development';
    
    // Reduce limits for testing
    config.crossChainPayout.payout.payoutBatchSize = 10;
    config.databaseSync.sync.batchSize = 100;
    config.realtimeEvents.websocket.maxConnections = 100;
    
    // Enable debug logging
    config.realtimeEvents.monitoring.logLevel = 'debug';
    
    return config;
  }

  static getDevelopmentConfig(): UnifiedIntegrationConfig {
    const config = this.getTestingConfig();
    
    // Further overrides for development
    config.security.enableEncryption = false;
    config.security.enableAccessControl = false;
    config.performance.enableCaching = false;
    
    // Use local services
    config.miningPoolAPI.miningPoolEndpoint = 'http://localhost:3000/api';
    config.databaseSync.miningPoolDb.host = 'localhost';
    config.databaseSync.bridgeDb.host = 'localhost';
    config.databaseSync.redis.host = 'localhost';
    
    return config;
  }

  static validateConfig(config: UnifiedIntegrationConfig): string[] {
    const errors: string[] = [];
    
    // Validate required environment variables
    if (!config.bridgeWallet.privateKey) {
      errors.push('BRIDGE_WALLET_PRIVATE_KEY is required');
    }
    
    if (!config.miningPoolAPI.apiKey) {
      errors.push('MINING_POOL_API_KEY is required');
    }
    
    if (!config.security.encryptionKey && config.security.enableEncryption) {
      errors.push('ENCRYPTION_KEY is required when encryption is enabled');
    }
    
    if (!config.realtimeEvents.auth.jwtSecret && config.realtimeEvents.auth.enableAuthentication) {
      errors.push('JWT_SECRET is required when authentication is enabled');
    }
    
    // Validate numeric ranges
    if (config.crossChainPayout.payout.payoutBatchSize <= 0) {
      errors.push('Payout batch size must be greater than 0');
    }
    
    if (config.global.healthCheckInterval <= 0) {
      errors.push('Health check interval must be greater than 0');
    }
    
    // Validate connection strings
    try {
      new URL(config.solana.rpcEndpoint);
    } catch {
      errors.push('Invalid Solana RPC endpoint URL');
    }
    
    return errors;
  }
}

// Export ready-to-use configurations
export const ProductionConfig = ConfigurationTemplates.getProductionConfig();
export const TestingConfig = ConfigurationTemplates.getTestingConfig();
export const DevelopmentConfig = ConfigurationTemplates.getDevelopmentConfig();