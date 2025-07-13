// NOCK Bridge Agent System Logger
// Centralized logging utility for the agent coordination system

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  agent_id?: string;
  task_id?: string;
  correlation_id?: string;
  source: string;
}

export interface LoggerConfig {
  level: LogLevel;
  outputs: ('console' | 'file' | 'remote')[];
  file_path?: string;
  remote_endpoint?: string;
  max_file_size?: number;
  max_log_files?: number;
  format: 'json' | 'text';
  include_stack_trace: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private bufferSize: number = 1000;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  debug(message: string, data?: any, context?: { agent_id?: string; task_id?: string }): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: { agent_id?: string; task_id?: string }): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: { agent_id?: string; task_id?: string }): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, error?: Error | any, context?: { agent_id?: string; task_id?: string }): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: this.config.include_stack_trace ? error.stack : undefined,
    } : error;
    
    this.log(LogLevel.ERROR, message, errorData, context);
  }

  critical(message: string, error?: Error | any, context?: { agent_id?: string; task_id?: string }): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack, // Always include stack trace for critical errors
    } : error;
    
    this.log(LogLevel.CRITICAL, message, errorData, context);
  }

  private log(level: LogLevel, message: string, data?: any, context?: { agent_id?: string; task_id?: string }): void {
    if (level < this.config.level) {
      return; // Skip if below configured log level
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      agent_id: context?.agent_id,
      task_id: context?.task_id,
      correlation_id: this.generateCorrelationId(),
      source: 'agent-system',
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.bufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Output to configured destinations
    this.output(entry);
  }

  private output(entry: LogEntry): void {
    if (this.config.outputs.includes('console')) {
      this.outputToConsole(entry);
    }

    if (this.config.outputs.includes('file') && this.config.file_path) {
      this.outputToFile(entry);
    }

    if (this.config.outputs.includes('remote') && this.config.remote_endpoint) {
      this.outputToRemote(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    
    let formattedMessage: string;
    
    if (this.config.format === 'json') {
      formattedMessage = JSON.stringify(entry);
    } else {
      const context = entry.agent_id ? `[${entry.agent_id}]` : '';
      const taskContext = entry.task_id ? `[${entry.task_id}]` : '';
      formattedMessage = `${timestamp} ${levelName} ${context}${taskContext} ${entry.message}`;
      
      if (entry.data) {
        formattedMessage += `\n${JSON.stringify(entry.data, null, 2)}`;
      }
    }

    // Use appropriate console method based on log level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  private outputToFile(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just store the formatted entry
    const formattedEntry = this.config.format === 'json' 
      ? JSON.stringify(entry) 
      : this.formatTextEntry(entry);
    
    // Would implement file writing with rotation here
    // fs.appendFileSync(this.config.file_path!, formattedEntry + '\n');
  }

  private outputToRemote(entry: LogEntry): void {
    // In a real implementation, this would send logs to a remote service
    // fetch(this.config.remote_endpoint!, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry)
    // }).catch(err => console.error('Failed to send log to remote:', err));
  }

  private formatTextEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const context = entry.agent_id ? `[${entry.agent_id}]` : '';
    const taskContext = entry.task_id ? `[${entry.task_id}]` : '';
    
    let formatted = `${timestamp} ${levelName} ${context}${taskContext} ${entry.message}`;
    
    if (entry.data) {
      formatted += `\nData: ${JSON.stringify(entry.data)}`;
    }
    
    return formatted;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility methods
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  getLogsByLevel(level: LogLevel, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count);
  }

  getLogsByAgent(agentId: string, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.agent_id === agentId)
      .slice(-count);
  }

  getLogsByTask(taskId: string): LogEntry[] {
    return this.logBuffer.filter(entry => entry.task_id === taskId);
  }

  clearBuffer(): void {
    this.logBuffer = [];
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // Agent-specific logger factory
  createAgentLogger(agentId: string): AgentLogger {
    return new AgentLogger(this, agentId);
  }
}

export class AgentLogger {
  private parentLogger: Logger;
  private agentId: string;

  constructor(parentLogger: Logger, agentId: string) {
    this.parentLogger = parentLogger;
    this.agentId = agentId;
  }

  debug(message: string, data?: any, taskId?: string): void {
    this.parentLogger.debug(message, data, { agent_id: this.agentId, task_id: taskId });
  }

  info(message: string, data?: any, taskId?: string): void {
    this.parentLogger.info(message, data, { agent_id: this.agentId, task_id: taskId });
  }

  warn(message: string, data?: any, taskId?: string): void {
    this.parentLogger.warn(message, data, { agent_id: this.agentId, task_id: taskId });
  }

  error(message: string, error?: Error | any, taskId?: string): void {
    this.parentLogger.error(message, error, { agent_id: this.agentId, task_id: taskId });
  }

  critical(message: string, error?: Error | any, taskId?: string): void {
    this.parentLogger.critical(message, error, { agent_id: this.agentId, task_id: taskId });
  }

  // Task-specific logger factory
  createTaskLogger(taskId: string): TaskLogger {
    return new TaskLogger(this, taskId);
  }
}

export class TaskLogger {
  private agentLogger: AgentLogger;
  private taskId: string;

  constructor(agentLogger: AgentLogger, taskId: string) {
    this.agentLogger = agentLogger;
    this.taskId = taskId;
  }

  debug(message: string, data?: any): void {
    this.agentLogger.debug(message, data, this.taskId);
  }

  info(message: string, data?: any): void {
    this.agentLogger.info(message, data, this.taskId);
  }

  warn(message: string, data?: any): void {
    this.agentLogger.warn(message, data, this.taskId);
  }

  error(message: string, error?: Error | any): void {
    this.agentLogger.error(message, error, this.taskId);
  }

  critical(message: string, error?: Error | any): void {
    this.agentLogger.critical(message, error, this.taskId);
  }
}

// Default logger configuration
export const createDefaultLogger = (): Logger => {
  const config: LoggerConfig = {
    level: LogLevel.INFO,
    outputs: ['console'],
    format: 'text',
    include_stack_trace: true,
  };
  
  return new Logger(config);
};

// Production logger configuration
export const createProductionLogger = (filePath?: string): Logger => {
  const config: LoggerConfig = {
    level: LogLevel.INFO,
    outputs: filePath ? ['console', 'file'] : ['console'],
    file_path: filePath,
    format: 'json',
    include_stack_trace: false,
    max_file_size: 100 * 1024 * 1024, // 100MB
    max_log_files: 10,
  };
  
  return new Logger(config);
};

// Development logger configuration
export const createDevelopmentLogger = (): Logger => {
  const config: LoggerConfig = {
    level: LogLevel.DEBUG,
    outputs: ['console'],
    format: 'text',
    include_stack_trace: true,
  };
  
  return new Logger(config);
};