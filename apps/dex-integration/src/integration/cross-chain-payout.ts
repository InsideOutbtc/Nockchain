// Cross-Chain Payout System - Unified mining rewards distribution across chains

import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface CrossChainPayoutConfig {
  // Core configuration
  solanaConnection: Connection;
  payoutWallet: Keypair;
  
  // Payout settings
  payout: {
    enableCrossChainPayouts: boolean;
    defaultChain: 'nockchain' | 'solana';
    minimumPayoutAmount: BN;
    maximumPayoutAmount: BN;
    payoutBatchSize: number;
    payoutInterval: number; // seconds
  };
  
  // Bridge integration
  bridge: {
    enableAutomaticBridging: boolean;
    bridgeThresholdAmount: BN;
    maxBridgeSlippage: number; // percentage
    bridgePriorityFee: BN;
  };
  
  // Fee structure
  fees: {
    nockchainPayoutFee: BN;
    solanaPayoutFee: BN;
    bridgeFeePercentage: number;
    priorityFeeEnabled: boolean;
  };
  
  // Risk management
  riskManagement: {
    enableVelocityChecks: boolean;
    maxHourlyPayouts: BN;
    maxDailyPayouts: BN;
    enableFraudDetection: boolean;
    enableWhitelisting: boolean;
  };
  
  // Retry configuration
  retry: {
    maxRetries: number;
    retryDelaySeconds: number;
    exponentialBackoff: boolean;
    enableFailsafe: boolean;
  };
}

export interface PayoutRequest {
  id: string;
  userId: string;
  requestedAt: number;
  
  // Payout details
  amount: BN;
  targetChain: 'nockchain' | 'solana';
  targetAddress: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Source information
  source: {
    type: 'mining' | 'bridge_rewards' | 'liquidity_rewards' | 'manual';
    blockHeight?: number;
    shareCount?: number;
    poolRound?: string;
  };
  
  // Processing status
  status: 'pending' | 'processing' | 'bridging' | 'completed' | 'failed' | 'cancelled';
  
  // Transaction tracking
  transactions: PayoutTransaction[];
  
  // Error handling
  errorCount: number;
  lastError?: string;
  nextRetryAt?: number;
  
  // Fees and deductions
  fees: {
    processingFee: BN;
    bridgeFee?: BN;
    networkFee: BN;
    totalDeducted: BN;
  };
  
  // Timing
  estimatedCompletionTime?: number;
  actualCompletionTime?: number;
  
  // Compliance
  compliance: {
    kycRequired: boolean;
    kycStatus?: 'approved' | 'pending' | 'rejected';
    riskScore: number;
    flagged: boolean;
  };
}

export interface PayoutTransaction {
  id: string;
  chain: 'nockchain' | 'solana';
  type: 'direct_payout' | 'bridge_deposit' | 'bridge_withdrawal';
  
  // Transaction details
  transactionHash?: string;
  amount: BN;
  fee: BN;
  confirmations: number;
  requiredConfirmations: number;
  
  // Status
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  submittedAt?: number;
  confirmedAt?: number;
  
  // Error details
  error?: string;
  retryCount: number;
}

export interface PayoutBatch {
  id: string;
  createdAt: number;
  payoutRequests: string[];
  totalAmount: BN;
  targetChain: 'nockchain' | 'solana';
  
  // Batch processing
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: number;
  completedAt?: number;
  
  // Batch transaction
  batchTransactionHash?: string;
  batchFee: BN;
  
  // Statistics
  successCount: number;
  failureCount: number;
  totalFees: BN;
}

export interface PayoutStatistics {
  // Volume statistics
  dailyVolume: BN;
  weeklyVolume: BN;
  monthlyVolume: BN;
  
  // Transaction statistics
  dailyTransactions: number;
  successRate: number;
  averageProcessingTime: number;
  
  // Chain breakdown
  chainBreakdown: {
    nockchain: { volume: BN; count: number };
    solana: { volume: BN; count: number };
  };
  
  // Fee statistics
  totalFeesCollected: BN;
  averageFeePercentage: number;
  
  // Performance metrics
  systemUptime: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface UserPayoutPreferences {
  userId: string;
  defaultChain: 'nockchain' | 'solana';
  enableAutomaticPayouts: boolean;
  minimumPayoutThreshold: BN;
  
  // Chain-specific addresses
  addresses: {
    nockchain: string;
    solana?: string;
  };
  
  // Advanced preferences
  enablePriorityFees: boolean;
  enableBridgeOptimization: boolean;
  consolidateSmallPayouts: boolean;
  
  // Notification preferences
  notifyOnPayout: boolean;
  notifyOnFailure: boolean;
  notificationChannels: string[];
  
  // Risk preferences
  acceptHigherFees: boolean;
  enableExpressPayouts: boolean;
  maxAcceptableDelay: number; // hours
}

export class CrossChainPayoutSystem {
  private config: CrossChainPayoutConfig;
  private connection: Connection;
  private logger: Logger;
  
  // Data stores
  private payoutQueue: Map<string, PayoutRequest> = new Map();
  private activeBatches: Map<string, PayoutBatch> = new Map();
  private userPreferences: Map<string, UserPayoutPreferences> = new Map();
  private statistics: PayoutStatistics;
  
  // Processing state
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private batchProcessor?: NodeJS.Timeout;

  constructor(config: CrossChainPayoutConfig) {
    this.config = config;
    this.connection = config.solanaConnection;
    this.logger = new Logger('CrossChainPayoutSystem');
    this.initializeStatistics();
  }

  async start(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Payout system is already running');
    }

    this.logger.info('Starting cross-chain payout system');
    this.isProcessing = true;

    // Start periodic processing
    this.processingInterval = setInterval(async () => {
      await this.processPayoutQueue();
    }, this.config.payout.payoutInterval * 1000);

    // Start batch processing
    this.batchProcessor = setInterval(async () => {
      await this.processBatches();
    }, 30000); // Every 30 seconds

    this.logger.info('Cross-chain payout system started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.logger.info('Stopping cross-chain payout system');
    this.isProcessing = false;

    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
    }

    // Process remaining payouts
    await this.processPayoutQueue();

    this.logger.info('Cross-chain payout system stopped');
  }

  async requestPayout(
    userId: string, 
    amount: BN, 
    targetChain: 'nockchain' | 'solana',
    priority: PayoutRequest['priority'] = 'normal',
    source: PayoutRequest['source'] = { type: 'mining' }
  ): Promise<string> {
    
    // Validate payout amount
    if (amount.lt(this.config.payout.minimumPayoutAmount)) {
      throw new Error(`Amount below minimum payout threshold: ${this.config.payout.minimumPayoutAmount.toString()}`);
    }

    if (amount.gt(this.config.payout.maximumPayoutAmount)) {
      throw new Error(`Amount exceeds maximum payout limit: ${this.config.payout.maximumPayoutAmount.toString()}`);
    }

    // Check velocity limits
    if (this.config.riskManagement.enableVelocityChecks) {
      await this.checkVelocityLimits(userId, amount);
    }

    // Get user preferences
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      throw new Error('User payout preferences not configured');
    }

    // Validate target address
    const targetAddress = targetChain === 'nockchain' 
      ? preferences.addresses.nockchain 
      : preferences.addresses.solana;

    if (!targetAddress) {
      throw new Error(`No ${targetChain} address configured for user`);
    }

    // Calculate fees
    const fees = await this.calculatePayoutFees(amount, targetChain);

    // Create payout request
    const payoutId = this.generatePayoutId();
    const payoutRequest: PayoutRequest = {
      id: payoutId,
      userId,
      requestedAt: Date.now(),
      amount,
      targetChain,
      targetAddress,
      priority,
      source,
      status: 'pending',
      transactions: [],
      errorCount: 0,
      fees,
      compliance: {
        kycRequired: this.requiresKYC(amount),
        riskScore: await this.calculateRiskScore(userId, amount),
        flagged: false
      }
    };

    // Add to queue
    this.payoutQueue.set(payoutId, payoutRequest);

    this.logger.info(`Payout request created`, {
      payoutId,
      userId,
      amount: amount.toString(),
      targetChain,
      priority
    });

    return payoutId;
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutRequest | null> {
    return this.payoutQueue.get(payoutId) || null;
  }

  async getUserPayouts(userId: string, limit: number = 50): Promise<PayoutRequest[]> {
    return Array.from(this.payoutQueue.values())
      .filter(payout => payout.userId === userId)
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .slice(0, limit);
  }

  async cancelPayout(payoutId: string): Promise<void> {
    const payout = this.payoutQueue.get(payoutId);
    if (!payout) {
      throw new Error(`Payout ${payoutId} not found`);
    }

    if (payout.status === 'processing' || payout.status === 'bridging') {
      throw new Error('Cannot cancel payout that is currently being processed');
    }

    payout.status = 'cancelled';
    this.logger.info(`Payout cancelled: ${payoutId}`);
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPayoutPreferences>): Promise<void> {
    const existing = this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
    const updated = { ...existing, ...preferences };
    
    this.userPreferences.set(userId, updated);
    
    this.logger.info(`User payout preferences updated: ${userId}`);
  }

  async getUserPreferences(userId: string): Promise<UserPayoutPreferences> {
    return this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
  }

  async getPayoutStatistics(): Promise<PayoutStatistics> {
    return { ...this.statistics };
  }

  async estimatePayoutTime(amount: BN, targetChain: 'nockchain' | 'solana'): Promise<number> {
    // Base processing time
    let estimatedTime = 300; // 5 minutes base

    // Add bridge time if needed
    if (targetChain === 'solana' && this.config.bridge.enableAutomaticBridging) {
      estimatedTime += 600; // 10 minutes for bridge
    }

    // Adjust for queue length
    const queueLength = Array.from(this.payoutQueue.values())
      .filter(p => p.status === 'pending').length;
    
    estimatedTime += queueLength * 60; // 1 minute per queued payout

    return estimatedTime;
  }

  private async processPayoutQueue(): Promise<void> {
    if (!this.isProcessing) return;

    const pendingPayouts = Array.from(this.payoutQueue.values())
      .filter(payout => payout.status === 'pending')
      .sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

    const batchSize = Math.min(pendingPayouts.length, this.config.payout.payoutBatchSize);
    const batch = pendingPayouts.slice(0, batchSize);

    for (const payout of batch) {
      try {
        await this.processSinglePayout(payout);
      } catch (error) {
        this.logger.error(`Failed to process payout ${payout.id}`, error);
        await this.handlePayoutError(payout, error.message);
      }
    }
  }

  private async processSinglePayout(payout: PayoutRequest): Promise<void> {
    payout.status = 'processing';

    this.logger.info(`Processing payout ${payout.id}`, {
      amount: payout.amount.toString(),
      targetChain: payout.targetChain,
      userId: payout.userId
    });

    try {
      if (payout.targetChain === 'nockchain') {
        await this.processNockchainPayout(payout);
      } else {
        await this.processSolanaPayout(payout);
      }

      payout.status = 'completed';
      payout.actualCompletionTime = Date.now();
      
      this.updateStatistics(payout);
      
    } catch (error) {
      await this.handlePayoutError(payout, error.message);
    }
  }

  private async processNockchainPayout(payout: PayoutRequest): Promise<void> {
    // Create direct Nockchain transaction
    const transaction: PayoutTransaction = {
      id: this.generateTransactionId(),
      chain: 'nockchain',
      type: 'direct_payout',
      amount: payout.amount,
      fee: payout.fees.networkFee,
      confirmations: 0,
      requiredConfirmations: 6,
      status: 'pending',
      retryCount: 0
    };

    payout.transactions.push(transaction);

    // Submit transaction to Nockchain network
    const txHash = await this.submitNockchainTransaction(payout);
    transaction.transactionHash = txHash;
    transaction.status = 'submitted';
    transaction.submittedAt = Date.now();

    // Monitor for confirmations
    await this.monitorNockchainTransaction(transaction);
  }

  private async processSolanaPayout(payout: PayoutRequest): Promise<void> {
    if (this.config.bridge.enableAutomaticBridging) {
      // Bridge NOCK to wNOCK first, then send
      await this.processBridgedSolanaPayout(payout);
    } else {
      // Direct Solana transaction (assumes wNOCK already available)
      await this.processDirectSolanaPayout(payout);
    }
  }

  private async processBridgedSolanaPayout(payout: PayoutRequest): Promise<void> {
    payout.status = 'bridging';

    // Step 1: Bridge NOCK to wNOCK
    const bridgeTransaction: PayoutTransaction = {
      id: this.generateTransactionId(),
      chain: 'solana',
      type: 'bridge_deposit',
      amount: payout.amount,
      fee: payout.fees.bridgeFee || new BN(0),
      confirmations: 0,
      requiredConfirmations: 5,
      status: 'pending',
      retryCount: 0
    };

    payout.transactions.push(bridgeTransaction);

    // Submit bridge transaction
    const bridgeTxHash = await this.submitBridgeTransaction(payout);
    bridgeTransaction.transactionHash = bridgeTxHash;
    bridgeTransaction.status = 'submitted';
    bridgeTransaction.submittedAt = Date.now();

    // Wait for bridge completion
    await this.monitorBridgeTransaction(bridgeTransaction);

    // Step 2: Send wNOCK to user's Solana address
    const payoutTransaction: PayoutTransaction = {
      id: this.generateTransactionId(),
      chain: 'solana',
      type: 'direct_payout',
      amount: payout.amount,
      fee: payout.fees.networkFee,
      confirmations: 0,
      requiredConfirmations: 1,
      status: 'pending',
      retryCount: 0
    };

    payout.transactions.push(payoutTransaction);

    const payoutTxHash = await this.submitSolanaTransaction(payout);
    payoutTransaction.transactionHash = payoutTxHash;
    payoutTransaction.status = 'submitted';
    payoutTransaction.submittedAt = Date.now();

    await this.monitorSolanaTransaction(payoutTransaction);
  }

  private async processDirectSolanaPayout(payout: PayoutRequest): Promise<void> {
    // Direct wNOCK transfer on Solana
    const transaction: PayoutTransaction = {
      id: this.generateTransactionId(),
      chain: 'solana',
      type: 'direct_payout',
      amount: payout.amount,
      fee: payout.fees.networkFee,
      confirmations: 0,
      requiredConfirmations: 1,
      status: 'pending',
      retryCount: 0
    };

    payout.transactions.push(transaction);

    const txHash = await this.submitSolanaTransaction(payout);
    transaction.transactionHash = txHash;
    transaction.status = 'submitted';
    transaction.submittedAt = Date.now();

    await this.monitorSolanaTransaction(transaction);
  }

  private async processBatches(): Promise<void> {
    // Process batched transactions for efficiency
    const pendingPayouts = Array.from(this.payoutQueue.values())
      .filter(p => p.status === 'pending' && p.priority !== 'urgent');

    if (pendingPayouts.length >= this.config.payout.payoutBatchSize) {
      await this.createPayoutBatch(pendingPayouts.slice(0, this.config.payout.payoutBatchSize));
    }
  }

  private async createPayoutBatch(payouts: PayoutRequest[]): Promise<string> {
    const batchId = this.generateBatchId();
    const totalAmount = payouts.reduce((sum, p) => sum.add(p.amount), new BN(0));
    
    const batch: PayoutBatch = {
      id: batchId,
      createdAt: Date.now(),
      payoutRequests: payouts.map(p => p.id),
      totalAmount,
      targetChain: payouts[0].targetChain, // Assume same chain for batch
      status: 'pending',
      batchFee: new BN(0),
      successCount: 0,
      failureCount: 0,
      totalFees: new BN(0)
    };

    this.activeBatches.set(batchId, batch);

    // Mark payouts as processing
    for (const payout of payouts) {
      payout.status = 'processing';
    }

    this.logger.info(`Created payout batch ${batchId}`, {
      payoutCount: payouts.length,
      totalAmount: totalAmount.toString(),
      targetChain: batch.targetChain
    });

    return batchId;
  }

  private async handlePayoutError(payout: PayoutRequest, error: string): Promise<void> {
    payout.errorCount++;
    payout.lastError = error;
    
    if (payout.errorCount >= this.config.retry.maxRetries) {
      payout.status = 'failed';
      this.logger.error(`Payout ${payout.id} failed permanently`, { error, attempts: payout.errorCount });
    } else {
      payout.status = 'pending';
      payout.nextRetryAt = Date.now() + (this.config.retry.retryDelaySeconds * 1000);
      this.logger.warn(`Payout ${payout.id} failed, will retry`, { error, attempt: payout.errorCount });
    }
  }

  private async calculatePayoutFees(amount: BN, targetChain: 'nockchain' | 'solana'): Promise<PayoutRequest['fees']> {
    const processingFee = targetChain === 'nockchain' 
      ? this.config.fees.nockchainPayoutFee 
      : this.config.fees.solanaPayoutFee;

    const bridgeFee = targetChain === 'solana' && this.config.bridge.enableAutomaticBridging
      ? amount.mul(new BN(this.config.fees.bridgeFeePercentage * 100)).div(new BN(10000))
      : undefined;

    const networkFee = new BN(10000); // Base network fee

    const totalDeducted = processingFee.add(bridgeFee || new BN(0)).add(networkFee);

    return {
      processingFee,
      bridgeFee,
      networkFee,
      totalDeducted
    };
  }

  private async checkVelocityLimits(userId: string, amount: BN): Promise<void> {
    // Check hourly and daily limits
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    const userPayouts = Array.from(this.payoutQueue.values())
      .filter(p => p.userId === userId);

    const hourlyAmount = userPayouts
      .filter(p => p.requestedAt > hourAgo)
      .reduce((sum, p) => sum.add(p.amount), new BN(0));

    const dailyAmount = userPayouts
      .filter(p => p.requestedAt > dayAgo)
      .reduce((sum, p) => sum.add(p.amount), new BN(0));

    if (hourlyAmount.add(amount).gt(this.config.riskManagement.maxHourlyPayouts)) {
      throw new Error('Hourly payout limit exceeded');
    }

    if (dailyAmount.add(amount).gt(this.config.riskManagement.maxDailyPayouts)) {
      throw new Error('Daily payout limit exceeded');
    }
  }

  private async calculateRiskScore(userId: string, amount: BN): Promise<number> {
    // Calculate risk score based on various factors
    let riskScore = 0;

    // Amount-based risk
    if (amount.gt(new BN(100000000))) { // Large amount
      riskScore += 3;
    }

    // User history risk
    const userPayouts = Array.from(this.payoutQueue.values())
      .filter(p => p.userId === userId);

    if (userPayouts.length === 0) { // New user
      riskScore += 2;
    }

    return Math.min(riskScore, 10); // Max risk score of 10
  }

  private requiresKYC(amount: BN): boolean {
    return amount.gt(new BN(1000000000)); // Require KYC for large amounts
  }

  private getPriorityScore(payout: PayoutRequest): number {
    const priorityScores = { low: 1, normal: 2, high: 3, urgent: 4 };
    return priorityScores[payout.priority];
  }

  private getDefaultPreferences(userId: string): UserPayoutPreferences {
    return {
      userId,
      defaultChain: 'nockchain',
      enableAutomaticPayouts: false,
      minimumPayoutThreshold: new BN(1000000),
      addresses: {
        nockchain: '', // Must be set by user
        solana: undefined
      },
      enablePriorityFees: false,
      enableBridgeOptimization: true,
      consolidateSmallPayouts: true,
      notifyOnPayout: true,
      notifyOnFailure: true,
      notificationChannels: ['email'],
      acceptHigherFees: false,
      enableExpressPayouts: false,
      maxAcceptableDelay: 24
    };
  }

  private updateStatistics(payout: PayoutRequest): void {
    this.statistics.dailyTransactions++;
    
    if (payout.targetChain === 'nockchain') {
      this.statistics.chainBreakdown.nockchain.volume = 
        this.statistics.chainBreakdown.nockchain.volume.add(payout.amount);
      this.statistics.chainBreakdown.nockchain.count++;
    } else {
      this.statistics.chainBreakdown.solana.volume = 
        this.statistics.chainBreakdown.solana.volume.add(payout.amount);
      this.statistics.chainBreakdown.solana.count++;
    }

    this.statistics.totalFeesCollected = 
      this.statistics.totalFeesCollected.add(payout.fees.totalDeducted);
  }

  private initializeStatistics(): void {
    this.statistics = {
      dailyVolume: new BN(0),
      weeklyVolume: new BN(0),
      monthlyVolume: new BN(0),
      dailyTransactions: 0,
      successRate: 100,
      averageProcessingTime: 300,
      chainBreakdown: {
        nockchain: { volume: new BN(0), count: 0 },
        solana: { volume: new BN(0), count: 0 }
      },
      totalFeesCollected: new BN(0),
      averageFeePercentage: 1.0,
      systemUptime: 100,
      averageResponseTime: 50,
      errorRate: 0
    };
  }

  // Transaction submission methods (to be implemented with actual blockchain interactions)
  private async submitNockchainTransaction(payout: PayoutRequest): Promise<string> {
    // Implementation would submit to Nockchain network
    return `nock_${Date.now()}`;
  }

  private async submitSolanaTransaction(payout: PayoutRequest): Promise<string> {
    // Implementation would submit to Solana network
    return `sol_${Date.now()}`;
  }

  private async submitBridgeTransaction(payout: PayoutRequest): Promise<string> {
    // Implementation would submit bridge transaction
    return `bridge_${Date.now()}`;
  }

  // Transaction monitoring methods
  private async monitorNockchainTransaction(transaction: PayoutTransaction): Promise<void> {
    // Implementation would monitor Nockchain confirmations
  }

  private async monitorSolanaTransaction(transaction: PayoutTransaction): Promise<void> {
    // Implementation would monitor Solana confirmations
  }

  private async monitorBridgeTransaction(transaction: PayoutTransaction): Promise<void> {
    // Implementation would monitor bridge completion
  }

  // ID generation methods
  private generatePayoutId(): string {
    return `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}