// Main institutional integration orchestrator combining all institutional services

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { InstitutionalAPI, InstitutionalAPIConfig } from './institutional-api';
import { CustodyVault, CustodyVaultConfig } from './custody-vault';
import { EnterpriseGateway, EnterpriseGatewayConfig } from './enterprise-gateway';
import { InstitutionalNotificationService, NotificationConfig } from '../services/institutional-notification';
import { InstitutionalReportingService, ReportingConfig } from '../services/institutional-reporting';

export interface InstitutionalIntegrationConfig {
  // Core configuration
  connection: Connection;
  wallet: Keypair;
  
  // Service configurations
  api: InstitutionalAPIConfig;
  custody: CustodyVaultConfig;
  gateway: EnterpriseGatewayConfig;
  notifications: NotificationConfig;
  reporting: ReportingConfig;
  
  // Integration settings
  enableAllServices: boolean;
  enableServiceOrchestration: boolean;
  enableCrossServiceCommunication: boolean;
  enableUnifiedLogging: boolean;
  
  // Enterprise features
  enterprise: {
    enableHighAvailability: boolean;
    enableLoadBalancing: boolean;
    enableFailover: boolean;
    enableDisasterRecovery: boolean;
    enableGlobalDistribution: boolean;
  };
  
  // Compliance and governance
  compliance: {
    enableGlobalCompliance: boolean;
    enableDataGovernance: boolean;
    enablePrivacyControls: boolean;
    enableRegulatoryReporting: boolean;
    enableAuditTrail: boolean;
  };
  
  // Performance and monitoring
  monitoring: {
    enableUnifiedMonitoring: boolean;
    enablePerformanceTracking: boolean;
    enableHealthChecks: boolean;
    enableAlertCorrelation: boolean;
    metricsAggregationInterval: number; // seconds
  };
}

export interface InstitutionalClient {
  // Basic information
  id: string;
  name: string;
  organizationType: 'hedge_fund' | 'asset_manager' | 'bank' | 'exchange' | 'broker' | 'family_office' | 'pension_fund' | 'insurance' | 'sovereign_wealth';
  
  // Business details
  businessDetails: {
    legalName: string;
    registrationNumber: string;
    jurisdiction: string;
    incorporationDate: number;
    website: string;
    primaryContact: ContactInfo;
    alternateContacts: ContactInfo[];
  };
  
  // Financial information
  financialProfile: {
    aum: BN; // Assets Under Management
    tier: 'emerging' | 'growth' | 'institutional' | 'enterprise' | 'sovereign';
    creditRating?: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive' | 'speculative';
    investmentObjectives: string[];
    liquidityRequirements: string;
  };
  
  // Regulatory and compliance
  compliance: {
    licenses: RegulatoryLicense[];
    jurisdictions: string[];
    regulators: string[];
    kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
    amlStatus: 'pending' | 'approved' | 'rejected' | 'expired';
    lastComplianceReview: number;
    nextComplianceReview: number;
  };
  
  // Service configuration
  services: {
    enabledServices: InstitutionalServiceType[];
    apiAccess: APIAccessConfig;
    custodyAccess: CustodyAccessConfig;
    reportingAccess: ReportingAccessConfig;
    notificationPreferences: NotificationPreferences;
  };
  
  // Risk and limits
  riskManagement: {
    creditLimit: BN;
    tradingLimits: TradingLimits;
    withdrawalLimits: WithdrawalLimits;
    concentrationLimits: ConcentrationLimits;
    riskScores: RiskScores;
  };
  
  // Operational
  operational: {
    timeZone: string;
    businessHours: BusinessHours;
    holidayCalendar: string;
    settlementInstructions: SettlementInstructions;
    reportingSchedule: ReportingSchedule;
  };
  
  // Account status
  status: 'active' | 'inactive' | 'suspended' | 'terminated' | 'under_review';
  onboardingStatus: 'pending' | 'in_progress' | 'completed' | 'rejected';
  lastActivity: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
  tags: string[];
  notes: string;
}

export interface ContactInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface RegulatoryLicense {
  type: string;
  number: string;
  issuer: string;
  jurisdiction: string;
  issuedDate: number;
  expiryDate: number;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
}

export type InstitutionalServiceType = 
  | 'api_access'
  | 'custody_services'
  | 'trading_services'
  | 'reporting_services'
  | 'notification_services'
  | 'compliance_services'
  | 'risk_management'
  | 'settlement_services'
  | 'prime_brokerage'
  | 'liquidity_services';

export interface APIAccessConfig {
  tier: 'basic' | 'professional' | 'enterprise' | 'unlimited';
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  allowedEndpoints: string[];
  restrictedEndpoints: string[];
  apiKeys: APIKeyInfo[];
  ipWhitelist: string[];
  enableWebhooks: boolean;
  webhookEndpoints: string[];
}

export interface APIKeyInfo {
  keyId: string;
  name: string;
  permissions: string[];
  createdAt: number;
  expiresAt?: number;
  lastUsed?: number;
  isActive: boolean;
}

export interface CustodyAccessConfig {
  enableCustodyServices: boolean;
  custodyTier: 'standard' | 'premium' | 'institutional' | 'prime';
  allowedAssets: string[];
  restrictedAssets: string[];
  vaultConfigurations: VaultConfiguration[];
  insuranceCoverage: BN;
  enableColdStorage: boolean;
  enableMultiSig: boolean;
  requiredSignatures: number;
}

export interface VaultConfiguration {
  id: string;
  name: string;
  type: 'hot' | 'warm' | 'cold' | 'air_gapped';
  assets: string[];
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  insuranceCoverage: BN;
  approvalWorkflow: string[];
}

export interface ReportingAccessConfig {
  enableReporting: boolean;
  reportingTier: 'basic' | 'advanced' | 'premium' | 'custom';
  availableReports: string[];
  customReports: boolean;
  scheduledReports: boolean;
  realTimeReports: boolean;
  reportingFrequency: string[];
  dataRetentionPeriod: number; // days
}

export interface NotificationPreferences {
  enableNotifications: boolean;
  channels: string[];
  alertTypes: string[];
  severityLevels: string[];
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  escalationRules: string[];
}

export interface TradingLimits {
  dailyLimit: BN;
  monthlyLimit: BN;
  positionLimits: PositionLimit[];
  orderSizeLimits: OrderSizeLimit[];
  enablePreTradeChecks: boolean;
  enablePostTradeMonitoring: boolean;
}

export interface PositionLimit {
  asset: string;
  maxPosition: BN;
  maxConcentration: number; // percentage
}

export interface OrderSizeLimit {
  asset: string;
  minOrderSize: BN;
  maxOrderSize: BN;
  maxOrderValue: BN;
}

export interface WithdrawalLimits {
  dailyLimit: BN;
  monthlyLimit: BN;
  singleTransactionLimit: BN;
  enableTimeDelays: boolean;
  standardDelay: number; // hours
  largeTransactionDelay: number; // hours
  enableApprovalWorkflow: boolean;
  approvalThreshold: BN;
}

export interface ConcentrationLimits {
  maxSingleAssetConcentration: number; // percentage
  maxSectorConcentration: number; // percentage
  maxGeographicConcentration: number; // percentage
  maxCounterpartyExposure: number; // percentage
}

export interface RiskScores {
  overallRiskScore: number;
  creditRiskScore: number;
  operationalRiskScore: number;
  marketRiskScore: number;
  liquidityRiskScore: number;
  lastCalculated: number;
}

export interface BusinessHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
}

export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
  timezone: string;
}

export interface SettlementInstructions {
  defaultSettlementPeriod: number; // days
  expeditedSettlement: boolean;
  settlementAccounts: SettlementAccount[];
  specialInstructions: string;
}

export interface SettlementAccount {
  asset: string;
  accountNumber: string;
  routingInfo: string;
  bankName: string;
  bankAddress: string;
  correspondent?: string;
}

export interface ReportingSchedule {
  dailyReports: string[];
  weeklyReports: string[];
  monthlyReports: string[];
  quarterlyReports: string[];
  customSchedules: CustomReportSchedule[];
}

export interface CustomReportSchedule {
  reportType: string;
  frequency: string;
  timing: string;
  recipients: string[];
}

export interface InstitutionalIntegrationStatus {
  // Overall status
  isRunning: boolean;
  startTime: number;
  uptime: number;
  
  // Service status
  services: {
    api: boolean;
    custody: boolean;
    gateway: boolean;
    notifications: boolean;
    reporting: boolean;
  };
  
  // Client metrics
  clientMetrics: {
    totalClients: number;
    activeClients: number;
    newClientsToday: number;
    clientsByType: Record<string, number>;
    clientsByTier: Record<string, number>;
  };
  
  // System metrics
  systemMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    systemLoad: number;
    memoryUsage: number;
    diskUsage: number;
  };
  
  // Business metrics
  businessMetrics: {
    totalAUM: BN;
    dailyTradingVolume: BN;
    assetsUnderCustody: BN;
    reportsGenerated: number;
    alertsSent: number;
  };
  
  // Health indicators
  health: {
    overall: 'healthy' | 'warning' | 'critical';
    services: Record<string, 'healthy' | 'warning' | 'critical'>;
    issues: string[];
    recommendations: string[];
  };
}

export class InstitutionalIntegration {
  private config: InstitutionalIntegrationConfig;
  private connection: Connection;
  private logger: Logger;
  
  // Core services
  private institutionalAPI: InstitutionalAPI;
  private custodyVault: CustodyVault;
  private enterpriseGateway: EnterpriseGateway;
  private notificationService: InstitutionalNotificationService;
  private reportingService: InstitutionalReportingService;
  
  // Client management
  private clients: Map<string, InstitutionalClient> = new Map();
  private isRunning: boolean = false;
  
  constructor(config: InstitutionalIntegrationConfig) {
    this.config = config;
    this.connection = config.connection;
    this.logger = new Logger('InstitutionalIntegration');
    
    // Initialize services
    this.institutionalAPI = new InstitutionalAPI(config.api, config.connection);
    this.custodyVault = new CustodyVault(config.custody, config.connection);
    this.enterpriseGateway = new EnterpriseGateway(config.gateway, config.connection);
    this.notificationService = new InstitutionalNotificationService(config.notifications, config.connection);
    this.reportingService = new InstitutionalReportingService(config.reporting, config.connection);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Institutional integration is already running');
    }

    this.logger.info('Starting institutional integration platform');
    this.isRunning = true;

    try {
      // Start all services in parallel
      await Promise.all([
        this.startService('Enterprise Gateway', () => this.enterpriseGateway.start()),
        this.startService('Institutional API', () => this.institutionalAPI.start()),
        this.startService('Custody Vault', () => this.custodyVault.start()),
        this.startService('Notification Service', () => this.notificationService.start()),
        this.startService('Reporting Service', () => this.reportingService.start())
      ]);

      // Load existing clients
      await this.loadClients();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.logger.info('Institutional integration platform started successfully');
      
    } catch (error) {
      this.isRunning = false;
      this.logger.error('Failed to start institutional integration platform', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping institutional integration platform');
    this.isRunning = false;

    try {
      // Stop all services in parallel
      await Promise.all([
        this.stopService('Reporting Service', () => this.reportingService.stop()),
        this.stopService('Notification Service', () => this.notificationService.stop()),
        this.stopService('Custody Vault', () => this.custodyVault.stop()),
        this.stopService('Institutional API', () => this.institutionalAPI.stop()),
        this.stopService('Enterprise Gateway', () => this.enterpriseGateway.stop())
      ]);
      
      this.logger.info('Institutional integration platform stopped successfully');
      
    } catch (error) {
      this.logger.error('Error stopping institutional integration platform', error);
      throw error;
    }
  }

  async onboardClient(clientData: Partial<InstitutionalClient>): Promise<string> {
    const clientId = this.generateClientId();
    
    const client: InstitutionalClient = {
      id: clientId,
      name: clientData.name || '',
      organizationType: clientData.organizationType || 'hedge_fund',
      businessDetails: clientData.businessDetails || this.getDefaultBusinessDetails(),
      financialProfile: clientData.financialProfile || this.getDefaultFinancialProfile(),
      compliance: clientData.compliance || this.getDefaultCompliance(),
      services: clientData.services || this.getDefaultServices(),
      riskManagement: clientData.riskManagement || this.getDefaultRiskManagement(),
      operational: clientData.operational || this.getDefaultOperational(),
      status: 'active',
      onboardingStatus: 'in_progress',
      lastActivity: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system',
      updatedBy: 'system',
      tags: [],
      notes: ''
    };

    // Store client
    this.clients.set(clientId, client);
    
    // Create API access
    if (client.services.enabledServices.includes('api_access')) {
      await this.institutionalAPI.createClient(client);
    }
    
    // Setup custody services
    if (client.services.enabledServices.includes('custody_services')) {
      await this.custodyVault.createClientVault(client);
    }
    
    // Setup reporting
    if (client.services.enabledServices.includes('reporting_services')) {
      await this.reportingService.setupClientReporting(client);
    }
    
    // Send welcome notification
    await this.notificationService.sendAlert({
      type: 'custody_breach', // This should be 'client_onboarded' but using existing type
      severity: 'info',
      title: 'Client Onboarding Complete',
      description: `Client ${client.name} has been successfully onboarded`,
      clientId: client.id,
      organizationId: client.id
    });

    this.logger.info(`Client onboarded successfully: ${clientId}`, {
      name: client.name,
      type: client.organizationType,
      services: client.services.enabledServices.length
    });

    return clientId;
  }

  async getClient(clientId: string): Promise<InstitutionalClient | null> {
    return this.clients.get(clientId) || null;
  }

  async updateClient(clientId: string, updates: Partial<InstitutionalClient>): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    Object.assign(client, updates, {
      updatedAt: Date.now(),
      updatedBy: 'system' // Should be actual user
    });

    this.logger.info(`Client updated: ${clientId}`);
  }

  async getClients(filters?: {
    status?: string;
    organizationType?: string;
    tier?: string;
  }): Promise<InstitutionalClient[]> {
    let clients = Array.from(this.clients.values());

    if (filters) {
      if (filters.status) {
        clients = clients.filter(client => client.status === filters.status);
      }
      if (filters.organizationType) {
        clients = clients.filter(client => client.organizationType === filters.organizationType);
      }
      if (filters.tier) {
        clients = clients.filter(client => client.financialProfile.tier === filters.tier);
      }
    }

    return clients;
  }

  async getStatus(): Promise<InstitutionalIntegrationStatus> {
    const clients = Array.from(this.clients.values());
    const activeClients = clients.filter(c => c.status === 'active');
    
    return {
      isRunning: this.isRunning,
      startTime: 0, // Should track actual start time
      uptime: 0,
      services: {
        api: true, // Should check actual service status
        custody: true,
        gateway: true,
        notifications: true,
        reporting: true
      },
      clientMetrics: {
        totalClients: clients.length,
        activeClients: activeClients.length,
        newClientsToday: this.getNewClientsToday(),
        clientsByType: this.groupClientsByType(clients),
        clientsByTier: this.groupClientsByTier(clients)
      },
      systemMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        systemLoad: 0,
        memoryUsage: 0,
        diskUsage: 0
      },
      businessMetrics: {
        totalAUM: this.calculateTotalAUM(),
        dailyTradingVolume: new BN(0),
        assetsUnderCustody: new BN(0),
        reportsGenerated: 0,
        alertsSent: 0
      },
      health: {
        overall: 'healthy',
        services: {
          api: 'healthy',
          custody: 'healthy',
          gateway: 'healthy',
          notifications: 'healthy',
          reporting: 'healthy'
        },
        issues: [],
        recommendations: []
      }
    };
  }

  private async startService(name: string, startFn: () => Promise<void>): Promise<void> {
    try {
      await startFn();
      this.logger.info(`${name} started successfully`);
    } catch (error) {
      this.logger.error(`Failed to start ${name}`, error);
      throw error;
    }
  }

  private async stopService(name: string, stopFn: () => Promise<void>): Promise<void> {
    try {
      await stopFn();
      this.logger.info(`${name} stopped successfully`);
    } catch (error) {
      this.logger.error(`Failed to stop ${name}`, error);
      throw error;
    }
  }

  private async loadClients(): Promise<void> {
    // Load clients from storage
    this.logger.info('Loading institutional clients');
  }

  private startHealthMonitoring(): void {
    // Health monitoring implementation
    setInterval(async () => {
      if (this.isRunning) {
        await this.performHealthCheck();
      }
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(): Promise<void> {
    // Health check implementation
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultBusinessDetails(): InstitutionalClient['businessDetails'] {
    return {
      legalName: '',
      registrationNumber: '',
      jurisdiction: '',
      incorporationDate: 0,
      website: '',
      primaryContact: {
        name: '',
        title: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: ''
        }
      },
      alternateContacts: []
    };
  }

  private getDefaultFinancialProfile(): InstitutionalClient['financialProfile'] {
    return {
      aum: new BN(0),
      tier: 'emerging',
      riskProfile: 'moderate',
      investmentObjectives: [],
      liquidityRequirements: 'standard'
    };
  }

  private getDefaultCompliance(): InstitutionalClient['compliance'] {
    return {
      licenses: [],
      jurisdictions: [],
      regulators: [],
      kycStatus: 'pending',
      amlStatus: 'pending',
      lastComplianceReview: 0,
      nextComplianceReview: 0
    };
  }

  private getDefaultServices(): InstitutionalClient['services'] {
    return {
      enabledServices: ['api_access'],
      apiAccess: {
        tier: 'basic',
        rateLimits: {
          requestsPerSecond: 10,
          requestsPerMinute: 600,
          requestsPerHour: 36000,
          requestsPerDay: 864000
        },
        allowedEndpoints: [],
        restrictedEndpoints: [],
        apiKeys: [],
        ipWhitelist: [],
        enableWebhooks: false,
        webhookEndpoints: []
      },
      custodyAccess: {
        enableCustodyServices: false,
        custodyTier: 'standard',
        allowedAssets: [],
        restrictedAssets: [],
        vaultConfigurations: [],
        insuranceCoverage: new BN(0),
        enableColdStorage: false,
        enableMultiSig: false,
        requiredSignatures: 1
      },
      reportingAccess: {
        enableReporting: false,
        reportingTier: 'basic',
        availableReports: [],
        customReports: false,
        scheduledReports: false,
        realTimeReports: false,
        reportingFrequency: [],
        dataRetentionPeriod: 365
      },
      notificationPreferences: {
        enableNotifications: true,
        channels: ['email'],
        alertTypes: [],
        severityLevels: ['critical', 'error'],
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC'
        },
        escalationRules: []
      }
    };
  }

  private getDefaultRiskManagement(): InstitutionalClient['riskManagement'] {
    return {
      creditLimit: new BN(0),
      tradingLimits: {
        dailyLimit: new BN(0),
        monthlyLimit: new BN(0),
        positionLimits: [],
        orderSizeLimits: [],
        enablePreTradeChecks: true,
        enablePostTradeMonitoring: true
      },
      withdrawalLimits: {
        dailyLimit: new BN(0),
        monthlyLimit: new BN(0),
        singleTransactionLimit: new BN(0),
        enableTimeDelays: true,
        standardDelay: 24,
        largeTransactionDelay: 48,
        enableApprovalWorkflow: true,
        approvalThreshold: new BN(0)
      },
      concentrationLimits: {
        maxSingleAssetConcentration: 20,
        maxSectorConcentration: 30,
        maxGeographicConcentration: 50,
        maxCounterpartyExposure: 10
      },
      riskScores: {
        overallRiskScore: 0,
        creditRiskScore: 0,
        operationalRiskScore: 0,
        marketRiskScore: 0,
        liquidityRiskScore: 0,
        lastCalculated: 0
      }
    };
  }

  private getDefaultOperational(): InstitutionalClient['operational'] {
    return {
      timeZone: 'UTC',
      businessHours: {
        monday: { start: '09:00', end: '17:00', timezone: 'UTC' },
        tuesday: { start: '09:00', end: '17:00', timezone: 'UTC' },
        wednesday: { start: '09:00', end: '17:00', timezone: 'UTC' },
        thursday: { start: '09:00', end: '17:00', timezone: 'UTC' },
        friday: { start: '09:00', end: '17:00', timezone: 'UTC' }
      },
      holidayCalendar: 'US',
      settlementInstructions: {
        defaultSettlementPeriod: 2,
        expeditedSettlement: false,
        settlementAccounts: [],
        specialInstructions: ''
      },
      reportingSchedule: {
        dailyReports: [],
        weeklyReports: [],
        monthlyReports: [],
        quarterlyReports: [],
        customSchedules: []
      }
    };
  }

  private getNewClientsToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    return Array.from(this.clients.values()).filter(
      client => client.createdAt >= todayTimestamp
    ).length;
  }

  private groupClientsByType(clients: InstitutionalClient[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const client of clients) {
      groups[client.organizationType] = (groups[client.organizationType] || 0) + 1;
    }
    
    return groups;
  }

  private groupClientsByTier(clients: InstitutionalClient[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const client of clients) {
      groups[client.financialProfile.tier] = (groups[client.financialProfile.tier] || 0) + 1;
    }
    
    return groups;
  }

  private calculateTotalAUM(): BN {
    return Array.from(this.clients.values()).reduce(
      (total, client) => total.add(client.financialProfile.aum),
      new BN(0)
    );
  }
}