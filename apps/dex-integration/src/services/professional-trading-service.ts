// Professional trading service integrating all trading interface components

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import { YieldOptimizationService } from './yield-optimization-service';
import { TradingInterface, TradingInterfaceConfig } from '../trading/trading-interface';
import { PortfolioAnalytics, AnalyticsConfig } from '../trading/portfolio-analytics';
import { TradingDashboard, DashboardConfig } from '../trading/trading-dashboard';

export interface ProfessionalTradingServiceConfig {
  // Core service configuration
  connection: Connection;
  wallet: Keypair;
  
  // Component configurations
  tradingInterface: TradingInterfaceConfig;
  portfolioAnalytics: AnalyticsConfig;
  dashboard: DashboardConfig;
  
  // Trading service settings
  enableProfessionalFeatures: boolean;
  enableAdvancedOrders: boolean;
  enableRiskManagement: boolean;
  enableAutomatedTrading: boolean;
  maxConcurrentOrders: number;
  orderExecutionTimeout: number; // seconds
  
  // Integration settings
  integrateWithYieldOptimization: boolean;
  syncWithPortfolioOptimizer: boolean;
  enableCrossStrategyCoordination: boolean;
}

export interface TradingServiceMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: BN;
  totalFees: BN;
  averageExecutionTime: number;
  bestExecutionSavings: BN;
  portfolioValue: BN;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  uptime: number;
  lastTradeTime: number;
  activeStrategies: number;
}

export interface TradingServiceStatus {
  isRunning: boolean;
  componentsStatus: {
    tradingInterface: boolean;
    portfolioAnalytics: boolean;
    dashboard: boolean;
    yieldOptimization: boolean;
    dexAggregator: boolean;
  };
  currentMode: 'manual' | 'semi_automated' | 'fully_automated';
  riskLevel: 'low' | 'medium' | 'high';
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastError?: string;
  activeAlerts: number;
  pendingOrders: number;
}

export interface AdvancedOrderRequest {
  baseOrder: any; // Base order parameters
  conditions: OrderCondition[];
  execution: ExecutionStrategy;
  riskControls: RiskControl[];
  metadata: OrderMetadata;
}

export interface OrderCondition {
  type: 'price' | 'time' | 'volume' | 'portfolio_value' | 'risk_score' | 'market_condition';
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: any;
  additionalValue?: any; // For 'between' operator
}

export interface ExecutionStrategy {
  type: 'immediate' | 'twap' | 'vwap' | 'pov' | 'iceberg' | 'smart';
  parameters: {
    duration?: number; // For TWAP/VWAP (minutes)
    participationRate?: number; // For POV (percentage)
    sliceSize?: BN; // For iceberg orders
    maxPriceImpact?: number; // For smart execution
  };
}

export interface RiskControl {
  type: 'position_limit' | 'loss_limit' | 'exposure_limit' | 'correlation_limit';
  limit: number | BN;
  action: 'block' | 'warn' | 'reduce' | 'cancel';
}

export interface OrderMetadata {
  strategy: string;
  clientOrderId?: string;
  notes?: string;
  tags?: string[];
  urgency: 'low' | 'medium' | 'high';
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'yield_farming' | 'market_making' | 'custom';
  enabled: boolean;
  parameters: Map<string, any>;
  riskLimits: RiskControl[];
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  lastExecuted: number;
}

export class ProfessionalTradingService {
  private config: ProfessionalTradingServiceConfig;
  private logger: Logger;
  
  // Core components
  private dexAggregator: DexAggregator;
  private yieldService: YieldOptimizationService;
  private tradingInterface: TradingInterface;
  private portfolioAnalytics: PortfolioAnalytics;
  private dashboard: TradingDashboard;
  
  // Service state
  private isRunning: boolean = false;
  private metrics: TradingServiceMetrics;
  private strategies: Map<string, TradingStrategy> = new Map();
  private pendingAdvancedOrders: Map<string, AdvancedOrderRequest> = new Map();
  
  // Monitoring intervals
  private metricsUpdateInterval?: NodeJS.Timeout;
  private strategyExecutionInterval?: NodeJS.Timeout;
  private advancedOrdersInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    config: ProfessionalTradingServiceConfig,
    dexAggregator: DexAggregator,
    yieldService: YieldOptimizationService,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.dexAggregator = dexAggregator;
    this.yieldService = yieldService;

    // Initialize metrics
    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalVolume: new BN(0),
      totalFees: new BN(0),
      averageExecutionTime: 0,
      bestExecutionSavings: new BN(0),
      portfolioValue: new BN(0),
      totalReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      uptime: 0,
      lastTradeTime: 0,
      activeStrategies: 0,
    };

    // Initialize components
    this.initializeComponents();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Professional trading service already running');
      return;
    }

    this.logger.info('Starting professional trading service', {
      enableProfessionalFeatures: this.config.enableProfessionalFeatures,
      enableAdvancedOrders: this.config.enableAdvancedOrders,
      enableAutomatedTrading: this.config.enableAutomatedTrading,
      integrateWithYieldOptimization: this.config.integrateWithYieldOptimization,
    });

    try {
      // Start core components
      await this.startComponents();

      // Load and initialize trading strategies
      await this.initializeStrategies();

      // Start monitoring and execution cycles
      this.isRunning = true;
      this.metrics.uptime = Date.now();
      this.startServiceCycles();

      this.logger.info('Professional trading service started successfully', {
        portfolioValue: this.metrics.portfolioValue.toString(),
        activeStrategies: this.metrics.activeStrategies,
        systemHealth: this.getSystemHealth(),
      });

    } catch (error) {
      this.logger.error('Failed to start professional trading service', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Professional trading service not running');
      return;
    }

    this.logger.info('Stopping professional trading service');

    try {
      // Stop monitoring intervals
      if (this.metricsUpdateInterval) clearInterval(this.metricsUpdateInterval);
      if (this.strategyExecutionInterval) clearInterval(this.strategyExecutionInterval);
      if (this.advancedOrdersInterval) clearInterval(this.advancedOrdersInterval);
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

      // Cancel all pending orders
      await this.cancelAllPendingOrders();

      // Stop components
      await this.stopComponents();

      this.isRunning = false;

      // Calculate final uptime
      this.metrics.uptime = Date.now() - this.metrics.uptime;

      this.logger.info('Professional trading service stopped successfully', {
        finalPortfolioValue: this.metrics.portfolioValue.toString(),
        totalTrades: this.metrics.totalTrades,
        winRate: this.metrics.winRate,
        uptime: this.metrics.uptime,
      });

    } catch (error) {
      this.logger.error('Failed to stop professional trading service gracefully', error);
      this.isRunning = false;
    }
  }

  async placeAdvancedOrder(orderRequest: AdvancedOrderRequest): Promise<string> {
    if (!this.config.enableAdvancedOrders) {
      throw new Error('Advanced orders not enabled');
    }

    const orderId = `adv_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.info('Placing advanced order', {
      orderId,
      strategy: orderRequest.execution.type,
      conditions: orderRequest.conditions.length,
      riskControls: orderRequest.riskControls.length,
    });

    try {
      // Validate order request
      await this.validateAdvancedOrder(orderRequest);

      // Check risk controls
      await this.checkOrderRiskControls(orderRequest);

      // Store pending order
      this.pendingAdvancedOrders.set(orderId, orderRequest);

      // If conditions are already met, execute immediately
      if (await this.checkOrderConditions(orderRequest)) {
        await this.executeAdvancedOrder(orderId, orderRequest);
      }

      this.logger.info('Advanced order placed successfully', { orderId });
      return orderId;

    } catch (error) {
      this.logger.error('Failed to place advanced order', error, { orderId });
      throw error;
    }
  }

  async cancelAdvancedOrder(orderId: string): Promise<boolean> {
    const orderRequest = this.pendingAdvancedOrders.get(orderId);
    if (!orderRequest) {
      this.logger.warn('Advanced order not found', { orderId });
      return false;
    }

    this.pendingAdvancedOrders.delete(orderId);
    this.logger.info('Advanced order cancelled', { orderId });
    return true;
  }

  async addTradingStrategy(strategy: TradingStrategy): Promise<void> {
    this.strategies.set(strategy.id, strategy);
    this.metrics.activeStrategies = this.strategies.size;

    this.logger.info('Trading strategy added', {
      strategyId: strategy.id,
      name: strategy.name,
      type: strategy.type,
      enabled: strategy.enabled,
    });

    if (strategy.enabled && this.config.enableAutomatedTrading) {
      await this.executeStrategy(strategy);
    }
  }

  async removeTradingStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      this.logger.warn('Strategy not found', { strategyId });
      return;
    }

    this.strategies.delete(strategyId);
    this.metrics.activeStrategies = this.strategies.size;
    this.logger.info('Trading strategy removed', { strategyId });
  }

  async executeStrategy(strategy: TradingStrategy): Promise<void> {
    if (!strategy.enabled) {
      this.logger.debug('Strategy disabled, skipping execution', { strategyId: strategy.id });
      return;
    }

    this.logger.info('Executing trading strategy', {
      strategyId: strategy.id,
      name: strategy.name,
      type: strategy.type,
    });

    try {
      switch (strategy.type) {
        case 'momentum':
          await this.executeMomentumStrategy(strategy);
          break;
        case 'mean_reversion':
          await this.executeMeanReversionStrategy(strategy);
          break;
        case 'arbitrage':
          await this.executeArbitrageStrategy(strategy);
          break;
        case 'yield_farming':
          await this.executeYieldFarmingStrategy(strategy);
          break;
        case 'market_making':
          await this.executeMarketMakingStrategy(strategy);
          break;
        case 'custom':
          await this.executeCustomStrategy(strategy);
          break;
        default:
          this.logger.warn('Unknown strategy type', { type: strategy.type });
      }

      strategy.lastExecuted = Date.now();

    } catch (error) {
      this.logger.error('Strategy execution failed', error, { strategyId: strategy.id });
    }
  }

  getServiceStatus(): TradingServiceStatus {
    return {
      isRunning: this.isRunning,
      componentsStatus: {
        tradingInterface: this.tradingInterface.isTrading(),
        portfolioAnalytics: this.portfolioAnalytics.isTrackingActive(),
        dashboard: this.dashboard.isActive(),
        yieldOptimization: this.yieldService.getServiceStatus().isRunning,
        dexAggregator: true, // DEX aggregator doesn't have status method
      },
      currentMode: this.getCurrentTradingMode(),
      riskLevel: this.getCurrentRiskLevel(),
      systemHealth: this.getSystemHealth(),
      activeAlerts: this.dashboard.getAlerts().length,
      pendingOrders: this.tradingInterface.getActiveOrders().length + this.pendingAdvancedOrders.size,
    };
  }

  getServiceMetrics(): TradingServiceMetrics {
    return { ...this.metrics };
  }

  getStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  getPendingAdvancedOrders(): AdvancedOrderRequest[] {
    return Array.from(this.pendingAdvancedOrders.values());
  }

  async generateTradingReport(period: string): Promise<any> {
    this.logger.info('Generating comprehensive trading report', { period });

    try {
      const performanceReport = this.portfolioAnalytics.generatePerformanceReport(period);
      const tradingStats = this.portfolioAnalytics.calculateTradingStatistics();
      const chartData = this.dashboard.getChartData();
      const yieldMetrics = this.yieldService.getServiceMetrics();

      const report = {
        timestamp: Date.now(),
        period,
        summary: {
          portfolioValue: this.metrics.portfolioValue,
          totalReturn: performanceReport.portfolio.totalReturn,
          totalReturnPercent: performanceReport.portfolio.totalReturnPercent,
          sharpeRatio: performanceReport.portfolio.sharpeRatio,
          maxDrawdown: performanceReport.portfolio.maxDrawdown,
          winRate: tradingStats.winRate,
          profitFactor: tradingStats.profitFactor,
          totalTrades: this.metrics.totalTrades,
          totalVolume: this.metrics.totalVolume,
          totalFees: this.metrics.totalFees,
        },
        performance: performanceReport,
        trading: {
          statistics: tradingStats,
          strategies: this.getStrategyPerformance(),
          orderExecution: {
            averageExecutionTime: this.metrics.averageExecutionTime,
            bestExecutionSavings: this.metrics.bestExecutionSavings,
            successRate: (this.metrics.successfulTrades / this.metrics.totalTrades) * 100,
          },
        },
        yieldOptimization: yieldMetrics,
        charts: chartData,
        recommendations: await this.generateTradingRecommendations(),
      };

      this.logger.info('Trading report generated successfully', {
        reportPeriod: period,
        portfolioValue: report.summary.portfolioValue.toString(),
        totalReturn: report.summary.totalReturnPercent,
        winRate: report.summary.winRate,
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate trading report', error);
      throw error;
    }
  }

  // Private implementation methods

  private initializeComponents(): void {
    // Initialize trading interface
    this.tradingInterface = new TradingInterface(
      this.config.tradingInterface,
      this.dexAggregator,
      this.yieldService,
      this.logger
    );

    // Initialize portfolio analytics
    this.portfolioAnalytics = new PortfolioAnalytics(
      this.config.portfolioAnalytics,
      this.logger
    );

    // Initialize dashboard
    this.dashboard = new TradingDashboard(
      this.config.dashboard,
      this.tradingInterface,
      this.portfolioAnalytics,
      this.yieldService,
      this.logger
    );
  }

  private async startComponents(): Promise<void> {
    // Start components in dependency order
    await this.tradingInterface.start();
    await this.portfolioAnalytics.startTracking();
    await this.dashboard.start();

    // Start yield optimization if integration is enabled
    if (this.config.integrateWithYieldOptimization && !this.yieldService.getServiceStatus().isRunning) {
      await this.yieldService.start();
    }

    this.logger.info('All trading service components started');
  }

  private async stopComponents(): Promise<void> {
    // Stop components in reverse dependency order
    await this.dashboard.stop();
    await this.portfolioAnalytics.stopTracking();
    await this.tradingInterface.stop();

    this.logger.info('All trading service components stopped');
  }

  private async initializeStrategies(): Promise<void> {
    // Initialize default strategies if none exist
    if (this.strategies.size === 0) {
      // Add default yield farming strategy if yield optimization is enabled
      if (this.config.integrateWithYieldOptimization) {
        const yieldStrategy: TradingStrategy = {
          id: 'yield_farming_strategy',
          name: 'Automated Yield Farming',
          description: 'Automatically allocate funds to highest-yield opportunities',
          type: 'yield_farming',
          enabled: true,
          parameters: new Map([
            ['minAPY', 15],
            ['maxRisk', 5],
            ['rebalanceThreshold', 0.05],
          ]),
          riskLimits: [
            { type: 'position_limit', limit: new BN(1000000), action: 'block' },
            { type: 'loss_limit', limit: new BN(50000), action: 'warn' },
          ],
          performance: {
            totalTrades: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
          },
          lastExecuted: 0,
        };

        await this.addTradingStrategy(yieldStrategy);
      }
    }
  }

  private async validateAdvancedOrder(orderRequest: AdvancedOrderRequest): Promise<void> {
    // Validate order conditions
    if (orderRequest.conditions.length === 0) {
      throw new Error('Advanced order must have at least one condition');
    }

    // Validate execution strategy
    if (!orderRequest.execution.type) {
      throw new Error('Execution strategy type is required');
    }

    // Validate risk controls
    if (this.config.enableRiskManagement && orderRequest.riskControls.length === 0) {
      throw new Error('Risk controls are required when risk management is enabled');
    }
  }

  private async checkOrderRiskControls(orderRequest: AdvancedOrderRequest): Promise<void> {
    for (const riskControl of orderRequest.riskControls) {
      const violation = await this.checkRiskControlViolation(riskControl);
      if (violation && riskControl.action === 'block') {
        throw new Error(`Risk control violation: ${riskControl.type}`);
      }
    }
  }

  private async checkRiskControlViolation(riskControl: RiskControl): Promise<boolean> {
    const portfolio = this.tradingInterface.getPortfolio();

    switch (riskControl.type) {
      case 'position_limit':
        return portfolio.totalValue.gt(riskControl.limit as BN);
      case 'loss_limit':
        const dailyPnL = portfolio.performance.dayReturn;
        return dailyPnL < -(riskControl.limit as number);
      case 'exposure_limit':
        return portfolio.totalValue.gt(riskControl.limit as BN);
      default:
        return false;
    }
  }

  private async checkOrderConditions(orderRequest: AdvancedOrderRequest): Promise<boolean> {
    for (const condition of orderRequest.conditions) {
      if (!await this.evaluateCondition(condition)) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(condition: OrderCondition): Promise<boolean> {
    let currentValue: any;

    switch (condition.type) {
      case 'price':
        // Get current price for the token pair
        currentValue = 100; // Placeholder
        break;
      case 'time':
        currentValue = Date.now();
        break;
      case 'portfolio_value':
        currentValue = this.tradingInterface.getPortfolio().totalValue.toNumber();
        break;
      case 'risk_score':
        currentValue = this.tradingInterface.getPortfolio().riskMetrics.portfolioRisk;
        break;
      default:
        return false;
    }

    return this.compareValues(currentValue, condition.operator, condition.value, condition.additionalValue);
  }

  private compareValues(current: any, operator: string, target: any, additional?: any): boolean {
    switch (operator) {
      case 'eq': return current === target;
      case 'gt': return current > target;
      case 'lt': return current < target;
      case 'gte': return current >= target;
      case 'lte': return current <= target;
      case 'between': return current >= target && current <= additional;
      default: return false;
    }
  }

  private async executeAdvancedOrder(orderId: string, orderRequest: AdvancedOrderRequest): Promise<void> {
    this.logger.info('Executing advanced order', {
      orderId,
      strategy: orderRequest.execution.type,
    });

    try {
      switch (orderRequest.execution.type) {
        case 'immediate':
          await this.executeImmediateOrder(orderRequest.baseOrder);
          break;
        case 'twap':
          await this.executeTWAPOrder(orderRequest);
          break;
        case 'vwap':
          await this.executeVWAPOrder(orderRequest);
          break;
        case 'iceberg':
          await this.executeIcebergOrder(orderRequest);
          break;
        case 'smart':
          await this.executeSmartOrder(orderRequest);
          break;
        default:
          throw new Error(`Unknown execution strategy: ${orderRequest.execution.type}`);
      }

      // Remove from pending orders
      this.pendingAdvancedOrders.delete(orderId);

      this.logger.info('Advanced order executed successfully', { orderId });

    } catch (error) {
      this.logger.error('Advanced order execution failed', error, { orderId });
      throw error;
    }
  }

  private async executeImmediateOrder(baseOrder: any): Promise<void> {
    await this.tradingInterface.placeOrder(baseOrder);
  }

  private async executeTWAPOrder(orderRequest: AdvancedOrderRequest): Promise<void> {
    const { duration } = orderRequest.execution.parameters;
    const slices = 10; // Number of slices
    const sliceAmount = orderRequest.baseOrder.amount.divn(slices);
    const sliceInterval = (duration! * 60 * 1000) / slices; // Convert to milliseconds

    for (let i = 0; i < slices; i++) {
      const sliceOrder = {
        ...orderRequest.baseOrder,
        amount: sliceAmount,
      };

      await this.tradingInterface.placeOrder(sliceOrder);

      if (i < slices - 1) {
        await new Promise(resolve => setTimeout(resolve, sliceInterval));
      }
    }
  }

  private async executeVWAPOrder(orderRequest: AdvancedOrderRequest): Promise<void> {
    // VWAP order execution (simplified)
    await this.executeTWAPOrder(orderRequest);
  }

  private async executeIcebergOrder(orderRequest: AdvancedOrderRequest): Promise<void> {
    const { sliceSize } = orderRequest.execution.parameters;
    const totalAmount = orderRequest.baseOrder.amount;
    let remainingAmount = totalAmount;

    while (remainingAmount.gt(new BN(0))) {
      const currentSlice = BN.min(remainingAmount, sliceSize!);
      
      const sliceOrder = {
        ...orderRequest.baseOrder,
        amount: currentSlice,
      };

      await this.tradingInterface.placeOrder(sliceOrder);
      remainingAmount = remainingAmount.sub(currentSlice);

      // Wait for slice to be filled before placing next one
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  private async executeSmartOrder(orderRequest: AdvancedOrderRequest): Promise<void> {
    const { maxPriceImpact } = orderRequest.execution.parameters;
    
    // Smart execution with price impact monitoring
    const quote = await this.tradingInterface.getOptimalQuote(
      orderRequest.baseOrder.inputToken,
      orderRequest.baseOrder.outputToken,
      orderRequest.baseOrder.amount
    );

    if (quote.priceImpact <= maxPriceImpact!) {
      await this.executeImmediateOrder(orderRequest.baseOrder);
    } else {
      // Split into smaller orders
      await this.executeTWAPOrder(orderRequest);
    }
  }

  private async executeMomentumStrategy(strategy: TradingStrategy): Promise<void> {
    // Momentum strategy implementation
    this.logger.debug('Executing momentum strategy', { strategyId: strategy.id });
  }

  private async executeMeanReversionStrategy(strategy: TradingStrategy): Promise<void> {
    // Mean reversion strategy implementation
    this.logger.debug('Executing mean reversion strategy', { strategyId: strategy.id });
  }

  private async executeArbitrageStrategy(strategy: TradingStrategy): Promise<void> {
    // Find and execute arbitrage opportunities
    const opportunities = await this.dexAggregator.findArbitrageOpportunities(['SOL', 'USDC']);
    
    for (const opportunity of opportunities) {
      if (opportunity.profitBps >= 50) { // Minimum 0.5% profit
        // Execute arbitrage
        this.logger.info('Executing arbitrage opportunity', {
          profit: opportunity.profitBps,
          tokenA: opportunity.tokenA,
          tokenB: opportunity.tokenB,
        });
      }
    }
  }

  private async executeYieldFarmingStrategy(strategy: TradingStrategy): Promise<void> {
    // Integrate with yield optimization service
    if (this.config.integrateWithYieldOptimization) {
      await this.yieldService.optimizePortfolio();
    }
  }

  private async executeMarketMakingStrategy(strategy: TradingStrategy): Promise<void> {
    // Market making strategy implementation
    this.logger.debug('Executing market making strategy', { strategyId: strategy.id });
  }

  private async executeCustomStrategy(strategy: TradingStrategy): Promise<void> {
    // Custom strategy implementation
    this.logger.debug('Executing custom strategy', { strategyId: strategy.id });
  }

  private async cancelAllPendingOrders(): Promise<void> {
    const activeOrders = this.tradingInterface.getActiveOrders();
    const cancelPromises = activeOrders.map(order => 
      this.tradingInterface.cancelOrder(order.id)
    );

    await Promise.allSettled(cancelPromises);

    // Clear advanced orders
    this.pendingAdvancedOrders.clear();
  }

  private getCurrentTradingMode(): 'manual' | 'semi_automated' | 'fully_automated' {
    if (this.config.enableAutomatedTrading && this.strategies.size > 0) {
      return 'fully_automated';
    } else if (this.config.enableAdvancedOrders) {
      return 'semi_automated';
    } else {
      return 'manual';
    }
  }

  private getCurrentRiskLevel(): 'low' | 'medium' | 'high' {
    const portfolio = this.tradingInterface.getPortfolio();
    const riskScore = portfolio.riskMetrics.portfolioRisk;

    if (riskScore <= 3) return 'low';
    if (riskScore <= 7) return 'medium';
    return 'high';
  }

  private getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const status = this.getServiceStatus();
    
    if (!status.componentsStatus.tradingInterface || !status.componentsStatus.dexAggregator) {
      return 'critical';
    }
    
    if (status.activeAlerts > 5 || status.riskLevel === 'high') {
      return 'warning';
    }
    
    return 'healthy';
  }

  private getStrategyPerformance(): any[] {
    return Array.from(this.strategies.values()).map(strategy => ({
      id: strategy.id,
      name: strategy.name,
      type: strategy.type,
      enabled: strategy.enabled,
      performance: strategy.performance,
      lastExecuted: strategy.lastExecuted,
    }));
  }

  private async generateTradingRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const portfolio = this.tradingInterface.getPortfolio();
    const status = this.getServiceStatus();

    // Risk-based recommendations
    if (status.riskLevel === 'high') {
      recommendations.push('Consider reducing position sizes to lower portfolio risk');
    }

    // Performance-based recommendations
    if (portfolio.performance.sharpeRatio < 1.0) {
      recommendations.push('Risk-adjusted returns could be improved');
    }

    // Strategy recommendations
    if (this.strategies.size === 0 && this.config.enableAutomatedTrading) {
      recommendations.push('Consider adding automated trading strategies');
    }

    // System health recommendations
    if (status.systemHealth !== 'healthy') {
      recommendations.push('System health issues detected - review alerts');
    }

    return recommendations;
  }

  private startServiceCycles(): void {
    // Metrics update cycle (every 30 seconds)
    this.metricsUpdateInterval = setInterval(async () => {
      await this.updateServiceMetrics();
    }, 30 * 1000);

    // Strategy execution cycle (every 5 minutes)
    if (this.config.enableAutomatedTrading) {
      this.strategyExecutionInterval = setInterval(async () => {
        await this.executeEnabledStrategies();
      }, 5 * 60 * 1000);
    }

    // Advanced orders monitoring (every 10 seconds)
    if (this.config.enableAdvancedOrders) {
      this.advancedOrdersInterval = setInterval(async () => {
        await this.monitorAdvancedOrders();
      }, 10 * 1000);
    }

    // Health check cycle (every minute)
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60 * 1000);
  }

  private async updateServiceMetrics(): Promise<void> {
    try {
      const portfolio = this.tradingInterface.getPortfolio();
      const tradingStats = this.portfolioAnalytics.calculateTradingStatistics();

      this.metrics.portfolioValue = portfolio.totalValue;
      this.metrics.totalReturn = portfolio.performance.totalReturnPercent;
      this.metrics.sharpeRatio = portfolio.performance.sharpeRatio;
      this.metrics.maxDrawdown = portfolio.performance.maxDrawdown;
      this.metrics.winRate = tradingStats.winRate;
      this.metrics.profitFactor = tradingStats.profitFactor;
      this.metrics.totalTrades = tradingStats.totalTrades;

    } catch (error) {
      this.logger.error('Failed to update service metrics', error);
    }
  }

  private async executeEnabledStrategies(): Promise<void> {
    for (const strategy of this.strategies.values()) {
      if (strategy.enabled) {
        try {
          await this.executeStrategy(strategy);
        } catch (error) {
          this.logger.error('Strategy execution failed', error, { strategyId: strategy.id });
        }
      }
    }
  }

  private async monitorAdvancedOrders(): Promise<void> {
    for (const [orderId, orderRequest] of this.pendingAdvancedOrders) {
      try {
        if (await this.checkOrderConditions(orderRequest)) {
          await this.executeAdvancedOrder(orderId, orderRequest);
        }
      } catch (error) {
        this.logger.error('Advanced order monitoring failed', error, { orderId });
      }
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const status = this.getServiceStatus();
      
      if (status.systemHealth === 'critical') {
        this.logger.error('Critical system health detected', {
          componentsStatus: status.componentsStatus,
          riskLevel: status.riskLevel,
          activeAlerts: status.activeAlerts,
        });
      }

    } catch (error) {
      this.logger.error('Health check failed', error);
    }
  }

  // Public getters
  isActive(): boolean {
    return this.isRunning;
  }

  getConfig(): ProfessionalTradingServiceConfig {
    return { ...this.config };
  }

  getTradingInterface(): TradingInterface {
    return this.tradingInterface;
  }

  getPortfolioAnalytics(): PortfolioAnalytics {
    return this.portfolioAnalytics;
  }

  getDashboard(): TradingDashboard {
    return this.dashboard;
  }
}

export default ProfessionalTradingService;