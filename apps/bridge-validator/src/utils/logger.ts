// Military-grade logging system with security event tracking

import winston from 'winston';
import { createHash } from 'crypto';

export interface LogEvent {
  level: string;
  message: string;
  timestamp: string;
  validatorId?: string;
  transactionId?: string;
  securityLevel?: 'info' | 'warning' | 'critical' | 'emergency';
  metadata?: Record<string, any>;
  hash?: string;
}

export class Logger {
  private winston: winston.Logger;
  private validatorId: string;
  private securityEvents: LogEvent[] = [];

  constructor(validatorId: string) {
    this.validatorId = validatorId;
    
    this.winston = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            validatorId: this.validatorId,
            ...meta,
          });
        })
      ),
      transports: [
        new winston.transports.File({
          filename: `logs/validator-${validatorId}-error.log`,
          level: 'error',
        }),
        new winston.transports.File({
          filename: `logs/validator-${validatorId}-combined.log`,
        }),
        new winston.transports.File({
          filename: `logs/security-events.log`,
          level: 'warn',
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
      exceptionHandlers: [
        new winston.transports.File({ filename: `logs/validator-${validatorId}-exceptions.log` }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: `logs/validator-${validatorId}-rejections.log` }),
      ],
    });
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.winston.info(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    const event = this.createSecurityEvent('warning', message, metadata);
    this.winston.warn(message, metadata);
    this.securityEvents.push(event);
  }

  error(message: string, error?: any, metadata?: Record<string, any>): void {
    const event = this.createSecurityEvent('critical', message, { error: error?.message, ...metadata });
    this.winston.error(message, { error, ...metadata });
    this.securityEvents.push(event);
  }

  critical(message: string, metadata?: Record<string, any>): void {
    const event = this.createSecurityEvent('critical', message, metadata);
    this.winston.error(message, { securityLevel: 'critical', ...metadata });
    this.securityEvents.push(event);
    
    // Immediate alerting for critical events
    this.alertEmergencyContacts(event);
  }

  emergency(message: string, metadata?: Record<string, any>): void {
    const event = this.createSecurityEvent('emergency', message, metadata);
    this.winston.error(message, { securityLevel: 'emergency', ...metadata });
    this.securityEvents.push(event);
    
    // Immediate emergency protocols
    this.alertEmergencyContacts(event);
    this.triggerEmergencyBackup(event);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.winston.debug(message, metadata);
  }

  // Security-specific logging methods
  logTransactionValidation(
    transactionId: string,
    result: 'approved' | 'rejected',
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const message = `Transaction ${transactionId} ${result}${reason ? `: ${reason}` : ''}`;
    const event = this.createSecurityEvent('info', message, {
      transactionId,
      result,
      reason,
      ...metadata,
    });
    
    this.winston.info(message, { transactionId, result, reason, ...metadata });
    this.securityEvents.push(event);
  }

  logConsensusParticipation(
    round: number,
    role: 'leader' | 'follower',
    result: 'success' | 'failure',
    metadata?: Record<string, any>
  ): void {
    const message = `Consensus round ${round}: ${role} - ${result}`;
    this.winston.info(message, { consensusRound: round, role, result, ...metadata });
  }

  logSecurityThreat(
    threatType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>
  ): void {
    const message = `Security threat detected: ${threatType} (${severity})`;
    const securityLevel = severity === 'critical' ? 'critical' : 'warning';
    
    const event = this.createSecurityEvent(securityLevel, message, {
      threatType,
      severity,
      ...details,
    });
    
    if (severity === 'critical' || severity === 'high') {
      this.winston.error(message, { threatType, severity, ...details });
      this.alertEmergencyContacts(event);
    } else {
      this.winston.warn(message, { threatType, severity, ...details });
    }
    
    this.securityEvents.push(event);
  }

  logNetworkEvent(
    eventType: 'validator_join' | 'validator_leave' | 'network_partition' | 'network_heal',
    metadata?: Record<string, any>
  ): void {
    const message = `Network event: ${eventType}`;
    this.winston.info(message, { eventType, ...metadata });
  }

  // Audit trail methods
  getSecurityEvents(startTime?: number, endTime?: number): LogEvent[] {
    let events = this.securityEvents;
    
    if (startTime) {
      events = events.filter(event => 
        new Date(event.timestamp).getTime() >= startTime
      );
    }
    
    if (endTime) {
      events = events.filter(event => 
        new Date(event.timestamp).getTime() <= endTime
      );
    }
    
    return events;
  }

  getAuditTrail(transactionId: string): LogEvent[] {
    return this.securityEvents.filter(event => 
      event.transactionId === transactionId
    );
  }

  // Export logs for compliance
  async exportLogs(
    format: 'json' | 'csv',
    startTime?: number,
    endTime?: number
  ): Promise<string> {
    const events = this.getSecurityEvents(startTime, endTime);
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'validatorId', 'transactionId', 'securityLevel'];
      const csvLines = events.map(event => 
        headers.map(header => event[header as keyof LogEvent] || '').join(',')
      );
      return [headers.join(','), ...csvLines].join('\n');
    }
    
    return JSON.stringify(events, null, 2);
  }

  // Log integrity verification
  verifyLogIntegrity(): { isValid: boolean; corruptedEvents: string[] } {
    const corruptedEvents: string[] = [];
    
    for (const event of this.securityEvents) {
      const eventData = { ...event };
      delete eventData.hash;
      
      const expectedHash = this.hashEvent(eventData);
      if (event.hash !== expectedHash) {
        corruptedEvents.push(event.timestamp);
      }
    }
    
    return {
      isValid: corruptedEvents.length === 0,
      corruptedEvents,
    };
  }

  private createSecurityEvent(
    securityLevel: 'info' | 'warning' | 'critical' | 'emergency',
    message: string,
    metadata?: Record<string, any>
  ): LogEvent {
    const event: LogEvent = {
      level: securityLevel,
      message,
      timestamp: new Date().toISOString(),
      validatorId: this.validatorId,
      securityLevel,
      metadata,
    };
    
    // Create tamper-proof hash
    event.hash = this.hashEvent(event);
    
    return event;
  }

  private hashEvent(event: Omit<LogEvent, 'hash'>): string {
    const eventString = JSON.stringify(event, Object.keys(event).sort());
    return createHash('sha256').update(eventString).digest('hex');
  }

  private async alertEmergencyContacts(event: LogEvent): Promise<void> {
    // In production, this would send alerts via SMS, email, Slack, etc.
    console.error(`🚨 EMERGENCY ALERT: ${event.message}`, {
      validatorId: this.validatorId,
      timestamp: event.timestamp,
      metadata: event.metadata,
    });
  }

  private async triggerEmergencyBackup(event: LogEvent): Promise<void> {
    // In production, this would backup critical state to secure storage
    console.error(`📁 EMERGENCY BACKUP TRIGGERED: ${event.message}`);
  }

  // Cleanup old logs to prevent disk space issues
  async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    this.securityEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > cutoffTime
    );
    
    this.winston.info(`Cleaned up logs older than ${retentionDays} days`);
  }

  // Performance monitoring
  startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.winston.debug(`Operation ${operation} completed in ${duration}ms`);
      
      if (duration > 5000) { // Log slow operations
        this.warn(`Slow operation detected: ${operation} took ${duration}ms`);
      }
    };
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }
}

export default Logger;