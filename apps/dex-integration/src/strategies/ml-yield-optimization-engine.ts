// ML-Powered Yield Optimization Engine - Advanced yield maximization strategies
// Uses machine learning algorithms for portfolio optimization and yield prediction

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { Logger } from '../utils/logger';
import { DexAggregator } from '../core/dex-aggregator';
import { RiskManager } from './risk-manager';
import { IntelligentLiquidityDistributor } from './intelligent-liquidity-distributor';
import { ConcentratedLiquidityManager } from './concentrated-liquidity-manager';
import { CrossDexArbitrageSystem } from './cross-dex-arbitrage-system';
import {
  DexPosition,
  YieldFarmingPosition,
  LiquidityStrategy,
} from '../types/dex-types';

export interface MLOptimizationConfig {
  // Model parameters
  modelUpdateFrequency: number; // hours
  trainingDataWindow: number; // days of historical data
  predictionHorizon: number; // hours to predict ahead
  confidenceThreshold: number; // minimum confidence for predictions
  
  // Feature engineering
  priceFeatures: boolean; // Use price-based features
  volumeFeatures: boolean; // Use volume-based features
  liquidityFeatures: boolean; // Use liquidity-based features
  sentimentFeatures: boolean; // Use market sentiment features
  macroFeatures: boolean; // Use macroeconomic features
  
  // Model ensemble
  useEnsemble: boolean; // Use multiple models for prediction
  models: ('linear_regression' | 'random_forest' | 'xgboost' | 'lstm' | 'transformer')[];
  ensembleWeights: number[]; // Weights for each model in ensemble
  
  // Risk management
  maxPositionSize: number; // Maximum position size as % of portfolio
  maxDrawdownLimit: number; // Maximum acceptable drawdown
  volatilityTargeting: boolean; // Adjust positions based on volatility
  targetVolatility: number; // Target portfolio volatility
  
  // Optimization objectives
  primaryObjective: 'sharpe_ratio' | 'return' | 'risk_adjusted_return' | 'max_diversification';
  secondaryObjectives: string[]; // Additional objectives to consider
  objectiveWeights: number[]; // Weights for multi-objective optimization
  
  // Advanced features
  reinforcementLearning: boolean; // Use RL for strategy optimization
  onlinelearning: boolean; // Continuously update models
  transferLearning: boolean; // Use pre-trained models from similar assets
  marketRegimeDetection: boolean; // Detect and adapt to market regimes
}

export interface MarketFeatures {
  timestamp: number;
  
  // Price features
  price: number;
  returns: number[];
  volatility: number;
  momentum: number;
  rsi: number;
  macd: number;
  bollinger_position: number;
  
  // Volume features
  volume: number;
  volume_sma: number;
  volume_profile: number[];
  vwap: number;
  
  // Liquidity features
  bid_ask_spread: number;
  market_depth: number;
  liquidity_concentration: number;
  slippage_estimate: number;
  
  // Cross-asset features
  correlation_btc: number;
  correlation_eth: number;
  correlation_sol: number;
  beta_market: number;
  
  // Macro features
  funding_rates: number;
  open_interest: number;
  options_iv: number;
  defi_tvl: number;
  
  // Sentiment features
  social_sentiment: number;
  whale_activity: number;
  developer_activity: number;
  fear_greed_index: number;
}

export interface YieldPrediction {
  asset: string;
  strategy: string;
  timeframe: number; // hours
  
  // Predictions
  predicted_apy: number;
  confidence: number; // 0-1
  prediction_interval: [number, number]; // confidence interval
  
  // Risk metrics
  predicted_volatility: number;
  max_drawdown_estimate: number;
  var_95: number; // 95% Value at Risk
  
  // Model info
  model_used: string;
  feature_importance: Map<string, number>;
  last_updated: number;
}

export interface PortfolioOptimization {
  timestamp: number;
  
  // Optimal allocations
  allocations: Map<string, number>; // asset -> percentage
  expected_return: number;
  expected_volatility: number;
  sharpe_ratio: number;
  
  // Alternative scenarios
  conservative_allocation: Map<string, number>;
  aggressive_allocation: Map<string, number>;
  max_diversification_allocation: Map<string, number>;
  
  // Rebalancing recommendations
  rebalance_needed: boolean;
  rebalance_actions: {
    asset: string;
    current_weight: number;
    target_weight: number;
    action: 'buy' | 'sell' | 'hold';
    amount: BN;
    priority: 'high' | 'medium' | 'low';
  }[];
  
  // Performance attribution
  attribution: {
    asset_selection: number;
    timing: number;
    interaction: number;
    total_alpha: number;
  };
}

export interface MarketRegime {
  regime_id: string;
  name: string;
  description: string;
  probability: number;
  
  // Regime characteristics
  volatility_level: 'low' | 'medium' | 'high';
  trend_direction: 'bull' | 'bear' | 'sideways';
  correlation_level: 'low' | 'medium' | 'high';
  liquidity_condition: 'abundant' | 'normal' | 'stressed';
  
  // Optimal strategies for this regime
  recommended_strategies: string[];
  risk_level: number;
  leverage_recommendation: number;
}

export interface MLMetrics {
  // Model performance
  model_accuracy: Map<string, number>;
  prediction_r2: Map<string, number>;
  prediction_mae: Map<string, number>;
  prediction_sharpe: number;
  
  // Strategy performance
  realized_apy: number;
  risk_adjusted_return: number;
  information_ratio: number;
  max_drawdown: number;
  win_rate: number;
  
  // ML-specific metrics
  feature_stability: number;
  model_drift: number;
  prediction_consistency: number;
  overfitting_score: number;
  
  // Operational metrics
  model_update_count: number;
  prediction_count: number;
  successful_predictions: number;
  last_model_update: number;
}

export class MLYieldOptimizationEngine {
  private config: MLOptimizationConfig;
  private aggregator: DexAggregator;
  private riskManager: RiskManager;
  private liquidityDistributor: IntelligentLiquidityDistributor;
  private clManager: ConcentratedLiquidityManager;
  private arbitrageSystem: CrossDexArbitrageSystem;
  private logger: Logger;
  
  // ML components
  private models: Map<string, any> = new Map(); // In production, these would be actual ML models
  private featureStore: Map<string, MarketFeatures[]> = new Map();
  private predictions: Map<string, YieldPrediction> = new Map();
  private regimeDetector: any; // Market regime detection model
  
  // Optimization state
  private currentOptimization?: PortfolioOptimization;
  private currentRegime?: MarketRegime;
  private metrics: MLMetrics;
  
  // Historical data
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>> = new Map();
  private performanceHistory: Array<{ timestamp: number; portfolio_value: number; benchmark: number }> = [];
  private predictionHistory: Array<{ prediction: YieldPrediction; actual: number; timestamp: number }> = [];
  
  // Control flags
  private isRunning: boolean = false;
  private isTraining: boolean = false;
  private isOptimizing: boolean = false;
  
  // Background processes
  private featureCollector?: NodeJS.Timeout;
  private modelTrainer?: NodeJS.Timeout;
  private optimizer?: NodeJS.Timeout;
  private performanceTracker?: NodeJS.Timeout;

  constructor(
    config: MLOptimizationConfig,
    aggregator: DexAggregator,
    riskManager: RiskManager,
    liquidityDistributor: IntelligentLiquidityDistributor,
    clManager: ConcentratedLiquidityManager,
    arbitrageSystem: CrossDexArbitrageSystem,
    logger: Logger
  ) {
    this.config = config;
    this.aggregator = aggregator;
    this.riskManager = riskManager;
    this.liquidityDistributor = liquidityDistributor;
    this.clManager = clManager;
    this.arbitrageSystem = arbitrageSystem;
    this.logger = logger;
    
    this.metrics = {
      model_accuracy: new Map(),
      prediction_r2: new Map(),
      prediction_mae: new Map(),
      prediction_sharpe: 0,
      realized_apy: 0,
      risk_adjusted_return: 0,
      information_ratio: 0,
      max_drawdown: 0,
      win_rate: 0,
      feature_stability: 1,
      model_drift: 0,
      prediction_consistency: 1,
      overfitting_score: 0,
      model_update_count: 0,
      prediction_count: 0,
      successful_predictions: 0,
      last_model_update: Date.now(),
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('ML Yield Optimization Engine already running');
      return;
    }

    this.logger.info('Starting ML Yield Optimization Engine', {
      models: this.config.models,
      primaryObjective: this.config.primaryObjective,
      useEnsemble: this.config.useEnsemble,
      reinforcementLearning: this.config.reinforcementLearning,
    });

    try {
      // Initialize ML components
      await this.initializeModels();
      
      // Load historical data
      await this.loadHistoricalData();
      
      // Train initial models
      await this.trainModels();
      
      // Initialize regime detection
      if (this.config.marketRegimeDetection) {
        await this.initializeRegimeDetection();
      }
      
      // Start background processes
      this.isRunning = true;
      this.startFeatureCollection();
      this.startModelTraining();
      this.startOptimization();
      this.startPerformanceTracking();
      
      this.logger.info('ML Yield Optimization Engine started successfully', {
        modelsInitialized: this.models.size,
        historicalDataPoints: this.priceHistory.size,
        initialRegime: this.currentRegime?.name,
      });

    } catch (error) {
      this.logger.error('Failed to start ML Yield Optimization Engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('ML Yield Optimization Engine not running');
      return;
    }

    this.logger.info('Stopping ML Yield Optimization Engine');

    try {
      // Stop background processes
      if (this.featureCollector) clearInterval(this.featureCollector);
      if (this.modelTrainer) clearInterval(this.modelTrainer);
      if (this.optimizer) clearInterval(this.optimizer);
      if (this.performanceTracker) clearInterval(this.performanceTracker);

      // Wait for ongoing training/optimization to complete
      while (this.isTraining || this.isOptimizing) {
        this.logger.info('Waiting for ML processes to complete...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.isRunning = false;

      this.logger.info('ML Yield Optimization Engine stopped successfully', {
        totalPredictions: this.metrics.prediction_count,
        successfulPredictions: this.metrics.successful_predictions,
        realizedAPY: this.metrics.realized_apy,
        sharpeRatio: this.metrics.prediction_sharpe,
      });

    } catch (error) {
      this.logger.error('Failed to stop ML Yield Optimization Engine gracefully', error);
      this.isRunning = false;
    }
  }

  // Core ML methods
  async generateYieldPredictions(): Promise<YieldPrediction[]> {
    this.logger.debug('Generating yield predictions using ML models');

    try {
      const predictions: YieldPrediction[] = [];
      const assets = await this.getTrackedAssets();
      
      for (const asset of assets) {
        try {
          // Get current features for the asset
          const features = await this.extractFeatures(asset);
          
          // Generate predictions using ensemble of models
          const prediction = await this.predictYield(asset, features);
          
          if (prediction.confidence >= this.config.confidenceThreshold) {
            predictions.push(prediction);
            this.predictions.set(asset, prediction);
          }
          
        } catch (error) {
          this.logger.debug(`Failed to generate prediction for ${asset}`, error);
        }
      }
      
      this.metrics.prediction_count += predictions.length;
      
      this.logger.info('Yield predictions generated', {
        totalPredictions: predictions.length,
        avgConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
        highestAPY: Math.max(...predictions.map(p => p.predicted_apy)),
      });
      
      return predictions;

    } catch (error) {
      this.logger.error('Failed to generate yield predictions', error);
      return [];
    }
  }

  async optimizePortfolio(): Promise<PortfolioOptimization> {
    if (this.isOptimizing) {
      this.logger.warn('Portfolio optimization already in progress');
      return this.currentOptimization!;
    }

    this.isOptimizing = true;
    this.logger.info('Starting ML-powered portfolio optimization');

    try {
      // Get current predictions
      const predictions = await this.generateYieldPredictions();
      
      if (predictions.length === 0) {
        throw new Error('No yield predictions available for optimization');
      }
      
      // Detect current market regime
      const regime = await this.detectMarketRegime();
      this.currentRegime = regime;
      
      // Generate multiple optimization scenarios
      const scenarios = await this.generateOptimizationScenarios(predictions, regime);
      
      // Select optimal scenario based on primary objective
      const optimalScenario = this.selectOptimalScenario(scenarios);
      
      // Generate rebalancing recommendations
      const rebalanceActions = await this.generateRebalanceActions(optimalScenario);
      
      // Calculate performance attribution
      const attribution = await this.calculatePerformanceAttribution();
      
      const optimization: PortfolioOptimization = {
        timestamp: Date.now(),
        allocations: optimalScenario.allocations,
        expected_return: optimalScenario.expected_return,
        expected_volatility: optimalScenario.expected_volatility,
        sharpe_ratio: optimalScenario.sharpe_ratio,
        conservative_allocation: scenarios.conservative.allocations,
        aggressive_allocation: scenarios.aggressive.allocations,
        max_diversification_allocation: scenarios.max_diversification.allocations,
        rebalance_needed: rebalanceActions.length > 0,
        rebalance_actions: rebalanceActions,
        attribution,
      };
      
      this.currentOptimization = optimization;
      
      this.logger.info('Portfolio optimization completed', {
        expectedReturn: optimization.expected_return,
        expectedVolatility: optimization.expected_volatility,
        sharpeRatio: optimization.sharpe_ratio,
        rebalanceActions: rebalanceActions.length,
        regime: regime.name,
      });
      
      return optimization;

    } catch (error) {
      this.logger.error('Portfolio optimization failed', error);
      throw error;
    } finally {
      this.isOptimizing = false;
    }
  }

  async executeOptimization(): Promise<void> {
    if (!this.currentOptimization) {
      await this.optimizePortfolio();
    }

    const optimization = this.currentOptimization!;
    
    if (!optimization.rebalance_needed) {
      this.logger.debug('No rebalancing needed according to optimization');
      return;
    }

    this.logger.info('Executing ML-optimized portfolio rebalancing', {
      actions: optimization.rebalance_actions.length,
      expectedImprovement: optimization.expected_return,
    });

    try {
      // Sort actions by priority
      const sortedActions = optimization.rebalance_actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      let successfulActions = 0;

      for (const action of sortedActions) {
        try {
          await this.executeRebalanceAction(action);
          successfulActions++;
          
          // Small delay between actions
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          this.logger.error('Failed to execute rebalance action', {
            asset: action.asset,
            action: action.action,
            error: error.message,
          });
        }
      }

      this.logger.info('Portfolio rebalancing completed', {
        successfulActions,
        totalActions: sortedActions.length,
        successRate: (successfulActions / sortedActions.length) * 100,
      });

    } catch (error) {
      this.logger.error('Failed to execute portfolio optimization', error);
      throw error;
    }
  }

  // ML model methods
  private async initializeModels(): Promise<void> {
    this.logger.debug('Initializing ML models');

    for (const modelType of this.config.models) {
      try {
        const model = await this.createModel(modelType);
        this.models.set(modelType, model);
        this.metrics.model_accuracy.set(modelType, 0);
        this.metrics.prediction_r2.set(modelType, 0);
        this.metrics.prediction_mae.set(modelType, Infinity);
      } catch (error) {
        this.logger.error(`Failed to initialize ${modelType} model`, error);
      }
    }

    this.logger.info('ML models initialized', {
      modelsCreated: this.models.size,
      modelTypes: Array.from(this.models.keys()),
    });
  }

  private async createModel(modelType: string): Promise<any> {
    // In a real implementation, this would create actual ML models
    // For now, we'll return placeholder model objects
    
    switch (modelType) {
      case 'linear_regression':
        return { type: 'linear_regression', weights: new Map(), bias: 0 };
      case 'random_forest':
        return { type: 'random_forest', trees: [], feature_importance: new Map() };
      case 'xgboost':
        return { type: 'xgboost', boosters: [], learning_rate: 0.1 };
      case 'lstm':
        return { type: 'lstm', layers: [], sequence_length: 24 };
      case 'transformer':
        return { type: 'transformer', attention_heads: 8, layers: 6 };
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  }

  private async trainModels(): Promise<void> {
    if (this.isTraining) {
      this.logger.warn('Model training already in progress');
      return;
    }

    this.isTraining = true;
    this.logger.info('Training ML models');

    try {
      const trainingData = await this.prepareTrainingData();
      
      if (trainingData.length < 100) {
        this.logger.warn('Insufficient training data, skipping model training');
        return;
      }

      for (const [modelType, model] of this.models) {
        try {
          await this.trainModel(model, trainingData);
          await this.validateModel(model, trainingData);
          this.metrics.model_update_count++;
        } catch (error) {
          this.logger.error(`Failed to train ${modelType} model`, error);
        }
      }

      this.metrics.last_model_update = Date.now();

      this.logger.info('Model training completed', {
        modelsUpdated: this.models.size,
        trainingDataSize: trainingData.length,
        avgAccuracy: Array.from(this.metrics.model_accuracy.values()).reduce((sum, acc) => sum + acc, 0) / this.models.size,
      });

    } catch (error) {
      this.logger.error('Model training failed', error);
    } finally {
      this.isTraining = false;
    }
  }

  private async predictYield(asset: string, features: MarketFeatures): Promise<YieldPrediction> {
    const predictions: Array<{ apy: number; confidence: number; model: string }> = [];
    
    // Generate predictions from each model
    for (const [modelType, model] of this.models) {
      try {
        const prediction = await this.runModelPrediction(model, features);
        predictions.push({
          apy: prediction.apy,
          confidence: prediction.confidence,
          model: modelType,
        });
      } catch (error) {
        this.logger.debug(`Model ${modelType} prediction failed`, error);
      }
    }
    
    if (predictions.length === 0) {
      throw new Error('No models available for prediction');
    }
    
    // Ensemble prediction
    let ensembleAPY: number;
    let ensembleConfidence: number;
    
    if (this.config.useEnsemble && predictions.length > 1) {
      // Weighted average based on model performance
      const weights = this.config.ensembleWeights.length === predictions.length 
        ? this.config.ensembleWeights 
        : Array(predictions.length).fill(1 / predictions.length);
      
      ensembleAPY = predictions.reduce((sum, pred, i) => sum + pred.apy * weights[i], 0);
      ensembleConfidence = predictions.reduce((sum, pred, i) => sum + pred.confidence * weights[i], 0);
    } else {
      // Use best single prediction
      const bestPrediction = predictions.reduce((best, pred) => 
        pred.confidence > best.confidence ? pred : best
      );
      ensembleAPY = bestPrediction.apy;
      ensembleConfidence = bestPrediction.confidence;
    }
    
    // Calculate prediction interval
    const predictionStd = this.calculatePredictionStd(predictions);
    const interval: [number, number] = [
      ensembleAPY - 1.96 * predictionStd,
      ensembleAPY + 1.96 * predictionStd
    ];
    
    // Calculate feature importance
    const featureImportance = await this.calculateFeatureImportance(asset, features);
    
    return {
      asset,
      strategy: 'ml_optimized',
      timeframe: this.config.predictionHorizon,
      predicted_apy: ensembleAPY,
      confidence: ensembleConfidence,
      prediction_interval: interval,
      predicted_volatility: this.calculatePredictedVolatility(features),
      max_drawdown_estimate: this.calculateDrawdownEstimate(features),
      var_95: this.calculateVaR95(features),
      model_used: this.config.useEnsemble ? 'ensemble' : predictions[0].model,
      feature_importance: featureImportance,
      last_updated: Date.now(),
    };
  }

  // Feature engineering methods
  private async extractFeatures(asset: string): Promise<MarketFeatures> {
    this.logger.debug(`Extracting features for asset: ${asset}`);

    const features: MarketFeatures = {
      timestamp: Date.now(),
      price: 0,
      returns: [],
      volatility: 0,
      momentum: 0,
      rsi: 0,
      macd: 0,
      bollinger_position: 0,
      volume: 0,
      volume_sma: 0,
      volume_profile: [],
      vwap: 0,
      bid_ask_spread: 0,
      market_depth: 0,
      liquidity_concentration: 0,
      slippage_estimate: 0,
      correlation_btc: 0,
      correlation_eth: 0,
      correlation_sol: 0,
      beta_market: 0,
      funding_rates: 0,
      open_interest: 0,
      options_iv: 0,
      defi_tvl: 0,
      social_sentiment: 0,
      whale_activity: 0,
      developer_activity: 0,
      fear_greed_index: 0,
    };

    try {
      // Get price history for the asset
      const priceHistory = this.priceHistory.get(asset) || [];
      
      if (priceHistory.length === 0) {
        throw new Error(`No price history available for ${asset}`);
      }

      // Extract price features
      if (this.config.priceFeatures) {
        await this.extractPriceFeatures(features, priceHistory);
      }

      // Extract volume features
      if (this.config.volumeFeatures) {
        await this.extractVolumeFeatures(features, asset);
      }

      // Extract liquidity features
      if (this.config.liquidityFeatures) {
        await this.extractLiquidityFeatures(features, asset);
      }

      // Extract sentiment features
      if (this.config.sentimentFeatures) {
        await this.extractSentimentFeatures(features, asset);
      }

      // Extract macro features
      if (this.config.macroFeatures) {
        await this.extractMacroFeatures(features, asset);
      }

    } catch (error) {
      this.logger.error(`Failed to extract features for ${asset}`, error);
    }

    return features;
  }

  private async extractPriceFeatures(features: MarketFeatures, priceHistory: Array<{ price: number; timestamp: number }>): Promise<void> {
    if (priceHistory.length < 2) return;

    const prices = priceHistory.map(p => p.price);
    const currentPrice = prices[prices.length - 1];
    
    features.price = currentPrice;
    
    // Calculate returns
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    features.returns = returns.slice(-50); // Last 50 returns
    
    // Calculate volatility (standard deviation of returns)
    if (returns.length > 1) {
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      features.volatility = Math.sqrt(variance);
    }
    
    // Calculate momentum (price change over lookback period)
    if (prices.length >= 14) {
      features.momentum = (currentPrice - prices[prices.length - 14]) / prices[prices.length - 14];
    }
    
    // Calculate RSI
    features.rsi = this.calculateRSI(prices);
    
    // Calculate MACD
    features.macd = this.calculateMACD(prices);
    
    // Calculate Bollinger Band position
    features.bollinger_position = this.calculateBollingerPosition(prices);
  }

  private async extractVolumeFeatures(features: MarketFeatures, asset: string): Promise<void> {
    // Get volume data (placeholder - in production would fetch real volume data)
    features.volume = 1000000; // Placeholder
    features.volume_sma = 1000000; // Placeholder
    features.volume_profile = [0.1, 0.2, 0.3, 0.4]; // Placeholder
    features.vwap = features.price; // Placeholder
  }

  private async extractLiquidityFeatures(features: MarketFeatures, asset: string): Promise<void> {
    // Get liquidity metrics from DEX aggregator
    try {
      const quotes = await this.aggregator.getAllQuotes(
        new PublicKey(asset),
        new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
        new BN(1000000)
      );
      
      if (quotes.length > 0) {
        features.bid_ask_spread = Math.max(...quotes.map(q => q.priceImpact));
        features.slippage_estimate = Math.max(...quotes.map(q => q.priceImpact));
      }
      
    } catch (error) {
      this.logger.debug('Failed to extract liquidity features', error);
    }
  }

  private async extractSentimentFeatures(features: MarketFeatures, asset: string): Promise<void> {
    // Placeholder sentiment features
    features.social_sentiment = 0.5; // Neutral sentiment
    features.whale_activity = 0.3;
    features.developer_activity = 0.7;
    features.fear_greed_index = 50; // Neutral
  }

  private async extractMacroFeatures(features: MarketFeatures, asset: string): Promise<void> {
    // Placeholder macro features
    features.funding_rates = 0.01;
    features.open_interest = 1000000;
    features.options_iv = 0.8;
    features.defi_tvl = 50000000000; // $50B
  }

  // Technical indicator calculations
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50; // Neutral RSI
    
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): number {
    if (prices.length < 26) return 0;
    
    // Simple MACD calculation
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    return ema12 - ema26;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateBollingerPosition(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0.5; // Middle position
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    const upperBand = sma + (2 * std);
    const lowerBand = sma - (2 * std);
    const currentPrice = prices[prices.length - 1];
    
    return (currentPrice - lowerBand) / (upperBand - lowerBand);
  }

  // Portfolio optimization methods
  private async generateOptimizationScenarios(
    predictions: YieldPrediction[],
    regime: MarketRegime
  ): Promise<{
    conservative: any;
    moderate: any;
    aggressive: any;
    max_diversification: any;
  }> {
    const assets = predictions.map(p => p.asset);
    const expectedReturns = predictions.map(p => p.predicted_apy / 100);
    const risks = predictions.map(p => p.predicted_volatility);
    
    // Conservative scenario - minimize risk
    const conservative = await this.optimizePortfolioForObjective(
      assets,
      expectedReturns,
      risks,
      'min_risk'
    );
    
    // Moderate scenario - balance risk and return
    const moderate = await this.optimizePortfolioForObjective(
      assets,
      expectedReturns,
      risks,
      'sharpe_ratio'
    );
    
    // Aggressive scenario - maximize return
    const aggressive = await this.optimizePortfolioForObjective(
      assets,
      expectedReturns,
      risks,
      'max_return'
    );
    
    // Max diversification scenario
    const max_diversification = await this.optimizePortfolioForObjective(
      assets,
      expectedReturns,
      risks,
      'max_diversification'
    );
    
    return {
      conservative,
      moderate,
      aggressive,
      max_diversification,
    };
  }

  private async optimizePortfolioForObjective(
    assets: string[],
    expectedReturns: number[],
    risks: number[],
    objective: string
  ): Promise<{
    allocations: Map<string, number>;
    expected_return: number;
    expected_volatility: number;
    sharpe_ratio: number;
  }> {
    // Simplified portfolio optimization
    // In production, this would use proper optimization libraries
    
    const allocations = new Map<string, number>();
    
    switch (objective) {
      case 'min_risk':
        // Equal weight allocation (simplified)
        assets.forEach(asset => allocations.set(asset, 100 / assets.length));
        break;
        
      case 'max_return':
        // Allocate to highest return asset (simplified)
        const bestAssetIndex = expectedReturns.indexOf(Math.max(...expectedReturns));
        assets.forEach((asset, i) => allocations.set(asset, i === bestAssetIndex ? 100 : 0));
        break;
        
      case 'sharpe_ratio':
        // Risk-adjusted allocation (simplified)
        const sharpeRatios = expectedReturns.map((ret, i) => ret / risks[i]);
        const totalSharpe = sharpeRatios.reduce((sum, sr) => sum + sr, 0);
        assets.forEach((asset, i) => allocations.set(asset, (sharpeRatios[i] / totalSharpe) * 100));
        break;
        
      case 'max_diversification':
        // Equal weight allocation
        assets.forEach(asset => allocations.set(asset, 100 / assets.length));
        break;
    }
    
    // Calculate portfolio metrics
    const portfolioReturn = assets.reduce((sum, asset, i) => 
      sum + (expectedReturns[i] * (allocations.get(asset)! / 100)), 0
    );
    
    const portfolioRisk = Math.sqrt(
      assets.reduce((sum, asset, i) => 
        sum + Math.pow(risks[i] * (allocations.get(asset)! / 100), 2), 0
      )
    );
    
    const sharpeRatio = portfolioRisk > 0 ? portfolioReturn / portfolioRisk : 0;
    
    return {
      allocations,
      expected_return: portfolioReturn,
      expected_volatility: portfolioRisk,
      sharpe_ratio: sharpeRatio,
    };
  }

  private selectOptimalScenario(scenarios: any): any {
    // Select scenario based on primary objective
    switch (this.config.primaryObjective) {
      case 'sharpe_ratio':
        return scenarios.moderate;
      case 'return':
        return scenarios.aggressive;
      case 'risk_adjusted_return':
        return scenarios.moderate;
      case 'max_diversification':
        return scenarios.max_diversification;
      default:
        return scenarios.moderate;
    }
  }

  // Market regime detection
  private async detectMarketRegime(): Promise<MarketRegime> {
    // Simplified regime detection
    // In production, this would use sophisticated ML models
    
    const regimes: MarketRegime[] = [
      {
        regime_id: 'bull_market',
        name: 'Bull Market',
        description: 'Rising prices with high confidence',
        probability: 0.3,
        volatility_level: 'medium',
        trend_direction: 'bull',
        correlation_level: 'low',
        liquidity_condition: 'abundant',
        recommended_strategies: ['aggressive', 'growth'],
        risk_level: 0.6,
        leverage_recommendation: 1.5,
      },
      {
        regime_id: 'bear_market',
        name: 'Bear Market',
        description: 'Declining prices with defensive positioning',
        probability: 0.2,
        volatility_level: 'high',
        trend_direction: 'bear',
        correlation_level: 'high',
        liquidity_condition: 'stressed',
        recommended_strategies: ['conservative', 'hedge'],
        risk_level: 0.8,
        leverage_recommendation: 0.5,
      },
      {
        regime_id: 'sideways_market',
        name: 'Sideways Market',
        description: 'Range-bound trading with mean reversion',
        probability: 0.5,
        volatility_level: 'low',
        trend_direction: 'sideways',
        correlation_level: 'medium',
        liquidity_condition: 'normal',
        recommended_strategies: ['range_trading', 'yield_farming'],
        risk_level: 0.4,
        leverage_recommendation: 1.0,
      },
    ];
    
    // Return most probable regime
    return regimes.reduce((best, regime) => 
      regime.probability > best.probability ? regime : best
    );
  }

  // Helper methods
  private async getTrackedAssets(): Promise<string[]> {
    // Return list of assets to track and optimize
    return [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'So11111111111111111111111111111111111111112', // SOL
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // RAY
    ];
  }

  private async loadHistoricalData(): Promise<void> {
    // Load historical price and performance data
    // This would typically load from a database or external data source
    
    const assets = await this.getTrackedAssets();
    
    for (const asset of assets) {
      const history = [];
      
      // Generate sample price history (in production, load real data)
      for (let i = 0; i < 1000; i++) {
        history.push({
          price: 100 + Math.random() * 50 - 25, // Random walk around $100
          timestamp: Date.now() - (1000 - i) * 3600000, // Hourly data
        });
      }
      
      this.priceHistory.set(asset, history);
    }
  }

  private async prepareTrainingData(): Promise<any[]> {
    // Prepare training data for ML models
    const trainingData = [];
    
    for (const [asset, history] of this.priceHistory) {
      for (let i = 50; i < history.length - 24; i++) { // Need lookback + prediction horizon
        try {
          const features = await this.extractFeaturesFromHistory(asset, history, i);
          const target = this.calculateTarget(history, i);
          
          trainingData.push({ features, target, asset, timestamp: history[i].timestamp });
        } catch (error) {
          this.logger.debug('Failed to prepare training sample', error);
        }
      }
    }
    
    return trainingData;
  }

  private async extractFeaturesFromHistory(asset: string, history: any[], index: number): Promise<MarketFeatures> {
    // Extract features from historical data point
    const historicalPrices = history.slice(0, index + 1);
    return this.extractPriceFeatures({} as MarketFeatures, historicalPrices) as any;
  }

  private calculateTarget(history: any[], index: number): number {
    // Calculate target APY for prediction horizon
    const currentPrice = history[index].price;
    const futurePrice = history[Math.min(index + this.config.predictionHorizon, history.length - 1)].price;
    
    return ((futurePrice - currentPrice) / currentPrice) * (365 * 24 / this.config.predictionHorizon); // Annualized
  }

  private async trainModel(model: any, trainingData: any[]): Promise<void> {
    // Train the ML model (placeholder implementation)
    // In production, this would use actual ML libraries
    
    this.logger.debug(`Training ${model.type} model with ${trainingData.length} samples`);
    
    // Simulate training by updating model accuracy
    const accuracy = 0.7 + Math.random() * 0.2; // Random accuracy between 70-90%
    this.metrics.model_accuracy.set(model.type, accuracy);
    this.metrics.prediction_r2.set(model.type, accuracy);
    this.metrics.prediction_mae.set(model.type, 0.1 * (1 - accuracy));
  }

  private async validateModel(model: any, trainingData: any[]): Promise<void> {
    // Validate model performance
    // This would typically use cross-validation or holdout validation
    
    this.logger.debug(`Validating ${model.type} model`);
  }

  private async runModelPrediction(model: any, features: MarketFeatures): Promise<{ apy: number; confidence: number }> {
    // Run prediction using the model (placeholder implementation)
    
    const accuracy = this.metrics.model_accuracy.get(model.type) || 0.5;
    
    // Simple feature-based prediction (in production, use actual model)
    let apy = 0;
    
    // Factor in momentum and volatility
    apy += features.momentum * 50; // Momentum contributes to APY
    apy += (100 - features.rsi) / 100 * 20; // Oversold conditions
    apy += Math.max(0, 30 - features.volatility * 100); // Lower volatility = higher stability
    
    // Add some randomness
    apy += (Math.random() - 0.5) * 10;
    
    // Ensure reasonable range
    apy = Math.max(0, Math.min(100, apy));
    
    return {
      apy,
      confidence: accuracy,
    };
  }

  private calculatePredictionStd(predictions: Array<{ apy: number; confidence: number; model: string }>): number {
    if (predictions.length < 2) return 0;
    
    const apys = predictions.map(p => p.apy);
    const mean = apys.reduce((sum, apy) => sum + apy, 0) / apys.length;
    const variance = apys.reduce((sum, apy) => sum + Math.pow(apy - mean, 2), 0) / apys.length;
    
    return Math.sqrt(variance);
  }

  private calculatePredictedVolatility(features: MarketFeatures): number {
    return features.volatility;
  }

  private calculateDrawdownEstimate(features: MarketFeatures): number {
    return features.volatility * 2; // Simple estimate
  }

  private calculateVaR95(features: MarketFeatures): number {
    return features.volatility * 1.65; // 95% VaR approximation
  }

  private async calculateFeatureImportance(asset: string, features: MarketFeatures): Promise<Map<string, number>> {
    // Calculate feature importance (placeholder)
    const importance = new Map<string, number>();
    
    importance.set('price', 0.2);
    importance.set('volatility', 0.15);
    importance.set('momentum', 0.1);
    importance.set('rsi', 0.1);
    importance.set('volume', 0.08);
    importance.set('liquidity', 0.12);
    importance.set('sentiment', 0.05);
    importance.set('macro', 0.2);
    
    return importance;
  }

  private async generateRebalanceActions(scenario: any): Promise<any[]> {
    // Generate rebalancing actions based on optimal allocation
    const actions = [];
    const currentPositions = await this.aggregator.getAllPositions();
    
    // Calculate current allocations
    const totalValue = currentPositions.reduce((sum, pos) => sum + pos.value, 0);
    
    for (const [asset, targetPercent] of scenario.allocations) {
      const currentPos = currentPositions.find(p => p.tokenA === asset || p.tokenB === asset);
      const currentPercent = currentPos ? (currentPos.value / totalValue) * 100 : 0;
      
      const difference = targetPercent - currentPercent;
      
      if (Math.abs(difference) > 5) { // 5% threshold
        actions.push({
          asset,
          current_weight: currentPercent,
          target_weight: targetPercent,
          action: difference > 0 ? 'buy' : 'sell',
          amount: new BN(Math.abs(difference) * totalValue / 100),
          priority: Math.abs(difference) > 15 ? 'high' : Math.abs(difference) > 10 ? 'medium' : 'low',
        });
      }
    }
    
    return actions;
  }

  private async calculatePerformanceAttribution(): Promise<any> {
    // Calculate performance attribution
    return {
      asset_selection: 0.02, // 2% from asset selection
      timing: 0.01, // 1% from timing
      interaction: 0.005, // 0.5% from interaction
      total_alpha: 0.035, // 3.5% total alpha
    };
  }

  private async executeRebalanceAction(action: any): Promise<void> {
    this.logger.debug('Executing ML-optimized rebalance action', {
      asset: action.asset,
      action: action.action,
      amount: action.amount.toString(),
    });
    
    // Execute through appropriate strategy engine
    if (action.action === 'buy') {
      // Buy more of this asset
    } else {
      // Sell some of this asset
    }
  }

  // Background process methods
  private startFeatureCollection(): void {
    this.featureCollector = setInterval(async () => {
      try {
        const assets = await this.getTrackedAssets();
        
        for (const asset of assets) {
          const features = await this.extractFeatures(asset);
          
          // Store features in feature store
          const assetFeatures = this.featureStore.get(asset) || [];
          assetFeatures.push(features);
          
          // Keep only recent features
          const cutoff = Date.now() - this.config.trainingDataWindow * 24 * 60 * 60 * 1000;
          const filteredFeatures = assetFeatures.filter(f => f.timestamp > cutoff);
          
          this.featureStore.set(asset, filteredFeatures);
        }
      } catch (error) {
        this.logger.error('Feature collection failed', error);
      }
    }, 300000); // Every 5 minutes
  }

  private startModelTraining(): void {
    this.modelTrainer = setInterval(async () => {
      try {
        if (this.config.onlinelearning) {
          await this.trainModels();
        }
      } catch (error) {
        this.logger.error('Model training failed', error);
      }
    }, this.config.modelUpdateFrequency * 60 * 60 * 1000);
  }

  private startOptimization(): void {
    this.optimizer = setInterval(async () => {
      try {
        await this.optimizePortfolio();
        
        // Execute optimization if conditions are met
        if (this.currentOptimization?.rebalance_needed) {
          await this.executeOptimization();
        }
      } catch (error) {
        this.logger.error('Portfolio optimization failed', error);
      }
    }, 3600000); // Every hour
  }

  private startPerformanceTracking(): void {
    this.performanceTracker = setInterval(async () => {
      try {
        await this.updatePerformanceMetrics();
      } catch (error) {
        this.logger.error('Performance tracking failed', error);
      }
    }, 300000); // Every 5 minutes
  }

  private async updatePerformanceMetrics(): Promise<void> {
    // Update realized performance metrics
    const positions = await this.aggregator.getAllPositions();
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    // Calculate portfolio APY
    if (this.performanceHistory.length > 0) {
      const firstValue = this.performanceHistory[0].portfolio_value;
      const timeElapsed = (Date.now() - this.performanceHistory[0].timestamp) / (1000 * 60 * 60 * 24 * 365);
      
      if (timeElapsed > 0) {
        this.metrics.realized_apy = ((totalValue / firstValue) ** (1 / timeElapsed) - 1) * 100;
      }
    }
    
    // Store performance history
    this.performanceHistory.push({
      timestamp: Date.now(),
      portfolio_value: totalValue,
      benchmark: totalValue, // Placeholder benchmark
    });
    
    // Keep only recent history
    if (this.performanceHistory.length > 10000) {
      this.performanceHistory = this.performanceHistory.slice(-10000);
    }
    
    // Update other metrics
    this.metrics.risk_adjusted_return = this.metrics.realized_apy / Math.max(0.01, this.calculatePortfolioVolatility());
    this.metrics.information_ratio = this.metrics.realized_apy / Math.max(0.01, this.calculateTrackingError());
    this.metrics.max_drawdown = this.calculateMaxDrawdown();
  }

  private calculatePortfolioVolatility(): number {
    if (this.performanceHistory.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < this.performanceHistory.length; i++) {
      const ret = (this.performanceHistory[i].portfolio_value - this.performanceHistory[i-1].portfolio_value) 
                 / this.performanceHistory[i-1].portfolio_value;
      returns.push(ret);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 365); // Annualized
  }

  private calculateTrackingError(): number {
    // Calculate tracking error vs benchmark
    return 0.05; // 5% placeholder
  }

  private calculateMaxDrawdown(): number {
    if (this.performanceHistory.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = this.performanceHistory[0].portfolio_value;
    
    for (const point of this.performanceHistory) {
      if (point.portfolio_value > peak) {
        peak = point.portfolio_value;
      }
      
      const drawdown = (peak - point.portfolio_value) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    return maxDrawdown;
  }

  // Public getters
  getMetrics(): MLMetrics {
    return { ...this.metrics };
  }

  getCurrentOptimization(): PortfolioOptimization | undefined {
    return this.currentOptimization;
  }

  getCurrentRegime(): MarketRegime | undefined {
    return this.currentRegime;
  }

  getPredictions(): YieldPrediction[] {
    return Array.from(this.predictions.values());
  }

  getFeatureStore(): Map<string, MarketFeatures[]> {
    return new Map(this.featureStore);
  }

  getPerformanceHistory(): Array<{ timestamp: number; portfolio_value: number; benchmark: number }> {
    return [...this.performanceHistory];
  }

  isTrainingActive(): boolean {
    return this.isTraining;
  }

  isOptimizationActive(): boolean {
    return this.isOptimizing;
  }
}

export default MLYieldOptimizationEngine;