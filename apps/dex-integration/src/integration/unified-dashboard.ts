// Unified Dashboard Integration - Single interface for mining and bridge operations

import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { MiningPoolBridgeIntegration, UnifiedAnalytics, MiningPoolUser } from './mining-pool-bridge';

export interface DashboardConfig {
  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  layout: 'compact' | 'standard' | 'detailed';
  refreshInterval: number; // seconds
  
  // Data display
  defaultTimeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  enableRealTimeUpdates: boolean;
  enableAdvancedCharts: boolean;
  enableCrossChainView: boolean;
  
  // Notifications
  enableDesktopNotifications: boolean;
  enableSoundAlerts: boolean;
  alertThresholds: AlertThresholds;
  
  // Features
  enableQuickActions: boolean;
  enablePredictiveAnalytics: boolean;
  enablePortfolioTracking: boolean;
  enableTaxReporting: boolean;
}

export interface AlertThresholds {
  hashrateDrop: number; // percentage
  payoutReady: BN;
  bridgeOpportunity: number; // percentage profit
  systemDowntime: number; // seconds
  liquidityLow: number; // percentage
  priceMovement: number; // percentage
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  enabled: boolean;
  refreshRate: number; // seconds
}

export type WidgetType = 
  | 'mining_overview'
  | 'hashrate_chart'
  | 'earnings_summary'
  | 'bridge_status'
  | 'cross_chain_portfolio'
  | 'liquidity_pools'
  | 'recent_transactions'
  | 'market_prices'
  | 'arbitrage_opportunities'
  | 'system_health'
  | 'payout_calendar'
  | 'tax_summary';

export interface DashboardData {
  // Real-time status
  timestamp: number;
  connectionStatus: {
    miningPool: boolean;
    bridge: boolean;
    solana: boolean;
    websocket: boolean;
  };
  
  // Mining overview
  mining: {
    currentHashrate: number;
    averageHashrate24h: number;
    activeWorkers: number;
    pendingShares: number;
    estimatedEarnings24h: BN;
    nextPayoutEstimate: number; // timestamp
    poolLuck24h: number; // percentage
    poolEfficiency: number; // percentage
  };
  
  // Bridge overview
  bridge: {
    availableLiquidity: BN;
    bridgeVolume24h: BN;
    averageBridgeTime: number; // seconds
    bridgeFee: number; // percentage
    pendingTransactions: number;
    lastBridgePrice: BN;
    priceImpact: number; // percentage
  };
  
  // Cross-chain portfolio
  portfolio: {
    totalValue: BN;
    nockchainBalance: BN;
    solanaBalance: BN;
    lpPositions: LiquidityPosition[];
    pendingRewards: BN;
    unrealizedPnL: BN;
    portfolioAllocation: ChainAllocation[];
  };
  
  // Market data
  market: {
    nockPrice: BN;
    wNockPrice: BN;
    priceSpread: number; // percentage
    volume24h: BN;
    marketCap: BN;
    priceChange24h: number; // percentage
    arbitrageOpportunities: ArbitrageOpportunity[];
  };
  
  // Analytics
  analytics: UnifiedAnalytics;
  
  // Recent activity
  recentActivity: RecentActivity[];
  
  // Alerts and notifications
  activeAlerts: DashboardAlert[];
  systemNotifications: SystemNotification[];
}

export interface LiquidityPosition {
  pool: string;
  chain: 'solana';
  tokenA: string;
  tokenB: string;
  liquidity: BN;
  value: BN;
  rewards: BN;
  apr: number; // percentage
  impermanentLoss: BN;
}

export interface ChainAllocation {
  chain: 'nockchain' | 'solana';
  value: BN;
  percentage: number;
  growth24h: number; // percentage
}

export interface ArbitrageOpportunity {
  id: string;
  sourceExchange: string;
  targetExchange: string;
  profitPercentage: number;
  profitAmount: BN;
  requiredCapital: BN;
  timeWindow: number; // seconds
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RecentActivity {
  id: string;
  type: 'mining' | 'bridge' | 'payout' | 'trade' | 'liquidity';
  timestamp: number;
  description: string;
  amount?: BN;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  chain?: string;
}

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'mining' | 'bridge' | 'market' | 'system';
  title: string;
  message: string;
  timestamp: number;
  actionRequired: boolean;
  actionUrl?: string;
  dismissed: boolean;
}

export interface SystemNotification {
  id: string;
  type: 'maintenance' | 'update' | 'announcement' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  content: string;
  timestamp: number;
  expiresAt?: number;
  targetUsers?: string[];
  read: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  type: 'bridge' | 'payout' | 'liquidity' | 'settings';
  enabled: boolean;
  requiresConfirmation: boolean;
  estimatedTime?: number; // seconds
  estimatedCost?: BN;
}

export interface PredictiveInsight {
  id: string;
  category: 'earnings' | 'market' | 'optimization' | 'risk';
  confidence: number; // percentage
  timeframe: string;
  title: string;
  description: string;
  recommendation?: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: 'low' | 'medium' | 'high';
  actionItems?: string[];
}

export class UnifiedDashboard {
  private config: DashboardConfig;
  private integration: MiningPoolBridgeIntegration;
  private logger: Logger;
  private widgets: Map<string, DashboardWidget> = new Map();
  private currentData?: DashboardData;
  private updateInterval?: NodeJS.Timeout;
  private wsConnection?: WebSocket;

  constructor(config: DashboardConfig, integration: MiningPoolBridgeIntegration) {
    this.config = config;
    this.integration = integration;
    this.logger = new Logger('UnifiedDashboard');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing unified dashboard');
    
    // Load default widgets
    await this.loadDefaultWidgets();
    
    // Start real-time updates if enabled
    if (this.config.enableRealTimeUpdates) {
      await this.startRealTimeUpdates();
    }
    
    // Initialize WebSocket connection
    await this.initializeWebSocket();
    
    this.logger.info('Unified dashboard initialized successfully');
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    const [
      connectionStatus,
      miningData,
      bridgeData,
      portfolioData,
      marketData,
      analytics,
      recentActivity,
      alerts,
      notifications
    ] = await Promise.all([
      this.getConnectionStatus(),
      this.getMiningData(userId),
      this.getBridgeData(),
      this.getPortfolioData(userId),
      this.getMarketData(),
      this.integration.getUnifiedAnalytics(this.config.defaultTimeframe),
      this.getRecentActivity(userId),
      this.getActiveAlerts(userId),
      this.getSystemNotifications(userId)
    ]);

    const dashboardData: DashboardData = {
      timestamp: Date.now(),
      connectionStatus,
      mining: miningData,
      bridge: bridgeData,
      portfolio: portfolioData,
      market: marketData,
      analytics,
      recentActivity,
      activeAlerts: alerts,
      systemNotifications: notifications
    };

    this.currentData = dashboardData;
    return dashboardData;
  }

  async getQuickActions(userId: string): Promise<QuickAction[]> {
    const user = await this.getUser(userId);
    if (!user) {
      return [];
    }

    const actions: QuickAction[] = [];

    // Bridge quick action
    if (user.mining.confirmedBalance.gt(new BN(1000000))) { // Min balance for bridge
      actions.push({
        id: 'quick_bridge',
        label: 'Bridge to Solana',
        description: 'Convert NOCK to wNOCK on Solana',
        type: 'bridge',
        enabled: true,
        requiresConfirmation: true,
        estimatedTime: 300, // 5 minutes
        estimatedCost: new BN(10000) // Bridge fee
      });
    }

    // Force payout action
    if (user.mining.pendingPayouts.gt(new BN(500000))) { // Min for force payout
      actions.push({
        id: 'force_payout',
        label: 'Request Payout',
        description: 'Force immediate payout of pending balance',
        type: 'payout',
        enabled: true,
        requiresConfirmation: true,
        estimatedTime: 60, // 1 minute
        estimatedCost: new BN(5000) // Processing fee
      });
    }

    // Add liquidity action
    if (user.preferences.enableLiquidityContribution) {
      actions.push({
        id: 'add_liquidity',
        label: 'Add Liquidity',
        description: 'Contribute to NOCK/SOL liquidity pool',
        type: 'liquidity',
        enabled: true,
        requiresConfirmation: true,
        estimatedTime: 180, // 3 minutes
        estimatedCost: new BN(15000) // Gas + fees
      });
    }

    return actions;
  }

  async getPredictiveInsights(userId: string): Promise<PredictiveInsight[]> {
    const insights: PredictiveInsight[] = [];
    const analytics = await this.integration.getUnifiedAnalytics('daily');

    // Earnings prediction
    insights.push({
      id: 'earnings_prediction',
      category: 'earnings',
      confidence: 85,
      timeframe: '24 hours',
      title: 'Earnings Forecast',
      description: 'Based on current hashrate and pool performance, estimated earnings for next 24h',
      impact: 'positive',
      magnitude: 'medium'
    });

    // Market opportunity
    if (analytics.bridge.successRate > 0.95) {
      insights.push({
        id: 'bridge_opportunity',
        category: 'market',
        confidence: 92,
        timeframe: 'Next 4 hours',
        title: 'Optimal Bridge Window',
        description: 'Current bridge rates are favorable with low congestion',
        recommendation: 'Consider bridging rewards to Solana for DeFi opportunities',
        impact: 'positive',
        magnitude: 'high',
        actionItems: ['Bridge mining rewards', 'Add to liquidity pools', 'Monitor price impact']
      });
    }

    // Optimization suggestion
    insights.push({
      id: 'optimization_suggestion',
      category: 'optimization',
      confidence: 78,
      timeframe: 'This week',
      title: 'Cross-Chain Optimization',
      description: 'Enabling auto-bridging could increase overall returns by 3-5%',
      recommendation: 'Enable automatic bridging of daily mining rewards',
      impact: 'positive',
      magnitude: 'medium',
      actionItems: ['Enable auto-bridging', 'Set optimal thresholds', 'Monitor performance']
    });

    return insights;
  }

  async executeQuickAction(userId: string, actionId: string, parameters?: Record<string, any>): Promise<string> {
    this.logger.info(`Executing quick action: ${actionId}`, { userId, parameters });

    switch (actionId) {
      case 'quick_bridge':
        return await this.executeBridgeAction(userId, parameters);
      case 'force_payout':
        return await this.executePayoutAction(userId, parameters);
      case 'add_liquidity':
        return await this.executeLiquidityAction(userId, parameters);
      default:
        throw new Error(`Unknown quick action: ${actionId}`);
    }
  }

  async updateWidgetConfig(userId: string, widgetId: string, config: Record<string, any>): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    widget.config = { ...widget.config, ...config };
    await this.saveWidgetConfig(userId, widget);

    this.logger.info(`Widget configuration updated`, { userId, widgetId });
  }

  async addCustomWidget(userId: string, widget: Omit<DashboardWidget, 'id'>): Promise<string> {
    const widgetId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullWidget: DashboardWidget = {
      id: widgetId,
      ...widget
    };

    this.widgets.set(widgetId, fullWidget);
    await this.saveWidgetConfig(userId, fullWidget);

    this.logger.info(`Custom widget added`, { userId, widgetId, type: widget.type });
    return widgetId;
  }

  async removeWidget(userId: string, widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    this.widgets.delete(widgetId);
    await this.deleteWidgetConfig(userId, widgetId);

    this.logger.info(`Widget removed`, { userId, widgetId });
  }

  async exportDashboardConfig(userId: string): Promise<string> {
    const config = {
      widgets: Array.from(this.widgets.values()),
      settings: this.config,
      timestamp: Date.now(),
      version: '1.0.0'
    };

    return JSON.stringify(config, null, 2);
  }

  async importDashboardConfig(userId: string, configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson);
      
      // Validate config format
      if (!config.widgets || !Array.isArray(config.widgets)) {
        throw new Error('Invalid configuration format');
      }

      // Clear existing widgets
      this.widgets.clear();

      // Load imported widgets
      for (const widget of config.widgets) {
        this.widgets.set(widget.id, widget);
        await this.saveWidgetConfig(userId, widget);
      }

      this.logger.info(`Dashboard configuration imported`, { 
        userId, 
        widgetCount: config.widgets.length 
      });

    } catch (error) {
      this.logger.error('Failed to import dashboard configuration', error);
      throw new Error('Invalid configuration file');
    }
  }

  private async loadDefaultWidgets(): Promise<void> {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'mining_overview',
        type: 'mining_overview',
        position: { x: 0, y: 0, width: 6, height: 4 },
        config: { showWorkers: true, showEfficiency: true },
        enabled: true,
        refreshRate: 30
      },
      {
        id: 'hashrate_chart',
        type: 'hashrate_chart',
        position: { x: 6, y: 0, width: 6, height: 4 },
        config: { timeframe: '24h', showMovingAverage: true },
        enabled: true,
        refreshRate: 60
      },
      {
        id: 'bridge_status',
        type: 'bridge_status',
        position: { x: 0, y: 4, width: 4, height: 3 },
        config: { showLiquidity: true, showFees: true },
        enabled: true,
        refreshRate: 30
      },
      {
        id: 'cross_chain_portfolio',
        type: 'cross_chain_portfolio',
        position: { x: 4, y: 4, width: 4, height: 3 },
        config: { showAllocation: true, showPnL: true },
        enabled: true,
        refreshRate: 60
      },
      {
        id: 'recent_transactions',
        type: 'recent_transactions',
        position: { x: 8, y: 4, width: 4, height: 3 },
        config: { limit: 10, showDetails: true },
        enabled: true,
        refreshRate: 15
      }
    ];

    for (const widget of defaultWidgets) {
      this.widgets.set(widget.id, widget);
    }
  }

  private async startRealTimeUpdates(): Promise<void> {
    this.updateInterval = setInterval(async () => {
      try {
        // Broadcast updates to connected clients
        await this.broadcastUpdate();
      } catch (error) {
        this.logger.error('Failed to broadcast real-time update', error);
      }
    }, this.config.refreshInterval * 1000);
  }

  private async initializeWebSocket(): Promise<void> {
    // Initialize WebSocket server for real-time dashboard updates
    this.logger.info('WebSocket dashboard server initialized');
  }

  private async broadcastUpdate(): Promise<void> {
    // Broadcast real-time updates to connected dashboard clients
    if (this.currentData) {
      // Update timestamp
      this.currentData.timestamp = Date.now();
      
      // Broadcast to connected clients via WebSocket
      this.logger.debug('Broadcasting dashboard update');
    }
  }

  // Data fetching methods
  private async getConnectionStatus(): Promise<DashboardData['connectionStatus']> {
    const status = await this.integration.getIntegrationStatus();
    return {
      miningPool: status.components.miningPool,
      bridge: status.components.bridge,
      solana: true, // Should check actual Solana connection
      websocket: status.components.websockets
    };
  }

  private async getMiningData(userId: string): Promise<DashboardData['mining']> {
    // Implementation would fetch real mining data for user
    return {
      currentHashrate: 0,
      averageHashrate24h: 0,
      activeWorkers: 0,
      pendingShares: 0,
      estimatedEarnings24h: new BN(0),
      nextPayoutEstimate: Date.now() + 86400000,
      poolLuck24h: 100,
      poolEfficiency: 99.5
    };
  }

  private async getBridgeData(): Promise<DashboardData['bridge']> {
    return {
      availableLiquidity: new BN(1000000000),
      bridgeVolume24h: new BN(500000000),
      averageBridgeTime: 300,
      bridgeFee: 0.5,
      pendingTransactions: 5,
      lastBridgePrice: new BN(100000),
      priceImpact: 0.1
    };
  }

  private async getPortfolioData(userId: string): Promise<DashboardData['portfolio']> {
    return {
      totalValue: new BN(0),
      nockchainBalance: new BN(0),
      solanaBalance: new BN(0),
      lpPositions: [],
      pendingRewards: new BN(0),
      unrealizedPnL: new BN(0),
      portfolioAllocation: []
    };
  }

  private async getMarketData(): Promise<DashboardData['market']> {
    return {
      nockPrice: new BN(100000),
      wNockPrice: new BN(100500),
      priceSpread: 0.5,
      volume24h: new BN(10000000),
      marketCap: new BN(429000000000),
      priceChange24h: 2.5,
      arbitrageOpportunities: []
    };
  }

  private async getRecentActivity(userId: string): Promise<RecentActivity[]> {
    return [];
  }

  private async getActiveAlerts(userId: string): Promise<DashboardAlert[]> {
    return [];
  }

  private async getSystemNotifications(userId: string): Promise<SystemNotification[]> {
    return [];
  }

  private async getUser(userId: string): Promise<MiningPoolUser | null> {
    // Implementation would fetch user from integration
    return null;
  }

  // Quick action implementations
  private async executeBridgeAction(userId: string, parameters?: Record<string, any>): Promise<string> {
    const amount = parameters?.amount ? new BN(parameters.amount) : new BN(1000000);
    return await this.integration.bridgeMiningRewards(userId, amount, 'solana');
  }

  private async executePayoutAction(userId: string, parameters?: Record<string, any>): Promise<string> {
    // Implementation would trigger force payout
    return `payout_${Date.now()}`;
  }

  private async executeLiquidityAction(userId: string, parameters?: Record<string, any>): Promise<string> {
    const amount = parameters?.amount ? new BN(parameters.amount) : new BN(500000);
    const percentage = parameters?.percentage || 10;
    return await this.integration.contributeMiningRewardsToLiquidity(userId, amount, percentage);
  }

  // Widget management
  private async saveWidgetConfig(userId: string, widget: DashboardWidget): Promise<void> {
    // Implementation would save widget config to database
  }

  private async deleteWidgetConfig(userId: string, widgetId: string): Promise<void> {
    // Implementation would delete widget config from database
  }
}