// NOCK Bridge Continuous Agent Execution Manager
// Orchestrates continuous autonomous execution of all agents

import { EventEmitter } from 'events';
import { Logger, createProductionLogger } from '../shared/utils/logger';
import AgentExecutionEngine from './agent-execution-engine';
import AgentScheduler from './agent-scheduler';
import InterAgentCommunication from './inter-agent-communication';
import { AgentTask, AgentStatus, TaskResult } from '../shared/types/agent-types';

export interface ExecutionManagerConfig {
  agents: {
    marketing: {
      enabled: boolean;
      execution_interval: number;
      max_concurrent_tasks: number;
      workspace_path: string;
    };
    research: {
      enabled: boolean;
      execution_interval: number;
      max_concurrent_tasks: number;
      workspace_path: string;
    };
    feature_planning: {
      enabled: boolean;
      execution_interval: number;
      max_concurrent_tasks: number;
      workspace_path: string;
    };
  };
  scheduler: {
    max_concurrent_agents: number;
    task_queue_limit: number;
    retry_policy: {
      max_retries: number;
      backoff_multiplier: number;
      initial_delay: number;
    };
    load_balancing: {
      enabled: boolean;
      strategy: 'round_robin' | 'least_loaded' | 'priority_based';
    };
  };
  communication: {
    message_queue_max_size: number;
    routing_strategy: 'direct' | 'broadcast' | 'intelligent';
    message_ttl: number;
    encryption_enabled: boolean;
  };
  execution: {
    continuous_mode: boolean;
    auto_restart: boolean;
    health_check_interval: number;
    metrics_collection_interval: number;
    task_generation_interval: number;
  };
}

export interface SystemMetrics {
  total_agents: number;
  active_agents: number;
  total_tasks_executed: number;
  successful_tasks: number;
  failed_tasks: number;
  average_execution_time: number;
  system_uptime: number;
  memory_usage: number;
  cpu_usage: number;
  message_throughput: number;
  agent_coordination_score: number;
}

export class ContinuousExecutionManager extends EventEmitter {
  private config: ExecutionManagerConfig;
  private logger: Logger;
  private isRunning: boolean = false;

  // Core components
  private scheduler!: AgentScheduler;
  private communication!: InterAgentCommunication;
  private agents: Map<string, AgentExecutionEngine> = new Map();

  // Execution management
  private taskGenerators: Map<string, NodeJS.Timeout> = new Map();
  private systemMonitor?: NodeJS.Timeout;
  private metricsCollector?: NodeJS.Timeout;
  private coordinationEngine?: NodeJS.Timeout;

  // System state
  private systemMetrics!: SystemMetrics;
  private startTime: number = 0;
  private taskCounter: number = 0;

  constructor(config: ExecutionManagerConfig) {
    super();
    this.config = config;
    this.logger = createProductionLogger('/Users/Patrick/Nockchain/logs/agent-execution.log');

    // Initialize core components
    this.initializeScheduler();
    this.initializeCommunication();
    this.initializeSystemMetrics();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Continuous execution manager already running');
      return;
    }

    this.logger.info('Starting NOCKCHAIN autonomous agent execution system', {
      enabled_agents: Object.entries(this.config.agents)
        .filter(([_, config]) => config.enabled)
        .map(([name, _]) => name),
      continuous_mode: this.config.execution.continuous_mode,
      auto_restart: this.config.execution.auto_restart,
    });

    try {
      this.startTime = Date.now();
      this.isRunning = true;

      // Start core components
      await this.communication.start();
      await this.scheduler.start();

      // Initialize and start agents
      await this.initializeAgents();
      await this.startAllAgents();

      // Start execution management
      this.startTaskGeneration();
      this.startSystemMonitoring();
      this.startMetricsCollection();
      this.startCoordinationEngine();

      this.logger.info('NOCKCHAIN autonomous agent system started successfully', {
        active_agents: this.agents.size,
        system_uptime: 0,
      });

      this.emit('execution_started', {
        timestamp: Date.now(),
        active_agents: Array.from(this.agents.keys()),
      });

    } catch (error) {
      this.logger.error('Failed to start continuous execution manager', error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Continuous execution manager not running');
      return;
    }

    this.logger.info('Stopping NOCKCHAIN autonomous agent execution system');

    try {
      // Stop execution management
      this.stopTaskGeneration();
      if (this.systemMonitor) clearInterval(this.systemMonitor);
      if (this.metricsCollector) clearInterval(this.metricsCollector);
      if (this.coordinationEngine) clearInterval(this.coordinationEngine);

      // Stop all agents
      await this.stopAllAgents();

      // Stop core components
      await this.scheduler.stop();
      await this.communication.stop();

      this.isRunning = false;

      const uptime = Date.now() - this.startTime;
      this.logger.info('NOCKCHAIN autonomous agent system stopped successfully', {
        total_uptime: uptime,
        total_tasks_executed: this.systemMetrics.total_tasks_executed,
        success_rate: this.calculateSuccessRate(),
      });

      this.emit('execution_stopped', {
        timestamp: Date.now(),
        uptime: uptime,
        total_tasks: this.systemMetrics.total_tasks_executed,
      });

    } catch (error) {
      this.logger.error('Failed to stop continuous execution manager gracefully', error);
      this.isRunning = false;
    }
  }

  // Agent management
  private async initializeAgents(): Promise<void> {
    for (const [agentId, agentConfig] of Object.entries(this.config.agents)) {
      if (!agentConfig.enabled) {
        this.logger.info(`Agent ${agentId} disabled, skipping initialization`);
        continue;
      }

      try {
        const executionEngine = new AgentExecutionEngine(
          {
            agent_id: agentId,
            workspace_path: agentConfig.workspace_path,
            execution_interval: agentConfig.execution_interval,
            max_concurrent_tasks: agentConfig.max_concurrent_tasks,
            auto_restart: this.config.execution.auto_restart,
            health_check_interval: this.config.execution.health_check_interval,
            task_timeout: 300000, // 5 minutes
            memory_limit: '1GB',
            cpu_limit: '1 core',
          },
          this.logger
        );

        // Register with scheduler
        await this.scheduler.registerAgent(agentId, executionEngine);

        // Register with communication system
        await this.communication.registerAgent(
          agentId,
          this.getAgentCapabilities(agentId),
          this.getAgentSubscriptions(agentId)
        );

        this.agents.set(agentId, executionEngine);

        this.logger.info(`Agent ${agentId} initialized successfully`);

      } catch (error) {
        this.logger.error(`Failed to initialize agent ${agentId}`, error);
        throw error;
      }
    }
  }

  private async startAllAgents(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.start();
        this.logger.info(`Agent ${agentId} started successfully`);
      } catch (error) {
        this.logger.error(`Failed to start agent ${agentId}`, error);
        throw error;
      }
    }
  }

  private async stopAllAgents(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        await agent.stop();
        await this.scheduler.unregisterAgent(agentId);
        await this.communication.unregisterAgent(agentId);
        this.logger.info(`Agent ${agentId} stopped successfully`);
      } catch (error) {
        this.logger.error(`Failed to stop agent ${agentId}`, error);
      }
    }
  }

  // Task generation and management
  private startTaskGeneration(): void {
    if (!this.config.execution.continuous_mode) {
      this.logger.info('Continuous mode disabled, skipping task generation');
      return;
    }

    for (const [agentId, agent] of this.agents) {
      const interval = setInterval(async () => {
        try {
          await this.generateAgentTasks(agentId);
        } catch (error) {
          this.logger.error(`Task generation failed for agent ${agentId}`, error);
        }
      }, this.config.execution.task_generation_interval);

      this.taskGenerators.set(agentId, interval);
    }

    this.logger.info('Continuous task generation started for all agents');
  }

  private stopTaskGeneration(): void {
    for (const [agentId, interval] of this.taskGenerators) {
      clearInterval(interval);
      this.logger.debug(`Task generation stopped for agent ${agentId}`);
    }
    this.taskGenerators.clear();
  }

  private async generateAgentTasks(agentId: string): Promise<void> {
    const tasks = this.getPeriodicTasks(agentId);
    
    for (const task of tasks) {
      try {
        await this.scheduler.scheduleTask(agentId, task, 'immediate');
        this.taskCounter++;
        
        this.logger.debug(`Generated task for agent ${agentId}`, {
          task_id: task.id,
          task_type: task.type,
          priority: task.priority,
        });

      } catch (error) {
        this.logger.error(`Failed to schedule task for agent ${agentId}`, error);
      }
    }
  }

  private getPeriodicTasks(agentId: string): AgentTask[] {
    const now = Date.now();
    const baseId = `${agentId}_${now}`;

    switch (agentId) {
      case 'marketing':
        return [
          {
            id: `${baseId}_competitive_monitoring`,
            type: 'competitive_monitoring',
            priority: 'medium',
            created_at: now,
            description: 'Monitor competitor activities and pricing changes',
          },
          {
            id: `${baseId}_community_engagement`,
            type: 'community_engagement',
            priority: 'high',
            created_at: now,
            description: 'Engage with NOCK community and track sentiment',
          },
          {
            id: `${baseId}_content_optimization`,
            type: 'campaign_optimization',
            priority: 'medium',
            created_at: now,
            description: 'Optimize ongoing marketing campaigns',
          },
        ];

      case 'research':
        return [
          {
            id: `${baseId}_user_behavior`,
            type: 'user_analysis',
            priority: 'high',
            created_at: now,
            description: 'Analyze current user behavior patterns',
          },
          {
            id: `${baseId}_market_trends`,
            type: 'trend_monitoring',
            priority: 'medium',
            created_at: now,
            description: 'Monitor DeFi and mining market trends',
          },
          {
            id: `${baseId}_platform_analytics`,
            type: 'data_analysis',
            priority: 'high',
            created_at: now,
            description: 'Analyze platform performance metrics',
          },
        ];

      case 'feature_planning':
        return [
          {
            id: `${baseId}_roadmap_review`,
            type: 'roadmap_planning',
            priority: 'medium',
            created_at: now,
            description: 'Review and update product roadmap',
          },
          {
            id: `${baseId}_resource_assessment`,
            type: 'resource_planning',
            priority: 'medium',
            created_at: now,
            description: 'Assess development resource allocation',
          },
          {
            id: `${baseId}_risk_monitoring`,
            type: 'risk_assessment',
            priority: 'high',
            created_at: now,
            description: 'Monitor technical and business risks',
          },
        ];

      default:
        return [];
    }
  }

  // System monitoring
  private startSystemMonitoring(): void {
    this.systemMonitor = setInterval(async () => {
      try {
        await this.performSystemHealthCheck();
        await this.monitorAgentPerformance();
        await this.checkAutoRestart();
      } catch (error) {
        this.logger.error('System monitoring error', error);
      }
    }, this.config.execution.health_check_interval);
  }

  private async performSystemHealthCheck(): Promise<void> {
    const healthyAgents = Array.from(this.agents.entries())
      .filter(([_, agent]) => agent.isAgentRunning())
      .length;

    const systemHealth = {
      timestamp: Date.now(),
      total_agents: this.agents.size,
      healthy_agents: healthyAgents,
      scheduler_running: this.scheduler.getSchedulerStatus().is_running,
      communication_running: this.communication.isSystemRunning(),
      uptime: Date.now() - this.startTime,
    };

    if (healthyAgents < this.agents.size) {
      this.logger.warn('System health degraded', {
        healthy_agents: healthyAgents,
        total_agents: this.agents.size,
      });

      this.emit('system_health_degraded', systemHealth);
    }

    this.emit('health_check_completed', systemHealth);
  }

  private async monitorAgentPerformance(): Promise<void> {
    const agentPerformance = new Map();

    for (const [agentId, agent] of this.agents) {
      const metrics = agent.getMetrics();
      const health = agent.getHealth();
      const status = agent.getStatus();

      agentPerformance.set(agentId, {
        metrics,
        health,
        status,
        performance_score: this.calculatePerformanceScore(metrics, health),
      });
    }

    this.emit('agent_performance_updated', Object.fromEntries(agentPerformance));
  }

  private async checkAutoRestart(): Promise<void> {
    if (!this.config.execution.auto_restart) return;

    for (const [agentId, agent] of this.agents) {
      if (!agent.isAgentRunning()) {
        this.logger.warn(`Agent ${agentId} is not running, attempting restart`);

        try {
          await agent.start();
          this.logger.info(`Agent ${agentId} restarted successfully`);
          
          this.emit('agent_restarted', { agent_id: agentId, timestamp: Date.now() });

        } catch (error) {
          this.logger.error(`Failed to restart agent ${agentId}`, error);
          
          this.emit('agent_restart_failed', { 
            agent_id: agentId, 
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  // Metrics collection
  private startMetricsCollection(): void {
    this.metricsCollector = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.generatePerformanceReport();
      } catch (error) {
        this.logger.error('Metrics collection error', error);
      }
    }, this.config.execution.metrics_collection_interval);
  }

  private async collectSystemMetrics(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Collect agent metrics
    let totalTasks = 0;
    let successfulTasks = 0;
    let totalExecutionTime = 0;
    let activeAgents = 0;

    for (const [_, agent] of this.agents) {
      const metrics = agent.getMetrics();
      
      totalTasks += metrics.tasks_executed;
      successfulTasks += metrics.tasks_successful;
      totalExecutionTime += metrics.average_execution_time * metrics.tasks_executed;
      
      if (agent.isAgentRunning()) activeAgents++;
    }

    // Collect communication metrics
    const commMetrics = this.communication.getCommunicationMetrics();

    this.systemMetrics = {
      total_agents: this.agents.size,
      active_agents: activeAgents,
      total_tasks_executed: totalTasks,
      successful_tasks: successfulTasks,
      failed_tasks: totalTasks - successfulTasks,
      average_execution_time: totalTasks > 0 ? totalExecutionTime / totalTasks : 0,
      system_uptime: Date.now() - this.startTime,
      memory_usage: memoryUsage.heapUsed,
      cpu_usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to percentage
      message_throughput: commMetrics.messages_delivered,
      agent_coordination_score: this.calculateCoordinationScore(),
    };

    this.emit('metrics_collected', this.systemMetrics);
  }

  private async generatePerformanceReport(): Promise<void> {
    const report = {
      timestamp: Date.now(),
      system_metrics: this.systemMetrics,
      agent_details: Object.fromEntries(
        Array.from(this.agents.entries()).map(([agentId, agent]) => [
          agentId,
          {
            status: agent.getStatus(),
            health: agent.getHealth(),
            metrics: agent.getMetrics(),
            active_tasks: agent.getActiveTasks().length,
          },
        ])
      ),
      scheduler_status: this.scheduler.getSchedulerStatus(),
      communication_metrics: this.communication.getCommunicationMetrics(),
      recommendations: this.generateOptimizationRecommendations(),
    };

    this.emit('performance_report_generated', report);

    // Log key metrics
    this.logger.info('System performance report', {
      success_rate: this.calculateSuccessRate(),
      average_execution_time: this.systemMetrics.average_execution_time,
      active_agents: this.systemMetrics.active_agents,
      total_tasks: this.systemMetrics.total_tasks_executed,
      coordination_score: this.systemMetrics.agent_coordination_score,
    });
  }

  // Agent coordination
  private startCoordinationEngine(): void {
    this.coordinationEngine = setInterval(async () => {
      try {
        await this.coordinateAgentActivities();
        await this.synchronizeAgentData();
        await this.optimizeTaskDistribution();
      } catch (error) {
        this.logger.error('Coordination engine error', error);
      }
    }, 60000); // Coordinate every minute
  }

  private async coordinateAgentActivities(): Promise<void> {
    // Coordinate activities between agents
    const coordinationTasks = [
      this.shareMarketIntelligence(),
      this.shareUserInsights(),
      this.shareProductUpdates(),
    ];

    await Promise.all(coordinationTasks);
  }

  private async shareMarketIntelligence(): Promise<void> {
    // Marketing agent shares competitive intelligence with other agents
    const message = {
      id: `coord_${Date.now()}`,
      type: 'market_intelligence_update' as const,
      content: {
        competitive_landscape: 'F2Pool fees increased, opportunity detected',
        market_sentiment: 'Positive NOCK community growth',
        recommended_actions: ['Accelerate bridge promotion', 'Target competitor users'],
      },
      timestamp: Date.now(),
    };

    await this.communication.sendMulticast('marketing', ['research', 'feature_planning'], message);
  }

  private async shareUserInsights(): Promise<void> {
    // Research agent shares user behavior insights
    const message = {
      id: `coord_${Date.now()}`,
      type: 'user_insights_update' as const,
      content: {
        user_behavior: 'Bridge adoption increasing 8% monthly',
        pain_points: ['Setup complexity', 'DeFi knowledge gap'],
        opportunities: ['Mobile interface demand', 'Automated yield suggestions'],
      },
      timestamp: Date.now(),
    };

    await this.communication.sendMulticast('research', ['marketing', 'feature_planning'], message);
  }

  private async shareProductUpdates(): Promise<void> {
    // Feature planning agent shares roadmap updates
    const message = {
      id: `coord_${Date.now()}`,
      type: 'product_roadmap_update' as const,
      content: {
        next_features: ['Unified dashboard', 'Mobile app', 'Institutional API'],
        timeline_changes: ['Mobile app moved up by 2 weeks'],
        resource_needs: ['Additional UI/UX designer', 'QA automation'],
      },
      timestamp: Date.now(),
    };

    await this.communication.sendMulticast('feature_planning', ['marketing', 'research'], message);
  }

  private async synchronizeAgentData(): Promise<void> {
    // Synchronize shared data between agents
    const sharedData = {
      platform_metrics: {
        active_miners: 2847,
        bridge_volume: '$156K monthly',
        user_retention: '74%',
      },
      market_data: {
        nock_price: '$0.012',
        network_hashrate: '450 TH/s',
        competitor_fees: { f2pool: '3.5%', antpool: '3%', viabtc: '2.5%' },
      },
      product_status: {
        current_version: '1.2.3',
        active_features: ['mining', 'bridge', 'basic_defi'],
        upcoming_releases: ['unified_dashboard', 'mobile_app'],
      },
    };

    // Share with all agents
    for (const agentId of this.agents.keys()) {
      const resourceId = await this.communication.shareResource(
        'system',
        {
          type: 'data',
          name: 'platform_intelligence',
          content: sharedData,
          access_permissions: {
            read: ['*'],
            write: ['system'],
            delete: ['system'],
          },
          version: '1.0',
        }
      );

      await this.communication.subscribeToResource(agentId, resourceId);
    }
  }

  private async optimizeTaskDistribution(): Promise<void> {
    // Optimize task distribution based on agent performance
    const agentMetrics = this.scheduler.getAgentMetrics();
    const overloadedAgents = [];
    const underloadedAgents = [];

    if (agentMetrics instanceof Map) {
      for (const [agentId, metrics] of agentMetrics) {
        if (metrics.current_load > 8) {
          overloadedAgents.push(agentId);
        } else if (metrics.current_load < 3) {
          underloadedAgents.push(agentId);
        }
      }
    }

    if (overloadedAgents.length > 0 || underloadedAgents.length > 0) {
      this.logger.info('Optimizing task distribution', {
        overloaded: overloadedAgents,
        underloaded: underloadedAgents,
      });

      this.emit('task_distribution_optimized', {
        overloaded_agents: overloadedAgents,
        underloaded_agents: underloadedAgents,
      });
    }
  }

  // Utility methods
  private initializeScheduler(): void {
    this.scheduler = new AgentScheduler(
      {
        max_concurrent_agents: this.config.scheduler.max_concurrent_agents,
        task_queue_limit: this.config.scheduler.task_queue_limit,
        priority_levels: { high: 3, medium: 2, low: 1 },
        retry_policy: this.config.scheduler.retry_policy,
        load_balancing: this.config.scheduler.load_balancing,
        health_monitoring: {
          enabled: true,
          check_interval: this.config.execution.health_check_interval,
          failure_threshold: 50,
        },
      },
      this.logger
    );
  }

  private initializeCommunication(): void {
    this.communication = new InterAgentCommunication(
      {
        message_queue: {
          type: 'memory',
          max_queue_size: this.config.communication.message_queue_max_size,
        },
        routing: {
          strategy: this.config.communication.routing_strategy,
          message_ttl: this.config.communication.message_ttl,
          retry_attempts: 3,
          retry_delay: 1000,
        },
        security: {
          encryption_enabled: this.config.communication.encryption_enabled,
          message_signing: false,
          agent_authentication: true,
        },
        performance: {
          batch_processing: true,
          batch_size: 10,
          compression_enabled: false,
          priority_queues: true,
        },
      },
      this.logger
    );
  }

  private initializeSystemMetrics(): void {
    this.systemMetrics = {
      total_agents: 0,
      active_agents: 0,
      total_tasks_executed: 0,
      successful_tasks: 0,
      failed_tasks: 0,
      average_execution_time: 0,
      system_uptime: 0,
      memory_usage: 0,
      cpu_usage: 0,
      message_throughput: 0,
      agent_coordination_score: 100,
    };
  }

  private getAgentCapabilities(agentId: string): string[] {
    const capabilities = {
      marketing: [
        'market_analysis',
        'content_creation',
        'campaign_optimization',
        'community_engagement',
        'competitive_monitoring',
      ],
      research: [
        'user_analysis',
        'market_research',
        'competitive_intelligence',
        'data_analysis',
        'trend_monitoring',
      ],
      feature_planning: [
        'roadmap_planning',
        'feature_specification',
        'resource_planning',
        'risk_assessment',
        'integration_planning',
      ],
    };

    return capabilities[agentId as keyof typeof capabilities] || [];
  }

  private getAgentSubscriptions(agentId: string): string[] {
    // All agents subscribe to system-wide updates
    const baseSubscriptions = [
      'system_update',
      'performance_alert',
      'coordination_message',
    ];

    const specificSubscriptions = {
      marketing: ['user_insights_update', 'product_roadmap_update'],
      research: ['market_intelligence_update', 'product_roadmap_update'],
      feature_planning: ['market_intelligence_update', 'user_insights_update'],
    };

    return [
      ...baseSubscriptions,
      ...(specificSubscriptions[agentId as keyof typeof specificSubscriptions] || []),
    ];
  }

  private calculateSuccessRate(): number {
    const total = this.systemMetrics.total_tasks_executed;
    return total > 0 ? (this.systemMetrics.successful_tasks / total) * 100 : 100;
  }

  private calculatePerformanceScore(metrics: any, health: any): number {
    const successRate = metrics.tasks_executed > 0 ? 
      (metrics.tasks_successful / metrics.tasks_executed) * 100 : 100;
    
    const healthScore = health.status === 'healthy' ? 100 : 
      health.status === 'warning' ? 75 : 50;
    
    const efficiencyScore = metrics.average_execution_time < 5000 ? 100 : 
      Math.max(0, 100 - (metrics.average_execution_time - 5000) / 1000);

    return (successRate * 0.4) + (healthScore * 0.3) + (efficiencyScore * 0.3);
  }

  private calculateCoordinationScore(): number {
    const commMetrics = this.communication.getCommunicationMetrics();
    const messageSuccessRate = commMetrics.messages_sent > 0 ? 
      (commMetrics.messages_delivered / commMetrics.messages_sent) * 100 : 100;
    
    const agentActivityScore = (this.systemMetrics.active_agents / this.systemMetrics.total_agents) * 100;
    
    return (messageSuccessRate * 0.6) + (agentActivityScore * 0.4);
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations = [];
    
    if (this.calculateSuccessRate() < 90) {
      recommendations.push('Investigate task failure causes and improve error handling');
    }
    
    if (this.systemMetrics.average_execution_time > 10000) {
      recommendations.push('Optimize task execution performance');
    }
    
    if (this.systemMetrics.agent_coordination_score < 80) {
      recommendations.push('Improve inter-agent communication reliability');
    }
    
    if (this.systemMetrics.active_agents < this.systemMetrics.total_agents) {
      recommendations.push('Investigate agent health issues and improve stability');
    }

    return recommendations;
  }

  // Public getters
  getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  getSystemStatus(): any {
    return {
      is_running: this.isRunning,
      uptime: Date.now() - this.startTime,
      agents: Object.fromEntries(
        Array.from(this.agents.entries()).map(([id, agent]) => [
          id,
          {
            running: agent.isAgentRunning(),
            status: agent.getStatus(),
            health: agent.getHealth(),
          },
        ])
      ),
      scheduler: this.scheduler.getSchedulerStatus(),
      communication: this.communication.getCommunicationMetrics(),
      metrics: this.systemMetrics,
    };
  }

  isSystemRunning(): boolean {
    return this.isRunning;
  }
}

export default ContinuousExecutionManager;