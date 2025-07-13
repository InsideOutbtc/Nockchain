// Deployment Orchestrator - Production deployment and infrastructure management

import { Connection, Keypair } from '@solana/web3.js';
import { Logger } from '../utils/logger';
import { UnifiedIntegration, UnifiedIntegrationConfig } from './unified-main';
import { ConfigurationTemplates } from './config-templates';

export interface DeploymentConfig {
  // Environment settings
  environment: 'development' | 'staging' | 'production';
  region: 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1';
  
  // Infrastructure settings
  infrastructure: {
    enableKubernetes: boolean;
    kubernetesNamespace: string;
    enableLoadBalancer: boolean;
    enableAutoScaling: boolean;
    minInstances: number;
    maxInstances: number;
    enableServiceMesh: boolean;
  };
  
  // Database settings
  database: {
    enableClusterMode: boolean;
    enableReadReplicas: boolean;
    replicaCount: number;
    enableBackups: boolean;
    backupRetention: number; // days
    enablePointInTimeRecovery: boolean;
  };
  
  // Monitoring and observability
  monitoring: {
    enablePrometheus: boolean;
    enableGrafana: boolean;
    enableElasticsearch: boolean;
    enableKibana: boolean;
    enableJaeger: boolean;
    enableSentry: boolean;
    alertChannels: string[];
  };
  
  // Security settings
  security: {
    enableTLS: boolean;
    enableMTLS: boolean;
    enableVPN: boolean;
    enableWAF: boolean;
    enableDDoSProtection: boolean;
    enableSecretManagement: boolean;
    secretProvider: 'aws-secrets' | 'hashicorp-vault' | 'kubernetes-secrets';
  };
  
  // Backup and disaster recovery
  backupRecovery: {
    enableContinuousBackup: boolean;
    enableCrossRegionReplication: boolean;
    rpoTargetMinutes: number; // Recovery Point Objective
    rtoTargetMinutes: number; // Recovery Time Objective
    enableAutomatedFailover: boolean;
  };
}

export interface DeploymentStatus {
  // Overall status
  status: 'deploying' | 'healthy' | 'degraded' | 'failed' | 'updating' | 'stopped';
  timestamp: number;
  deploymentId: string;
  version: string;
  
  // Component status
  components: {
    application: ComponentDeploymentStatus;
    database: ComponentDeploymentStatus;
    cache: ComponentDeploymentStatus;
    messageQueue: ComponentDeploymentStatus;
    monitoring: ComponentDeploymentStatus;
    loadBalancer: ComponentDeploymentStatus;
  };
  
  // Infrastructure status
  infrastructure: {
    region: string;
    availabilityZones: string[];
    instanceCount: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      storage: number;
      network: number;
    };
  };
  
  // Health checks
  healthChecks: {
    overall: boolean;
    apiEndpoints: boolean;
    databaseConnections: boolean;
    cacheConnections: boolean;
    externalServices: boolean;
  };
  
  // Performance metrics
  performance: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
  
  // Recent deployments
  recentDeployments: DeploymentHistory[];
}

export interface ComponentDeploymentStatus {
  status: 'deploying' | 'healthy' | 'degraded' | 'failed' | 'stopped';
  version: string;
  instances: number;
  healthyInstances: number;
  lastDeployed: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    storage?: number;
  };
}

export interface DeploymentHistory {
  id: string;
  version: string;
  timestamp: number;
  duration: number; // seconds
  status: 'success' | 'failed' | 'rollback';
  deployedBy: string;
  changes: string[];
  rollbackVersion?: string;
}

export interface DeploymentPlan {
  id: string;
  environment: string;
  version: string;
  
  // Deployment strategy
  strategy: 'blue-green' | 'rolling' | 'canary' | 'recreate';
  stages: DeploymentStage[];
  
  // Dependencies
  prerequisites: string[];
  dependencies: string[];
  
  // Rollback plan
  rollbackStrategy: 'automatic' | 'manual' | 'disabled';
  rollbackTriggers: string[];
  
  // Testing
  preDeploymentTests: string[];
  postDeploymentTests: string[];
  performanceTests: string[];
  
  // Notifications
  notificationChannels: string[];
  stakeholders: string[];
}

export interface DeploymentStage {
  name: string;
  order: number;
  components: string[];
  parallel: boolean;
  
  // Stage configuration
  timeout: number; // minutes
  retryCount: number;
  rollbackOnFailure: boolean;
  
  // Health checks
  healthChecks: {
    enabled: boolean;
    endpoint?: string;
    timeout: number;
    interval: number;
    threshold: number;
  };
  
  // Approval gates
  approvalRequired: boolean;
  approvers: string[];
  
  // Custom scripts
  preStageScript?: string;
  postStageScript?: string;
}

export class DeploymentOrchestrator {
  private config: DeploymentConfig;
  private logger: Logger;
  private unifiedIntegration?: UnifiedIntegration;
  private deploymentStatus: DeploymentStatus;
  private currentDeploymentId?: string;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.logger = new Logger('DeploymentOrchestrator');
    this.initializeDeploymentStatus();
  }

  async deploy(plan: DeploymentPlan): Promise<string> {
    this.currentDeploymentId = this.generateDeploymentId();
    
    this.logger.info('Starting deployment', {
      deploymentId: this.currentDeploymentId,
      environment: plan.environment,
      version: plan.version,
      strategy: plan.strategy
    });

    try {
      // Update deployment status
      this.deploymentStatus.status = 'deploying';
      this.deploymentStatus.deploymentId = this.currentDeploymentId;
      this.deploymentStatus.version = plan.version;

      // Execute deployment stages
      await this.executeDeploymentStages(plan);
      
      // Run post-deployment verification
      await this.runPostDeploymentVerification(plan);
      
      // Update status to healthy
      this.deploymentStatus.status = 'healthy';
      
      // Record deployment history
      await this.recordDeploymentHistory(plan, 'success');
      
      this.logger.info('Deployment completed successfully', {
        deploymentId: this.currentDeploymentId,
        version: plan.version
      });

      return this.currentDeploymentId;

    } catch (error) {
      this.logger.error('Deployment failed', error);
      this.deploymentStatus.status = 'failed';
      
      // Attempt automatic rollback if configured
      if (plan.rollbackStrategy === 'automatic') {
        await this.rollback(plan);
      }
      
      await this.recordDeploymentHistory(plan, 'failed');
      throw error;
    }
  }

  async rollback(plan: DeploymentPlan, targetVersion?: string): Promise<void> {
    this.logger.info('Starting rollback', {
      currentVersion: plan.version,
      targetVersion: targetVersion || 'previous'
    });

    try {
      // Determine rollback version
      const rollbackVersion = targetVersion || await this.getPreviousVersion();
      
      // Create rollback plan
      const rollbackPlan = this.createRollbackPlan(plan, rollbackVersion);
      
      // Execute rollback
      await this.executeDeploymentStages(rollbackPlan);
      
      this.deploymentStatus.status = 'healthy';
      this.deploymentStatus.version = rollbackVersion;
      
      await this.recordDeploymentHistory(plan, 'rollback', rollbackVersion);
      
      this.logger.info('Rollback completed successfully', {
        rolledBackTo: rollbackVersion
      });

    } catch (error) {
      this.logger.error('Rollback failed', error);
      this.deploymentStatus.status = 'failed';
      throw error;
    }
  }

  async getDeploymentStatus(): Promise<DeploymentStatus> {
    await this.updateDeploymentStatus();
    return { ...this.deploymentStatus };
  }

  async createDeploymentPlan(
    environment: string,
    version: string,
    strategy: DeploymentPlan['strategy'] = 'rolling'
  ): Promise<DeploymentPlan> {
    const planId = this.generatePlanId();
    
    const plan: DeploymentPlan = {
      id: planId,
      environment,
      version,
      strategy,
      stages: this.createDeploymentStages(strategy),
      prerequisites: this.getPrerequisites(environment),
      dependencies: this.getDependencies(),
      rollbackStrategy: 'automatic',
      rollbackTriggers: ['health_check_failure', 'error_rate_threshold'],
      preDeploymentTests: this.getPreDeploymentTests(),
      postDeploymentTests: this.getPostDeploymentTests(),
      performanceTests: this.getPerformanceTests(),
      notificationChannels: this.config.monitoring.alertChannels,
      stakeholders: ['deployment-team', 'operations-team']
    };

    this.logger.info('Deployment plan created', {
      planId,
      environment,
      version,
      strategy,
      stages: plan.stages.length
    });

    return plan;
  }

  async validateDeploymentPlan(plan: DeploymentPlan): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate prerequisites
    for (const prerequisite of plan.prerequisites) {
      const satisfied = await this.checkPrerequisite(prerequisite);
      if (!satisfied) {
        errors.push(`Prerequisite not satisfied: ${prerequisite}`);
      }
    }

    // Validate dependencies
    for (const dependency of plan.dependencies) {
      const available = await this.checkDependency(dependency);
      if (!available) {
        errors.push(`Dependency not available: ${dependency}`);
      }
    }

    // Validate stages
    if (plan.stages.length === 0) {
      errors.push('Deployment plan must have at least one stage');
    }

    // Check for duplicate stage orders
    const orders = plan.stages.map(s => s.order);
    const uniqueOrders = new Set(orders);
    if (orders.length !== uniqueOrders.size) {
      errors.push('Duplicate stage orders found');
    }

    // Validate environment-specific requirements
    if (plan.environment === 'production') {
      if (!plan.preDeploymentTests.length) {
        warnings.push('No pre-deployment tests configured for production');
      }
      
      if (plan.rollbackStrategy === 'disabled') {
        warnings.push('Rollback disabled for production deployment');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async initializeInfrastructure(): Promise<void> {
    this.logger.info('Initializing infrastructure', {
      environment: this.config.environment,
      region: this.config.region
    });

    try {
      // Initialize Kubernetes if enabled
      if (this.config.infrastructure.enableKubernetes) {
        await this.initializeKubernetes();
      }

      // Initialize databases
      await this.initializeDatabases();

      // Initialize monitoring
      if (this.config.monitoring.enablePrometheus) {
        await this.initializeMonitoring();
      }

      // Initialize security
      await this.initializeSecurity();

      // Initialize networking
      await this.initializeNetworking();

      this.logger.info('Infrastructure initialization completed');

    } catch (error) {
      this.logger.error('Infrastructure initialization failed', error);
      throw error;
    }
  }

  async startUnifiedIntegration(): Promise<void> {
    if (this.unifiedIntegration) {
      throw new Error('Unified integration is already running');
    }

    this.logger.info('Starting unified integration');

    try {
      // Get configuration for environment
      const integrationConfig = this.getIntegrationConfig();
      
      // Validate configuration
      const configErrors = ConfigurationTemplates.validateConfig(integrationConfig);
      if (configErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${configErrors.join(', ')}`);
      }

      // Create and start unified integration
      this.unifiedIntegration = new UnifiedIntegration(integrationConfig);
      await this.unifiedIntegration.start();

      // Update component status
      this.deploymentStatus.components.application.status = 'healthy';
      this.deploymentStatus.components.application.instances = 1;
      this.deploymentStatus.components.application.healthyInstances = 1;

      this.logger.info('Unified integration started successfully');

    } catch (error) {
      this.logger.error('Failed to start unified integration', error);
      this.deploymentStatus.components.application.status = 'failed';
      throw error;
    }
  }

  async stopUnifiedIntegration(): Promise<void> {
    if (!this.unifiedIntegration) {
      return;
    }

    this.logger.info('Stopping unified integration');

    try {
      await this.unifiedIntegration.stop();
      this.unifiedIntegration = undefined;

      this.deploymentStatus.components.application.status = 'stopped';
      this.deploymentStatus.components.application.healthyInstances = 0;

      this.logger.info('Unified integration stopped successfully');

    } catch (error) {
      this.logger.error('Error stopping unified integration', error);
      throw error;
    }
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      if (!this.unifiedIntegration) {
        return false;
      }

      const health = await this.unifiedIntegration.getSystemHealth();
      
      // Update deployment status based on health
      this.deploymentStatus.healthChecks.overall = health.overall === 'healthy';
      this.deploymentStatus.healthChecks.apiEndpoints = health.overall !== 'down';
      
      return health.overall === 'healthy';

    } catch (error) {
      this.logger.error('Health check failed', error);
      return false;
    }
  }

  private async executeDeploymentStages(plan: DeploymentPlan): Promise<void> {
    // Sort stages by order
    const sortedStages = plan.stages.sort((a, b) => a.order - b.order);

    for (const stage of sortedStages) {
      this.logger.info(`Executing deployment stage: ${stage.name}`, {
        order: stage.order,
        components: stage.components.length
      });

      try {
        // Run pre-stage script
        if (stage.preStageScript) {
          await this.runScript(stage.preStageScript);
        }

        // Deploy stage components
        if (stage.parallel) {
          await Promise.all(stage.components.map(component => 
            this.deployComponent(component, stage)
          ));
        } else {
          for (const component of stage.components) {
            await this.deployComponent(component, stage);
          }
        }

        // Run health checks
        if (stage.healthChecks.enabled) {
          await this.runStageHealthChecks(stage);
        }

        // Run post-stage script
        if (stage.postStageScript) {
          await this.runScript(stage.postStageScript);
        }

        this.logger.info(`Stage completed successfully: ${stage.name}`);

      } catch (error) {
        this.logger.error(`Stage failed: ${stage.name}`, error);
        
        if (stage.rollbackOnFailure) {
          this.logger.info(`Rolling back stage: ${stage.name}`);
          await this.rollbackStage(stage);
        }
        
        throw error;
      }
    }
  }

  private async deployComponent(component: string, stage: DeploymentStage): Promise<void> {
    this.logger.info(`Deploying component: ${component}`);

    switch (component) {
      case 'unified-integration':
        await this.startUnifiedIntegration();
        break;
      case 'database':
        await this.deployDatabase();
        break;
      case 'cache':
        await this.deployCache();
        break;
      case 'monitoring':
        await this.deployMonitoring();
        break;
      default:
        this.logger.warn(`Unknown component: ${component}`);
    }
  }

  private async runPostDeploymentVerification(plan: DeploymentPlan): Promise<void> {
    this.logger.info('Running post-deployment verification');

    // Run post-deployment tests
    for (const test of plan.postDeploymentTests) {
      await this.runTest(test);
    }

    // Run performance tests
    for (const test of plan.performanceTests) {
      await this.runPerformanceTest(test);
    }

    // Verify health checks
    const isHealthy = await this.performHealthCheck();
    if (!isHealthy) {
      throw new Error('Post-deployment health check failed');
    }
  }

  private createDeploymentStages(strategy: DeploymentPlan['strategy']): DeploymentStage[] {
    const stages: DeploymentStage[] = [];

    switch (strategy) {
      case 'blue-green':
        stages.push(
          {
            name: 'Deploy Blue Environment',
            order: 1,
            components: ['database', 'cache', 'unified-integration'],
            parallel: false,
            timeout: 30,
            retryCount: 2,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 60, interval: 10, threshold: 3 },
            approvalRequired: false,
            approvers: []
          },
          {
            name: 'Switch Traffic',
            order: 2,
            components: ['load-balancer'],
            parallel: false,
            timeout: 5,
            retryCount: 1,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 30, interval: 5, threshold: 2 },
            approvalRequired: true,
            approvers: ['operations-team']
          }
        );
        break;

      case 'rolling':
        stages.push(
          {
            name: 'Deploy Infrastructure',
            order: 1,
            components: ['database', 'cache'],
            parallel: true,
            timeout: 20,
            retryCount: 2,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 60, interval: 10, threshold: 3 },
            approvalRequired: false,
            approvers: []
          },
          {
            name: 'Deploy Application',
            order: 2,
            components: ['unified-integration'],
            parallel: false,
            timeout: 15,
            retryCount: 2,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 60, interval: 10, threshold: 3 },
            approvalRequired: false,
            approvers: []
          },
          {
            name: 'Deploy Monitoring',
            order: 3,
            components: ['monitoring'],
            parallel: false,
            timeout: 10,
            retryCount: 1,
            rollbackOnFailure: false,
            healthChecks: { enabled: true, timeout: 30, interval: 5, threshold: 2 },
            approvalRequired: false,
            approvers: []
          }
        );
        break;

      case 'canary':
        stages.push(
          {
            name: 'Deploy Canary',
            order: 1,
            components: ['unified-integration'],
            parallel: false,
            timeout: 15,
            retryCount: 2,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 60, interval: 10, threshold: 3 },
            approvalRequired: false,
            approvers: []
          },
          {
            name: 'Canary Analysis',
            order: 2,
            components: ['monitoring'],
            parallel: false,
            timeout: 20,
            retryCount: 1,
            rollbackOnFailure: false,
            healthChecks: { enabled: true, timeout: 300, interval: 30, threshold: 5 },
            approvalRequired: true,
            approvers: ['operations-team']
          },
          {
            name: 'Full Deployment',
            order: 3,
            components: ['unified-integration'],
            parallel: false,
            timeout: 30,
            retryCount: 2,
            rollbackOnFailure: true,
            healthChecks: { enabled: true, timeout: 60, interval: 10, threshold: 3 },
            approvalRequired: false,
            approvers: []
          }
        );
        break;

      default:
        stages.push({
          name: 'Deploy All Components',
          order: 1,
          components: ['database', 'cache', 'unified-integration', 'monitoring'],
          parallel: false,
          timeout: 60,
          retryCount: 2,
          rollbackOnFailure: true,
          healthChecks: { enabled: true, timeout: 120, interval: 15, threshold: 5 },
          approvalRequired: false,
          approvers: []
        });
    }

    return stages;
  }

  private getIntegrationConfig(): UnifiedIntegrationConfig {
    switch (this.config.environment) {
      case 'production':
        return ConfigurationTemplates.getProductionConfig();
      case 'staging':
        return ConfigurationTemplates.getTestingConfig();
      case 'development':
        return ConfigurationTemplates.getDevelopmentConfig();
      default:
        throw new Error(`Unknown environment: ${this.config.environment}`);
    }
  }

  private initializeDeploymentStatus(): void {
    this.deploymentStatus = {
      status: 'stopped',
      timestamp: Date.now(),
      deploymentId: '',
      version: '',
      components: {
        application: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0 }
        },
        database: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0, storage: 0 }
        },
        cache: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0 }
        },
        messageQueue: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0 }
        },
        monitoring: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0 }
        },
        loadBalancer: {
          status: 'stopped',
          version: '',
          instances: 0,
          healthyInstances: 0,
          lastDeployed: 0,
          resourceUsage: { cpu: 0, memory: 0 }
        }
      },
      infrastructure: {
        region: this.config.region,
        availabilityZones: [],
        instanceCount: 0,
        resourceUtilization: { cpu: 0, memory: 0, storage: 0, network: 0 }
      },
      healthChecks: {
        overall: false,
        apiEndpoints: false,
        databaseConnections: false,
        cacheConnections: false,
        externalServices: false
      },
      performance: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptime: 0
      },
      recentDeployments: []
    };
  }

  // Placeholder methods for infrastructure operations
  private async initializeKubernetes(): Promise<void> {
    this.logger.info('Initializing Kubernetes cluster');
  }

  private async initializeDatabases(): Promise<void> {
    this.logger.info('Initializing databases');
    this.deploymentStatus.components.database.status = 'healthy';
  }

  private async initializeMonitoring(): Promise<void> {
    this.logger.info('Initializing monitoring stack');
    this.deploymentStatus.components.monitoring.status = 'healthy';
  }

  private async initializeSecurity(): Promise<void> {
    this.logger.info('Initializing security components');
  }

  private async initializeNetworking(): Promise<void> {
    this.logger.info('Initializing networking');
  }

  private async deployDatabase(): Promise<void> {
    this.logger.info('Deploying database');
    this.deploymentStatus.components.database.status = 'healthy';
  }

  private async deployCache(): Promise<void> {
    this.logger.info('Deploying cache');
    this.deploymentStatus.components.cache.status = 'healthy';
  }

  private async deployMonitoring(): Promise<void> {
    this.logger.info('Deploying monitoring');
    this.deploymentStatus.components.monitoring.status = 'healthy';
  }

  private async updateDeploymentStatus(): Promise<void> {
    this.deploymentStatus.timestamp = Date.now();
  }

  private async runScript(script: string): Promise<void> {
    this.logger.info(`Running script: ${script}`);
  }

  private async runStageHealthChecks(stage: DeploymentStage): Promise<void> {
    this.logger.info(`Running health checks for stage: ${stage.name}`);
  }

  private async rollbackStage(stage: DeploymentStage): Promise<void> {
    this.logger.info(`Rolling back stage: ${stage.name}`);
  }

  private async runTest(test: string): Promise<void> {
    this.logger.info(`Running test: ${test}`);
  }

  private async runPerformanceTest(test: string): Promise<void> {
    this.logger.info(`Running performance test: ${test}`);
  }

  private createRollbackPlan(originalPlan: DeploymentPlan, rollbackVersion: string): DeploymentPlan {
    return {
      ...originalPlan,
      version: rollbackVersion,
      id: this.generatePlanId()
    };
  }

  private async getPreviousVersion(): Promise<string> {
    // Implementation would fetch previous version from deployment history
    return 'v1.0.0';
  }

  private async recordDeploymentHistory(
    plan: DeploymentPlan,
    status: 'success' | 'failed' | 'rollback',
    rollbackVersion?: string
  ): Promise<void> {
    const history: DeploymentHistory = {
      id: this.generateDeploymentId(),
      version: plan.version,
      timestamp: Date.now(),
      duration: 0, // Would calculate actual duration
      status,
      deployedBy: 'system',
      changes: [],
      rollbackVersion
    };

    this.deploymentStatus.recentDeployments.unshift(history);
    
    // Keep only last 10 deployments
    if (this.deploymentStatus.recentDeployments.length > 10) {
      this.deploymentStatus.recentDeployments = this.deploymentStatus.recentDeployments.slice(0, 10);
    }
  }

  private getPrerequisites(environment: string): string[] {
    const prerequisites = ['database-available', 'cache-available'];
    
    if (environment === 'production') {
      prerequisites.push('security-scan-passed', 'load-test-passed');
    }
    
    return prerequisites;
  }

  private getDependencies(): string[] {
    return ['solana-network', 'mining-pool-api', 'external-apis'];
  }

  private getPreDeploymentTests(): string[] {
    return ['unit-tests', 'integration-tests', 'security-tests'];
  }

  private getPostDeploymentTests(): string[] {
    return ['smoke-tests', 'api-tests', 'end-to-end-tests'];
  }

  private getPerformanceTests(): string[] {
    return ['load-tests', 'stress-tests', 'endurance-tests'];
  }

  private async checkPrerequisite(prerequisite: string): Promise<boolean> {
    // Implementation would check actual prerequisites
    return true;
  }

  private async checkDependency(dependency: string): Promise<boolean> {
    // Implementation would check actual dependencies
    return true;
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}