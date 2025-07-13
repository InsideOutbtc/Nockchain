// NOCK Bridge Agent Scheduler and Task Runner
// Advanced scheduling system for autonomous agent execution

import { EventEmitter } from 'events';
import { Logger } from '../shared/utils/logger';
import { AgentTask, AgentStatus, TaskResult } from '../shared/types/agent-types';
import AgentExecutionEngine from './agent-execution-engine';

export interface SchedulerConfig {
  max_concurrent_agents: number;
  task_queue_limit: number;
  priority_levels: Record<string, number>;
  retry_policy: {
    max_retries: number;
    backoff_multiplier: number;
    initial_delay: number;
  };
  load_balancing: {
    enabled: boolean;
    strategy: 'round_robin' | 'least_loaded' | 'priority_based';
  };
  health_monitoring: {
    enabled: boolean;
    check_interval: number;
    failure_threshold: number;
  };
}

export interface TaskSchedule {
  task_id: string;
  agent_id: string;
  schedule_type: 'immediate' | 'delayed' | 'recurring' | 'conditional';
  schedule_expression?: string; // cron expression for recurring
  delay?: number; // milliseconds for delayed
  condition?: (context: any) => boolean; // for conditional
  priority: 'low' | 'medium' | 'high' | 'critical';
  max_retries?: number;
  retry_count: number;
  created_at: number;
  next_execution: number;
  last_execution?: number;
}

export interface LoadBalancingMetrics {
  agent_id: string;
  current_load: number;
  queue_size: number;
  average_execution_time: number;
  success_rate: number;
  health_score: number;
}

export class AgentScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private logger: Logger;
  private isRunning: boolean = false;

  // Agent management
  private agents: Map<string, AgentExecutionEngine> = new Map();
  private agentMetrics: Map<string, LoadBalancingMetrics> = new Map();

  // Task scheduling
  private taskSchedules: Map<string, TaskSchedule> = new Map();
  private globalTaskQueue: AgentTask[] = [];
  private recurringTasks: Map<string, TaskSchedule> = new Map();

  // Execution control
  private schedulerLoop?: NodeJS.Timeout;
  private healthMonitor?: NodeJS.Timeout;
  private loadBalancer?: NodeJS.Timeout;
  private retryProcessor?: NodeJS.Timeout;

  // Retry management
  private retryQueue: Map<string, { task: AgentTask; schedule: TaskSchedule; nextRetry: number }> = new Map();

  constructor(config: SchedulerConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Agent scheduler already running');
      return;
    }

    this.logger.info('Starting autonomous agent scheduler', {
      max_concurrent_agents: this.config.max_concurrent_agents,
      task_queue_limit: this.config.task_queue_limit,
      load_balancing: this.config.load_balancing.enabled,
    });

    try {
      this.isRunning = true;

      // Start scheduler loops
      this.startSchedulerLoop();
      if (this.config.health_monitoring.enabled) {
        this.startHealthMonitoring();
      }
      if (this.config.load_balancing.enabled) {
        this.startLoadBalancing();
      }
      this.startRetryProcessor();

      this.logger.info('Agent scheduler started successfully');
      this.emit('scheduler_started');

    } catch (error) {
      this.logger.error('Failed to start agent scheduler', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Agent scheduler not running');
      return;
    }

    this.logger.info('Stopping agent scheduler');

    try {
      // Stop all loops
      if (this.schedulerLoop) clearInterval(this.schedulerLoop);
      if (this.healthMonitor) clearInterval(this.healthMonitor);
      if (this.loadBalancer) clearInterval(this.loadBalancer);
      if (this.retryProcessor) clearInterval(this.retryProcessor);

      // Stop all agents
      for (const [agentId, agent] of this.agents) {
        try {
          await agent.stop();
          this.logger.info(`Agent ${agentId} stopped`);
        } catch (error) {
          this.logger.error(`Failed to stop agent ${agentId}`, error);
        }
      }

      this.isRunning = false;
      this.logger.info('Agent scheduler stopped successfully');
      this.emit('scheduler_stopped');

    } catch (error) {
      this.logger.error('Failed to stop agent scheduler gracefully', error);
      this.isRunning = false;
    }
  }

  // Agent management
  async registerAgent(agentId: string, agent: AgentExecutionEngine): Promise<void> {
    this.logger.info('Registering agent with scheduler', { agent_id: agentId });

    this.agents.set(agentId, agent);
    this.agentMetrics.set(agentId, {
      agent_id: agentId,
      current_load: 0,
      queue_size: 0,
      average_execution_time: 0,
      success_rate: 100,
      health_score: 100,
    });

    // Set up agent event listeners
    this.setupAgentEventListeners(agentId, agent);

    // Start the agent
    await agent.start();

    this.emit('agent_registered', { agent_id: agentId });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    this.logger.info('Unregistering agent from scheduler', { agent_id: agentId });

    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
      this.agents.delete(agentId);
      this.agentMetrics.delete(agentId);
    }

    // Remove agent's tasks from queues
    this.removeAgentTasks(agentId);

    this.emit('agent_unregistered', { agent_id: agentId });
  }

  // Task scheduling methods
  async scheduleTask(
    agentId: string,
    task: AgentTask,
    scheduleType: 'immediate' | 'delayed' | 'recurring' | 'conditional' = 'immediate',
    scheduleOptions?: {
      delay?: number;
      cronExpression?: string;
      condition?: (context: any) => boolean;
      maxRetries?: number;
    }
  ): Promise<void> {
    const scheduleId = `${task.id}_${Date.now()}`;

    const schedule: TaskSchedule = {
      task_id: task.id,
      agent_id: agentId,
      schedule_type: scheduleType,
      schedule_expression: scheduleOptions?.cronExpression,
      delay: scheduleOptions?.delay,
      condition: scheduleOptions?.condition,
      priority: task.priority,
      max_retries: scheduleOptions?.maxRetries || this.config.retry_policy.max_retries,
      retry_count: 0,
      created_at: Date.now(),
      next_execution: this.calculateNextExecution(scheduleType, scheduleOptions),
    };

    this.taskSchedules.set(scheduleId, schedule);

    if (scheduleType === 'recurring') {
      this.recurringTasks.set(scheduleId, schedule);
    }

    // Add to global queue if immediate
    if (scheduleType === 'immediate') {
      this.addToGlobalQueue(task, agentId);
    }

    this.logger.debug('Task scheduled', {
      schedule_id: scheduleId,
      agent_id: agentId,
      task_id: task.id,
      type: scheduleType,
      next_execution: new Date(schedule.next_execution).toISOString(),
    });

    this.emit('task_scheduled', { schedule_id: scheduleId, task, schedule });
  }

  async scheduleRecurringTask(
    agentId: string,
    taskTemplate: Omit<AgentTask, 'id' | 'created_at'>,
    cronExpression: string,
    maxRetries?: number
  ): Promise<void> {
    const baseTask: AgentTask = {
      ...taskTemplate,
      id: `recurring_${taskTemplate.type}_${Date.now()}`,
      created_at: Date.now(),
    };

    await this.scheduleTask(agentId, baseTask, 'recurring', {
      cronExpression,
      maxRetries,
    });
  }

  async scheduleConditionalTask(
    agentId: string,
    task: AgentTask,
    condition: (context: any) => boolean,
    maxRetries?: number
  ): Promise<void> {
    await this.scheduleTask(agentId, task, 'conditional', {
      condition,
      maxRetries,
    });
  }

  // Load balancing
  private selectOptimalAgent(task: AgentTask): string | null {
    if (!this.config.load_balancing.enabled) {
      // Default to task's assigned agent if no load balancing
      return task.agent_id || Array.from(this.agents.keys())[0] || null;
    }

    const availableAgents = Array.from(this.agentMetrics.values())
      .filter(metrics => this.isAgentHealthy(metrics.agent_id))
      .filter(metrics => this.canAgentHandleTask(metrics.agent_id, task));

    if (availableAgents.length === 0) {
      return null;
    }

    switch (this.config.load_balancing.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(availableAgents);
      case 'least_loaded':
        return this.selectLeastLoaded(availableAgents);
      case 'priority_based':
        return this.selectPriorityBased(availableAgents, task);
      default:
        return availableAgents[0].agent_id;
    }
  }

  private selectRoundRobin(agents: LoadBalancingMetrics[]): string {
    // Simple round-robin selection
    const now = Date.now();
    const index = Math.floor(now / 1000) % agents.length;
    return agents[index].agent_id;
  }

  private selectLeastLoaded(agents: LoadBalancingMetrics[]): string {
    return agents.reduce((least, current) => 
      current.current_load < least.current_load ? current : least
    ).agent_id;
  }

  private selectPriorityBased(agents: LoadBalancingMetrics[], task: AgentTask): string {
    // Score agents based on multiple factors
    const scored = agents.map(agent => ({
      agent_id: agent.agent_id,
      score: this.calculateAgentScore(agent, task),
    }));

    return scored.reduce((best, current) =>
      current.score > best.score ? current : best
    ).agent_id;
  }

  private calculateAgentScore(agent: LoadBalancingMetrics, task: AgentTask): number {
    const loadScore = Math.max(0, 100 - agent.current_load);
    const performanceScore = agent.success_rate;
    const healthScore = agent.health_score;
    const priorityBonus = this.config.priority_levels[task.priority] || 0;

    return (loadScore * 0.4) + (performanceScore * 0.3) + (healthScore * 0.2) + (priorityBonus * 0.1);
  }

  // Task execution
  private async executeTask(task: AgentTask, targetAgent?: string): Promise<TaskResult | null> {
    const agentId = targetAgent || this.selectOptimalAgent(task);
    
    if (!agentId) {
      this.logger.warn('No available agent for task execution', {
        task_id: task.id,
        task_type: task.type,
      });
      return null;
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.error('Selected agent not found', { agent_id: agentId });
      return null;
    }

    try {
      this.updateAgentLoad(agentId, 1);
      const result = await agent.executeTask(task);
      this.updateAgentLoad(agentId, -1);

      this.updateAgentMetrics(agentId, result);
      
      this.logger.debug('Task executed successfully', {
        task_id: task.id,
        agent_id: agentId,
        execution_time: result.metadata.execution_time,
      });

      this.emit('task_executed', { task, result, agent_id: agentId });
      return result;

    } catch (error) {
      this.updateAgentLoad(agentId, -1);
      
      this.logger.error('Task execution failed', error, {
        task_id: task.id,
        agent_id: agentId,
      });

      this.emit('task_execution_failed', { task, error, agent_id: agentId });
      return null;
    }
  }

  // Retry management
  private async handleTaskFailure(task: AgentTask, schedule: TaskSchedule, error: any): Promise<void> {
    if (schedule.retry_count >= schedule.max_retries!) {
      this.logger.error('Task exceeded maximum retries', {
        task_id: task.id,
        retry_count: schedule.retry_count,
        max_retries: schedule.max_retries,
      });

      this.emit('task_failed_permanently', { task, schedule, error });
      return;
    }

    // Calculate retry delay with exponential backoff
    const retryDelay = this.config.retry_policy.initial_delay * 
      Math.pow(this.config.retry_policy.backoff_multiplier, schedule.retry_count);

    const nextRetry = Date.now() + retryDelay;

    this.retryQueue.set(task.id, {
      task,
      schedule: {
        ...schedule,
        retry_count: schedule.retry_count + 1,
      },
      nextRetry,
    });

    this.logger.info('Task scheduled for retry', {
      task_id: task.id,
      retry_count: schedule.retry_count + 1,
      next_retry: new Date(nextRetry).toISOString(),
    });

    this.emit('task_retry_scheduled', { task, schedule, next_retry: nextRetry });
  }

  // Scheduler loops
  private startSchedulerLoop(): void {
    this.schedulerLoop = setInterval(async () => {
      try {
        await this.processScheduledTasks();
        await this.processGlobalQueue();
        await this.processRecurringTasks();
      } catch (error) {
        this.logger.error('Scheduler loop error', error);
      }
    }, 5000); // Run every 5 seconds
  }

  private startHealthMonitoring(): void {
    this.healthMonitor = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health monitoring error', error);
      }
    }, this.config.health_monitoring.check_interval);
  }

  private startLoadBalancing(): void {
    this.loadBalancer = setInterval(async () => {
      try {
        await this.updateLoadBalancingMetrics();
        await this.rebalanceTasks();
      } catch (error) {
        this.logger.error('Load balancing error', error);
      }
    }, 30000); // Run every 30 seconds
  }

  private startRetryProcessor(): void {
    this.retryProcessor = setInterval(async () => {
      try {
        await this.processRetryQueue();
      } catch (error) {
        this.logger.error('Retry processor error', error);
      }
    }, 10000); // Run every 10 seconds
  }

  // Processing methods
  private async processScheduledTasks(): Promise<void> {
    const now = Date.now();
    const readyTasks: string[] = [];

    for (const [scheduleId, schedule] of this.taskSchedules) {
      if (schedule.next_execution <= now) {
        if (schedule.schedule_type === 'conditional') {
          if (schedule.condition && !schedule.condition({})) {
            continue; // Condition not met
          }
        }

        readyTasks.push(scheduleId);
      }
    }

    for (const scheduleId of readyTasks) {
      const schedule = this.taskSchedules.get(scheduleId);
      if (!schedule) continue;

      const task: AgentTask = {
        id: `${schedule.task_id}_${Date.now()}`,
        type: schedule.task_id.split('_')[0], // Extract task type
        priority: schedule.priority,
        created_at: Date.now(),
        agent_id: schedule.agent_id,
      };

      await this.executeTask(task, schedule.agent_id);

      // Update schedule for next execution if recurring
      if (schedule.schedule_type === 'recurring') {
        schedule.last_execution = now;
        schedule.next_execution = this.calculateNextExecution('recurring', {
          cronExpression: schedule.schedule_expression,
        });
      } else {
        // Remove one-time schedules
        this.taskSchedules.delete(scheduleId);
      }
    }
  }

  private async processGlobalQueue(): Promise<void> {
    if (this.globalTaskQueue.length === 0) return;

    const availableSlots = this.calculateAvailableSlots();
    if (availableSlots <= 0) return;

    // Sort queue by priority
    this.globalTaskQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const tasksToExecute = this.globalTaskQueue.splice(0, availableSlots);

    for (const task of tasksToExecute) {
      await this.executeTask(task);
    }
  }

  private async processRecurringTasks(): Promise<void> {
    const now = Date.now();

    for (const [scheduleId, schedule] of this.recurringTasks) {
      if (schedule.next_execution <= now) {
        const task: AgentTask = {
          id: `${schedule.task_id}_${now}`,
          type: schedule.task_id,
          priority: schedule.priority,
          created_at: now,
          agent_id: schedule.agent_id,
        };

        await this.executeTask(task, schedule.agent_id);

        // Update next execution time
        schedule.last_execution = now;
        schedule.next_execution = this.calculateNextExecution('recurring', {
          cronExpression: schedule.schedule_expression,
        });
      }
    }
  }

  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const readyRetries: string[] = [];

    for (const [taskId, retryItem] of this.retryQueue) {
      if (retryItem.nextRetry <= now) {
        readyRetries.push(taskId);
      }
    }

    for (const taskId of readyRetries) {
      const retryItem = this.retryQueue.get(taskId);
      if (!retryItem) continue;

      const result = await this.executeTask(retryItem.task, retryItem.schedule.agent_id);
      
      if (result && result.status === 'success') {
        // Retry succeeded
        this.retryQueue.delete(taskId);
        this.emit('task_retry_succeeded', { task: retryItem.task, result });
      } else if (retryItem.schedule.retry_count >= retryItem.schedule.max_retries!) {
        // Max retries exceeded
        this.retryQueue.delete(taskId);
        this.emit('task_failed_permanently', { 
          task: retryItem.task, 
          schedule: retryItem.schedule,
          error: 'Max retries exceeded',
        });
      } else {
        // Schedule next retry
        await this.handleTaskFailure(retryItem.task, retryItem.schedule, 'Retry failed');
      }
    }
  }

  // Utility methods
  private calculateNextExecution(
    scheduleType: string,
    options?: { delay?: number; cronExpression?: string }
  ): number {
    const now = Date.now();

    switch (scheduleType) {
      case 'immediate':
        return now;
      case 'delayed':
        return now + (options?.delay || 0);
      case 'recurring':
        // Simple cron parsing - in production, use a proper cron library
        return now + 300000; // Default to 5 minutes for recurring
      case 'conditional':
        return now + 60000; // Check every minute for conditional tasks
      default:
        return now;
    }
  }

  private addToGlobalQueue(task: AgentTask, agentId: string): void {
    if (this.globalTaskQueue.length >= this.config.task_queue_limit) {
      this.logger.warn('Global task queue limit reached, dropping task', {
        task_id: task.id,
        queue_size: this.globalTaskQueue.length,
      });
      return;
    }

    this.globalTaskQueue.push({ ...task, agent_id: agentId });
  }

  private calculateAvailableSlots(): number {
    let totalActiveSlots = 0;
    
    for (const agent of this.agents.values()) {
      totalActiveSlots += agent.getActiveTasks().length;
    }

    return Math.max(0, this.config.max_concurrent_agents - totalActiveSlots);
  }

  private setupAgentEventListeners(agentId: string, agent: AgentExecutionEngine): void {
    agent.on('task_completed', (data) => {
      this.emit('agent_task_completed', { ...data, agent_id: agentId });
    });

    agent.on('task_failed', (data) => {
      this.emit('agent_task_failed', { ...data, agent_id: agentId });
    });

    agent.on('health_check', (health) => {
      this.updateAgentHealth(agentId, health);
    });

    agent.on('metrics_collected', (metrics) => {
      this.updateAgentPerformanceMetrics(agentId, metrics);
    });
  }

  private updateAgentLoad(agentId: string, delta: number): void {
    const metrics = this.agentMetrics.get(agentId);
    if (metrics) {
      metrics.current_load = Math.max(0, metrics.current_load + delta);
      this.agentMetrics.set(agentId, metrics);
    }
  }

  private updateAgentMetrics(agentId: string, result: TaskResult): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) return;

    // Update success rate
    const isSuccess = result.status === 'success';
    metrics.success_rate = (metrics.success_rate * 0.9) + (isSuccess ? 10 : 0);

    // Update average execution time
    const executionTime = result.metadata.execution_time;
    metrics.average_execution_time = 
      (metrics.average_execution_time * 0.8) + (executionTime * 0.2);

    this.agentMetrics.set(agentId, metrics);
  }

  private updateAgentHealth(agentId: string, health: any): void {
    const metrics = this.agentMetrics.get(agentId);
    if (metrics) {
      metrics.health_score = this.calculateHealthScore(health);
      this.agentMetrics.set(agentId, metrics);
    }
  }

  private updateAgentPerformanceMetrics(agentId: string, performanceMetrics: any): void {
    const metrics = this.agentMetrics.get(agentId);
    if (metrics) {
      metrics.queue_size = performanceMetrics.tasks_queued || 0;
      this.agentMetrics.set(agentId, metrics);
    }
  }

  private calculateHealthScore(health: any): number {
    let score = 100;
    
    if (health.resource_usage?.cpu_percent > 80) score -= 20;
    if (health.resource_usage?.memory_percent > 80) score -= 20;
    if (health.error_count > 5) score -= 30;
    if (!health.health_checks?.performance) score -= 10;
    
    return Math.max(0, score);
  }

  private isAgentHealthy(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    const metrics = this.agentMetrics.get(agentId);
    
    return !!(agent?.isAgentRunning()) && 
           (metrics?.health_score || 0) >= this.config.health_monitoring.failure_threshold;
  }

  private canAgentHandleTask(agentId: string, task: AgentTask): boolean {
    // Check if agent can handle this type of task
    const agentTypes = {
      marketing: ['market_analysis', 'content_creation', 'campaign_optimization', 'community_engagement', 'competitive_monitoring'],
      research: ['user_analysis', 'market_research', 'competitive_intelligence', 'data_analysis', 'trend_monitoring'],
      feature_planning: ['roadmap_planning', 'feature_specification', 'resource_planning', 'risk_assessment', 'integration_planning'],
    };

    const supportedTypes = agentTypes[agentId as keyof typeof agentTypes] || [];
    return supportedTypes.includes(task.type);
  }

  private removeAgentTasks(agentId: string): void {
    // Remove from global queue
    this.globalTaskQueue = this.globalTaskQueue.filter(task => task.agent_id !== agentId);

    // Remove from schedules
    for (const [scheduleId, schedule] of this.taskSchedules) {
      if (schedule.agent_id === agentId) {
        this.taskSchedules.delete(scheduleId);
      }
    }

    // Remove from recurring tasks
    for (const [scheduleId, schedule] of this.recurringTasks) {
      if (schedule.agent_id === agentId) {
        this.recurringTasks.delete(scheduleId);
      }
    }

    // Remove from retry queue
    for (const [taskId, retryItem] of this.retryQueue) {
      if (retryItem.schedule.agent_id === agentId) {
        this.retryQueue.delete(taskId);
      }
    }
  }

  private async performHealthChecks(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        const health = agent.getHealth();
        const metrics = this.agentMetrics.get(agentId);
        
        if (metrics) {
          metrics.health_score = this.calculateHealthScore(health);
          
          if (metrics.health_score < this.config.health_monitoring.failure_threshold) {
            this.logger.warn('Agent health degraded', {
              agent_id: agentId,
              health_score: metrics.health_score,
            });
            
            this.emit('agent_health_degraded', { agent_id: agentId, health });
          }
        }
      } catch (error) {
        this.logger.error('Health check failed for agent', error, { agent_id: agentId });
      }
    }
  }

  private async updateLoadBalancingMetrics(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      const metrics = this.agentMetrics.get(agentId);
      if (metrics) {
        metrics.current_load = agent.getActiveTasks().length;
        metrics.queue_size = this.globalTaskQueue.filter(t => t.agent_id === agentId).length;
        this.agentMetrics.set(agentId, metrics);
      }
    }
  }

  private async rebalanceTasks(): Promise<void> {
    if (!this.config.load_balancing.enabled) return;

    // Simple rebalancing: move tasks from overloaded agents to underloaded ones
    const agentMetrics = Array.from(this.agentMetrics.values());
    const overloaded = agentMetrics.filter(m => m.current_load > 5);
    const underloaded = agentMetrics.filter(m => m.current_load < 2);

    if (overloaded.length > 0 && underloaded.length > 0) {
      this.logger.info('Rebalancing tasks between agents', {
        overloaded_agents: overloaded.map(a => a.agent_id),
        underloaded_agents: underloaded.map(a => a.agent_id),
      });

      // In a production system, this would actually move tasks
      // For now, just log the rebalancing action
      this.emit('tasks_rebalanced', { overloaded, underloaded });
    }
  }

  // Public getters
  getSchedulerStatus(): any {
    return {
      is_running: this.isRunning,
      registered_agents: Array.from(this.agents.keys()),
      global_queue_size: this.globalTaskQueue.length,
      scheduled_tasks: this.taskSchedules.size,
      recurring_tasks: this.recurringTasks.size,
      retry_queue_size: this.retryQueue.size,
      agent_metrics: Object.fromEntries(this.agentMetrics),
    };
  }

  getAgentMetrics(agentId?: string): LoadBalancingMetrics | Map<string, LoadBalancingMetrics> {
    if (agentId) {
      return this.agentMetrics.get(agentId) || {} as LoadBalancingMetrics;
    }
    return new Map(this.agentMetrics);
  }

  getTaskSchedules(): Map<string, TaskSchedule> {
    return new Map(this.taskSchedules);
  }

  getRetryQueue(): Map<string, any> {
    return new Map(this.retryQueue);
  }
}

export default AgentScheduler;