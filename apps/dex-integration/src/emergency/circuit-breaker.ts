// Advanced circuit breaker system for automated emergency protection

import BN from 'bn.js';
import { Logger } from '../utils/logger';

export interface CircuitBreakerConfig {
  // Failure thresholds
  failureThreshold: number; // Number of failures before opening
  timeWindow: number; // Time window in milliseconds
  resetTimeout: number; // Time before attempting to close circuit
  
  // Volume-based protection
  maxVolumePerMinute: BN;
  maxVolumePerHour: BN;
  maxVolumePerDay: BN;
  
  // Rate limiting
  maxRequestsPerSecond: number;
  maxRequestsPerMinute: number;
  
  // Loss protection
  maxLossPerTrade: BN;
  maxLossPerHour: BN;
  maxLossPerDay: BN;
  
  // Advanced settings
  enableAdaptiveThresholds: boolean;
  healthCheckInterval: number; // milliseconds
  emergencyOverride: boolean;
}

export interface CircuitState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  openedAt: number;
  nextRetryAt: number;
  
  // Volume tracking
  volumePerMinute: VolumeWindow;
  volumePerHour: VolumeWindow;
  volumePerDay: VolumeWindow;
  
  // Request tracking
  requestsPerSecond: RequestWindow;
  requestsPerMinute: RequestWindow;
  
  // Loss tracking
  lossPerTrade: BN;
  lossPerHour: VolumeWindow;
  lossPerDay: VolumeWindow;
  
  // Adaptive metrics
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
}

export interface VolumeWindow {
  current: BN;
  window: number; // milliseconds
  lastReset: number;
  history: { timestamp: number; amount: BN }[];
}

export interface RequestWindow {
  current: number;
  window: number; // milliseconds
  lastReset: number;
  history: number[];
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  currentState: string;
  timeInState: number;
  lastStateChange: number;
  
  // Volume metrics
  totalVolumeProcessed: BN;
  averageVolumePerMinute: BN;
  peakVolumePerMinute: BN;
  
  // Loss metrics
  totalLosses: BN;
  averageLossPerTrade: BN;
  maxSingleLoss: BN;
  
  // Performance metrics
  successRate: number;
  errorRate: number;
  availabilityPercentage: number;
}

export interface CircuitBreakerEvent {
  id: string;
  timestamp: number;
  type: 'opened' | 'closed' | 'half_opened' | 'failure' | 'success' | 'threshold_exceeded';
  reason: string;
  metrics: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private logger: Logger;
  private state: CircuitState;
  private metrics: CircuitBreakerMetrics;
  private events: CircuitBreakerEvent[] = [];
  
  private healthCheckInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;

  constructor(config: CircuitBreakerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize state
    this.state = this.initializeState();
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
  }

  async execute<T>(operation: () => Promise<T>, context?: any): Promise<T> {
    // Check if circuit allows execution
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker is ${this.state.state} - operation blocked`);
      this.recordEvent('failure', `Operation blocked - circuit ${this.state.state}`, 'high');
      throw error;
    }

    const startTime = Date.now();
    
    try {
      // Check pre-execution limits
      await this.checkPreExecutionLimits(context);
      
      // Execute operation
      const result = await operation();
      
      // Record success
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime, context);
      
      return result;
      
    } catch (error) {
      // Record failure
      const responseTime = Date.now() - startTime;
      this.recordFailure(error, responseTime, context);
      
      throw error;
    }
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Circuit breaker monitoring already active');
      return;
    }

    this.logger.info('Starting circuit breaker monitoring', {
      failureThreshold: this.config.failureThreshold,
      timeWindow: this.config.timeWindow,
      healthCheckInterval: this.config.healthCheckInterval,
    });

    this.isMonitoring = true;
    
    // Start health check cycle
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    this.logger.info('Circuit breaker monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Circuit breaker monitoring not active');
      return;
    }

    this.logger.info('Stopping circuit breaker monitoring');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.isMonitoring = false;
    this.logger.info('Circuit breaker monitoring stopped');
  }

  forceOpen(reason: string): void {
    this.logger.warn('Forcing circuit breaker open', { reason });
    
    this.state.state = 'open';
    this.state.openedAt = Date.now();
    this.state.nextRetryAt = Date.now() + this.config.resetTimeout;
    
    this.recordEvent('opened', `Forced open: ${reason}`, 'critical');
    this.updateMetrics();
  }

  forceClose(reason: string): void {
    if (!this.config.emergencyOverride) {
      throw new Error('Emergency override not enabled');
    }

    this.logger.warn('Forcing circuit breaker closed', { reason });
    
    this.state.state = 'closed';
    this.state.failureCount = 0;
    this.state.lastSuccessTime = Date.now();
    
    this.recordEvent('closed', `Forced closed: ${reason}`, 'high');
    this.updateMetrics();
  }

  reset(): void {
    this.logger.info('Resetting circuit breaker');
    
    this.state = this.initializeState();
    this.metrics = this.initializeMetrics();
    this.events = [];
    
    this.recordEvent('closed', 'Circuit breaker reset', 'medium');
  }

  getState(): CircuitState {
    return { ...this.state };
  }

  getMetrics(): CircuitBreakerMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  getEvents(limit?: number): CircuitBreakerEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  isOpen(): boolean {
    return this.state.state === 'open';
  }

  isClosed(): boolean {
    return this.state.state === 'closed';
  }

  isHalfOpen(): boolean {
    return this.state.state === 'half_open';
  }

  // Private implementation methods

  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case 'closed':
        return true;
        
      case 'open':
        // Check if we should transition to half-open
        if (now >= this.state.nextRetryAt) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;
        
      case 'half_open':
        return true;
        
      default:
        return false;
    }
  }

  private async checkPreExecutionLimits(context: any): Promise<void> {
    const now = Date.now();

    // Check rate limits
    this.updateRequestWindows(now);
    
    if (this.state.requestsPerSecond.current >= this.config.maxRequestsPerSecond) {
      throw new Error('Rate limit exceeded: max requests per second');
    }
    
    if (this.state.requestsPerMinute.current >= this.config.maxRequestsPerMinute) {
      throw new Error('Rate limit exceeded: max requests per minute');
    }

    // Check volume limits if context provides volume information
    if (context?.volume) {
      this.updateVolumeWindows(now);
      
      const volume = new BN(context.volume);
      
      if (this.state.volumePerMinute.current.add(volume).gt(this.config.maxVolumePerMinute)) {
        throw new Error('Volume limit exceeded: max volume per minute');
      }
      
      if (this.state.volumePerHour.current.add(volume).gt(this.config.maxVolumePerHour)) {
        throw new Error('Volume limit exceeded: max volume per hour');
      }
      
      if (this.state.volumePerDay.current.add(volume).gt(this.config.maxVolumePerDay)) {
        throw new Error('Volume limit exceeded: max volume per day');
      }
    }

    // Check loss limits if context provides expected loss
    if (context?.expectedLoss) {
      const expectedLoss = new BN(context.expectedLoss);
      
      if (expectedLoss.gt(this.config.maxLossPerTrade)) {
        throw new Error('Loss limit exceeded: max loss per trade');
      }
    }
  }

  private recordSuccess(responseTime: number, context: any): void {
    const now = Date.now();
    
    this.state.lastSuccessTime = now;
    this.state.failureCount = Math.max(0, this.state.failureCount - 1);
    
    // Update response time
    this.updateAverageResponseTime(responseTime);
    
    // Update volume if provided
    if (context?.volume) {
      this.addVolume(new BN(context.volume), now);
    }
    
    // Update request counts
    this.incrementRequestCounts(now);
    
    // Check for state transitions
    if (this.state.state === 'half_open') {
      // Successful request in half-open state - close the circuit
      this.transitionToClosed();
    }
    
    this.recordEvent('success', 'Operation completed successfully', 'low');
    this.updateMetrics();
  }

  private recordFailure(error: any, responseTime: number, context: any): void {
    const now = Date.now();
    
    this.state.lastFailureTime = now;
    this.state.failureCount++;
    
    // Update response time
    this.updateAverageResponseTime(responseTime);
    
    // Update loss tracking if provided
    if (context?.actualLoss) {
      this.addLoss(new BN(context.actualLoss), now);
    }
    
    // Update request counts
    this.incrementRequestCounts(now);
    
    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.transitionToOpen();
    }
    
    this.recordEvent('failure', `Operation failed: ${error.message}`, 'medium');
    this.updateMetrics();
  }

  private shouldOpenCircuit(): boolean {
    const now = Date.now();
    const timeWindow = this.config.timeWindow;
    
    // Count failures within the time window
    const recentFailures = this.events.filter(event => 
      event.type === 'failure' && 
      event.timestamp > (now - timeWindow)
    ).length;
    
    return recentFailures >= this.config.failureThreshold;
  }

  private transitionToOpen(): void {
    const now = Date.now();
    
    this.state.state = 'open';
    this.state.openedAt = now;
    this.state.nextRetryAt = now + this.config.resetTimeout;
    
    this.logger.warn('Circuit breaker opened', {
      failureCount: this.state.failureCount,
      nextRetryAt: new Date(this.state.nextRetryAt).toISOString(),
    });
    
    this.recordEvent('opened', 'Circuit opened due to failure threshold exceeded', 'high');
  }

  private transitionToHalfOpen(): void {
    this.state.state = 'half_open';
    
    this.logger.info('Circuit breaker transitioned to half-open');
    this.recordEvent('half_opened', 'Circuit transitioned to half-open for testing', 'medium');
  }

  private transitionToClosed(): void {
    this.state.state = 'closed';
    this.state.failureCount = 0;
    
    this.logger.info('Circuit breaker closed');
    this.recordEvent('closed', 'Circuit closed after successful test', 'low');
  }

  private updateRequestWindows(now: number): void {
    // Update requests per second
    if (now - this.state.requestsPerSecond.lastReset >= 1000) {
      this.state.requestsPerSecond.current = 0;
      this.state.requestsPerSecond.lastReset = now;
    }
    
    // Update requests per minute
    if (now - this.state.requestsPerMinute.lastReset >= 60000) {
      this.state.requestsPerMinute.current = 0;
      this.state.requestsPerMinute.lastReset = now;
    }
  }

  private updateVolumeWindows(now: number): void {
    // Update volume per minute
    this.cleanVolumeWindow(this.state.volumePerMinute, now);
    
    // Update volume per hour
    this.cleanVolumeWindow(this.state.volumePerHour, now);
    
    // Update volume per day
    this.cleanVolumeWindow(this.state.volumePerDay, now);
  }

  private cleanVolumeWindow(window: VolumeWindow, now: number): void {
    // Remove old entries
    window.history = window.history.filter(entry => 
      entry.timestamp > (now - window.window)
    );
    
    // Recalculate current volume
    window.current = window.history.reduce((sum, entry) => sum.add(entry.amount), new BN(0));
  }

  private addVolume(amount: BN, timestamp: number): void {
    // Add to all volume windows
    this.state.volumePerMinute.history.push({ timestamp, amount });
    this.state.volumePerHour.history.push({ timestamp, amount });
    this.state.volumePerDay.history.push({ timestamp, amount });
    
    // Update current totals
    this.state.volumePerMinute.current = this.state.volumePerMinute.current.add(amount);
    this.state.volumePerHour.current = this.state.volumePerHour.current.add(amount);
    this.state.volumePerDay.current = this.state.volumePerDay.current.add(amount);
  }

  private addLoss(amount: BN, timestamp: number): void {
    this.state.lossPerTrade = amount;
    
    // Add to loss windows
    this.state.lossPerHour.history.push({ timestamp, amount });
    this.state.lossPerDay.history.push({ timestamp, amount });
    
    // Clean and update current totals
    this.cleanVolumeWindow(this.state.lossPerHour, timestamp);
    this.cleanVolumeWindow(this.state.lossPerDay, timestamp);
  }

  private incrementRequestCounts(now: number): void {
    this.state.requestsPerSecond.current++;
    this.state.requestsPerMinute.current++;
    
    // Add to history
    this.state.requestsPerSecond.history.push(now);
    this.state.requestsPerMinute.history.push(now);
    
    // Clean old entries
    this.state.requestsPerSecond.history = this.state.requestsPerSecond.history.filter(
      timestamp => timestamp > (now - 1000)
    );
    this.state.requestsPerMinute.history = this.state.requestsPerMinute.history.filter(
      timestamp => timestamp > (now - 60000)
    );
  }

  private updateAverageResponseTime(responseTime: number): void {
    if (this.state.averageResponseTime === 0) {
      this.state.averageResponseTime = responseTime;
    } else {
      // Exponential moving average
      this.state.averageResponseTime = (this.state.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
  }

  private performHealthCheck(): void {
    const now = Date.now();
    
    try {
      // Update time-based windows
      this.updateVolumeWindows(now);
      this.updateRequestWindows(now);
      
      // Check for adaptive threshold adjustments
      if (this.config.enableAdaptiveThresholds) {
        this.adjustAdaptiveThresholds();
      }
      
      // Clean old events
      this.cleanOldEvents(now);
      
      // Update metrics
      this.updateMetrics();
      
    } catch (error) {
      this.logger.error('Circuit breaker health check failed', error);
    }
  }

  private adjustAdaptiveThresholds(): void {
    // Adjust thresholds based on current performance
    // This is a simplified implementation
    
    if (this.state.errorRate > 0.1) { // 10% error rate
      // Reduce thresholds to be more protective
      // Implementation would adjust config values
    } else if (this.state.errorRate < 0.01) { // 1% error rate
      // Increase thresholds to be less restrictive
      // Implementation would adjust config values
    }
  }

  private cleanOldEvents(now: number): void {
    // Keep only events from the last 24 hours
    const cutoff = now - (24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  private recordEvent(type: CircuitBreakerEvent['type'], reason: string, severity: CircuitBreakerEvent['severity']): void {
    const event: CircuitBreakerEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      reason,
      metrics: {
        state: this.state.state,
        failureCount: this.state.failureCount,
        averageResponseTime: this.state.averageResponseTime,
      },
      severity,
    };
    
    this.events.push(event);
    
    // Log based on severity
    switch (severity) {
      case 'critical':
        this.logger.error(`Circuit breaker event: ${reason}`, event);
        break;
      case 'high':
        this.logger.warn(`Circuit breaker event: ${reason}`, event);
        break;
      case 'medium':
        this.logger.info(`Circuit breaker event: ${reason}`, event);
        break;
      case 'low':
        this.logger.debug(`Circuit breaker event: ${reason}`, event);
        break;
    }
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    const successEvents = this.events.filter(e => e.type === 'success');
    const failureEvents = this.events.filter(e => e.type === 'failure');
    
    this.metrics.totalRequests = successEvents.length + failureEvents.length;
    this.metrics.totalSuccesses = successEvents.length;
    this.metrics.totalFailures = failureEvents.length;
    this.metrics.averageResponseTime = this.state.averageResponseTime;
    this.metrics.currentState = this.state.state;
    this.metrics.timeInState = now - (this.state.openedAt || this.state.lastSuccessTime || now);
    this.metrics.lastStateChange = this.state.openedAt || this.state.lastSuccessTime || 0;
    
    // Calculate rates
    if (this.metrics.totalRequests > 0) {
      this.metrics.successRate = (this.metrics.totalSuccesses / this.metrics.totalRequests) * 100;
      this.metrics.errorRate = (this.metrics.totalFailures / this.metrics.totalRequests) * 100;
    } else {
      this.metrics.successRate = 100;
      this.metrics.errorRate = 0;
    }
    
    // Update state error rate
    this.state.errorRate = this.metrics.errorRate / 100;
    this.state.successRate = this.metrics.successRate / 100;
    
    // Calculate availability (simplified)
    const totalTime = now - (this.events[0]?.timestamp || now);
    const openTime = this.state.state === 'open' ? this.metrics.timeInState : 0;
    this.metrics.availabilityPercentage = totalTime > 0 ? 
      ((totalTime - openTime) / totalTime) * 100 : 100;
    
    // Volume metrics
    this.metrics.totalVolumeProcessed = this.state.volumePerDay.current;
    this.metrics.averageVolumePerMinute = this.state.volumePerMinute.current;
    this.metrics.peakVolumePerMinute = this.state.volumePerMinute.history.reduce(
      (max, entry) => entry.amount.gt(max) ? entry.amount : max, 
      new BN(0)
    );
    
    // Loss metrics
    this.metrics.totalLosses = this.state.lossPerDay.current;
    this.metrics.averageLossPerTrade = this.state.lossPerTrade;
    this.metrics.maxSingleLoss = this.state.lossPerDay.history.reduce(
      (max, entry) => entry.amount.gt(max) ? entry.amount : max,
      new BN(0)
    );
  }

  private initializeState(): CircuitState {
    const now = Date.now();
    
    return {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: now,
      openedAt: 0,
      nextRetryAt: 0,
      
      volumePerMinute: {
        current: new BN(0),
        window: 60000, // 1 minute
        lastReset: now,
        history: [],
      },
      volumePerHour: {
        current: new BN(0),
        window: 3600000, // 1 hour
        lastReset: now,
        history: [],
      },
      volumePerDay: {
        current: new BN(0),
        window: 86400000, // 24 hours
        lastReset: now,
        history: [],
      },
      
      requestsPerSecond: {
        current: 0,
        window: 1000, // 1 second
        lastReset: now,
        history: [],
      },
      requestsPerMinute: {
        current: 0,
        window: 60000, // 1 minute
        lastReset: now,
        history: [],
      },
      
      lossPerTrade: new BN(0),
      lossPerHour: {
        current: new BN(0),
        window: 3600000, // 1 hour
        lastReset: now,
        history: [],
      },
      lossPerDay: {
        current: new BN(0),
        window: 86400000, // 24 hours
        lastReset: now,
        history: [],
      },
      
      averageResponseTime: 0,
      errorRate: 0,
      successRate: 100,
    };
  }

  private initializeMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
      currentState: 'closed',
      timeInState: 0,
      lastStateChange: Date.now(),
      
      totalVolumeProcessed: new BN(0),
      averageVolumePerMinute: new BN(0),
      peakVolumePerMinute: new BN(0),
      
      totalLosses: new BN(0),
      averageLossPerTrade: new BN(0),
      maxSingleLoss: new BN(0),
      
      successRate: 100,
      errorRate: 0,
      availabilityPercentage: 100,
    };
  }

  // Public getters
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

export default CircuitBreaker;