// Comprehensive yield optimization service integrating all components

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import { YieldOptimizer, YieldOptimizerConfig } from '../strategies/yield-optimizer';
import { RiskManager, RiskManagerConfig } from '../strategies/risk-manager';
import { PortfolioOptimizer, PortfolioOptimizerConfig } from '../strategies/portfolio-optimizer';
import { LiquidityManager, LiquidityManagerConfig } from '../strategies/liquidity-manager';

export interface YieldOptimizationServiceConfig {
  // Core service configuration
  connection: Connection;
  wallet: Keypair;
  
  // Component configurations
  yieldOptimizer: YieldOptimizerConfig;
  riskManager: RiskManagerConfig;
  portfolioOptimizer: PortfolioOptimizerConfig;
  liquidityManager: LiquidityManagerConfig;
  
  // Service-level settings
  autoStart: boolean;
  enableEmergencyControls: boolean;
  maxTotalRisk: number;
  performanceReportingFrequency: number; // hours
}

export interface ServiceMetrics {
  totalAssetsUnderManagement: BN;
  totalYieldGenerated: BN;
  averageAPY: number;
  portfolioValue: BN;
  riskAdjustedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  activeStrategies: number;
  successfulTrades: number;
  failedTrades: number;
  emergencyExits: number;
  uptime: number;
  lastOptimization: number;
  nextOptimization: number;
}

export interface ServiceStatus {
  isRunning: boolean;
  componentStatus: {
    yieldOptimizer: boolean;
    riskManager: boolean;
    portfolioOptimizer: boolean;
    liquidityManager: boolean;
    dexAggregator: boolean;
  };
  currentRiskLevel: number;
  emergencyMode: boolean;
  lastError?: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export class YieldOptimizationService {
  private config: YieldOptimizationServiceConfig;
  private logger: Logger;
  
  // Core components
  private dexAggregator: DexAggregator;
  private yieldOptimizer: YieldOptimizer;
  private riskManager: RiskManager;
  private portfolioOptimizer: PortfolioOptimizer;
  private liquidityManager: LiquidityManager;
  
  // Service state
  private isRunning: boolean = false;
  private emergencyMode: boolean = false;
  private metrics: ServiceMetrics;
  private lastError?: string;
  
  // Monitoring intervals
  private healthCheckInterval?: NodeJS.Timeout;
  private performanceReportInterval?: NodeJS.Timeout;
  private emergencyMonitorInterval?: NodeJS.Timeout;

  constructor(config: YieldOptimizationServiceConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize metrics
    this.metrics = {
      totalAssetsUnderManagement: new BN(0),
      totalYieldGenerated: new BN(0),
      averageAPY: 0,
      portfolioValue: new BN(0),
      riskAdjustedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      activeStrategies: 0,
      successfulTrades: 0,
      failedTrades: 0,
      emergencyExits: 0,
      uptime: 0,
      lastOptimization: Date.now(),
      nextOptimization: Date.now() + 6 * 60 * 60 * 1000, // 6 hours from now
    };

    // Initialize components
    this.initializeComponents();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Yield optimization service already running');
      return;
    }

    this.logger.info('Starting comprehensive yield optimization service', {
      targetAPY: this.config.yieldOptimizer.targetAPY,
      maxRiskScore: this.config.yieldOptimizer.maxRiskScore,
      autoStart: this.config.autoStart,
    });

    try {
      // Initialize DEX aggregator first
      await this.dexAggregator.initialize();

      // Start all optimization components
      await this.startOptimizationComponents();

      // Start monitoring and health checks
      this.isRunning = true;
      this.startSystemMonitoring();

      // Record startup time
      this.metrics.uptime = Date.now();

      this.logger.info('Yield optimization service started successfully', {
        portfolioValue: this.metrics.portfolioValue.toString(),
        activeStrategies: this.metrics.activeStrategies,
        systemHealth: this.getSystemHealth(),
      });

    } catch (error) {
      this.logger.error('Failed to start yield optimization service', error);
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Yield optimization service not running');
      return;
    }

    this.logger.info('Stopping yield optimization service');

    try {
      // Stop monitoring intervals
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.performanceReportInterval) clearInterval(this.performanceReportInterval);
      if (this.emergencyMonitorInterval) clearInterval(this.emergencyMonitorInterval);

      // Stop all optimization components in reverse order
      await this.stopOptimizationComponents();

      this.isRunning = false;

      // Calculate final uptime
      this.metrics.uptime = Date.now() - this.metrics.uptime;

      this.logger.info('Yield optimization service stopped successfully', {
        finalPortfolioValue: this.metrics.portfolioValue.toString(),
        totalYieldGenerated: this.metrics.totalYieldGenerated.toString(),
        averageAPY: this.metrics.averageAPY,
        uptime: this.metrics.uptime,
        winRate: this.metrics.winRate,
      });

    } catch (error) {
      this.logger.error('Failed to stop yield optimization service gracefully', error);
      this.isRunning = false;
    }
  }

  async optimizePortfolio(): Promise<void> {
    this.logger.info('Running comprehensive portfolio optimization');

    try {
      // Update optimization timestamp
      this.metrics.lastOptimization = Date.now();

      // Run yield optimization
      await this.yieldOptimizer.discoverYieldOpportunities();
      
      // Run portfolio optimization
      const portfolioResult = await this.portfolioOptimizer.optimizePortfolio();
      
      // Run liquidity optimization
      await this.liquidityManager.optimizeLiquidityAllocations();
      
      // Execute optimal allocations
      await this.liquidityManager.rebalancePositions();

      // Update metrics
      await this.updateServiceMetrics();

      // Schedule next optimization
      this.metrics.nextOptimization = Date.now() + 6 * 60 * 60 * 1000; // 6 hours

      this.logger.info('Portfolio optimization completed successfully', {
        expectedReturn: portfolioResult.portfolio.expectedReturn,
        sharpeRatio: portfolioResult.portfolio.sharpeRatio,
        riskScore: portfolioResult.portfolio.var95.toString(),
        nextOptimization: new Date(this.metrics.nextOptimization).toISOString(),
      });

    } catch (error) {
      this.logger.error('Portfolio optimization failed', error);
      this.lastError = error instanceof Error ? error.message : 'Optimization failed';
      throw error;
    }
  }

  async executeEmergencyExit(): Promise<boolean> {
    this.logger.error('EXECUTING EMERGENCY EXIT - All positions will be closed');
    
    this.emergencyMode = true;

    try {
      // Execute emergency exit across all components
      const liquidityManagerSuccess = await this.liquidityManager.executeEmergencyExit();
      const riskManagerSuccess = await this.riskManager.executeEmergencyExit();

      const success = liquidityManagerSuccess && riskManagerSuccess;

      if (success) {
        this.metrics.emergencyExits++;
        this.logger.error('Emergency exit completed successfully');
      } else {
        this.logger.error('Emergency exit partially failed');
      }

      return success;

    } catch (error) {
      this.logger.error('Emergency exit failed completely', error);
      return false;
    } finally {
      this.emergencyMode = false;
    }
  }

  getServiceStatus(): ServiceStatus {
    return {
      isRunning: this.isRunning,
      componentStatus: {
        yieldOptimizer: this.yieldOptimizer.isActive(),
        riskManager: this.riskManager.isMonitoringActive(),
        portfolioOptimizer: this.portfolioOptimizer.isOptimizationActive(),
        liquidityManager: this.liquidityManager.isActive(),
        dexAggregator: true, // DEX aggregator doesn't have a status method
      },
      currentRiskLevel: this.getCurrentRiskLevel(),
      emergencyMode: this.emergencyMode,
      lastError: this.lastError,
      systemHealth: this.getSystemHealth(),
    };
  }

  getServiceMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  async generatePerformanceReport(): Promise<any> {
    this.logger.info('Generating comprehensive performance report');

    try {
      const yieldMetrics = this.yieldOptimizer.getMetrics();
      const riskMetrics = this.riskManager.getRiskMetrics();
      const portfolioHistory = this.portfolioOptimizer.getOptimizationHistory();
      const liquidityMetrics = this.liquidityManager.getMetrics();

      const report = {
        timestamp: Date.now(),
        service: this.metrics,
        yieldOptimization: yieldMetrics,
        riskManagement: riskMetrics,
        portfolioOptimization: {
          totalOptimizations: portfolioHistory.length,
          averageExecutionTime: portfolioHistory.reduce((sum, r) => sum + r.executionTime, 0) / portfolioHistory.length,
          convergenceRate: portfolioHistory.filter(r => r.convergence).length / portfolioHistory.length,
        },
        liquidityManagement: liquidityMetrics,
        systemHealth: this.getSystemHealth(),
        recommendations: await this.generateRecommendations(),
      };

      this.logger.info('Performance report generated', {
        reportTimestamp: report.timestamp,
        systemHealth: report.systemHealth,
        totalYield: report.service.totalYieldGenerated.toString(),
        averageAPY: report.service.averageAPY,
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to generate performance report', error);
      throw error;
    }
  }

  // Private implementation methods

  private initializeComponents(): void {
    // Initialize DEX aggregator
    this.dexAggregator = new DexAggregator(
      this.config.connection,
      this.config.wallet,
      this.logger
    );

    // Initialize yield optimizer
    this.yieldOptimizer = new YieldOptimizer(
      this.config.yieldOptimizer,
      this.dexAggregator,
      this.logger
    );

    // Initialize risk manager
    this.riskManager = new RiskManager(
      this.config.riskManager,
      this.dexAggregator,
      this.logger
    );

    // Initialize portfolio optimizer
    this.portfolioOptimizer = new PortfolioOptimizer(
      this.config.portfolioOptimizer,
      this.dexAggregator,
      this.yieldOptimizer,
      this.riskManager,
      this.logger
    );

    // Initialize liquidity manager
    this.liquidityManager = new LiquidityManager(
      this.config.liquidityManager,
      this.dexAggregator,
      this.yieldOptimizer,
      this.riskManager,
      this.portfolioOptimizer,
      this.logger
    );
  }

  private async startOptimizationComponents(): Promise<void> {
    // Start components in dependency order
    await this.yieldOptimizer.start();
    await this.riskManager.start();
    await this.portfolioOptimizer.start();
    await this.liquidityManager.start();

    this.logger.info('All optimization components started successfully');
  }

  private async stopOptimizationComponents(): Promise<void> {
    // Stop components in reverse dependency order
    await this.liquidityManager.stop();
    await this.portfolioOptimizer.stop();
    await this.riskManager.stop();
    await this.yieldOptimizer.stop();

    this.logger.info('All optimization components stopped successfully');
  }

  private startSystemMonitoring(): void {
    // Health check every 2 minutes
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 2 * 60 * 1000);

    // Performance reporting
    this.performanceReportInterval = setInterval(async () => {
      await this.generatePerformanceReport();
    }, this.config.performanceReportingFrequency * 60 * 60 * 1000);

    // Emergency monitoring every 30 seconds
    this.emergencyMonitorInterval = setInterval(async () => {
      await this.checkEmergencyConditions();
    }, 30 * 1000);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      await this.updateServiceMetrics();
      
      const systemHealth = this.getSystemHealth();
      if (systemHealth === 'critical') {
        this.logger.error('System health is critical', {
          currentRiskLevel: this.getCurrentRiskLevel(),
          maxDrawdown: this.metrics.maxDrawdown,
        });
      }

    } catch (error) {
      this.logger.error('Health check failed', error);
      this.lastError = error instanceof Error ? error.message : 'Health check failed';
    }
  }

  private async checkEmergencyConditions(): Promise<void> {
    if (this.emergencyMode) return;

    try {
      const riskMetrics = this.riskManager.getRiskMetrics();
      const activeAlerts = this.riskManager.getActiveAlerts();

      // Check for critical risk alerts
      const criticalAlerts = Array.from(activeAlerts.values()).filter(
        alert => alert.severity === 'critical'
      );

      if (criticalAlerts.length > 0) {
        this.logger.warn('Critical risk alerts detected', {
          alertCount: criticalAlerts.length,
          alerts: criticalAlerts.map(a => ({ type: a.type, message: a.message })),
        });
      }

      // Check for emergency exit conditions
      const shouldEmergencyExit = criticalAlerts.some(
        alert => alert.recommendedAction === 'emergency_exit'
      );

      if (shouldEmergencyExit && this.config.enableEmergencyControls) {
        this.logger.error('Emergency exit conditions detected, executing emergency exit');
        await this.executeEmergencyExit();
      }

    } catch (error) {
      this.logger.error('Emergency condition check failed', error);
    }
  }

  private async updateServiceMetrics(): Promise<void> {
    try {
      // Get metrics from all components
      const yieldMetrics = this.yieldOptimizer.getMetrics();
      const riskMetrics = this.riskManager.getRiskMetrics();
      const liquidityMetrics = this.liquidityManager.getMetrics();

      // Update service-level metrics
      this.metrics.portfolioValue = yieldMetrics.portfolioValue;
      this.metrics.totalYieldGenerated = yieldMetrics.totalYieldGenerated;
      this.metrics.averageAPY = yieldMetrics.averageAPY;
      this.metrics.riskAdjustedReturn = yieldMetrics.riskAdjustedReturn;
      this.metrics.sharpeRatio = yieldMetrics.sharpeRatio;
      this.metrics.maxDrawdown = Math.max(yieldMetrics.maxDrawdown, riskMetrics.maxDrawdown);
      this.metrics.activeStrategies = yieldMetrics.activeStrategies;
      this.metrics.totalAssetsUnderManagement = liquidityMetrics.totalValueLocked;

      // Calculate win rate
      const totalTrades = this.metrics.successfulTrades + this.metrics.failedTrades;
      this.metrics.winRate = totalTrades > 0 ? (this.metrics.successfulTrades / totalTrades) * 100 : 0;

    } catch (error) {
      this.logger.error('Failed to update service metrics', error);
    }
  }

  private getCurrentRiskLevel(): number {
    try {
      const riskMetrics = this.riskManager.getRiskMetrics();
      return riskMetrics.portfolioRisk;
    } catch {
      return 0;
    }
  }

  private getSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const currentRisk = this.getCurrentRiskLevel();
    const maxDrawdown = this.metrics.maxDrawdown;

    if (currentRisk > this.config.maxTotalRisk || maxDrawdown > 20) {
      return 'critical';
    }
    if (currentRisk > this.config.maxTotalRisk * 0.8 || maxDrawdown > 10) {
      return 'warning';
    }
    return 'healthy';
  }

  private async generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const riskMetrics = this.riskManager.getRiskMetrics();
      const yieldMetrics = this.yieldOptimizer.getMetrics();

      // Risk-based recommendations
      if (riskMetrics.portfolioRisk > this.config.maxTotalRisk * 0.9) {
        recommendations.push('Consider reducing position sizes to lower portfolio risk');
      }

      if (riskMetrics.concentrationRisk > 7) {
        recommendations.push('Portfolio is highly concentrated - consider diversification');
      }

      // Performance-based recommendations
      if (yieldMetrics.averageAPY < this.config.yieldOptimizer.targetAPY * 0.8) {
        recommendations.push('Current yield is below target - consider higher-yield opportunities');
      }

      if (this.metrics.sharpeRatio < 1.0) {
        recommendations.push('Risk-adjusted returns could be improved');
      }

    } catch (error) {
      this.logger.error('Failed to generate recommendations', error);
    }

    return recommendations;
  }
}

export default YieldOptimizationService;