/**
 * Type definitions for Data Analytics system
 */

export namespace AnalyticsTypes {
  
  // Core Analytics Interfaces
  export interface AnalyticsThresholds {
    minimumDataQuality: number;
    minimumAccuracy: number;
    minimumPerformance: number;
    maximumLatency: number;
    maximumErrorRate: number;
  }

  export interface AnalyticsContext {
    type: 'insight' | 'prediction' | 'recommendation' | 'alert' | 'optimization';
    data: any;
    context: string;
    urgency?: 'low' | 'medium' | 'high';
    source?: string;
  }

  export interface AnalyticsTrends {
    dataVolumeTrend: 'increasing' | 'decreasing' | 'stable';
    accuracyTrend: 'improving' | 'degrading' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
    insightTrend: 'increasing' | 'decreasing' | 'stable';
  }

  export interface AnalyticsStatus {
    isRunning: boolean;
    metrics: any;
    recentDecisions: any[];
    systemHealth: SystemHealth;
    autonomousMode: boolean;
  }

  export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'critical';
    dataProcessing: string;
    modeling: string;
    visualization: string;
    monitoring: string;
  }

  // Data Processing Types
  export interface ProcessedData {
    batchId: string;
    items: any[];
    timestamp: number;
    metrics: any;
  }

  export interface DataValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }

  export interface DataTransformation {
    id: string;
    type: string;
    input: any;
    output: any;
    timestamp: number;
  }

  export interface DataQualityMetrics {
    overallQuality: number;
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    trends: {
      qualityTrend: string;
      volumeTrend: string;
    };
  }

  // Machine Learning Types
  export interface Prediction {
    id: string;
    type: string;
    model: string;
    input: any;
    output: any;
    confidence: number;
    timestamp: number;
    metadata?: any;
  }

  export interface Anomaly {
    id: string;
    type: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    data: any;
    confidence: number;
    timestamp: number;
    source: string;
  }

  export interface MLModel {
    id: string;
    name: string;
    type: string;
    version: string;
    accuracy: number;
    status: 'training' | 'deployed' | 'deprecated';
    createdAt: number;
    updatedAt: number;
  }

  // Analytics Reporting Types
  export type ReportType = 'executive' | 'operational' | 'financial' | 'performance' | 'risk' | 'compliance';

  export interface AnalyticsReport {
    id: string;
    type: ReportType;
    metrics: any;
    insights: Insight[];
    predictions: Prediction[];
    recommendations: Recommendation[];
    visualizations?: any;
    timestamp: Date;
  }

  export interface Insight {
    type: string;
    message: string;
    confidence: number;
    impact?: 'low' | 'medium' | 'high';
    data?: any;
  }

  export interface Recommendation {
    id: string;
    type: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    effort: string;
    confidence: number;
    actions: string[];
  }

  // Performance Monitoring Types
  export interface PerformanceAlert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    data: any;
    timestamp: number;
  }

  export interface PerformanceMetrics {
    processingLatency: number;
    throughput: number;
    errorRate: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
    modelPerformance: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
    };
  }

  // Expert Integration Types
  export interface ExpertGuidance {
    type: string;
    recommendation: 'implement' | 'monitor' | 'escalate';
    reasoning: string;
    confidence: number;
    actions: string[];
    cryptoSpecific?: {
      protocolAnalysis: any;
      riskAssessment: any;
      complianceGuidance: any;
    };
  }

  // Visualization Types
  export interface Chart {
    id: string;
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'gauge';
    title: string;
    data: any;
    config: any;
    timestamp: number;
  }

  export interface Dashboard {
    id: string;
    name: string;
    description: string;
    charts: Chart[];
    layout: any;
    refreshRate: number;
    permissions: string[];
  }

  // Agent Coordination Types
  export interface AgentCoordination {
    agentId: string;
    agentType: string;
    requestType: string;
    data: any;
    status: 'pending' | 'completed' | 'failed';
    response?: any;
    timestamp: number;
  }

  // Financial Analytics Types
  export interface FinancialMetrics {
    revenue: number;
    expenses: number;
    profit: number;
    margins: number;
    growth: number;
    efficiency: number;
    risk: number;
    period: {
      start: number;
      end: number;
    };
  }

  export interface CustomerMetrics {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    churnRate: number;
    satisfactionScore: number;
    lifetimeValue: number;
    acquisitionCost: number;
    retentionRate: number;
  }

  export interface OperationalMetrics {
    uptime: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
    efficiency: number;
    capacity: number;
    utilization: number;
    availability: number;
  }

  // Risk Analytics Types
  export interface RiskMetric {
    type: string;
    level: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    description: string;
    mitigation: string[];
    timestamp: number;
  }

  export interface RiskAssessment {
    overallRisk: number;
    riskCategories: {
      operational: RiskMetric;
      financial: RiskMetric;
      compliance: RiskMetric;
      technical: RiskMetric;
      market: RiskMetric;
    };
    trends: {
      direction: 'increasing' | 'decreasing' | 'stable';
      rate: number;
    };
    recommendations: string[];
  }

  // Crypto-specific Types
  export interface CryptoAnalytics {
    tokenMetrics: {
      price: number;
      volume: number;
      marketCap: number;
      circulatingSupply: number;
      totalSupply: number;
    };
    defiMetrics: {
      totalValueLocked: number;
      yield: number;
      utilizationRate: number;
      liquidityDepth: number;
    };
    networkMetrics: {
      hashRate: number;
      difficulty: number;
      blockTime: number;
      transactionCount: number;
      fees: number;
    };
    governanceMetrics: {
      proposalCount: number;
      participationRate: number;
      votingPower: number;
    };
  }

  export interface MiningAnalytics {
    hashRate: number;
    difficulty: number;
    blockReward: number;
    efficiency: number;
    profitability: number;
    networkSecurity: number;
    distributionMetrics: {
      poolConcentration: number;
      geographicDistribution: any;
      hardwareDistribution: any;
    };
  }

  // Alert and Notification Types
  export interface Alert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    data: any;
    actions: string[];
    status: 'active' | 'acknowledged' | 'resolved';
    timestamp: number;
    resolvedAt?: number;
  }

  export interface Notification {
    id: string;
    recipient: string;
    channel: 'email' | 'slack' | 'webhook' | 'dashboard';
    alert: Alert;
    delivered: boolean;
    timestamp: number;
  }

  // Configuration Types
  export interface AnalyticsConfig {
    dataProcessing: {
      batchSize: number;
      processingInterval: number;
      qualityThresholds: DataQualityMetrics;
    };
    machineLearning: {
      trainingInterval: number;
      retrainThreshold: number;
      modelSelection: string[];
    };
    monitoring: {
      alertThresholds: any;
      dashboardRefreshRate: number;
      reportingSchedule: any;
    };
    integration: {
      expertPromptEnabled: boolean;
      agentCoordinationEnabled: boolean;
      cryptoAnalyticsEnabled: boolean;
    };
  }

  // API Response Types
  export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
    requestId: string;
  }

  export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
}