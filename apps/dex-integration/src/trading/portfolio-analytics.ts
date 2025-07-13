// Advanced portfolio analytics and performance tracking

import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { Portfolio, Position, PerformanceMetrics, RiskMetrics } from './trading-interface';

export interface AnalyticsConfig {
  benchmarkToken: string; // Token to use as benchmark (e.g., SOL)
  riskFreeRate: number; // Annual risk-free rate for Sharpe calculation
  lookbackPeriods: {
    short: number; // days
    medium: number; // days
    long: number; // days
  };
  updateFrequency: number; // minutes
}

export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: BN;
  positions: Map<string, Position>;
  performance: PerformanceMetrics;
  riskMetrics: RiskMetrics;
}

export interface PerformanceReport {
  reportDate: number;
  period: string;
  portfolio: {
    startValue: BN;
    endValue: BN;
    totalReturn: BN;
    totalReturnPercent: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    calmarRatio: number;
  };
  benchmark: {
    totalReturn: number;
    volatility: number;
    sharpeRatio: number;
    correlation: number;
  };
  riskMetrics: {
    var95: BN;
    var99: BN;
    expectedShortfall: BN;
    trackingError: number;
    informationRatio: number;
    beta: number;
    alpha: number;
  };
  attribution: {
    assetAllocation: number;
    stockSelection: number;
    interaction: number;
    totalActiveReturn: number;
  };
  topPositions: Position[];
  worstPositions: Position[];
  recommendations: string[];
}

export interface RiskAnalysis {
  portfolioRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  specificRisk: number;
  correlationMatrix: number[][];
  stressTestResults: {
    scenario: string;
    portfolioImpact: BN;
    worstAssets: string[];
  }[];
  riskContributions: Map<string, number>;
  marginOfSafety: number;
}

export interface TradingStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  expectancy: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  averageHoldTime: number;
  turnoverRate: number;
}

export class PortfolioAnalytics {
  private config: AnalyticsConfig;
  private logger: Logger;
  
  private snapshots: PortfolioSnapshot[] = [];
  private benchmarkPrices: Map<number, BN> = new Map();
  private tradeHistory: any[] = [];
  
  private isTracking: boolean = false;
  private updateInterval?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async startTracking(): Promise<void> {
    if (this.isTracking) {
      this.logger.warn('Portfolio analytics already tracking');
      return;
    }

    this.logger.info('Starting portfolio analytics tracking', {
      benchmarkToken: this.config.benchmarkToken,
      riskFreeRate: this.config.riskFreeRate,
      updateFrequency: this.config.updateFrequency,
    });

    this.isTracking = true;
    
    // Start periodic updates
    this.updateInterval = setInterval(async () => {
      // This would be called by the main trading interface
      // when portfolio updates occur
    }, this.config.updateFrequency * 60 * 1000);

    this.logger.info('Portfolio analytics tracking started');
  }

  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      this.logger.warn('Portfolio analytics not tracking');
      return;
    }

    this.logger.info('Stopping portfolio analytics tracking');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.isTracking = false;
    this.logger.info('Portfolio analytics tracking stopped');
  }

  addPortfolioSnapshot(portfolio: Portfolio): void {
    const snapshot: PortfolioSnapshot = {
      timestamp: Date.now(),
      totalValue: portfolio.totalValue,
      positions: new Map(portfolio.positions),
      performance: { ...portfolio.performance },
      riskMetrics: { ...portfolio.riskMetrics },
    };

    this.snapshots.push(snapshot);
    
    // Keep only last 10,000 snapshots (approximately 6+ months of data at 1-minute intervals)
    if (this.snapshots.length > 10000) {
      this.snapshots = this.snapshots.slice(-10000);
    }

    this.logger.debug('Portfolio snapshot added', {
      timestamp: snapshot.timestamp,
      totalValue: snapshot.totalValue.toString(),
      positionCount: snapshot.positions.size,
    });
  }

  calculatePerformanceMetrics(portfolio: Portfolio): PerformanceMetrics {
    if (this.snapshots.length < 2) {
      return this.getEmptyPerformanceMetrics();
    }

    const currentSnapshot = this.snapshots[this.snapshots.length - 1];
    const returns = this.calculateReturns();
    
    return {
      totalReturn: this.calculateTotalReturn(),
      totalReturnPercent: this.calculateTotalReturnPercent(),
      dayReturn: this.calculatePeriodReturn(1),
      dayReturnPercent: this.calculatePeriodReturnPercent(1),
      weekReturn: this.calculatePeriodReturn(7),
      weekReturnPercent: this.calculatePeriodReturnPercent(7),
      monthReturn: this.calculatePeriodReturn(30),
      monthReturnPercent: this.calculatePeriodReturnPercent(30),
      yearReturn: this.calculatePeriodReturn(365),
      yearReturnPercent: this.calculatePeriodReturnPercent(365),
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(),
      volatility: this.calculateVolatility(returns),
      winRate: this.calculateWinRate(),
      profitFactor: this.calculateProfitFactor(),
      averageWin: this.calculateAverageWin(),
      averageLoss: this.calculateAverageLoss(),
    };
  }

  calculateRiskMetrics(portfolio: Portfolio): RiskMetrics {
    const returns = this.calculateReturns();
    
    return {
      portfolioRisk: this.calculatePortfolioRisk(),
      var95: this.calculateVaR(0.95),
      var99: this.calculateVaR(0.99),
      expectedShortfall: this.calculateExpectedShortfall(0.95),
      beta: this.calculateBeta(),
      correlation: this.calculateCorrelation(),
      concentrationRisk: this.calculateConcentrationRisk(portfolio),
      liquidityRisk: this.calculateLiquidityRisk(portfolio),
      marginUsed: new BN(0), // Would integrate with margin calculations
      marginAvailable: new BN(0),
      marginRatio: 0,
    };
  }

  generatePerformanceReport(period: string): PerformanceReport {
    const endDate = Date.now();
    const startDate = this.getStartDateForPeriod(period, endDate);
    
    const startSnapshot = this.getSnapshotNearDate(startDate);
    const endSnapshot = this.getSnapshotNearDate(endDate);
    
    if (!startSnapshot || !endSnapshot) {
      throw new Error('Insufficient data for performance report');
    }

    const returns = this.calculateReturnsForPeriod(startDate, endDate);
    const benchmarkReturns = this.getBenchmarkReturnsForPeriod(startDate, endDate);

    return {
      reportDate: endDate,
      period,
      portfolio: {
        startValue: startSnapshot.totalValue,
        endValue: endSnapshot.totalValue,
        totalReturn: endSnapshot.totalValue.sub(startSnapshot.totalValue),
        totalReturnPercent: this.calculateReturnPercent(startSnapshot.totalValue, endSnapshot.totalValue),
        annualizedReturn: this.annualizeReturn(
          this.calculateReturnPercent(startSnapshot.totalValue, endSnapshot.totalValue),
          this.getDaysInPeriod(period)
        ),
        volatility: this.calculateVolatility(returns),
        sharpeRatio: this.calculateSharpeRatio(returns),
        sortinoRatio: this.calculateSortinoRatio(returns),
        maxDrawdown: this.calculateMaxDrawdownForPeriod(startDate, endDate),
        calmarRatio: this.calculateCalmarRatio(returns),
      },
      benchmark: {
        totalReturn: this.calculateBenchmarkReturn(benchmarkReturns),
        volatility: this.calculateVolatility(benchmarkReturns),
        sharpeRatio: this.calculateSharpeRatio(benchmarkReturns),
        correlation: this.calculateCorrelationWithBenchmark(returns, benchmarkReturns),
      },
      riskMetrics: {
        var95: this.calculateVaR(0.95),
        var99: this.calculateVaR(0.99),
        expectedShortfall: this.calculateExpectedShortfall(0.95),
        trackingError: this.calculateTrackingError(returns, benchmarkReturns),
        informationRatio: this.calculateInformationRatio(returns, benchmarkReturns),
        beta: this.calculateBeta(),
        alpha: this.calculateAlpha(returns, benchmarkReturns),
      },
      attribution: this.calculatePerformanceAttribution(returns, benchmarkReturns),
      topPositions: this.getTopPositions(endSnapshot, 5),
      worstPositions: this.getWorstPositions(endSnapshot, 5),
      recommendations: this.generateRecommendations(endSnapshot),
    };
  }

  analyzeRisk(portfolio: Portfolio): RiskAnalysis {
    return {
      portfolioRisk: this.calculatePortfolioRisk(),
      concentrationRisk: this.calculateConcentrationRisk(portfolio),
      liquidityRisk: this.calculateLiquidityRisk(portfolio),
      marketRisk: this.calculateMarketRisk(),
      specificRisk: this.calculateSpecificRisk(),
      correlationMatrix: this.calculateCorrelationMatrix(portfolio),
      stressTestResults: this.runStressTests(portfolio),
      riskContributions: this.calculateRiskContributions(portfolio),
      marginOfSafety: this.calculateMarginOfSafety(portfolio),
    };
  }

  calculateTradingStatistics(): TradingStatistics {
    const wins = this.tradeHistory.filter(trade => trade.pnl > 0);
    const losses = this.tradeHistory.filter(trade => trade.pnl < 0);
    const totalTrades = this.tradeHistory.length;

    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const averageWin = wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length) : 0;
    const profitFactor = averageLoss > 0 ? (averageWin * wins.length) / (averageLoss * losses.length) : 0;

    return {
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate,
      averageWin,
      averageLoss,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
      profitFactor,
      expectancy: (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss,
      consecutiveWins: this.calculateCurrentConsecutiveWins(),
      consecutiveLosses: this.calculateCurrentConsecutiveLosses(),
      maxConsecutiveWins: this.calculateMaxConsecutiveWins(),
      maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(),
      averageHoldTime: this.calculateAverageHoldTime(),
      turnoverRate: this.calculateTurnoverRate(),
    };
  }

  // Private calculation methods

  private calculateReturns(): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < this.snapshots.length; i++) {
      const prevValue = this.snapshots[i - 1].totalValue;
      const currValue = this.snapshots[i].totalValue;
      
      if (prevValue.gt(new BN(0))) {
        const returnPct = currValue.sub(prevValue).muln(100).div(prevValue).toNumber() / 100;
        returns.push(returnPct);
      }
    }
    
    return returns;
  }

  private calculateTotalReturn(): number {
    if (this.snapshots.length < 2) return 0;
    
    const firstValue = this.snapshots[0].totalValue;
    const lastValue = this.snapshots[this.snapshots.length - 1].totalValue;
    
    return lastValue.sub(firstValue).toNumber();
  }

  private calculateTotalReturnPercent(): number {
    if (this.snapshots.length < 2) return 0;
    
    const firstValue = this.snapshots[0].totalValue;
    const lastValue = this.snapshots[this.snapshots.length - 1].totalValue;
    
    if (firstValue.gt(new BN(0))) {
      return lastValue.sub(firstValue).muln(100).div(firstValue).toNumber();
    }
    
    return 0;
  }

  private calculatePeriodReturn(days: number): number {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const startSnapshot = this.getSnapshotNearDate(cutoffTime);
    const endSnapshot = this.snapshots[this.snapshots.length - 1];
    
    if (!startSnapshot || !endSnapshot) return 0;
    
    return endSnapshot.totalValue.sub(startSnapshot.totalValue).toNumber();
  }

  private calculatePeriodReturnPercent(days: number): number {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const startSnapshot = this.getSnapshotNearDate(cutoffTime);
    const endSnapshot = this.snapshots[this.snapshots.length - 1];
    
    if (!startSnapshot || !endSnapshot || startSnapshot.totalValue.isZero()) return 0;
    
    return endSnapshot.totalValue.sub(startSnapshot.totalValue)
      .muln(100).div(startSnapshot.totalValue).toNumber();
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    const riskFreeRate = this.config.riskFreeRate / 365; // Daily risk-free rate
    
    return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downside = returns.filter(r => r < 0);
    const downsideStdDev = downside.length > 0 ? 
      Math.sqrt(downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length) : 0;
    const riskFreeRate = this.config.riskFreeRate / 365;
    
    return downsideStdDev > 0 ? (avgReturn - riskFreeRate) / downsideStdDev : 0;
  }

  private calculateMaxDrawdown(): number {
    if (this.snapshots.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = this.snapshots[0].totalValue;
    
    for (const snapshot of this.snapshots) {
      if (snapshot.totalValue.gt(peak)) {
        peak = snapshot.totalValue;
      } else {
        const drawdown = peak.sub(snapshot.totalValue).muln(100).div(peak).toNumber();
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private calculateVaR(confidence: number): BN {
    const returns = this.calculateReturns();
    if (returns.length === 0) return new BN(0);
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidence) * sortedReturns.length);
    const varReturn = sortedReturns[varIndex] || 0;
    
    const currentValue = this.snapshots[this.snapshots.length - 1]?.totalValue || new BN(0);
    return currentValue.muln(Math.abs(varReturn * 100)).divn(100);
  }

  private calculateExpectedShortfall(confidence: number): BN {
    const var95 = this.calculateVaR(confidence);
    return var95.muln(125).divn(100); // Approximate 25% worse than VaR
  }

  private calculateBeta(): number {
    // Calculate beta relative to benchmark
    const returns = this.calculateReturns();
    const benchmarkReturns = this.getBenchmarkReturns();
    
    if (returns.length !== benchmarkReturns.length || returns.length < 2) return 1.0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const avgBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < returns.length; i++) {
      covariance += (returns[i] - avgReturn) * (benchmarkReturns[i] - avgBenchmark);
      benchmarkVariance += Math.pow(benchmarkReturns[i] - avgBenchmark, 2);
    }
    
    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1.0;
  }

  private calculateCorrelation(): number {
    // Calculate correlation with benchmark
    const returns = this.calculateReturns();
    const benchmarkReturns = this.getBenchmarkReturns();
    
    return this.calculateCorrelationWithBenchmark(returns, benchmarkReturns);
  }

  private calculateConcentrationRisk(portfolio: Portfolio): number {
    // Calculate Herfindahl-Hirschman Index
    let hhi = 0;
    
    for (const position of portfolio.positions.values()) {
      const weight = position.allocation / 100;
      hhi += weight * weight;
    }
    
    return hhi * 10; // Scale to 0-10
  }

  private calculateLiquidityRisk(portfolio: Portfolio): number {
    // Estimate liquidity risk based on position sizes and market liquidity
    let liquidityRisk = 0;
    let totalWeight = 0;
    
    for (const position of portfolio.positions.values()) {
      const weight = position.allocation / 100;
      const positionLiquidityRisk = this.estimatePositionLiquidityRisk(position);
      liquidityRisk += positionLiquidityRisk * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? liquidityRisk / totalWeight : 0;
  }

  private estimatePositionLiquidityRisk(position: Position): number {
    // Estimate liquidity risk for individual position
    // This would integrate with market data
    return 5.0; // Placeholder
  }

  private calculatePortfolioRisk(): number {
    // Calculate overall portfolio risk score
    const returns = this.calculateReturns();
    const volatility = this.calculateVolatility(returns);
    
    return Math.min(volatility * 10, 10); // Scale to 0-10
  }

  private calculateMarketRisk(): number {
    // Calculate market risk component
    return 5.0; // Placeholder
  }

  private calculateSpecificRisk(): number {
    // Calculate specific risk component
    return 3.0; // Placeholder
  }

  private calculateCorrelationMatrix(portfolio: Portfolio): number[][] {
    // Calculate correlation matrix between positions
    const positions = Array.from(portfolio.positions.values());
    const n = positions.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          matrix[i][j] = this.calculatePositionCorrelation(positions[i], positions[j]);
        }
      }
    }
    
    return matrix;
  }

  private calculatePositionCorrelation(posA: Position, posB: Position): number {
    // Calculate correlation between two positions
    // This would use historical price data
    return 0.3; // Placeholder
  }

  private runStressTests(portfolio: Portfolio): any[] {
    // Run stress tests on portfolio
    return [
      {
        scenario: 'Market Crash -20%',
        portfolioImpact: portfolio.totalValue.muln(20).divn(100),
        worstAssets: ['SOL', 'RAY'],
      },
      {
        scenario: 'High Volatility',
        portfolioImpact: portfolio.totalValue.muln(15).divn(100),
        worstAssets: ['MEME', 'SHITCOIN'],
      },
    ];
  }

  private calculateRiskContributions(portfolio: Portfolio): Map<string, number> {
    const contributions = new Map<string, number>();
    
    for (const [tokenMint, position] of portfolio.positions) {
      const contribution = position.allocation * this.estimatePositionRisk(position);
      contributions.set(tokenMint, contribution);
    }
    
    return contributions;
  }

  private estimatePositionRisk(position: Position): number {
    // Estimate risk contribution of individual position
    return 1.0; // Placeholder
  }

  private calculateMarginOfSafety(portfolio: Portfolio): number {
    // Calculate margin of safety based on risk metrics
    return 15.0; // Placeholder
  }

  // Helper methods

  private getSnapshotNearDate(targetDate: number): PortfolioSnapshot | null {
    let closest: PortfolioSnapshot | null = null;
    let minDiff = Infinity;
    
    for (const snapshot of this.snapshots) {
      const diff = Math.abs(snapshot.timestamp - targetDate);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }
    
    return closest;
  }

  private getStartDateForPeriod(period: string, endDate: number): number {
    const periodDays = this.getDaysInPeriod(period);
    return endDate - (periodDays * 24 * 60 * 60 * 1000);
  }

  private getDaysInPeriod(period: string): number {
    const periodMap: Record<string, number> = {
      '1D': 1,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      'YTD': this.getDaysSinceYearStart(),
      'ALL': this.getDaysSinceStart(),
    };
    
    return periodMap[period] || 30;
  }

  private getDaysSinceYearStart(): number {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
  }

  private getDaysSinceStart(): number {
    if (this.snapshots.length === 0) return 0;
    const firstSnapshot = this.snapshots[0];
    return Math.floor((Date.now() - firstSnapshot.timestamp) / (24 * 60 * 60 * 1000));
  }

  private getBenchmarkReturns(): number[] {
    // Get benchmark returns for correlation/beta calculations
    return []; // Placeholder
  }

  private getBenchmarkReturnsForPeriod(startDate: number, endDate: number): number[] {
    // Get benchmark returns for specific period
    return []; // Placeholder
  }

  private calculateReturnPercent(startValue: BN, endValue: BN): number {
    if (startValue.isZero()) return 0;
    return endValue.sub(startValue).muln(100).div(startValue).toNumber();
  }

  private annualizeReturn(returnPercent: number, days: number): number {
    return Math.pow(1 + returnPercent / 100, 365 / days) - 1;
  }

  private calculateMaxDrawdownForPeriod(startDate: number, endDate: number): number {
    const periodSnapshots = this.snapshots.filter(
      s => s.timestamp >= startDate && s.timestamp <= endDate
    );
    
    if (periodSnapshots.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = periodSnapshots[0].totalValue;
    
    for (const snapshot of periodSnapshots) {
      if (snapshot.totalValue.gt(peak)) {
        peak = snapshot.totalValue;
      } else {
        const drawdown = peak.sub(snapshot.totalValue).muln(100).div(peak).toNumber();
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  private calculateCalmarRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const maxDrawdown = this.calculateMaxDrawdown();
    return maxDrawdown > 0 ? (avgReturn * 365) / maxDrawdown : 0;
  }

  private calculateReturnsForPeriod(startDate: number, endDate: number): number[] {
    const periodSnapshots = this.snapshots.filter(
      s => s.timestamp >= startDate && s.timestamp <= endDate
    );
    
    const returns: number[] = [];
    for (let i = 1; i < periodSnapshots.length; i++) {
      const prevValue = periodSnapshots[i - 1].totalValue;
      const currValue = periodSnapshots[i].totalValue;
      
      if (prevValue.gt(new BN(0))) {
        const returnPct = currValue.sub(prevValue).muln(100).div(prevValue).toNumber() / 100;
        returns.push(returnPct);
      }
    }
    
    return returns;
  }

  private calculateBenchmarkReturn(benchmarkReturns: number[]): number {
    return benchmarkReturns.reduce((sum, r) => sum + r, 0);
  }

  private calculateCorrelationWithBenchmark(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length || returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const avgBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let returnVariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < returns.length; i++) {
      const returnDiff = returns[i] - avgReturn;
      const benchmarkDiff = benchmarkReturns[i] - avgBenchmark;
      
      covariance += returnDiff * benchmarkDiff;
      returnVariance += returnDiff * returnDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    const denominator = Math.sqrt(returnVariance * benchmarkVariance);
    return denominator > 0 ? covariance / denominator : 0;
  }

  private calculateTrackingError(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length) return 0;
    
    const activereturns = returns.map((r, i) => r - (benchmarkReturns[i] || 0));
    return this.calculateVolatility(activereturns);
  }

  private calculateInformationRatio(returns: number[], benchmarkReturns: number[]): number {
    const trackingError = this.calculateTrackingError(returns, benchmarkReturns);
    if (trackingError === 0) return 0;
    
    const avgExcessReturn = returns.reduce((sum, r, i) => sum + (r - (benchmarkReturns[i] || 0)), 0) / returns.length;
    return avgExcessReturn / trackingError;
  }

  private calculateAlpha(returns: number[], benchmarkReturns: number[]): number {
    const beta = this.calculateBeta();
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const avgBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    const riskFreeRate = this.config.riskFreeRate / 365;
    
    return avgReturn - (riskFreeRate + beta * (avgBenchmark - riskFreeRate));
  }

  private calculatePerformanceAttribution(returns: number[], benchmarkReturns: number[]): any {
    // Simplified attribution analysis
    return {
      assetAllocation: 0.02, // 2%
      stockSelection: 0.01, // 1%
      interaction: 0.001, // 0.1%
      totalActiveReturn: 0.031, // 3.1%
    };
  }

  private getTopPositions(snapshot: PortfolioSnapshot, count: number): Position[] {
    return Array.from(snapshot.positions.values())
      .sort((a, b) => b.unrealizedPnL.sub(a.unrealizedPnL).toNumber())
      .slice(0, count);
  }

  private getWorstPositions(snapshot: PortfolioSnapshot, count: number): Position[] {
    return Array.from(snapshot.positions.values())
      .sort((a, b) => a.unrealizedPnL.sub(b.unrealizedPnL).toNumber())
      .slice(0, count);
  }

  private generateRecommendations(snapshot: PortfolioSnapshot): string[] {
    const recommendations: string[] = [];
    
    // Check concentration
    const concentrationRisk = this.calculateConcentrationRisk({ 
      totalValue: snapshot.totalValue,
      cashBalance: new BN(0),
      positions: snapshot.positions,
      performance: snapshot.performance,
      riskMetrics: snapshot.riskMetrics,
      allocation: [],
    });
    
    if (concentrationRisk > 7) {
      recommendations.push('Portfolio is highly concentrated - consider diversification');
    }
    
    // Check drawdown
    if (snapshot.performance.maxDrawdown > 15) {
      recommendations.push('Consider reducing risk exposure due to high drawdown');
    }
    
    // Check performance
    if (snapshot.performance.sharpeRatio < 1.0) {
      recommendations.push('Risk-adjusted returns could be improved');
    }
    
    return recommendations;
  }

  private calculateWinRate(): number {
    const trades = this.tradeHistory;
    if (trades.length === 0) return 0;
    
    const winningTrades = trades.filter(trade => trade.pnl > 0).length;
    return (winningTrades / trades.length) * 100;
  }

  private calculateProfitFactor(): number {
    const wins = this.tradeHistory.filter(trade => trade.pnl > 0);
    const losses = this.tradeHistory.filter(trade => trade.pnl < 0);
    
    const totalWins = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    
    return totalLosses > 0 ? totalWins / totalLosses : 0;
  }

  private calculateAverageWin(): number {
    const wins = this.tradeHistory.filter(trade => trade.pnl > 0);
    return wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.pnl, 0) / wins.length : 0;
  }

  private calculateAverageLoss(): number {
    const losses = this.tradeHistory.filter(trade => trade.pnl < 0);
    return losses.length > 0 ? Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0) / losses.length) : 0;
  }

  private calculateCurrentConsecutiveWins(): number {
    let consecutive = 0;
    for (let i = this.tradeHistory.length - 1; i >= 0; i--) {
      if (this.tradeHistory[i].pnl > 0) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  private calculateCurrentConsecutiveLosses(): number {
    let consecutive = 0;
    for (let i = this.tradeHistory.length - 1; i >= 0; i--) {
      if (this.tradeHistory[i].pnl < 0) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  private calculateMaxConsecutiveWins(): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const trade of this.tradeHistory) {
      if (trade.pnl > 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateMaxConsecutiveLosses(): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const trade of this.tradeHistory) {
      if (trade.pnl < 0) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }

  private calculateAverageHoldTime(): number {
    if (this.tradeHistory.length === 0) return 0;
    
    const totalHoldTime = this.tradeHistory.reduce((sum, trade) => 
      sum + (trade.exitTime - trade.entryTime), 0
    );
    
    return totalHoldTime / this.tradeHistory.length;
  }

  private calculateTurnoverRate(): number {
    // Calculate annual turnover rate
    if (this.snapshots.length < 2) return 0;
    
    const timespan = this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp;
    const years = timespan / (365 * 24 * 60 * 60 * 1000);
    
    if (years === 0) return 0;
    
    const totalTradeValue = this.tradeHistory.reduce((sum, trade) => sum + Math.abs(trade.value), 0);
    const avgPortfolioValue = this.snapshots.reduce((sum, s) => sum + s.totalValue.toNumber(), 0) / this.snapshots.length;
    
    return avgPortfolioValue > 0 ? (totalTradeValue / avgPortfolioValue) / years : 0;
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
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
    };
  }

  // Public getters
  getSnapshots(): PortfolioSnapshot[] {
    return [...this.snapshots];
  }

  getTradeHistory(): any[] {
    return [...this.tradeHistory];
  }

  isTrackingActive(): boolean {
    return this.isTracking;
  }
}

export default PortfolioAnalytics;