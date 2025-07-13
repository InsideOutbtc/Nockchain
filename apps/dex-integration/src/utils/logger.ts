// Enhanced logging utility for DEX integration with structured logging

import winston from 'winston';
import { format } from 'winston';

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  enableConsole: boolean;
  enableFile: boolean;
  logFile?: string;
  enableMetrics: boolean;
}

export class Logger {
  private winston: winston.Logger;
  private metrics: {
    errors: number;
    warnings: number;
    infos: number;
    debugs: number;
    startTime: number;
  };

  constructor(config: LoggerConfig = {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    enableMetrics: true,
  }) {
    this.metrics = {
      errors: 0,
      warnings: 0,
      infos: 0,
      debugs: 0,
      startTime: Date.now(),
    };

    const transports: winston.transport[] = [];

    // Console transport
    if (config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.errors({ stack: true }),
            format.colorize({ all: true }),
            format.printf(({ timestamp, level, message, stack, ...meta }) => {
              let logMessage = `${timestamp} [${level}]: ${message}`;
              
              if (Object.keys(meta).length > 0) {
                logMessage += ` ${JSON.stringify(meta, null, 2)}`;
              }
              
              if (stack) {
                logMessage += `\n${stack}`;
              }
              
              return logMessage;
            })
          ),
        })
      );
    }

    // File transport
    if (config.enableFile && config.logFile) {
      transports.push(
        new winston.transports.File({
          filename: config.logFile,
          format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.json()
          ),
        })
      );
    }

    this.winston = winston.createLogger({
      level: config.level,
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      ),
      transports,
      exitOnError: false,
    });
  }

  error(message: string, error?: Error | any, meta?: any): void {
    this.metrics.errors++;
    
    if (error instanceof Error) {
      this.winston.error(message, { 
        error: error.message, 
        stack: error.stack,
        ...meta 
      });
    } else if (error) {
      this.winston.error(message, { error, ...meta });
    } else {
      this.winston.error(message, meta);
    }
  }

  warn(message: string, meta?: any): void {
    this.metrics.warnings++;
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.metrics.infos++;
    this.winston.info(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.metrics.debugs++;
    this.winston.debug(message, meta);
  }

  // DEX-specific logging methods
  tradeExecuted(dex: string, trade: any): void {
    this.info('Trade executed successfully', {
      dex,
      signature: trade.signature,
      inputAmount: trade.inputAmount,
      outputAmount: trade.outputAmount,
      priceImpact: trade.priceImpact,
      gasUsed: trade.gasUsed,
      latency: trade.latency,
    });
  }

  tradeFailed(dex: string, error: Error, tradeDetails?: any): void {
    this.error('Trade execution failed', error, {
      dex,
      ...tradeDetails,
    });
  }

  arbitrageOpportunity(opportunity: any): void {
    this.info('Arbitrage opportunity detected', {
      tokenA: opportunity.tokenA,
      tokenB: opportunity.tokenB,
      buyDex: opportunity.buyDex,
      sellDex: opportunity.sellDex,
      profitPercentage: opportunity.profitPercentage,
      estimatedProfit: opportunity.estimatedProfit,
    });
  }

  priceUpdate(token: string, prices: any): void {
    this.debug('Price update received', {
      token,
      prices,
      timestamp: Date.now(),
    });
  }

  liquidityPosition(action: 'create' | 'remove' | 'update', position: any): void {
    this.info(`Liquidity position ${action}d`, {
      dex: position.dex,
      poolAddress: position.poolAddress,
      liquidity: position.liquidity,
      value: position.value,
      apy: position.apy,
    });
  }

  routeSelection(optimal: any, alternatives: any[]): void {
    this.info('Optimal route selected', {
      selectedDex: optimal.dex,
      score: optimal.score,
      reasoning: optimal.reasoning,
      outputAmount: optimal.quote.outputAmount,
      priceImpact: optimal.quote.priceImpact,
      alternativeCount: alternatives.length,
    });
  }

  // Performance and metrics logging
  performanceMetric(metric: string, value: number, unit: string = 'ms'): void {
    this.debug('Performance metric', {
      metric,
      value,
      unit,
      timestamp: Date.now(),
    });
  }

  getMetrics(): typeof this.metrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  // Health check logging
  healthCheck(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: any): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    this[level](`Health check: ${component} is ${status}`, details);
  }

  // Network and connection logging
  connectionEvent(event: 'connect' | 'disconnect' | 'error' | 'timeout', target: string, details?: any): void {
    const level = event === 'error' ? 'error' : event === 'disconnect' ? 'warn' : 'info';
    this[level](`Connection ${event}: ${target}`, details);
  }

  // Configuration and initialization logging
  configLoaded(component: string, config: any): void {
    this.info(`Configuration loaded for ${component}`, {
      component,
      configKeys: Object.keys(config),
    });
  }

  initializationComplete(component: string, duration: number, details?: any): void {
    this.info(`${component} initialized successfully`, {
      component,
      duration,
      ...details,
    });
  }

  // Create child logger with context
  child(context: any): Logger {
    const childLogger = Object.create(this);
    childLogger.winston = this.winston.child(context);
    return childLogger;
  }

  // Structured error logging for specific DEX operations
  dexOperationStart(operation: string, dex: string, params: any): void {
    this.debug(`Starting ${operation}`, { 
      operation, 
      dex, 
      params,
      timestamp: Date.now() 
    });
  }

  dexOperationComplete(operation: string, dex: string, duration: number, result?: any): void {
    this.info(`Completed ${operation}`, {
      operation,
      dex,
      duration,
      success: true,
      result,
    });
  }

  dexOperationFailed(operation: string, dex: string, duration: number, error: Error): void {
    this.error(`Failed ${operation}`, error, {
      operation,
      dex,
      duration,
      success: false,
    });
  }

  // Rate limiting and throttling logs
  rateLimitWarning(service: string, limit: number, window: number): void {
    this.warn('Rate limit approaching', {
      service,
      limit,
      window,
      timestamp: Date.now(),
    });
  }

  rateLimitExceeded(service: string, retryAfter?: number): void {
    this.error('Rate limit exceeded', null, {
      service,
      retryAfter,
      timestamp: Date.now(),
    });
  }

  // Market data and pricing logs
  marketDataUpdate(source: string, symbols: string[], latency: number): void {
    this.debug('Market data updated', {
      source,
      symbolCount: symbols.length,
      latency,
      timestamp: Date.now(),
    });
  }

  priceDiscrepancy(tokenPair: string, prices: any, spread: number): void {
    this.warn('Price discrepancy detected', {
      tokenPair,
      prices,
      spread,
      timestamp: Date.now(),
    });
  }

  // Cleanup and shutdown logging
  shutdown(component: string, graceful: boolean = true): void {
    this.info(`Shutting down ${component}`, { 
      component, 
      graceful,
      uptime: Date.now() - this.metrics.startTime 
    });
  }
}

// Create default logger instance
export const createLogger = (config?: Partial<LoggerConfig>): Logger => {
  const defaultConfig: LoggerConfig = {
    level: process.env.LOG_LEVEL as any || 'info',
    enableConsole: true,
    enableFile: !!process.env.LOG_FILE,
    logFile: process.env.LOG_FILE,
    enableMetrics: true,
  };

  return new Logger({ ...defaultConfig, ...config });
};

export default Logger;