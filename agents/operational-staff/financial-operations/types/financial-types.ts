/**
 * Financial Operations Types
 * Type definitions for the Autonomous Financial Operations Manager
 */

export interface FinancialOperationsConfig {
  autonomousExecution: boolean;
  complianceLevel: 'strict' | 'standard' | 'relaxed';
  riskTolerance: 'low' | 'medium' | 'high';
  optimizationStrategy: 'conservative' | 'balanced' | 'aggressive';
  reportingFrequency: 'real-time' | 'hourly' | 'daily';
}

export interface TransactionRequest {
  id: string;
  type: 'payment' | 'transfer' | 'investment' | 'withdrawal' | 'deposit';
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  purpose: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  compliance: ComplianceRequirement[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface ComplianceRequirement {
  type: 'kyc' | 'aml' | 'regulatory' | 'audit' | 'tax';
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  requirements: string[];
  documentation: string[];
  expiryDate?: number;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'escrow' | 'liquidity' | 'operational';
  balance: number;
  currency: string;
  provider: string;
  apiEndpoint: string;
  lastReconciled: number;
  status: 'active' | 'frozen' | 'closed';
  metadata: Record<string, any>;
}

export interface ReconciliationResult {
  accountId: string;
  expectedBalance: number;
  actualBalance: number;
  discrepancy: number;
  status: 'matched' | 'discrepancy' | 'error';
  transactions: TransactionRecord[];
  timestamp: number;
  resolution?: string;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: number;
  blockHash?: string;
  transactionHash?: string;
  gasUsed?: number;
  fee: number;
  metadata: Record<string, any>;
}

export interface FinancialReport {
  id: string;
  type: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'regulatory' | 'tax' | 'audit';
  period: {
    start: number;
    end: number;
  };
  data: Record<string, any>;
  compliance: ComplianceRequirement[];
  generated: number;
  status: 'draft' | 'review' | 'approved' | 'submitted';
  recipients: string[];
}

export interface LiquidityPool {
  id: string;
  name: string;
  protocol: string;
  tokenA: string;
  tokenB: string;
  liquidity: number;
  apr: number;
  volume24h: number;
  fees: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'paused';
}

export interface YieldStrategy {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  expectedYield: number;
  riskLevel: 'low' | 'medium' | 'high';
  minimumAmount: number;
  lockupPeriod: number;
  autoCompound: boolean;
  status: 'active' | 'inactive' | 'paused';
}

export interface RiskMetric {
  type: 'market' | 'liquidity' | 'credit' | 'operational' | 'regulatory';
  score: number; // 0-100
  threshold: number;
  status: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendations: string[];
  lastUpdated: number;
}

export interface FinancialAlert {
  id: string;
  type: 'threshold_breach' | 'compliance_issue' | 'system_error' | 'fraud_detected' | 'optimization_opportunity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data: Record<string, any>;
  timestamp: number;
  status: 'active' | 'acknowledged' | 'resolved';
  actions: string[];
}

export interface OptimizationResult {
  type: 'liquidity' | 'yield' | 'cost' | 'revenue' | 'risk';
  currentValue: number;
  optimizedValue: number;
  improvement: number;
  strategy: string;
  recommendations: string[];
  implementationSteps: string[];
  estimatedImpact: number;
  timestamp: number;
}

export interface ExpertPromptIntegration {
  promptType: 'financial_analysis' | 'risk_assessment' | 'compliance_check' | 'optimization_strategy' | 'market_analysis';
  context: Record<string, any>;
  response: string;
  confidence: number;
  timestamp: number;
  implementationStatus: 'pending' | 'implemented' | 'rejected';
}

export interface AgentCoordination {
  agentId: string;
  agentType: 'customer_success' | 'technical_support' | 'community_management' | 'data_analytics' | 'process_automation';
  requestType: 'payment_processing' | 'billing_inquiry' | 'financial_data' | 'compliance_check' | 'optimization_request';
  data: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  response?: any;
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  liquidity: number;
  yieldEarned: number;
  transactionVolume: number;
  averageTransactionFee: number;
  complianceScore: number;
  riskScore: number;
  optimizationScore: number;
  period: {
    start: number;
    end: number;
  };
}

export interface AutonomousExecutionConfig {
  enabled: boolean;
  transactionLimits: {
    maxSingleTransaction: number;
    maxDailyTotal: number;
    maxWeeklyTotal: number;
    maxMonthlyTotal: number;
  };
  approvalRequirements: {
    multiSigThreshold: number;
    requiredApprovers: string[];
    timeoutMinutes: number;
  };
  emergencyControls: {
    pauseThreshold: number;
    emergencyContacts: string[];
    escalationProcedures: string[];
  };
}

export interface FinancialOperationsEngine {
  processTransaction(request: TransactionRequest): Promise<TransactionRecord>;
  reconcileAccounts(accountIds: string[]): Promise<ReconciliationResult[]>;
  generateReport(type: string, period: { start: number; end: number }): Promise<FinancialReport>;
  optimizeYield(amount: number, duration: number): Promise<OptimizationResult>;
  assessRisk(portfolio: any): Promise<RiskMetric[]>;
  executeCompliance(requirements: ComplianceRequirement[]): Promise<boolean>;
  coordinateWithAgent(agentId: string, request: any): Promise<any>;
  getExpertGuidance(promptType: string, context: any): Promise<ExpertPromptIntegration>;
}