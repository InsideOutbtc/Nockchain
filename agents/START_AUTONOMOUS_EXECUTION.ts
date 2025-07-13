#!/usr/bin/env npx ts-node

// NOCK Bridge Autonomous Agent System - Launch Script
// Execute this script to deploy and start all autonomous agents

import { initializeAutonomousAgentSystem, getSystemStatus } from './execution';

async function main() {
  console.log(`
🌟 NOCKCHAIN AUTONOMOUS AGENT LAUNCH SEQUENCE
=============================================

Welcome to the NOCKCHAIN autonomous agent system.
This will deploy and activate all strategic AI agents for
market domination in the NOCK ecosystem.

Agents being deployed:
• Marketing Strategist Agent
• User Research Strategist Agent  
• Product Strategist Agent

Systems being activated:
• Real-time task scheduling
• Inter-agent communication
• Health monitoring & alerting
• Continuous autonomous execution

Press Ctrl+C to stop the system.
`);

  try {
    // Deploy the autonomous agent system
    const deployment = await initializeAutonomousAgentSystem();
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log(`
🛑 SHUTDOWN SIGNAL RECEIVED
==========================
Gracefully stopping autonomous agent system...
`);
      
      try {
        await deployment.undeploy();
        console.log('✅ Autonomous agent system stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Monitor system status
    setInterval(() => {
      const status = getSystemStatus(deployment);
      
      if (status.status === 'deployed') {
        console.log(`
📊 SYSTEM STATUS UPDATE
======================
Uptime: ${Math.floor(status.uptime / 1000 / 60)} minutes
Health: ${status.health}
Active Agents: ${Object.keys(status.agents).length}
Tasks Executed: ${status.metrics?.execution_metrics?.total_tasks_executed || 0}
Success Rate: ${((status.metrics?.execution_metrics?.successful_tasks || 0) / Math.max(1, status.metrics?.execution_metrics?.total_tasks_executed || 1) * 100).toFixed(1)}%
Active Alerts: ${status.metrics?.active_alerts?.length || 0}
`);
      }
    }, 300000); // Status update every 5 minutes

    console.log(`
✅ AUTONOMOUS AGENT SYSTEM IS NOW RUNNING
========================================

The system is executing autonomously. Key capabilities:

🎯 MARKETING AGENT:
   • Continuous competitive monitoring
   • Real-time community engagement
   • Campaign optimization
   • Content generation

🔬 RESEARCH AGENT:
   • User behavior analysis
   • Market trend monitoring
   • Platform analytics
   • Competitive intelligence

🛠️ PRODUCT AGENT:
   • Roadmap planning
   • Feature specification
   • Risk assessment
   • Resource planning

🤖 COORDINATION:
   • Autonomous task scheduling
   • Inter-agent communication
   • Load balancing
   • Health monitoring

The NOCKCHAIN platform is now operating with world-class autonomous intelligence.
Monitoring will continue indefinitely until stopped with Ctrl+C.
`);

    // Keep the process running
    await new Promise(() => {}); // Run forever until SIGINT

  } catch (error) {
    console.error(`
❌ AUTONOMOUS AGENT SYSTEM LAUNCH FAILED
=======================================
Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check the logs for detailed error information.
You may need to:
1. Ensure all dependencies are installed
2. Check system resources are available
3. Verify workspace directories exist
4. Check for port conflicts

Exiting...
`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the autonomous agent system
main().catch((error) => {
  console.error('❌ Main execution failed:', error);
  process.exit(1);
});