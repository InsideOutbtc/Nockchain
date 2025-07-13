// Professional trading dashboard with real-time data and advanced visualization

import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { TradingInterface, Portfolio, TradeOrder, TradingSignal, MarketData } from './trading-interface';
import { PortfolioAnalytics, PerformanceReport, RiskAnalysis, TradingStatistics } from './portfolio-analytics';
import { YieldOptimizationService } from '../services/yield-optimization-service';

export interface DashboardConfig {
  updateFrequency: number; // seconds
  enableRealTimeUpdates: boolean;
  alertThresholds: {
    maxDrawdown: number;
    dailyLossLimit: BN;
    riskScore: number;
    profitTarget: number;
  };
  displaySettings: {
    theme: 'dark' | 'light';
    precision: number; // decimal places
    timezone: string;
    currency: 'USD' | 'SOL' | 'USDC';
  };
}

export interface DashboardData {
  timestamp: number;
  portfolio: Portfolio;
  performance: PerformanceReport;
  riskAnalysis: RiskAnalysis;
  tradingStats: TradingStatistics;
  activeOrders: TradeOrder[];
  tradingSignals: TradingSignal[];
  marketData: Map<string, MarketData>;
  alerts: DashboardAlert[];
  systemStatus: SystemStatus;
  yieldOptimization: any;
}

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  autoHide: boolean;
  actions?: {
    label: string;
    action: string;
    destructive?: boolean;
  }[];
}

export interface SystemStatus {
  trading: 'active' | 'paused' | 'error';
  yieldOptimization: 'active' | 'paused' | 'error';
  riskMonitoring: 'active' | 'paused' | 'error';
  dataFeeds: 'connected' | 'degraded' | 'disconnected';
  latency: number; // milliseconds
  uptime: number; // seconds
  lastUpdate: number;
  healthScore: number; // 0-100
}

export interface ChartData {
  portfolioValue: TimeSeriesData[];
  returns: TimeSeriesData[];
  drawdown: TimeSeriesData[];
  allocation: PieChartData[];
  performance: BarChartData[];
  riskMetrics: RadarChartData;
  correlationMatrix: HeatmapData;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface BarChartData {
  category: string;
  value: number;
  color: string;
  benchmark?: number;
}

export interface RadarChartData {
  metrics: {
    label: string;
    value: number;
    max: number;
  }[];
}

export interface HeatmapData {
  data: number[][];
  labels: string[];
  min: number;
  max: number;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  timestamp: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export class TradingDashboard {
  private config: DashboardConfig;
  private logger: Logger;
  private tradingInterface: TradingInterface;
  private portfolioAnalytics: PortfolioAnalytics;
  private yieldService: YieldOptimizationService;

  private dashboardData: DashboardData;
  private alerts: Map<string, DashboardAlert> = new Map();
  private subscribers: Map<string, (data: DashboardData) => void> = new Map();

  private isActive: boolean = false;
  private updateInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;

  constructor(
    config: DashboardConfig,
    tradingInterface: TradingInterface,
    portfolioAnalytics: PortfolioAnalytics,
    yieldService: YieldOptimizationService,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;
    this.tradingInterface = tradingInterface;
    this.portfolioAnalytics = portfolioAnalytics;
    this.yieldService = yieldService;

    // Initialize dashboard data
    this.dashboardData = this.initializeDashboardData();
  }

  async start(): Promise<void> {
    if (this.isActive) {
      this.logger.warn('Trading dashboard already active');
      return;
    }

    this.logger.info('Starting trading dashboard', {
      updateFrequency: this.config.updateFrequency,
      enableRealTimeUpdates: this.config.enableRealTimeUpdates,
      theme: this.config.displaySettings.theme,
    });

    try {
      // Initial data load
      await this.updateDashboardData();

      // Start update cycles
      this.isActive = true;
      this.startUpdateCycles();

      this.logger.info('Trading dashboard started successfully');

    } catch (error) {
      this.logger.error('Failed to start trading dashboard', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      this.logger.warn('Trading dashboard not active');
      return;
    }

    this.logger.info('Stopping trading dashboard');

    // Stop update intervals
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);

    this.isActive = false;
    this.logger.info('Trading dashboard stopped');
  }

  getDashboardData(): DashboardData {
    return JSON.parse(JSON.stringify(this.dashboardData));
  }

  getChartData(): ChartData {
    return this.generateChartData();
  }

  getOrderBookData(tokenPair: string): OrderBookData {
    return this.generateOrderBookData(tokenPair);
  }

  subscribe(id: string, callback: (data: DashboardData) => void): void {
    this.subscribers.set(id, callback);
    this.logger.debug('Dashboard subscriber added', { subscriberId: id });
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.logger.debug('Dashboard subscriber removed', { subscriberId: id });
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.debug('Alert acknowledged', { alertId });
    }
  }

  dismissAlert(alertId: string): void {
    this.alerts.delete(alertId);
    this.logger.debug('Alert dismissed', { alertId });
  }

  async executeAlertAction(alertId: string, action: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    this.logger.info('Executing alert action', { alertId, action });

    try {
      switch (action) {
        case 'emergency_exit':
          await this.yieldService.executeEmergencyExit();
          break;
        case 'pause_trading':
          await this.tradingInterface.stop();
          break;
        case 'cancel_all_orders':
          const activeOrders = this.tradingInterface.getActiveOrders();
          for (const order of activeOrders) {
            await this.tradingInterface.cancelOrder(order.id);
          }
          break;
        case 'rebalance_portfolio':
          await this.yieldService.optimizePortfolio();
          break;
        default:
          this.logger.warn('Unknown alert action', { action });
      }

      // Mark alert as acknowledged
      alert.acknowledged = true;

    } catch (error) {
      this.logger.error('Failed to execute alert action', error, { alertId, action });
      throw error;
    }
  }

  generatePerformanceReport(period: string): PerformanceReport {
    return this.portfolioAnalytics.generatePerformanceReport(period);
  }

  async exportData(format: 'json' | 'csv' | 'excel', dataType: 'portfolio' | 'trades' | 'performance'): Promise<string> {
    this.logger.info('Exporting dashboard data', { format, dataType });

    try {
      let data: any;

      switch (dataType) {
        case 'portfolio':
          data = this.dashboardData.portfolio;
          break;
        case 'trades':
          data = this.tradingInterface.getOrderHistory();
          break;
        case 'performance':
          data = this.dashboardData.performance;
          break;
        default:
          throw new Error('Invalid data type');
      }

      // Convert data based on format
      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          return this.convertToCSV(data);
        case 'excel':
          return this.convertToExcel(data);
        default:
          throw new Error('Invalid export format');
      }

    } catch (error) {
      this.logger.error('Failed to export data', error);
      throw error;
    }
  }

  // Private implementation methods

  private async updateDashboardData(): Promise<void> {
    try {
      const portfolio = this.tradingInterface.getPortfolio();
      const performance = this.portfolioAnalytics.generatePerformanceReport('1D');
      const riskAnalysis = this.portfolioAnalytics.analyzeRisk(portfolio);
      const tradingStats = this.portfolioAnalytics.calculateTradingStatistics();
      const activeOrders = this.tradingInterface.getActiveOrders();
      const tradingSignals = this.tradingInterface.getTradingSignals();
      const marketData = this.tradingInterface.getMarketData() as Map<string, MarketData>;
      const yieldOptimization = this.yieldService.getServiceMetrics();

      this.dashboardData = {
        timestamp: Date.now(),
        portfolio,
        performance,
        riskAnalysis,
        tradingStats,
        activeOrders,
        tradingSignals,
        marketData,
        alerts: Array.from(this.alerts.values()),
        systemStatus: this.getSystemStatus(),
        yieldOptimization,
      };

      // Check for alerts
      await this.checkAlertConditions();

      // Notify subscribers
      this.notifySubscribers();

    } catch (error) {
      this.logger.error('Failed to update dashboard data', error);
    }
  }

  private async checkAlertConditions(): Promise<void> {
    const portfolio = this.dashboardData.portfolio;
    const performance = this.dashboardData.performance;
    const riskAnalysis = this.dashboardData.riskAnalysis;

    // Check drawdown threshold
    if (performance.portfolio.maxDrawdown > this.config.alertThresholds.maxDrawdown) {
      this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'High Drawdown Alert',
        message: `Portfolio drawdown (${performance.portfolio.maxDrawdown.toFixed(2)}%) exceeds threshold (${this.config.alertThresholds.maxDrawdown}%)`,
        autoHide: false,
        actions: [
          { label: 'Emergency Exit', action: 'emergency_exit', destructive: true },
          { label: 'Pause Trading', action: 'pause_trading' },
        ],
      });
    }

    // Check daily loss limit
    const dailyLoss = new BN(Math.abs(performance.portfolio.totalReturn.toNumber()));
    if (dailyLoss.gt(this.config.alertThresholds.dailyLossLimit)) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'Daily Loss Limit Exceeded',
        message: `Daily loss (${dailyLoss.toString()}) exceeds limit (${this.config.alertThresholds.dailyLossLimit.toString()})`,
        autoHide: false,
        actions: [
          { label: 'Emergency Exit', action: 'emergency_exit', destructive: true },
          { label: 'Cancel All Orders', action: 'cancel_all_orders' },
        ],
      });
    }

    // Check risk score
    if (riskAnalysis.portfolioRisk > this.config.alertThresholds.riskScore) {
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        title: 'High Risk Score',
        message: `Portfolio risk score (${riskAnalysis.portfolioRisk.toFixed(2)}) exceeds threshold (${this.config.alertThresholds.riskScore})`,
        autoHide: false,
        actions: [
          { label: 'Rebalance Portfolio', action: 'rebalance_portfolio' },
        ],
      });
    }

    // Check profit target
    if (performance.portfolio.totalReturnPercent >= this.config.alertThresholds.profitTarget) {
      this.createAlert({
        type: 'success',
        severity: 'low',
        title: 'Profit Target Reached',
        message: `Portfolio return (${performance.portfolio.totalReturnPercent.toFixed(2)}%) reached target (${this.config.alertThresholds.profitTarget}%)`,
        autoHide: true,
      });
    }

    // Check system health
    const systemStatus = this.getSystemStatus();
    if (systemStatus.healthScore < 70) {
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        title: 'System Health Warning',
        message: `System health score (${systemStatus.healthScore}) is below optimal level`,
        autoHide: false,
      });
    }
  }

  private createAlert(alertData: Partial<DashboardAlert>): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: DashboardAlert = {
      id: alertId,
      type: alertData.type || 'info',
      severity: alertData.severity || 'low',
      title: alertData.title || 'Alert',
      message: alertData.message || '',
      timestamp: Date.now(),
      acknowledged: false,
      autoHide: alertData.autoHide || false,
      actions: alertData.actions,
    };

    this.alerts.set(alertId, alert);

    this.logger.info('Alert created', {
      alertId,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
    });

    // Auto-hide alerts if configured
    if (alert.autoHide) {
      setTimeout(() => {
        this.alerts.delete(alertId);
      }, 30000); // 30 seconds
    }
  }

  private getSystemStatus(): SystemStatus {
    const tradingStatus = this.tradingInterface.isTrading() ? 'active' : 'paused';
    const yieldStatus = this.yieldService.getServiceStatus();
    
    let healthScore = 100;
    
    // Reduce health score based on system issues
    if (tradingStatus !== 'active') healthScore -= 20;
    if (yieldStatus.systemHealth !== 'healthy') healthScore -= 30;
    if (!yieldStatus.componentStatus.riskManager) healthScore -= 25;
    if (!yieldStatus.componentStatus.dexAggregator) healthScore -= 25;

    return {
      trading: tradingStatus,
      yieldOptimization: yieldStatus.isRunning ? 'active' : 'paused',
      riskMonitoring: yieldStatus.componentStatus.riskManager ? 'active' : 'error',
      dataFeeds: 'connected', // Would integrate with actual data feed status
      latency: 50, // Would measure actual latency
      uptime: Math.floor((Date.now() - this.dashboardData.timestamp) / 1000),
      lastUpdate: Date.now(),
      healthScore: Math.max(0, healthScore),
    };
  }

  private generateChartData(): ChartData {
    const snapshots = this.portfolioAnalytics.getSnapshots();
    
    return {
      portfolioValue: this.generatePortfolioValueChart(snapshots),
      returns: this.generateReturnsChart(snapshots),
      drawdown: this.generateDrawdownChart(snapshots),
      allocation: this.generateAllocationChart(),
      performance: this.generatePerformanceChart(),
      riskMetrics: this.generateRiskRadarChart(),
      correlationMatrix: this.generateCorrelationHeatmap(),
    };
  }

  private generatePortfolioValueChart(snapshots: any[]): TimeSeriesData[] {
    return snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: snapshot.totalValue.toNumber(),
    }));
  }

  private generateReturnsChart(snapshots: any[]): TimeSeriesData[] {
    const returns: TimeSeriesData[] = [];
    
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = snapshots[i - 1].totalValue;
      const currValue = snapshots[i].totalValue;
      
      if (prevValue.gt(new BN(0))) {
        const returnPct = currValue.sub(prevValue).muln(100).div(prevValue).toNumber();
        returns.push({
          timestamp: snapshots[i].timestamp,
          value: returnPct,
        });
      }
    }
    
    return returns;
  }

  private generateDrawdownChart(snapshots: any[]): TimeSeriesData[] {
    const drawdowns: TimeSeriesData[] = [];
    let peak = snapshots[0]?.totalValue || new BN(0);
    
    for (const snapshot of snapshots) {
      if (snapshot.totalValue.gt(peak)) {
        peak = snapshot.totalValue;
      }
      
      const drawdown = peak.isZero() ? 0 : 
        peak.sub(snapshot.totalValue).muln(100).div(peak).toNumber();
      
      drawdowns.push({
        timestamp: snapshot.timestamp,
        value: -drawdown, // Negative for visual representation
      });
    }
    
    return drawdowns;
  }

  private generateAllocationChart(): PieChartData[] {
    const portfolio = this.dashboardData.portfolio;
    const allocation: PieChartData[] = [];
    
    let index = 0;
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
    
    for (const [tokenMint, position] of portfolio.positions) {
      allocation.push({
        label: position.symbol,
        value: position.marketValue.toNumber(),
        color: colors[index % colors.length],
        percentage: position.allocation,
      });
      index++;
    }
    
    return allocation.sort((a, b) => b.value - a.value);
  }

  private generatePerformanceChart(): BarChartData[] {
    const performance = this.dashboardData.performance;
    
    return [
      {
        category: '1D',
        value: performance.portfolio.totalReturnPercent,
        color: performance.portfolio.totalReturnPercent >= 0 ? '#4ECDC4' : '#FF6B6B',
      },
      {
        category: '1W',
        value: 0, // Would calculate weekly return
        color: '#45B7D1',
      },
      {
        category: '1M',
        value: 0, // Would calculate monthly return
        color: '#96CEB4',
      },
      {
        category: '1Y',
        value: performance.portfolio.annualizedReturn,
        color: performance.portfolio.annualizedReturn >= 0 ? '#4ECDC4' : '#FF6B6B',
      },
    ];
  }

  private generateRiskRadarChart(): RadarChartData {
    const riskAnalysis = this.dashboardData.riskAnalysis;
    
    return {
      metrics: [
        { label: 'Portfolio Risk', value: riskAnalysis.portfolioRisk, max: 10 },
        { label: 'Concentration', value: riskAnalysis.concentrationRisk, max: 10 },
        { label: 'Liquidity Risk', value: riskAnalysis.liquidityRisk, max: 10 },
        { label: 'Market Risk', value: riskAnalysis.marketRisk, max: 10 },
        { label: 'Specific Risk', value: riskAnalysis.specificRisk, max: 10 },
        { label: 'Margin Safety', value: riskAnalysis.marginOfSafety, max: 100 },
      ],
    };
  }

  private generateCorrelationHeatmap(): HeatmapData {
    const riskAnalysis = this.dashboardData.riskAnalysis;
    const portfolio = this.dashboardData.portfolio;
    
    const labels = Array.from(portfolio.positions.values()).map(p => p.symbol);
    
    return {
      data: riskAnalysis.correlationMatrix,
      labels,
      min: -1,
      max: 1,
    };
  }

  private generateOrderBookData(tokenPair: string): OrderBookData {
    // This would integrate with real order book data
    // Placeholder implementation
    return {
      bids: [
        { price: 100.5, size: 1000, total: 1000 },
        { price: 100.4, size: 2000, total: 3000 },
        { price: 100.3, size: 1500, total: 4500 },
      ],
      asks: [
        { price: 100.6, size: 800, total: 800 },
        { price: 100.7, size: 1200, total: 2000 },
        { price: 100.8, size: 900, total: 2900 },
      ],
      spread: 0.1,
      midPrice: 100.55,
      timestamp: Date.now(),
    };
  }

  private notifySubscribers(): void {
    for (const [id, callback] of this.subscribers) {
      try {
        callback(this.dashboardData);
      } catch (error) {
        this.logger.error('Failed to notify subscriber', error, { subscriberId: id });
      }
    }
  }

  private startUpdateCycles(): void {
    // Main update cycle
    this.updateInterval = setInterval(async () => {
      await this.updateDashboardData();
    }, this.config.updateFrequency * 1000);

    // Alert check cycle (more frequent)
    this.alertCheckInterval = setInterval(async () => {
      await this.checkAlertConditions();
    }, 10 * 1000); // Every 10 seconds
  }

  private convertToCSV(data: any): string {
    // Convert data to CSV format
    // Simplified implementation
    return JSON.stringify(data);
  }

  private convertToExcel(data: any): string {
    // Convert data to Excel format
    // Would use a library like xlsx
    return JSON.stringify(data);
  }

  private initializeDashboardData(): DashboardData {
    return {
      timestamp: Date.now(),
      portfolio: {
        totalValue: new BN(0),
        cashBalance: new BN(0),
        positions: new Map(),
        performance: {
          totalReturn: 0,
          totalReturnPercent: 0,
          dayReturn: 0,
          dayReturnPercent: 0,
          weekReturn: 0,
          weekReturnPercent: 0,
          monthReturn: 0,
          monthReturnPercent: 0,
          yearReturn: 0,
          yearReturnPercent: 0,
          sharpeRatio: 0,
          sortinoRatio: 0,
          maxDrawdown: 0,
          volatility: 0,
          winRate: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0,
        },
        riskMetrics: {
          portfolioRisk: 0,
          var95: new BN(0),
          var99: new BN(0),
          expectedShortfall: new BN(0),
          beta: 0,
          correlation: 0,
          concentrationRisk: 0,
          liquidityRisk: 0,
          marginUsed: new BN(0),
          marginAvailable: new BN(0),
          marginRatio: 0,
        },
        allocation: [],
      },
      performance: {} as PerformanceReport,
      riskAnalysis: {} as RiskAnalysis,
      tradingStats: {} as TradingStatistics,
      activeOrders: [],
      tradingSignals: [],
      marketData: new Map(),
      alerts: [],
      systemStatus: {
        trading: 'paused',
        yieldOptimization: 'paused',
        riskMonitoring: 'paused',
        dataFeeds: 'disconnected',
        latency: 0,
        uptime: 0,
        lastUpdate: Date.now(),
        healthScore: 0,
      },
      yieldOptimization: {},
    };
  }

  // Public getters
  isActive(): boolean {
    return this.isActive;
  }

  getAlerts(): DashboardAlert[] {
    return Array.from(this.alerts.values());
  }

  getConfig(): DashboardConfig {
    return { ...this.config };
  }
}

export default TradingDashboard;