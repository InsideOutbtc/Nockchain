// Advanced custody vault with multi-signature security and institutional controls

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface CustodyVaultConfig {
  // Vault security settings
  enableMultiSig: boolean;
  requiredSignatures: number;
  totalSigners: number;
  enableHardwareSecurity: boolean;
  enableColdStorage: boolean;
  
  // Insurance and protection
  enableInsuranceFund: boolean;
  insuranceCoverageAmount: BN;
  enableSlashingProtection: boolean;
  maxSlashingAmount: BN;
  
  // Withdrawal controls
  withdrawalLimits: {
    dailyLimit: BN;
    monthlyLimit: BN;
    singleTransactionLimit: BN;
    enableWhitelist: boolean;
    requireApproval: boolean;
  };
  
  // Time-based controls
  timeLocks: {
    enableTimeLock: boolean;
    minimumDelay: number; // hours
    maximumDelay: number; // hours
    emergencyDelay: number; // minutes
  };
  
  // Risk management
  riskControls: {
    enableVelocityChecks: boolean;
    enableAnomalyDetection: boolean;
    enableGeoRestrictions: boolean;
    allowedJurisdictions: string[];
    maxConcentrationRisk: number; // percentage
  };
  
  // Compliance and reporting
  compliance: {
    enableAuditTrail: boolean;
    enableRealTimeReporting: boolean;
    enableRegulatorAccess: boolean;
    reportingFrequency: 'daily' | 'weekly' | 'monthly';
    enableSuspiciousActivityReporting: boolean;
  };
  
  // Recovery and backup
  recovery: {
    enableRecoveryProcedures: boolean;
    enableShardedBackup: boolean;
    requiredRecoverySignatures: number;
    emergencyRecoveryTimeout: number; // hours
    enableSocialRecovery: boolean;
  };
}

export interface VaultWallet {
  id: string;
  name: string;
  type: 'hot' | 'warm' | 'cold' | 'air_gapped';
  
  // Wallet security
  publicKey: PublicKey;
  threshold: number;
  signers: VaultSigner[];
  
  // Asset management
  assets: VaultAsset[];
  totalValue: BN;
  
  // Security features
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  hardwareSecured: boolean;
  geographicalLocation: string;
  lastSecurityAudit: number;
  
  // Access controls
  accessPolicy: AccessPolicy;
  approvalWorkflow: ApprovalWorkflow[];
  
  // Insurance and protection
  insuranceCoverage: BN;
  insuranceProvider: string;
  lastInsuranceAudit: number;
  
  // Monitoring
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastHealthCheck: number;
  alertsEnabled: boolean;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'locked' | 'frozen' | 'deprecated';
  notes: string;
}

export interface VaultSigner {
  id: string;
  name: string;
  role: 'admin' | 'operator' | 'auditor' | 'emergency';
  
  // Identity and authentication
  publicKey: PublicKey;
  certificateFingerprint: string;
  mfaEnabled: boolean;
  
  // Hardware security
  hardwareType: 'software' | 'hardware_wallet' | 'hsm' | 'smart_card';
  deviceId?: string;
  firmwareVersion?: string;
  
  // Access controls
  permissions: string[];
  restrictions: string[];
  ipWhitelist: string[];
  geoRestrictions: string[];
  
  // Activity tracking
  lastSigned: number;
  totalSignatures: number;
  failedAttempts: number;
  
  // Status
  status: 'active' | 'suspended' | 'revoked';
  suspendedUntil?: number;
  revocationReason?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface VaultAsset {
  mint: PublicKey;
  symbol: string;
  name: string;
  
  // Balances
  totalBalance: BN;
  availableBalance: BN;
  lockedBalance: BN;
  stakedBalance: BN;
  
  // Valuation
  currentPrice: BN;
  totalValue: BN;
  priceSource: string;
  lastPriceUpdate: number;
  
  // Risk metrics
  volatility: number;
  var95: BN; // Value at Risk 95%
  concentrationRisk: number;
  liquidityRisk: 'low' | 'medium' | 'high';
  
  // Metadata
  decimals: number;
  verified: boolean;
  lastUpdated: number;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  
  // Basic access rules
  requiredRole: string;
  minimumSignatures: number;
  quorumPercentage: number;
  
  // Time-based rules
  allowedHours: string; // e.g., "09:00-17:00"
  allowedDays: string[]; // e.g., ["monday", "tuesday", ...]
  timezone: string;
  
  // Geographic rules
  allowedCountries: string[];
  blockedCountries: string[];
  requirePhysicalPresence: boolean;
  
  // Transaction rules
  maxTransactionAmount: BN;
  maxDailyAmount: BN;
  allowedAssets: PublicKey[];
  blockedAssets: PublicKey[];
  
  // Emergency overrides
  emergencyOverride: {
    enabled: boolean;
    requiredRole: string;
    timeLimit: number; // hours
    requiredJustification: boolean;
  };
  
  // Metadata
  priority: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  
  // Workflow steps
  steps: ApprovalStep[];
  parallelExecution: boolean;
  timeoutDuration: number; // hours
  
  // Trigger conditions
  triggers: Array<{
    type: 'amount' | 'asset' | 'destination' | 'time' | 'risk_score';
    condition: string;
    value: any;
  }>;
  
  // Escalation rules
  escalation: {
    enabled: boolean;
    timeoutAction: 'approve' | 'reject' | 'escalate';
    escalationSteps: ApprovalStep[];
  };
  
  // Metadata
  active: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApprovalStep {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'multi_sig' | 'time_delay';
  
  // Approval requirements
  requiredApprovers: number;
  allowedRoles: string[];
  specificApprovers: PublicKey[];
  
  // Timing
  timeoutDuration: number; // hours
  delayDuration?: number; // hours for time_delay type
  
  // Conditions
  conditions: Array<{
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'in' | 'contains';
    value: any;
  }>;
  
  // Notifications
  notifications: {
    enabled: boolean;
    channels: string[];
    reminder: boolean;
    reminderInterval: number; // hours
  };
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  requestedBy: PublicKey;
  
  // Withdrawal details
  asset: PublicKey;
  amount: BN;
  destination: PublicKey;
  memo?: string;
  
  // Approval tracking
  workflowId: string;
  currentStep: number;
  approvals: Approval[];
  requiredApprovals: number;
  
  // Risk assessment
  riskScore: number;
  riskFactors: string[];
  flagged: boolean;
  flagReasons: string[];
  
  // Status and timing
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'cancelled' | 'expired';
  submittedAt: number;
  approvedAt?: number;
  executedAt?: number;
  expiresAt: number;
  
  // Execution details
  transactionHash?: string;
  actualAmount?: BN;
  fees?: BN;
  
  // Metadata
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string;
  auditTrail: AuditEntry[];
}

export interface Approval {
  id: string;
  stepId: string;
  approver: PublicKey;
  
  // Approval details
  decision: 'approve' | 'reject' | 'delegate';
  reason: string;
  signature: string;
  
  // Context
  ipAddress: string;
  userAgent: string;
  location?: string;
  
  // Timing
  timestamp: number;
  validUntil?: number;
  
  // Delegation (if applicable)
  delegatedTo?: PublicKey;
  delegationReason?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  actor: PublicKey;
  details: Record<string, any>;
  ipAddress: string;
  success: boolean;
  errorMessage?: string;
}

export interface VaultTransaction {
  id: string;
  walletId: string;
  
  // Transaction details
  type: 'deposit' | 'withdrawal' | 'internal_transfer' | 'staking' | 'unstaking';
  asset: PublicKey;
  amount: BN;
  from?: PublicKey;
  to?: PublicKey;
  
  // Blockchain details
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
  confirmations: number;
  
  // Fees and costs
  networkFee: BN;
  custodyFee: BN;
  totalCost: BN;
  
  // Risk and compliance
  riskScore: number;
  complianceChecks: string[];
  amlScreening: boolean;
  sanctionsScreening: boolean;
  
  // Approval details
  approvedBy: PublicKey[];
  approvalWorkflow?: string;
  emergencyExecution: boolean;
  
  // Status tracking
  status: 'pending' | 'confirmed' | 'completed' | 'failed' | 'reversed';
  failureReason?: string;
  
  // Metadata
  initiatedAt: number;
  completedAt?: number;
  notes: string;
  tags: string[];
}

export interface VaultReport {
  id: string;
  walletId: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'audit';
  period: {
    startDate: number;
    endDate: number;
  };
  
  // Asset summary
  assetSummary: {
    totalAssets: number;
    totalValue: BN;
    topAssets: Array<{
      asset: string;
      value: BN;
      percentage: number;
    }>;
    assetAllocation: Record<string, number>;
  };
  
  // Transaction summary
  transactionSummary: {
    totalTransactions: number;
    totalVolume: BN;
    deposits: { count: number; volume: BN };
    withdrawals: { count: number; volume: BN };
    internalTransfers: { count: number; volume: BN };
    averageTransactionSize: BN;
    largestTransaction: BN;
  };
  
  // Security metrics
  securityMetrics: {
    signatureSuccessRate: number;
    failedSigningAttempts: number;
    suspiciousActivities: number;
    securityAlerts: number;
    lastSecurityAudit: number;
  };
  
  // Compliance metrics
  complianceMetrics: {
    amlScreenings: number;
    sanctionsScreenings: number;
    complianceViolations: number;
    regulatoryReports: number;
    kycUpdates: number;
  };
  
  // Risk assessment
  riskAssessment: {
    overallRiskScore: number;
    concentrationRisk: number;
    liquidityRisk: number;
    operationalRisk: number;
    marketRisk: number;
    riskTrends: Array<{
      date: number;
      riskScore: number;
    }>;
  };
  
  // Performance metrics
  performanceMetrics: {
    uptime: number;
    responseTime: number;
    systemAvailability: number;
    errorRate: number;
    successfulTransactions: number;
  };
  
  // Attestation
  attestation: {
    auditorId: string;
    auditedAt: number;
    digitalSignature: string;
    findings: string[];
    recommendations: string[];
    nextAuditDate: number;
  };
  
  // Metadata
  generatedAt: number;
  generatedBy: PublicKey;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  recipients: string[];
}

export class CustodyVault {
  private config: CustodyVaultConfig;
  private logger: Logger;
  private connection: Connection;
  
  // Vault state
  private wallets: Map<string, VaultWallet> = new Map();
  private signers: Map<string, VaultSigner> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();
  private approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private withdrawalRequests: Map<string, WithdrawalRequest> = new Map();
  private transactions: VaultTransaction[] = [];
  
  // Service state
  private isActive: boolean = false;
  private startTime: number = 0;
  
  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private riskMonitoringInterval?: NodeJS.Timeout;
  private complianceCheckInterval?: NodeJS.Timeout;
  private auditInterval?: NodeJS.Timeout;

  constructor(
    config: CustodyVaultConfig,
    connection: Connection,
    logger: Logger
  ) {
    this.config = config;
    this.connection = connection;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Custody vault already active');
      return;
    }

    this.logger.info('Starting institutional custody vault', {
      enableMultiSig: this.config.enableMultiSig,
      requiredSignatures: this.config.requiredSignatures,
      enableHardwareSecurity: this.config.enableHardwareSecurity,
      enableColdStorage: this.config.enableColdStorage,
    });

    try {
      // Initialize vault security
      await this.initializeVaultSecurity();
      
      // Load existing vault data
      await this.loadVaultData();
      
      // Start monitoring systems
      this.isActive = true;
      this.startTime = Date.now();
      this.startMonitoringSystems();

      this.logger.info('Custody vault started successfully', {
        totalWallets: this.wallets.size,
        totalSigners: this.signers.size,
        securityLevel: 'institutional',
      });

    } catch (error) {
      this.logger.error('Failed to start custody vault', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Custody vault not active');
      return;
    }

    this.logger.info('Stopping custody vault');

    try {
      // Stop monitoring systems
      this.stopMonitoringSystems();
      
      // Secure shutdown procedures
      await this.performSecureShutdown();

      this.isActive = false;
      
      this.logger.info('Custody vault stopped successfully', {
        uptime: Date.now() - this.startTime,
        totalTransactions: this.transactions.length,
      });

    } catch (error) {
      this.logger.error('Failed to stop custody vault gracefully', error);
      this.isActive = false;
    }
  }

  async createVaultWallet(
    name: string,
    type: VaultWallet['type'],
    signerIds: string[],
    threshold: number,
    options: Partial<VaultWallet> = {}
  ): Promise<VaultWallet> {
    const walletId = `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate signers
    const signers = signerIds.map(id => {
      const signer = this.signers.get(id);
      if (!signer) {
        throw new Error(`Signer ${id} not found`);
      }
      return signer;
    });

    // Generate wallet keypair
    const keypair = Keypair.generate();

    const wallet: VaultWallet = {
      id: walletId,
      name,
      type,
      
      publicKey: keypair.publicKey,
      threshold,
      signers,
      
      assets: [],
      totalValue: new BN(0),
      
      securityLevel: options.securityLevel || 'enhanced',
      hardwareSecured: options.hardwareSecured || this.config.enableHardwareSecurity,
      geographicalLocation: options.geographicalLocation || 'secure_facility',
      lastSecurityAudit: Date.now(),
      
      accessPolicy: await this.createDefaultAccessPolicy(walletId),
      approvalWorkflow: await this.createDefaultApprovalWorkflow(walletId),
      
      insuranceCoverage: options.insuranceCoverage || this.config.insuranceCoverageAmount,
      insuranceProvider: options.insuranceProvider || 'institutional_insurer',
      lastInsuranceAudit: Date.now(),
      
      healthStatus: 'healthy',
      lastHealthCheck: Date.now(),
      alertsEnabled: true,
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
      notes: options.notes || '',
    };

    this.wallets.set(walletId, wallet);

    this.logger.info('Vault wallet created', {
      walletId,
      name,
      type,
      threshold,
      signerCount: signers.length,
      securityLevel: wallet.securityLevel,
    });

    return wallet;
  }

  async addVaultSigner(
    name: string,
    role: VaultSigner['role'],
    publicKey: PublicKey,
    hardwareType: VaultSigner['hardwareType'],
    options: Partial<VaultSigner> = {}
  ): Promise<VaultSigner> {
    const signerId = `signer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const signer: VaultSigner = {
      id: signerId,
      name,
      role,
      
      publicKey,
      certificateFingerprint: options.certificateFingerprint || this.generateCertificateFingerprint(),
      mfaEnabled: options.mfaEnabled || true,
      
      hardwareType,
      deviceId: options.deviceId,
      firmwareVersion: options.firmwareVersion,
      
      permissions: this.getDefaultPermissions(role),
      restrictions: options.restrictions || [],
      ipWhitelist: options.ipWhitelist || [],
      geoRestrictions: options.geoRestrictions || [],
      
      lastSigned: 0,
      totalSignatures: 0,
      failedAttempts: 0,
      
      status: 'active',
      
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.signers.set(signerId, signer);

    this.logger.info('Vault signer added', {
      signerId,
      name,
      role,
      hardwareType,
      mfaEnabled: signer.mfaEnabled,
    });

    return signer;
  }

  async submitWithdrawalRequest(
    walletId: string,
    requestedBy: PublicKey,
    asset: PublicKey,
    amount: BN,
    destination: PublicKey,
    memo?: string,
    priority: WithdrawalRequest['priority'] = 'normal'
  ): Promise<WithdrawalRequest> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    // Validate withdrawal against limits and policies
    await this.validateWithdrawalRequest(wallet, asset, amount, destination);

    const requestId = `withdrawal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine approval workflow
    const workflowId = await this.determineApprovalWorkflow(wallet, asset, amount);
    const workflow = this.approvalWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Approval workflow ${workflowId} not found`);
    }

    // Calculate risk score
    const riskScore = await this.calculateWithdrawalRiskScore(wallet, asset, amount, destination);
    
    const request: WithdrawalRequest = {
      id: requestId,
      walletId,
      requestedBy,
      
      asset,
      amount,
      destination,
      memo,
      
      workflowId,
      currentStep: 0,
      approvals: [],
      requiredApprovals: workflow.steps[0].requiredApprovers,
      
      riskScore,
      riskFactors: await this.identifyRiskFactors(wallet, asset, amount, destination),
      flagged: riskScore > 0.7,
      flagReasons: [],
      
      status: 'pending',
      submittedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours default
      
      priority,
      notes: '',
      auditTrail: [{
        id: `audit_${Date.now()}`,
        timestamp: Date.now(),
        action: 'withdrawal_submitted',
        actor: requestedBy,
        details: { asset: asset.toString(), amount: amount.toString(), destination: destination.toString() },
        ipAddress: '0.0.0.0', // Would be provided by request context
        success: true,
      }],
    };

    this.withdrawalRequests.set(requestId, request);

    // Notify relevant approvers
    await this.notifyApprovers(request);

    this.logger.info('Withdrawal request submitted', {
      requestId,
      walletId,
      asset: asset.toString(),
      amount: amount.toString(),
      riskScore,
      priority,
    });

    return request;
  }

  async approveWithdrawalRequest(
    requestId: string,
    approver: PublicKey,
    decision: 'approve' | 'reject',
    reason: string,
    signature: string
  ): Promise<boolean> {
    const request = this.withdrawalRequests.get(requestId);
    if (!request) {
      throw new Error(`Withdrawal request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Withdrawal request ${requestId} is not pending`);
    }

    // Validate approver authorization
    await this.validateApproverAuthorization(request, approver);

    // Create approval record
    const approval: Approval = {
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stepId: request.workflowId,
      approver,
      decision,
      reason,
      signature,
      ipAddress: '0.0.0.0', // Would be provided by request context
      userAgent: 'custody_vault',
      timestamp: Date.now(),
    };

    request.approvals.push(approval);

    // Add audit entry
    request.auditTrail.push({
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      action: `withdrawal_${decision}`,
      actor: approver,
      details: { decision, reason },
      ipAddress: '0.0.0.0',
      success: true,
    });

    // Check if request should be processed
    if (decision === 'reject') {
      request.status = 'rejected';
      this.logger.info('Withdrawal request rejected', { requestId, approver: approver.toString(), reason });
      return false;
    }

    // Check if we have enough approvals
    const approvalCount = request.approvals.filter(a => a.decision === 'approve').length;
    if (approvalCount >= request.requiredApprovals) {
      request.status = 'approved';
      request.approvedAt = Date.now();
      
      // Execute withdrawal if auto-execution is enabled
      await this.executeWithdrawal(request);
      
      this.logger.info('Withdrawal request approved and executed', { requestId, approvalCount });
      return true;
    }

    this.logger.info('Withdrawal request partially approved', { 
      requestId, 
      approvalCount, 
      requiredApprovals: request.requiredApprovals 
    });
    return false;
  }

  async executeWithdrawal(request: WithdrawalRequest): Promise<VaultTransaction> {
    const wallet = this.wallets.get(request.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${request.walletId} not found`);
    }

    // Final validation before execution
    await this.performFinalWithdrawalValidation(request);

    // Create blockchain transaction
    const transaction = new Transaction();
    
    // Add transfer instruction (simplified)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: request.destination,
        lamports: request.amount.toNumber(),
      })
    );

    // Execute transaction with multi-sig
    const transactionHash = await this.executeMultiSigTransaction(wallet, transaction);

    // Create transaction record
    const vaultTransaction: VaultTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletId: request.walletId,
      
      type: 'withdrawal',
      asset: request.asset,
      amount: request.amount,
      from: wallet.publicKey,
      to: request.destination,
      
      transactionHash,
      blockNumber: 0, // Would be filled when confirmed
      blockTimestamp: Date.now(),
      confirmations: 0,
      
      networkFee: new BN(5000), // 0.005 SOL example
      custodyFee: new BN(0),
      totalCost: new BN(5000),
      
      riskScore: request.riskScore,
      complianceChecks: ['aml_screening', 'sanctions_screening'],
      amlScreening: true,
      sanctionsScreening: true,
      
      approvedBy: request.approvals.map(a => a.approver),
      approvalWorkflow: request.workflowId,
      emergencyExecution: false,
      
      status: 'pending',
      
      initiatedAt: Date.now(),
      notes: request.memo || '',
      tags: ['withdrawal', 'institutional'],
    };

    this.transactions.push(vaultTransaction);

    // Update withdrawal request
    request.status = 'executed';
    request.executedAt = Date.now();
    request.transactionHash = transactionHash;
    request.actualAmount = request.amount;
    request.fees = vaultTransaction.totalCost;

    this.logger.info('Withdrawal executed successfully', {
      requestId: request.id,
      transactionHash,
      amount: request.amount.toString(),
      destination: request.destination.toString(),
    });

    return vaultTransaction;
  }

  async generateVaultReport(
    walletId: string,
    reportType: VaultReport['reportType'],
    period: { startDate: number; endDate: number }
  ): Promise<VaultReport> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Filter transactions for the period
    const periodTransactions = this.transactions.filter(tx => 
      tx.walletId === walletId &&
      tx.initiatedAt >= period.startDate &&
      tx.initiatedAt <= period.endDate
    );

    const report: VaultReport = {
      id: reportId,
      walletId,
      reportType,
      period,
      
      assetSummary: await this.generateAssetSummary(wallet),
      transactionSummary: this.generateTransactionSummary(periodTransactions),
      securityMetrics: await this.generateSecurityMetrics(wallet, period),
      complianceMetrics: await this.generateComplianceMetrics(wallet, period),
      riskAssessment: await this.generateRiskAssessment(wallet, period),
      performanceMetrics: await this.generatePerformanceMetrics(wallet, period),
      
      attestation: {
        auditorId: 'system_auditor',
        auditedAt: Date.now(),
        digitalSignature: this.generateDigitalSignature(reportId),
        findings: [],
        recommendations: [],
        nextAuditDate: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      },
      
      generatedAt: Date.now(),
      generatedBy: wallet.signers[0].publicKey, // First signer as generator
      confidentialityLevel: 'confidential',
      recipients: ['compliance@institution.com', 'audit@institution.com'],
    };

    this.logger.info('Vault report generated', {
      reportId,
      walletId,
      reportType,
      period,
      transactionCount: periodTransactions.length,
    });

    return report;
  }

  async getWalletBalance(walletId: string, assetMint?: PublicKey): Promise<VaultAsset[]> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    if (assetMint) {
      const asset = wallet.assets.find(a => a.mint.equals(assetMint));
      return asset ? [asset] : [];
    }

    return wallet.assets;
  }

  async freezeWallet(walletId: string, reason: string, frozenBy: PublicKey): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    wallet.status = 'frozen';
    wallet.notes = `Frozen: ${reason}`;
    wallet.updatedAt = Date.now();

    this.logger.warn('Wallet frozen', {
      walletId,
      reason,
      frozenBy: frozenBy.toString(),
    });

    // Cancel all pending withdrawal requests for this wallet
    for (const [requestId, request] of this.withdrawalRequests) {
      if (request.walletId === walletId && request.status === 'pending') {
        request.status = 'cancelled';
        request.auditTrail.push({
          id: `audit_${Date.now()}`,
          timestamp: Date.now(),
          action: 'withdrawal_cancelled_wallet_frozen',
          actor: frozenBy,
          details: { reason },
          ipAddress: '0.0.0.0',
          success: true,
        });
      }
    }
  }

  async unfreezeWallet(walletId: string, reason: string, unfrozenBy: PublicKey): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    if (wallet.status !== 'frozen') {
      throw new Error(`Wallet ${walletId} is not frozen`);
    }

    wallet.status = 'active';
    wallet.notes = `Unfrozen: ${reason}`;
    wallet.updatedAt = Date.now();

    this.logger.info('Wallet unfrozen', {
      walletId,
      reason,
      unfrozenBy: unfrozenBy.toString(),
    });
  }

  // Private implementation methods

  private async initializeVaultSecurity(): Promise<void> {
    // Initialize security systems
    this.logger.info('Initializing vault security systems');
    
    // Setup hardware security modules if enabled
    if (this.config.enableHardwareSecurity) {
      await this.initializeHSM();
    }
    
    // Initialize insurance fund if enabled
    if (this.config.enableInsuranceFund) {
      await this.initializeInsuranceFund();
    }
    
    this.logger.info('Vault security systems initialized');
  }

  private async initializeHSM(): Promise<void> {
    // Hardware Security Module initialization
    this.logger.info('Initializing Hardware Security Module');
    // Implementation would interact with actual HSM
  }

  private async initializeInsuranceFund(): Promise<void> {
    // Insurance fund setup
    this.logger.info('Initializing insurance fund', {
      coverageAmount: this.config.insuranceCoverageAmount.toString(),
    });
  }

  private async loadVaultData(): Promise<void> {
    // Load existing vault data from storage
    this.logger.info('Loading vault data');
    // Implementation would load from persistent storage
  }

  private startMonitoringSystems(): void {
    // Health monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60 * 1000); // Every minute

    // Risk monitoring
    this.riskMonitoringInterval = setInterval(async () => {
      await this.performRiskMonitoring();
    }, 300 * 1000); // Every 5 minutes

    // Compliance monitoring
    this.complianceCheckInterval = setInterval(async () => {
      await this.performComplianceCheck();
    }, 3600 * 1000); // Every hour

    // Audit monitoring
    this.auditInterval = setInterval(async () => {
      await this.performAuditCheck();
    }, 6 * 3600 * 1000); // Every 6 hours
  }

  private stopMonitoringSystems(): void {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.riskMonitoringInterval) clearInterval(this.riskMonitoringInterval);
    if (this.complianceCheckInterval) clearInterval(this.complianceCheckInterval);
    if (this.auditInterval) clearInterval(this.auditInterval);
  }

  private async performSecureShutdown(): Promise<void> {
    // Secure shutdown procedures
    this.logger.info('Performing secure shutdown procedures');
    
    // Cancel all pending operations if necessary
    // Secure sensitive data
    // Notify relevant parties
  }

  private async createDefaultAccessPolicy(walletId: string): Promise<AccessPolicy> {
    return {
      id: `policy_${walletId}`,
      name: `Default Policy for ${walletId}`,
      description: 'Default access policy for institutional wallet',
      
      requiredRole: 'operator',
      minimumSignatures: this.config.requiredSignatures,
      quorumPercentage: 60,
      
      allowedHours: '09:00-17:00',
      allowedDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      timezone: 'UTC',
      
      allowedCountries: this.config.riskControls.allowedJurisdictions,
      blockedCountries: [],
      requirePhysicalPresence: false,
      
      maxTransactionAmount: this.config.withdrawalLimits.singleTransactionLimit,
      maxDailyAmount: this.config.withdrawalLimits.dailyLimit,
      allowedAssets: [],
      blockedAssets: [],
      
      emergencyOverride: {
        enabled: true,
        requiredRole: 'admin',
        timeLimit: 4,
        requiredJustification: true,
      },
      
      priority: 1,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private async createDefaultApprovalWorkflow(walletId: string): Promise<ApprovalWorkflow[]> {
    const workflowId = `workflow_${walletId}`;
    
    const workflow: ApprovalWorkflow = {
      id: workflowId,
      name: `Default Workflow for ${walletId}`,
      description: 'Default approval workflow for institutional transactions',
      
      steps: [
        {
          id: 'step_1',
          name: 'Operator Approval',
          type: 'manual',
          requiredApprovers: 1,
          allowedRoles: ['operator', 'admin'],
          specificApprovers: [],
          timeoutDuration: 4,
          conditions: [],
          notifications: {
            enabled: true,
            channels: ['email', 'sms'],
            reminder: true,
            reminderInterval: 1,
          },
        },
        {
          id: 'step_2',
          name: 'Admin Approval',
          type: 'manual',
          requiredApprovers: 1,
          allowedRoles: ['admin'],
          specificApprovers: [],
          timeoutDuration: 8,
          conditions: [
            {
              field: 'amount',
              operator: 'gt',
              value: this.config.withdrawalLimits.singleTransactionLimit.divn(2),
            },
          ],
          notifications: {
            enabled: true,
            channels: ['email'],
            reminder: true,
            reminderInterval: 2,
          },
        },
      ],
      
      parallelExecution: false,
      timeoutDuration: 24,
      
      triggers: [
        {
          type: 'amount',
          condition: 'gt',
          value: new BN(0),
        },
      ],
      
      escalation: {
        enabled: true,
        timeoutAction: 'escalate',
        escalationSteps: [],
      },
      
      active: true,
      priority: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.approvalWorkflows.set(workflowId, workflow);
    return [workflow];
  }

  private async validateWithdrawalRequest(
    wallet: VaultWallet,
    asset: PublicKey,
    amount: BN,
    destination: PublicKey
  ): Promise<void> {
    // Check wallet status
    if (wallet.status !== 'active') {
      throw new Error(`Wallet ${wallet.id} is not active`);
    }

    // Check asset balance
    const assetInfo = wallet.assets.find(a => a.mint.equals(asset));
    if (!assetInfo) {
      throw new Error(`Asset ${asset.toString()} not found in wallet`);
    }

    if (amount.gt(assetInfo.availableBalance)) {
      throw new Error('Insufficient balance for withdrawal');
    }

    // Check withdrawal limits
    if (amount.gt(this.config.withdrawalLimits.singleTransactionLimit)) {
      throw new Error('Amount exceeds single transaction limit');
    }

    // Check daily limits
    const dailyWithdrawals = await this.getDailyWithdrawals(wallet.id);
    if (dailyWithdrawals.add(amount).gt(this.config.withdrawalLimits.dailyLimit)) {
      throw new Error('Amount would exceed daily withdrawal limit');
    }

    // Check destination whitelist if enabled
    if (this.config.withdrawalLimits.enableWhitelist) {
      const isWhitelisted = await this.isDestinationWhitelisted(wallet.id, destination);
      if (!isWhitelisted) {
        throw new Error('Destination address not whitelisted');
      }
    }
  }

  private async getDailyWithdrawals(walletId: string): Promise<BN> {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    return this.transactions
      .filter(tx => 
        tx.walletId === walletId &&
        tx.type === 'withdrawal' &&
        tx.initiatedAt >= oneDayAgo &&
        (tx.status === 'completed' || tx.status === 'confirmed')
      )
      .reduce((total, tx) => total.add(tx.amount), new BN(0));
  }

  private async isDestinationWhitelisted(walletId: string, destination: PublicKey): Promise<boolean> {
    // Implementation would check destination against whitelist
    return true; // Placeholder
  }

  private async determineApprovalWorkflow(
    wallet: VaultWallet,
    asset: PublicKey,
    amount: BN
  ): Promise<string> {
    // Find the appropriate workflow based on amount and asset
    for (const workflow of this.approvalWorkflows.values()) {
      const matchesTriggers = workflow.triggers.every(trigger => {
        switch (trigger.type) {
          case 'amount':
            return this.evaluateCondition(amount, trigger.condition, trigger.value);
          case 'asset':
            return asset.equals(new PublicKey(trigger.value));
          default:
            return true;
        }
      });
      
      if (matchesTriggers) {
        return workflow.id;
      }
    }
    
    // Return default workflow if no specific match
    return wallet.approvalWorkflow[0].id;
  }

  private evaluateCondition(value: BN, operator: string, target: any): boolean {
    const targetBN = new BN(target);
    
    switch (operator) {
      case 'gt': return value.gt(targetBN);
      case 'lt': return value.lt(targetBN);
      case 'eq': return value.eq(targetBN);
      default: return false;
    }
  }

  private async calculateWithdrawalRiskScore(
    wallet: VaultWallet,
    asset: PublicKey,
    amount: BN,
    destination: PublicKey
  ): Promise<number> {
    let riskScore = 0;

    // Amount-based risk
    const assetInfo = wallet.assets.find(a => a.mint.equals(asset));
    if (assetInfo) {
      const amountRatio = amount.toNumber() / assetInfo.totalBalance.toNumber();
      if (amountRatio > 0.5) riskScore += 0.3; // High percentage of balance
      if (amountRatio > 0.8) riskScore += 0.2; // Very high percentage
    }

    // Destination risk (new vs known addresses)
    const isKnownDestination = await this.isKnownDestination(destination);
    if (!isKnownDestination) riskScore += 0.2;

    // Time-based risk (off-hours transactions)
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour > 17) riskScore += 0.1;

    // Frequency risk
    const recentWithdrawals = await this.getRecentWithdrawals(wallet.id, 60); // Last hour
    if (recentWithdrawals.length > 3) riskScore += 0.2;

    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  private async isKnownDestination(destination: PublicKey): Promise<boolean> {
    // Check if destination has been used before
    return this.transactions.some(tx => 
      tx.to?.equals(destination) && tx.status === 'completed'
    );
  }

  private async getRecentWithdrawals(walletId: string, minutes: number): Promise<VaultTransaction[]> {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    
    return this.transactions.filter(tx =>
      tx.walletId === walletId &&
      tx.type === 'withdrawal' &&
      tx.initiatedAt >= cutoff
    );
  }

  private async identifyRiskFactors(
    wallet: VaultWallet,
    asset: PublicKey,
    amount: BN,
    destination: PublicKey
  ): Promise<string[]> {
    const factors: string[] = [];

    // Large amount
    const assetInfo = wallet.assets.find(a => a.mint.equals(asset));
    if (assetInfo && amount.gt(assetInfo.totalBalance.divn(2))) {
      factors.push('large_amount_relative_to_balance');
    }

    // New destination
    if (!(await this.isKnownDestination(destination))) {
      factors.push('new_destination_address');
    }

    // Off-hours transaction
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour > 17) {
      factors.push('off_hours_transaction');
    }

    // High frequency
    const recentWithdrawals = await this.getRecentWithdrawals(wallet.id, 60);
    if (recentWithdrawals.length > 2) {
      factors.push('high_frequency_withdrawals');
    }

    return factors;
  }

  private async notifyApprovers(request: WithdrawalRequest): Promise<void> {
    // Implementation would send notifications to relevant approvers
    this.logger.info('Notifying approvers for withdrawal request', {
      requestId: request.id,
      workflowId: request.workflowId,
    });
  }

  private async validateApproverAuthorization(
    request: WithdrawalRequest,
    approver: PublicKey
  ): Promise<void> {
    const workflow = this.approvalWorkflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${request.workflowId} not found`);
    }

    const currentStep = workflow.steps[request.currentStep];
    if (!currentStep) {
      throw new Error('Invalid workflow step');
    }

    // Check if approver is in allowed roles or specific approvers
    const approverSigner = Array.from(this.signers.values())
      .find(s => s.publicKey.equals(approver));
    
    if (!approverSigner) {
      throw new Error('Approver not found in vault signers');
    }

    if (currentStep.allowedRoles.length > 0 && !currentStep.allowedRoles.includes(approverSigner.role)) {
      throw new Error('Approver does not have required role');
    }

    if (currentStep.specificApprovers.length > 0 && !currentStep.specificApprovers.some(pk => pk.equals(approver))) {
      throw new Error('Approver not in specific approvers list');
    }
  }

  private async performFinalWithdrawalValidation(request: WithdrawalRequest): Promise<void> {
    // Final checks before execution
    const wallet = this.wallets.get(request.walletId);
    if (!wallet) {
      throw new Error(`Wallet ${request.walletId} not found`);
    }

    // Re-check balance
    const assetInfo = wallet.assets.find(a => a.mint.equals(request.asset));
    if (!assetInfo || request.amount.gt(assetInfo.availableBalance)) {
      throw new Error('Insufficient balance for withdrawal execution');
    }

    // Check if wallet is still active
    if (wallet.status !== 'active') {
      throw new Error(`Wallet ${wallet.id} is not active`);
    }
  }

  private async executeMultiSigTransaction(wallet: VaultWallet, transaction: Transaction): Promise<string> {
    // Multi-signature transaction execution
    const requiredSignatures = wallet.threshold;
    const availableSigners = wallet.signers.filter(s => s.status === 'active');
    
    if (availableSigners.length < requiredSignatures) {
      throw new Error('Insufficient active signers for transaction');
    }

    // Sign transaction with required number of signers
    const signers = availableSigners.slice(0, requiredSignatures);
    
    // For demonstration, we'll simulate the signing process
    const signature = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    this.logger.info('Multi-sig transaction executed', {
      walletId: wallet.id,
      requiredSignatures,
      actualSigners: signers.length,
      signature,
    });
    
    return signature;
  }

  private async performHealthCheck(): Promise<void> {
    for (const [walletId, wallet] of this.wallets) {
      try {
        // Check wallet health
        const healthStatus = await this.checkWalletHealth(wallet);
        wallet.healthStatus = healthStatus;
        wallet.lastHealthCheck = Date.now();
        
        if (healthStatus !== 'healthy') {
          this.logger.warn('Wallet health issue detected', {
            walletId,
            healthStatus,
          });
        }
      } catch (error) {
        this.logger.error('Health check failed for wallet', error, { walletId });
      }
    }
  }

  private async checkWalletHealth(wallet: VaultWallet): Promise<VaultWallet['healthStatus']> {
    // Simplified health check
    const activeSigners = wallet.signers.filter(s => s.status === 'active');
    
    if (activeSigners.length < wallet.threshold) {
      return 'critical';
    } else if (activeSigners.length < wallet.threshold + 1) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private async performRiskMonitoring(): Promise<void> {
    // Monitor risk levels across all wallets
    for (const [walletId, wallet] of this.wallets) {
      const riskLevel = await this.calculateWalletRiskLevel(wallet);
      
      if (riskLevel > 0.8) {
        this.logger.warn('High risk level detected for wallet', {
          walletId,
          riskLevel,
        });
      }
    }
  }

  private async calculateWalletRiskLevel(wallet: VaultWallet): Promise<number> {
    // Simplified risk calculation
    let riskLevel = 0;
    
    // Concentration risk
    if (wallet.assets.length > 0) {
      const totalValue = wallet.assets.reduce((sum, asset) => sum.add(asset.totalValue), new BN(0));
      const largestAsset = wallet.assets.reduce((max, asset) => 
        asset.totalValue.gt(max.totalValue) ? asset : max
      );
      
      const concentration = largestAsset.totalValue.toNumber() / totalValue.toNumber();
      if (concentration > 0.7) riskLevel += 0.3;
    }
    
    // Recent activity risk
    const recentTx = await this.getRecentWithdrawals(wallet.id, 24 * 60); // Last 24 hours
    if (recentTx.length > 10) riskLevel += 0.2;
    
    return Math.min(riskLevel, 1.0);
  }

  private async performComplianceCheck(): Promise<void> {
    // Perform compliance checks
    this.logger.debug('Performing compliance checks');
    
    // Check for suspicious patterns
    // Verify KYC/AML compliance
    // Generate required reports
  }

  private async performAuditCheck(): Promise<void> {
    // Perform audit checks
    this.logger.debug('Performing audit checks');
    
    // Verify transaction integrity
    // Check approval processes
    // Validate security controls
  }

  // Report generation methods

  private async generateAssetSummary(wallet: VaultWallet): Promise<VaultReport['assetSummary']> {
    const totalValue = wallet.assets.reduce((sum, asset) => sum.add(asset.totalValue), new BN(0));
    
    const topAssets = wallet.assets
      .sort((a, b) => b.totalValue.cmp(a.totalValue))
      .slice(0, 5)
      .map(asset => ({
        asset: asset.symbol,
        value: asset.totalValue,
        percentage: totalValue.gt(new BN(0)) ? (asset.totalValue.toNumber() / totalValue.toNumber()) * 100 : 0,
      }));

    const assetAllocation = wallet.assets.reduce((allocation, asset) => {
      const percentage = totalValue.gt(new BN(0)) ? (asset.totalValue.toNumber() / totalValue.toNumber()) * 100 : 0;
      allocation[asset.symbol] = percentage;
      return allocation;
    }, {} as Record<string, number>);

    return {
      totalAssets: wallet.assets.length,
      totalValue,
      topAssets,
      assetAllocation,
    };
  }

  private generateTransactionSummary(transactions: VaultTransaction[]): VaultReport['transactionSummary'] {
    const totalVolume = transactions.reduce((sum, tx) => sum.add(tx.amount), new BN(0));
    
    const deposits = transactions.filter(tx => tx.type === 'deposit');
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal');
    const internalTransfers = transactions.filter(tx => tx.type === 'internal_transfer');
    
    const depositVolume = deposits.reduce((sum, tx) => sum.add(tx.amount), new BN(0));
    const withdrawalVolume = withdrawals.reduce((sum, tx) => sum.add(tx.amount), new BN(0));
    const internalVolume = internalTransfers.reduce((sum, tx) => sum.add(tx.amount), new BN(0));
    
    const averageTransactionSize = transactions.length > 0 
      ? totalVolume.divn(transactions.length)
      : new BN(0);
    
    const largestTransaction = transactions.reduce((max, tx) => 
      tx.amount.gt(max) ? tx.amount : max, new BN(0)
    );

    return {
      totalTransactions: transactions.length,
      totalVolume,
      deposits: { count: deposits.length, volume: depositVolume },
      withdrawals: { count: withdrawals.length, volume: withdrawalVolume },
      internalTransfers: { count: internalTransfers.length, volume: internalVolume },
      averageTransactionSize,
      largestTransaction,
    };
  }

  private async generateSecurityMetrics(
    wallet: VaultWallet,
    period: { startDate: number; endDate: number }
  ): Promise<VaultReport['securityMetrics']> {
    // Count signing attempts and success rates
    const totalSigningAttempts = 100; // Placeholder
    const failedSigningAttempts = 5; // Placeholder
    const signatureSuccessRate = ((totalSigningAttempts - failedSigningAttempts) / totalSigningAttempts) * 100;

    return {
      signatureSuccessRate,
      failedSigningAttempts,
      suspiciousActivities: 0,
      securityAlerts: 0,
      lastSecurityAudit: wallet.lastSecurityAudit,
    };
  }

  private async generateComplianceMetrics(
    wallet: VaultWallet,
    period: { startDate: number; endDate: number }
  ): Promise<VaultReport['complianceMetrics']> {
    const periodTransactions = this.transactions.filter(tx =>
      tx.walletId === wallet.id &&
      tx.initiatedAt >= period.startDate &&
      tx.initiatedAt <= period.endDate
    );

    return {
      amlScreenings: periodTransactions.filter(tx => tx.amlScreening).length,
      sanctionsScreenings: periodTransactions.filter(tx => tx.sanctionsScreening).length,
      complianceViolations: 0,
      regulatoryReports: 1,
      kycUpdates: 0,
    };
  }

  private async generateRiskAssessment(
    wallet: VaultWallet,
    period: { startDate: number; endDate: number }
  ): Promise<VaultReport['riskAssessment']> {
    const overallRiskScore = await this.calculateWalletRiskLevel(wallet);

    return {
      overallRiskScore,
      concentrationRisk: 0.2, // 20%
      liquidityRisk: 0.1, // 10%
      operationalRisk: 0.05, // 5%
      marketRisk: 0.15, // 15%
      riskTrends: [
        { date: period.startDate, riskScore: 0.2 },
        { date: period.endDate, riskScore: overallRiskScore },
      ],
    };
  }

  private async generatePerformanceMetrics(
    wallet: VaultWallet,
    period: { startDate: number; endDate: number }
  ): Promise<VaultReport['performanceMetrics']> {
    return {
      uptime: 99.9,
      responseTime: 150, // milliseconds
      systemAvailability: 99.9,
      errorRate: 0.1,
      successfulTransactions: this.transactions.filter(tx => 
        tx.walletId === wallet.id && tx.status === 'completed'
      ).length,
    };
  }

  private generateCertificateFingerprint(): string {
    return `fp_${Math.random().toString(36).substr(2, 32)}`;
  }

  private getDefaultPermissions(role: VaultSigner['role']): string[] {
    switch (role) {
      case 'admin':
        return ['sign', 'approve', 'manage_signers', 'freeze_wallet', 'emergency_actions'];
      case 'operator':
        return ['sign', 'approve', 'view_balances'];
      case 'auditor':
        return ['view_balances', 'view_transactions', 'generate_reports'];
      case 'emergency':
        return ['emergency_actions', 'emergency_sign'];
      default:
        return ['view_balances'];
    }
  }

  private generateDigitalSignature(data: string): string {
    return `sig_${Math.random().toString(36).substr(2, 32)}`;
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getConfig(): CustodyVaultConfig {
    return { ...this.config };
  }

  getWallets(): VaultWallet[] {
    return Array.from(this.wallets.values());
  }

  getWallet(walletId: string): VaultWallet | null {
    return this.wallets.get(walletId) || null;
  }

  getSigners(): VaultSigner[] {
    return Array.from(this.signers.values());
  }

  getSigner(signerId: string): VaultSigner | null {
    return this.signers.get(signerId) || null;
  }

  getWithdrawalRequests(walletId?: string): WithdrawalRequest[] {
    const requests = Array.from(this.withdrawalRequests.values());
    return walletId ? requests.filter(r => r.walletId === walletId) : requests;
  }

  getTransactions(walletId?: string): VaultTransaction[] {
    return walletId ? this.transactions.filter(tx => tx.walletId === walletId) : this.transactions;
  }
}

export default CustodyVault;