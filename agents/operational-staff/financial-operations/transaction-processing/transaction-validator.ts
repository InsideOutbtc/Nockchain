/**
 * Autonomous Transaction Validator
 * Validates all transactions before processing with comprehensive checks
 */

import {
  TransactionRequest,
  TransactionRecord,
  FinancialAccount,
  ComplianceRequirement,
  RiskMetric,
  FinancialAlert
} from '../types/financial-types';

export class AutonomousTransactionValidator {
  private validationRules: Map<string, any> = new Map();
  private riskThresholds: Map<string, number> = new Map();
  private complianceRules: Map<string, ComplianceRequirement[]> = new Map();
  private validationHistory: any[] = [];

  constructor() {
    this.initializeValidator();
  }

  private initializeValidator(): void {
    console.log('🔍 Initializing Autonomous Transaction Validator');
    
    // Initialize validation rules
    this.initializeValidationRules();
    
    // Initialize risk thresholds
    this.initializeRiskThresholds();
    
    // Initialize compliance rules
    this.initializeComplianceRules();
    
    // Start validation monitoring
    this.startValidationMonitoring();
  }

  /**
   * Validate transaction comprehensively
   */
  async validateTransaction(request: TransactionRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    riskScore: number;
    complianceStatus: boolean;
    recommendedAction: string;
  }> {
    console.log(`🔍 Validating transaction: ${request.id}`);
    
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      riskScore: 0,
      complianceStatus: true,
      recommendedAction: 'proceed'
    };

    try {
      // Structure validation
      const structureResult = await this.validateStructure(request);
      this.mergeValidationResults(validationResult, structureResult);

      // Business rules validation
      const businessResult = await this.validateBusinessRules(request);
      this.mergeValidationResults(validationResult, businessResult);

      // Compliance validation
      const complianceResult = await this.validateCompliance(request);
      this.mergeValidationResults(validationResult, complianceResult);

      // Risk assessment
      const riskResult = await this.assessRisk(request);
      validationResult.riskScore = riskResult.score;
      this.mergeValidationResults(validationResult, riskResult);

      // Fraud detection
      const fraudResult = await this.detectFraud(request);
      this.mergeValidationResults(validationResult, fraudResult);

      // Account validation
      const accountResult = await this.validateAccounts(request);
      this.mergeValidationResults(validationResult, accountResult);

      // Amount validation
      const amountResult = await this.validateAmount(request);
      this.mergeValidationResults(validationResult, amountResult);

      // Currency validation
      const currencyResult = await this.validateCurrency(request);
      this.mergeValidationResults(validationResult, currencyResult);

      // Determine final validation status
      validationResult.isValid = validationResult.errors.length === 0;
      validationResult.complianceStatus = !validationResult.errors.some(e => e.includes('compliance'));
      validationResult.recommendedAction = this.determineRecommendedAction(validationResult);

      // Log validation result
      this.logValidationResult(request, validationResult);

      console.log(`✅ Transaction validation completed: ${request.id} (Valid: ${validationResult.isValid})`);
      return validationResult;

    } catch (error) {
      console.error(`❌ Transaction validation failed: ${error.message}`);
      validationResult.isValid = false;
      validationResult.errors.push(`Validation error: ${error.message}`);
      validationResult.recommendedAction = 'reject';
      
      return validationResult;
    }
  }

  /**
   * Validate multiple transactions in batch
   */
  async validateBatchTransactions(requests: TransactionRequest[]): Promise<Map<string, any>> {
    console.log(`📦 Validating batch transactions: ${requests.length} transactions`);
    
    const results = new Map<string, any>();
    const validationPromises = requests.map(async (request) => {
      const result = await this.validateTransaction(request);
      results.set(request.id, result);
    });

    await Promise.all(validationPromises);
    
    const validCount = Array.from(results.values()).filter(r => r.isValid).length;
    console.log(`✅ Batch validation completed: ${validCount}/${requests.length} valid`);
    
    return results;
  }

  /**
   * Validate transaction structure
   */
  private async validateStructure(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Required fields validation
    if (!request.id) result.errors.push('Transaction ID is required');
    if (!request.type) result.errors.push('Transaction type is required');
    if (!request.amount) result.errors.push('Transaction amount is required');
    if (!request.currency) result.errors.push('Currency is required');
    if (!request.fromAccount) result.errors.push('From account is required');
    if (!request.toAccount) result.errors.push('To account is required');
    if (!request.timestamp) result.errors.push('Timestamp is required');

    // Format validation
    if (request.id && !/^[a-zA-Z0-9_-]+$/.test(request.id)) {
      result.errors.push('Invalid transaction ID format');
    }

    // Type validation
    const validTypes = ['payment', 'transfer', 'withdrawal', 'deposit', 'investment'];
    if (request.type && !validTypes.includes(request.type)) {
      result.errors.push(`Invalid transaction type: ${request.type}`);
    }

    // Priority validation
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (request.priority && !validPriorities.includes(request.priority)) {
      result.warnings.push(`Invalid priority level: ${request.priority}`);
    }

    return result;
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Get business rules for transaction type
    const rules = this.validationRules.get(request.type) || {};

    // Minimum amount validation
    if (rules.minAmount && request.amount < rules.minAmount) {
      result.errors.push(`Amount below minimum: ${request.amount} < ${rules.minAmount}`);
    }

    // Maximum amount validation
    if (rules.maxAmount && request.amount > rules.maxAmount) {
      result.errors.push(`Amount exceeds maximum: ${request.amount} > ${rules.maxAmount}`);
    }

    // Business hours validation
    if (rules.businessHoursOnly && !this.isBusinessHours()) {
      result.warnings.push('Transaction outside business hours');
    }

    // Account relationship validation
    if (request.fromAccount === request.toAccount) {
      result.errors.push('Source and destination accounts cannot be the same');
    }

    // Purpose validation
    if (rules.requirePurpose && !request.purpose) {
      result.errors.push('Transaction purpose is required');
    }

    return result;
  }

  /**
   * Validate compliance requirements
   */
  private async validateCompliance(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Check compliance requirements
    for (const requirement of request.compliance || []) {
      const isValid = await this.validateComplianceRequirement(requirement);
      if (!isValid) {
        result.errors.push(`Compliance requirement not met: ${requirement.type}`);
      }
    }

    // Check regulatory compliance
    const regulatoryResult = await this.checkRegulatoryCompliance(request);
    if (!regulatoryResult.isCompliant) {
      result.errors.push(`Regulatory compliance issue: ${regulatoryResult.reason}`);
    }

    // AML/KYC checks
    const amlResult = await this.performAMLCheck(request);
    if (!amlResult.passed) {
      result.errors.push(`AML check failed: ${amlResult.reason}`);
    }

    return result;
  }

  /**
   * Assess transaction risk
   */
  private async assessRisk(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[], score: 0 };

    // Amount risk
    const amountRisk = this.calculateAmountRisk(request.amount);
    result.score += amountRisk;

    // Account risk
    const accountRisk = await this.calculateAccountRisk(request.fromAccount, request.toAccount);
    result.score += accountRisk;

    // Transaction pattern risk
    const patternRisk = await this.calculatePatternRisk(request);
    result.score += patternRisk;

    // Geographical risk
    const geoRisk = await this.calculateGeographicalRisk(request);
    result.score += geoRisk;

    // Time-based risk
    const timeRisk = this.calculateTimeRisk(request.timestamp);
    result.score += timeRisk;

    // Check risk thresholds
    const threshold = this.riskThresholds.get(request.type) || 50;
    if (result.score > threshold) {
      result.errors.push(`High risk transaction: score ${result.score} > ${threshold}`);
    } else if (result.score > threshold * 0.7) {
      result.warnings.push(`Medium risk transaction: score ${result.score}`);
    }

    return result;
  }

  /**
   * Detect fraud
   */
  private async detectFraud(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Velocity checks
    const velocityCheck = await this.checkTransactionVelocity(request);
    if (velocityCheck.suspicious) {
      result.warnings.push(`High transaction velocity detected: ${velocityCheck.reason}`);
    }

    // Pattern analysis
    const patternCheck = await this.analyzeFraudPatterns(request);
    if (patternCheck.suspicious) {
      result.warnings.push(`Suspicious pattern detected: ${patternCheck.reason}`);
    }

    // Duplicate transaction check
    const duplicateCheck = await this.checkDuplicateTransaction(request);
    if (duplicateCheck.isDuplicate) {
      result.errors.push(`Duplicate transaction detected: ${duplicateCheck.originalId}`);
    }

    // Blacklist check
    const blacklistCheck = await this.checkBlacklist(request);
    if (blacklistCheck.isBlacklisted) {
      result.errors.push(`Blacklisted entity detected: ${blacklistCheck.entity}`);
    }

    return result;
  }

  /**
   * Validate accounts
   */
  private async validateAccounts(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // From account validation
    const fromAccountValid = await this.validateAccount(request.fromAccount);
    if (!fromAccountValid.isValid) {
      result.errors.push(`Invalid from account: ${fromAccountValid.reason}`);
    }

    // To account validation
    const toAccountValid = await this.validateAccount(request.toAccount);
    if (!toAccountValid.isValid) {
      result.errors.push(`Invalid to account: ${toAccountValid.reason}`);
    }

    // Balance check
    const balanceCheck = await this.checkAccountBalance(request.fromAccount, request.amount);
    if (!balanceCheck.sufficient) {
      result.errors.push(`Insufficient funds: available ${balanceCheck.available}, required ${request.amount}`);
    }

    // Account status check
    const statusCheck = await this.checkAccountStatus(request.fromAccount);
    if (!statusCheck.active) {
      result.errors.push(`Account not active: ${statusCheck.status}`);
    }

    return result;
  }

  /**
   * Validate amount
   */
  private async validateAmount(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Positive amount check
    if (request.amount <= 0) {
      result.errors.push('Transaction amount must be positive');
    }

    // Decimal precision check
    const decimalPlaces = (request.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 8) {
      result.errors.push('Too many decimal places in amount');
    }

    // Large amount warning
    if (request.amount > 1000000) {
      result.warnings.push('Large transaction amount');
    }

    // Unusual amount pattern
    if (this.isUnusualAmount(request.amount)) {
      result.warnings.push('Unusual amount pattern detected');
    }

    return result;
  }

  /**
   * Validate currency
   */
  private async validateCurrency(request: TransactionRequest): Promise<any> {
    const result = { errors: [] as string[], warnings: [] as string[] };

    // Supported currency check
    const supportedCurrencies = ['USD', 'EUR', 'BTC', 'ETH', 'NOCK'];
    if (!supportedCurrencies.includes(request.currency)) {
      result.errors.push(`Unsupported currency: ${request.currency}`);
    }

    // Currency format check
    if (!/^[A-Z]{3,4}$/.test(request.currency)) {
      result.errors.push('Invalid currency format');
    }

    // Currency availability check
    const availabilityCheck = await this.checkCurrencyAvailability(request.currency);
    if (!availabilityCheck.available) {
      result.errors.push(`Currency not available: ${availabilityCheck.reason}`);
    }

    return result;
  }

  // Helper methods
  private mergeValidationResults(target: any, source: any): void {
    if (source.errors) target.errors.push(...source.errors);
    if (source.warnings) target.warnings.push(...source.warnings);
  }

  private determineRecommendedAction(result: any): string {
    if (result.errors.length > 0) return 'reject';
    if (result.riskScore > 80) return 'manual_review';
    if (result.warnings.length > 3) return 'enhanced_monitoring';
    return 'proceed';
  }

  private logValidationResult(request: TransactionRequest, result: any): void {
    const logEntry = {
      transactionId: request.id,
      timestamp: Date.now(),
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      riskScore: result.riskScore,
      recommendedAction: result.recommendedAction
    };

    this.validationHistory.push(logEntry);
    
    // Keep only last 1000 entries
    if (this.validationHistory.length > 1000) {
      this.validationHistory = this.validationHistory.slice(-1000);
    }
  }

  private initializeValidationRules(): void {
    // Payment rules
    this.validationRules.set('payment', {
      minAmount: 0.01,
      maxAmount: 1000000,
      businessHoursOnly: false,
      requirePurpose: false
    });

    // Transfer rules
    this.validationRules.set('transfer', {
      minAmount: 0.01,
      maxAmount: 500000,
      businessHoursOnly: false,
      requirePurpose: false
    });

    // Withdrawal rules
    this.validationRules.set('withdrawal', {
      minAmount: 10,
      maxAmount: 100000,
      businessHoursOnly: true,
      requirePurpose: true
    });

    // Investment rules
    this.validationRules.set('investment', {
      minAmount: 1000,
      maxAmount: 10000000,
      businessHoursOnly: true,
      requirePurpose: true
    });
  }

  private initializeRiskThresholds(): void {
    this.riskThresholds.set('payment', 50);
    this.riskThresholds.set('transfer', 40);
    this.riskThresholds.set('withdrawal', 60);
    this.riskThresholds.set('deposit', 30);
    this.riskThresholds.set('investment', 70);
  }

  private initializeComplianceRules(): void {
    // Initialize compliance rules for different transaction types
    console.log('🔒 Initializing compliance rules');
  }

  private startValidationMonitoring(): void {
    setInterval(() => {
      this.generateValidationReport();
    }, 300000); // Every 5 minutes
  }

  private generateValidationReport(): void {
    const recentValidations = this.validationHistory.slice(-100);
    const successRate = (recentValidations.filter(v => v.isValid).length / recentValidations.length) * 100;
    const avgRiskScore = recentValidations.reduce((sum, v) => sum + v.riskScore, 0) / recentValidations.length;
    
    console.log(`📊 Validation Report - Success Rate: ${successRate.toFixed(1)}%, Avg Risk Score: ${avgRiskScore.toFixed(1)}`);
  }

  // Additional helper methods (placeholder implementations)
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 9 && hour <= 17;
  }

  private async validateComplianceRequirement(requirement: ComplianceRequirement): Promise<boolean> {
    return requirement.status === 'approved';
  }

  private async checkRegulatoryCompliance(request: TransactionRequest): Promise<{ isCompliant: boolean; reason?: string }> {
    return { isCompliant: true };
  }

  private async performAMLCheck(request: TransactionRequest): Promise<{ passed: boolean; reason?: string }> {
    return { passed: true };
  }

  private calculateAmountRisk(amount: number): number {
    if (amount > 100000) return 30;
    if (amount > 10000) return 15;
    if (amount > 1000) return 5;
    return 0;
  }

  private async calculateAccountRisk(fromAccount: string, toAccount: string): Promise<number> {
    return 10; // Placeholder
  }

  private async calculatePatternRisk(request: TransactionRequest): Promise<number> {
    return 5; // Placeholder
  }

  private async calculateGeographicalRisk(request: TransactionRequest): Promise<number> {
    return 5; // Placeholder
  }

  private calculateTimeRisk(timestamp: number): number {
    const now = Date.now();
    const hour = new Date(timestamp).getHours();
    
    // Higher risk for transactions outside business hours
    if (hour < 6 || hour > 22) return 10;
    return 0;
  }

  private async checkTransactionVelocity(request: TransactionRequest): Promise<{ suspicious: boolean; reason?: string }> {
    return { suspicious: false };
  }

  private async analyzeFraudPatterns(request: TransactionRequest): Promise<{ suspicious: boolean; reason?: string }> {
    return { suspicious: false };
  }

  private async checkDuplicateTransaction(request: TransactionRequest): Promise<{ isDuplicate: boolean; originalId?: string }> {
    return { isDuplicate: false };
  }

  private async checkBlacklist(request: TransactionRequest): Promise<{ isBlacklisted: boolean; entity?: string }> {
    return { isBlacklisted: false };
  }

  private async validateAccount(accountId: string): Promise<{ isValid: boolean; reason?: string }> {
    return { isValid: true };
  }

  private async checkAccountBalance(accountId: string, amount: number): Promise<{ sufficient: boolean; available: number }> {
    return { sufficient: true, available: 1000000 };
  }

  private async checkAccountStatus(accountId: string): Promise<{ active: boolean; status: string }> {
    return { active: true, status: 'active' };
  }

  private isUnusualAmount(amount: number): boolean {
    // Check for round numbers or suspicious patterns
    return amount % 10000 === 0 && amount > 50000;
  }

  private async checkCurrencyAvailability(currency: string): Promise<{ available: boolean; reason?: string }> {
    return { available: true };
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): any {
    const recent = this.validationHistory.slice(-100);
    const total = recent.length;
    const valid = recent.filter(v => v.isValid).length;
    const avgRiskScore = recent.reduce((sum, v) => sum + v.riskScore, 0) / total;
    
    return {
      totalValidations: total,
      successRate: (valid / total) * 100,
      averageRiskScore: avgRiskScore,
      recentValidations: recent.slice(-10)
    };
  }
}