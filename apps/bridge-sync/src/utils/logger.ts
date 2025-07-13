// Advanced logging system for cross-chain state synchronization

import pino from 'pino';
import { createHash } from 'crypto';

export interface LogEvent {
  level: string;
  message: string;
  timestamp: string;
  component: string;
  transactionId?: string;
  chain?: 'nockchain' | 'solana' | 'bridge';
  metadata?: Record<string, any>;
  hash?: string;
}

export class Logger {
  private pino: pino.Logger;
  private component: string;
  private logEvents: LogEvent[] = [];

  constructor(component: string, options: pino.LoggerOptions = {}) {
    this.component = component;
    
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'hostname,pid',
        },
      },
      ...options,
    });
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: any, metadata?: Record<string, any>): void {
    this.log('error', message, { error: error?.message || error, ...metadata });
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  critical(message: string, metadata?: Record<string, any>): void {
    this.log('error', `CRITICAL: ${message}`, metadata);
  }

  emergency(message: string, metadata?: Record<string, any>): void {
    this.log('error', `EMERGENCY: ${message}`, metadata);
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const event: LogEvent = {
      level,
      message,
      timestamp: new Date().toISOString(),
      component: this.component,
      metadata,
    };
    
    // Create tamper-proof hash
    event.hash = this.hashEvent(event);
    
    this.logEvents.push(event);
    
    // Log with pino
    this.pino[level as keyof pino.Logger]({
      component: this.component,
      ...metadata,
    }, message);
  }

  private hashEvent(event: Omit<LogEvent, 'hash'>): string {
    const eventString = JSON.stringify(event, Object.keys(event).sort());
    return createHash('sha256').update(eventString).digest('hex');
  }

  getEvents(filter?: { level?: string; component?: string; startTime?: number }): LogEvent[] {
    let events = this.logEvents;
    
    if (filter) {
      events = events.filter(event => {
        if (filter.level && event.level !== filter.level) return false;
        if (filter.component && event.component !== filter.component) return false;
        if (filter.startTime && new Date(event.timestamp).getTime() < filter.startTime) return false;
        return true;
      });
    }
    
    return events;
  }
}

export default Logger;