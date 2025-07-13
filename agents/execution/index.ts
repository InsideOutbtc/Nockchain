// NOCK Bridge Autonomous Agent System - Main Entry Point
// Complete autonomous agent execution system with monitoring and coordination

export { default as AgentExecutionEngine } from './agent-execution-engine';
export { default as AgentScheduler } from './agent-scheduler';
export { default as InterAgentCommunication } from './inter-agent-communication';
export { default as ContinuousExecutionManager } from './continuous-execution-manager';
export { default as AgentMonitoringSystem } from './agent-monitoring-system';
export { 
  default as AutonomousAgentDeployment,
  deployAutonomousAgents,
  quickDeploy 
} from './deploy-autonomous-agents';

// Export types
export type { 
  AgentExecutionConfig,
  ExecutionMetrics 
} from './agent-execution-engine';

export type { 
  SchedulerConfig,
  TaskSchedule,
  LoadBalancingMetrics 
} from './agent-scheduler';

export type { 
  CommunicationConfig,
  MessageRoute,
  CommunicationMetrics 
} from './inter-agent-communication';

export type { 
  ExecutionManagerConfig,
  SystemMetrics 
} from './continuous-execution-manager';

export type { 
  MonitoringConfig,
  AgentMonitoringData,
  SystemMonitoringData,
  AlertRule 
} from './agent-monitoring-system';

export type { DeploymentConfig } from './deploy-autonomous-agents';

// Main autonomous agent system initialization
import { quickDeploy, AutonomousAgentDeployment } from './deploy-autonomous-agents';

/**
 * Initialize and deploy the complete NOCKCHAIN autonomous agent system
 */
export async function initializeAutonomousAgentSystem(): Promise<AutonomousAgentDeployment> {
  console.log(`
🚀 NOCKCHAIN AUTONOMOUS AGENT SYSTEM
====================================

Deploying elite autonomous agents:
✅ Marketing Strategist Agent
✅ User Research Strategist Agent  
✅ Product Strategist Agent
✅ Inter-Agent Communication System
✅ Task Scheduler & Load Balancer
✅ Health Monitoring & Alerting
✅ Continuous Execution Manager

Initializing autonomous execution...
`);

  try {
    const deployment = await quickDeploy();
    
    console.log(`
🎉 AUTONOMOUS AGENT SYSTEM DEPLOYED SUCCESSFULLY!
=================================================

System Status:
- Agents Deployed: ${deployment.getDeploymentStatus().deployment_metrics.agents_deployed}
- Deployment Time: ${deployment.getDeploymentStatus().deployment_metrics.deployment_time}ms
- System Health: ${deployment.getDeploymentStatus().deployment_metrics.system_health}
- Initial Tasks: ${deployment.getDeploymentStatus().deployment_metrics.initial_tasks_scheduled}

🔄 Autonomous execution is now active...
📊 Monitoring and alerting operational...
🤝 Inter-agent coordination enabled...

The NOCKCHAIN platform now operates with world-class autonomous intelligence.
`);

    return deployment;

  } catch (error) {
    console.error(`
❌ AUTONOMOUS AGENT DEPLOYMENT FAILED
====================================
Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check logs for detailed error information.
`);
    throw error;
  }
}

/**
 * Get system status for deployed autonomous agents
 */
export function getSystemStatus(deployment: AutonomousAgentDeployment): any {
  if (!deployment.isSystemDeployed()) {
    return {
      status: 'not_deployed',
      message: 'Autonomous agent system is not deployed',
    };
  }

  const status = deployment.getDeploymentStatus();
  const metrics = deployment.getSystemMetrics();

  return {
    status: 'deployed',
    deployment: status,
    metrics: metrics,
    uptime: status.system_status?.uptime || 0,
    health: status.deployment_metrics.system_health,
    agents: status.system_status?.agents || {},
  };
}

/**
 * Stop autonomous agent system
 */
export async function stopAutonomousAgentSystem(deployment: AutonomousAgentDeployment): Promise<void> {
  console.log(`
🛑 STOPPING NOCKCHAIN AUTONOMOUS AGENT SYSTEM
=============================================
`);

  try {
    await deployment.undeploy();
    
    console.log(`
✅ AUTONOMOUS AGENT SYSTEM STOPPED SUCCESSFULLY
==============================================

All agents have been gracefully shutdown.
Monitoring and coordination systems stopped.
System resources released.
`);

  } catch (error) {
    console.error(`
❌ FAILED TO STOP AUTONOMOUS AGENT SYSTEM
========================================
Error: ${error instanceof Error ? error.message : 'Unknown error'}
`);
    throw error;
  }
}

// Export convenient aliases
export const startAgents = initializeAutonomousAgentSystem;
export const stopAgents = stopAutonomousAgentSystem;
export const getAgentStatus = getSystemStatus;