// Centralized logging system with structured logging and multiple outputs
// Supports console, file, and remote logging with configurable levels

import winston from 'winston'
import path from 'path'

export class Logger {
  private static instance: winston.Logger
  
  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = Logger.createLogger()
    }
    return Logger.instance
  }

  private static createLogger(): winston.Logger {
    const logLevel = process.env.LOG_LEVEL || 'info'
    const logDir = process.env.LOG_DIR || './logs'
    
    // Custom format for better readability
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    )

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        const serviceStr = service ? `[${service}] ` : ''
        return `${timestamp} ${level}: ${serviceStr}${message} ${metaStr}`
      })
    )

    const transports: winston.transport[] = [
      // Console transport for development
      new winston.transports.Console({
        level: logLevel,
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      })
    ]

    // File transports for production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 10,
          handleExceptions: true
        }),
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          format: customFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      )
    }

    return winston.createLogger({
      level: logLevel,
      format: customFormat,
      defaultMeta: { 
        service: 'nockchain-monitoring',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports,
      exitOnError: false
    })
  }
}