// NOCK Bridge Inter-Agent Communication System
// Real-time message passing and data synchronization between autonomous agents

import { EventEmitter } from 'events';
import { Logger } from '../shared/utils/logger';
import { AgentMessage, AgentCommunication, SharedResource } from '../shared/types/agent-types';

export interface CommunicationConfig {
  message_queue: {
    type: 'memory' | 'redis' | 'rabbitmq';
    host?: string;
    port?: number;
    db?: number;
    max_queue_size: number;
  };
  routing: {
    strategy: 'direct' | 'broadcast' | 'intelligent';
    message_ttl: number; // Time to live in milliseconds
    retry_attempts: number;
    retry_delay: number;
  };
  security: {
    encryption_enabled: boolean;
    message_signing: boolean;
    agent_authentication: boolean;
  };
  performance: {
    batch_processing: boolean;
    batch_size: number;
    compression_enabled: boolean;
    priority_queues: boolean;
  };
}

export interface MessageRoute {
  from_agent: string;
  to_agent: string;
  message_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  routing_strategy: 'direct' | 'broadcast' | 'multicast';
  delivery_confirmation: boolean;
}

export interface CommunicationMetrics {
  messages_sent: number;
  messages_received: number;
  messages_delivered: number;
  messages_failed: number;
  average_delivery_time: number;
  queue_sizes: Record<string, number>;
  bandwidth_usage: number;
  error_rate: number;
}

export class InterAgentCommunication extends EventEmitter {
  private config: CommunicationConfig;
  private logger: Logger;
  private isRunning: boolean = false;

  // Message queues
  private messageQueues: Map<string, AgentMessage[]> = new Map();
  private priorityQueues: Map<string, Map<string, AgentMessage[]>> = new Map();
  private broadcastQueue: AgentMessage[] = [];

  // Agent registry
  private registeredAgents: Set<string> = new Set();
  private agentCapabilities: Map<string, string[]> = new Map();
  private agentSubscriptions: Map<string, string[]> = new Map();

  // Shared resources
  private sharedResources: Map<string, SharedResource> = new Map();
  private resourceSubscriptions: Map<string, Set<string>> = new Map();

  // Communication state
  private messageHistory: AgentCommunication[] = [];
  private deliveryConfirmations: Map<string, number> = new Map();
  private routingTable: Map<string, MessageRoute[]> = new Map();

  // Performance monitoring
  private metrics: CommunicationMetrics;
  private processingLoop?: NodeJS.Timeout;
  private metricsCollector?: NodeJS.Timeout;
  private cleanupLoop?: NodeJS.Timeout;

  constructor(config: CommunicationConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;
    
    this.metrics = {
      messages_sent: 0,
      messages_received: 0,
      messages_delivered: 0,
      messages_failed: 0,
      average_delivery_time: 0,
      queue_sizes: {},
      bandwidth_usage: 0,
      error_rate: 0,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Inter-agent communication already running');
      return;
    }

    this.logger.info('Starting inter-agent communication system', {
      message_queue_type: this.config.message_queue.type,
      routing_strategy: this.config.routing.strategy,
      encryption_enabled: this.config.security.encryption_enabled,
    });

    try {
      this.isRunning = true;

      // Initialize message queues for known agent types
      this.initializeMessageQueues();

      // Start processing loops
      this.startMessageProcessing();
      this.startMetricsCollection();
      this.startCleanupLoop();

      this.logger.info('Inter-agent communication system started successfully');
      this.emit('communication_started');

    } catch (error) {
      this.logger.error('Failed to start inter-agent communication', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Inter-agent communication not running');
      return;
    }

    this.logger.info('Stopping inter-agent communication system');

    try {
      // Stop processing loops
      if (this.processingLoop) clearInterval(this.processingLoop);
      if (this.metricsCollector) clearInterval(this.metricsCollector);
      if (this.cleanupLoop) clearInterval(this.cleanupLoop);

      // Process remaining messages
      await this.processAllQueues();

      this.isRunning = false;
      this.logger.info('Inter-agent communication system stopped successfully');
      this.emit('communication_stopped');

    } catch (error) {
      this.logger.error('Failed to stop inter-agent communication gracefully', error);
      this.isRunning = false;
    }
  }

  // Agent registration
  async registerAgent(agentId: string, capabilities: string[], subscriptions: string[]): Promise<void> {
    this.logger.info('Registering agent with communication system', {
      agent_id: agentId,
      capabilities: capabilities.length,
      subscriptions: subscriptions.length,
    });

    this.registeredAgents.add(agentId);
    this.agentCapabilities.set(agentId, capabilities);
    this.agentSubscriptions.set(agentId, subscriptions);

    // Initialize message queue for agent
    if (!this.messageQueues.has(agentId)) {
      this.messageQueues.set(agentId, []);
    }

    // Initialize priority queues if enabled
    if (this.config.performance.priority_queues) {
      const priorityQueue = new Map([
        ['urgent', []],
        ['high', []],
        ['medium', []],
        ['low', []],
      ]);
      this.priorityQueues.set(agentId, priorityQueue);
    }

    this.emit('agent_registered', { agent_id: agentId, capabilities, subscriptions });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    this.logger.info('Unregistering agent from communication system', { agent_id: agentId });

    this.registeredAgents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.agentSubscriptions.delete(agentId);
    
    // Clear message queues
    this.messageQueues.delete(agentId);
    this.priorityQueues.delete(agentId);

    // Remove from routing table
    this.routingTable.delete(agentId);

    this.emit('agent_unregistered', { agent_id: agentId });
  }

  // Message sending
  async sendMessage(fromAgent: string, toAgent: string, message: AgentMessage): Promise<boolean> {
    if (!this.registeredAgents.has(fromAgent) || !this.registeredAgents.has(toAgent)) {
      this.logger.error('Attempt to send message between unregistered agents', {
        from: fromAgent,
        to: toAgent,
      });
      return false;
    }

    const messageId = this.generateMessageId();
    const enrichedMessage: AgentMessage = {
      ...message,
      id: messageId,
      from: fromAgent,
      to: toAgent,
      timestamp: Date.now(),
    };

    try {
      // Validate message
      if (!this.validateMessage(enrichedMessage)) {
        this.logger.error('Message validation failed', { message_id: messageId });
        return false;
      }

      // Apply security if enabled
      if (this.config.security.encryption_enabled) {
        enrichedMessage.content = await this.encryptMessage(enrichedMessage.content);
      }

      // Route message
      const routed = await this.routeMessage(enrichedMessage);
      
      if (routed) {
        this.metrics.messages_sent++;
        this.recordCommunication(enrichedMessage, 'sent');
        
        this.logger.debug('Message sent successfully', {
          message_id: messageId,
          from: fromAgent,
          to: toAgent,
          type: message.type,
        });

        this.emit('message_sent', enrichedMessage);
        return true;
      } else {
        this.metrics.messages_failed++;
        return false;
      }

    } catch (error) {
      this.logger.error('Failed to send message', error, {
        agent_id: fromAgent,
      });
      this.metrics.messages_failed++;
      return false;
    }
  }

  async broadcastMessage(fromAgent: string, message: AgentMessage, excludeAgents?: string[]): Promise<boolean> {
    if (!this.registeredAgents.has(fromAgent)) {
      this.logger.error('Attempt to broadcast from unregistered agent', { from: fromAgent });
      return false;
    }

    const messageId = this.generateMessageId();
    const broadcastMessage: AgentMessage = {
      ...message,
      id: messageId,
      from: fromAgent,
      to: 'broadcast',
      timestamp: Date.now(),
    };

    try {
      // Add to broadcast queue
      this.broadcastQueue.push(broadcastMessage);

      this.logger.debug('Broadcast message queued', {
        message_id: messageId,
        from: fromAgent,
        type: message.type,
        exclude_count: excludeAgents?.length || 0,
      });

      this.emit('message_broadcast', broadcastMessage);
      return true;

    } catch (error) {
      this.logger.error('Failed to broadcast message', error);
      return false;
    }
  }

  async sendMulticast(fromAgent: string, toAgents: string[], message: AgentMessage): Promise<boolean> {
    let successCount = 0;
    
    for (const toAgent of toAgents) {
      const success = await this.sendMessage(fromAgent, toAgent, {
        ...message,
        id: this.generateMessageId(),
      });
      
      if (success) successCount++;
    }

    const success = successCount === toAgents.length;
    
    this.logger.debug('Multicast message sent', {
      from: fromAgent,
      target_count: toAgents.length,
      success_count: successCount,
      success: success,
    });

    return success;
  }

  // Message receiving
  async receiveMessages(agentId: string, maxMessages?: number): Promise<AgentMessage[]> {
    if (!this.registeredAgents.has(agentId)) {
      this.logger.error('Attempt to receive messages for unregistered agent', { agent_id: agentId });
      return [];
    }

    const messages: AgentMessage[] = [];
    
    // Get messages from priority queues if enabled
    if (this.config.performance.priority_queues) {
      const priorityQueue = this.priorityQueues.get(agentId);
      if (priorityQueue) {
        const priorities = ['urgent', 'high', 'medium', 'low'];
        
        for (const priority of priorities) {
          const queue = priorityQueue.get(priority) || [];
          const takeCount = maxMessages ? Math.min(queue.length, maxMessages - messages.length) : queue.length;
          
          messages.push(...queue.splice(0, takeCount));
          
          if (maxMessages && messages.length >= maxMessages) break;
        }
      }
    } else {
      // Get messages from regular queue
      const queue = this.messageQueues.get(agentId) || [];
      const takeCount = maxMessages ? Math.min(queue.length, maxMessages) : queue.length;
      
      messages.push(...queue.splice(0, takeCount));
    }

    // Process received messages
    for (const message of messages) {
      await this.processReceivedMessage(agentId, message);
    }

    this.metrics.messages_received += messages.length;

    if (messages.length > 0) {
      this.logger.debug('Messages received by agent', {
        agent_id: agentId,
        message_count: messages.length,
      });
    }

    return messages;
  }

  // Shared resource management
  async shareResource(
    ownerId: string,
    resource: Omit<SharedResource, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string> {
    const resourceId = this.generateResourceId();
    
    const sharedResource: SharedResource = {
      ...resource,
      id: resourceId,
      owner_agent: ownerId,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    this.sharedResources.set(resourceId, sharedResource);

    // Notify subscribers
    await this.notifyResourceSubscribers(resourceId, 'created');

    this.logger.info('Resource shared', {
      resource_id: resourceId,
      owner: ownerId,
      type: resource.type,
      name: resource.name,
    });

    this.emit('resource_shared', sharedResource);
    return resourceId;
  }

  async updateResource(resourceId: string, agentId: string, updates: Partial<SharedResource>): Promise<boolean> {
    const resource = this.sharedResources.get(resourceId);
    
    if (!resource) {
      this.logger.error('Attempt to update non-existent resource', { resource_id: resourceId });
      return false;
    }

    // Check permissions
    if (!this.hasResourcePermission(agentId, resource, 'write')) {
      this.logger.error('Agent lacks permission to update resource', {
        agent_id: agentId,
        resource_id: resourceId,
      });
      return false;
    }

    // Apply updates
    const updatedResource: SharedResource = {
      ...resource,
      ...updates,
      updated_at: Date.now(),
    };

    this.sharedResources.set(resourceId, updatedResource);

    // Notify subscribers
    await this.notifyResourceSubscribers(resourceId, 'updated');

    this.logger.debug('Resource updated', {
      resource_id: resourceId,
      updated_by: agentId,
    });

    this.emit('resource_updated', updatedResource);
    return true;
  }

  async subscribeToResource(agentId: string, resourceId: string): Promise<boolean> {
    if (!this.sharedResources.has(resourceId)) {
      this.logger.error('Attempt to subscribe to non-existent resource', { resource_id: resourceId });
      return false;
    }

    if (!this.resourceSubscriptions.has(resourceId)) {
      this.resourceSubscriptions.set(resourceId, new Set());
    }

    this.resourceSubscriptions.get(resourceId)!.add(agentId);

    this.logger.debug('Agent subscribed to resource', {
      agent_id: agentId,
      resource_id: resourceId,
    });

    return true;
  }

  async getResource(resourceId: string, agentId: string): Promise<SharedResource | null> {
    const resource = this.sharedResources.get(resourceId);
    
    if (!resource) {
      return null;
    }

    // Check permissions
    if (!this.hasResourcePermission(agentId, resource, 'read')) {
      this.logger.error('Agent lacks permission to read resource', {
        agent_id: agentId,
        resource_id: resourceId,
      });
      return null;
    }

    return resource;
  }

  // Message routing
  private async routeMessage(message: AgentMessage): Promise<boolean> {
    switch (this.config.routing.strategy) {
      case 'direct':
        return await this.routeDirect(message);
      case 'broadcast':
        return await this.routeBroadcast(message);
      case 'intelligent':
        return await this.routeIntelligent(message);
      default:
        return await this.routeDirect(message);
    }
  }

  private async routeDirect(message: AgentMessage): Promise<boolean> {
    const targetAgent = message.to!;
    
    if (!this.registeredAgents.has(targetAgent)) {
      this.logger.error('Target agent not registered', { agent_id: targetAgent });
      return false;
    }

    return await this.deliverMessage(message, targetAgent);
  }

  private async routeBroadcast(message: AgentMessage): Promise<boolean> {
    let successCount = 0;
    const targetAgents = Array.from(this.registeredAgents).filter(agent => agent !== message.from);

    for (const agentId of targetAgents) {
      const delivered = await this.deliverMessage(message, agentId);
      if (delivered) successCount++;
    }

    return successCount > 0;
  }

  private async routeIntelligent(message: AgentMessage): Promise<boolean> {
    // Intelligent routing based on agent capabilities and subscriptions
    const targetAgents = this.findTargetAgents(message);
    
    if (targetAgents.length === 0) {
      return await this.routeDirect(message);
    }

    let successCount = 0;
    
    for (const agentId of targetAgents) {
      const delivered = await this.deliverMessage(message, agentId);
      if (delivered) successCount++;
    }

    return successCount > 0;
  }

  private findTargetAgents(message: AgentMessage): string[] {
    const targetAgents: string[] = [];

    // If specific target, use that
    if (message.to && message.to !== 'broadcast') {
      return [message.to];
    }

    // Find agents based on message type and subscriptions
    for (const [agentId, subscriptions] of this.agentSubscriptions) {
      if (agentId === message.from) continue; // Don't send to sender

      // Check if agent is subscribed to this message type
      if (subscriptions.includes(message.type) || subscriptions.includes('*')) {
        targetAgents.push(agentId);
      }
    }

    return targetAgents;
  }

  private async deliverMessage(message: AgentMessage, targetAgent: string): Promise<boolean> {
    try {
      // Check queue capacity
      const queue = this.messageQueues.get(targetAgent) || [];
      if (queue.length >= this.config.message_queue.max_queue_size) {
        this.logger.warn('Message queue full, dropping message', {
          target_agent: targetAgent,
          queue_size: queue.length,
          message_id: message.id,
        });
        return false;
      }

      // Deliver to appropriate queue
      if (this.config.performance.priority_queues) {
        const priorityQueue = this.priorityQueues.get(targetAgent);
        const priority = this.getMessagePriority(message);
        
        if (priorityQueue && priorityQueue.has(priority)) {
          priorityQueue.get(priority)!.push(message);
        } else {
          queue.push(message);
        }
      } else {
        queue.push(message);
      }

      this.metrics.messages_delivered++;
      this.recordCommunication(message, 'delivered');

      this.emit('message_delivered', { message, target_agent: targetAgent });
      return true;

    } catch (error) {
      this.logger.error('Failed to deliver message', error, {
        agent_id: targetAgent,
      });
      return false;
    }
  }

  // Message processing loops
  private startMessageProcessing(): void {
    this.processingLoop = setInterval(async () => {
      try {
        await this.processBroadcastQueue();
        await this.cleanupExpiredMessages();
        await this.processDeliveryConfirmations();
      } catch (error) {
        this.logger.error('Message processing loop error', error);
      }
    }, 1000); // Process every second
  }

  private startMetricsCollection(): void {
    this.metricsCollector = setInterval(async () => {
      try {
        await this.updateMetrics();
      } catch (error) {
        this.logger.error('Metrics collection error', error);
      }
    }, 30000); // Collect every 30 seconds
  }

  private startCleanupLoop(): void {
    this.cleanupLoop = setInterval(async () => {
      try {
        await this.cleanupOldMessages();
        await this.cleanupOldCommunications();
      } catch (error) {
        this.logger.error('Cleanup loop error', error);
      }
    }, 300000); // Cleanup every 5 minutes
  }

  // Processing methods
  private async processBroadcastQueue(): Promise<void> {
    while (this.broadcastQueue.length > 0) {
      const message = this.broadcastQueue.shift();
      if (!message) continue;

      const targetAgents = Array.from(this.registeredAgents)
        .filter(agent => agent !== message.from);

      for (const agentId of targetAgents) {
        await this.deliverMessage(message, agentId);
      }
    }
  }

  private async processAllQueues(): Promise<void> {
    // Process any remaining messages in all queues
    for (const [agentId, queue] of this.messageQueues) {
      while (queue.length > 0) {
        const message = queue.shift();
        if (message) {
          await this.processReceivedMessage(agentId, message);
        }
      }
    }
  }

  private async processReceivedMessage(agentId: string, message: AgentMessage): Promise<void> {
    try {
      // Decrypt if necessary
      if (this.config.security.encryption_enabled) {
        message.content = await this.decryptMessage(message.content);
      }

      // Record delivery
      this.recordCommunication(message, 'received');

      // Send delivery confirmation if required
      if (message.from) {
        await this.sendDeliveryConfirmation(message, agentId);
      }

      this.emit('message_processed', { message, agent_id: agentId });

    } catch (error) {
      this.logger.error('Failed to process received message', error, {
        agent_id: agentId,
      });
    }
  }

  // Utility methods
  private initializeMessageQueues(): void {
    const agentTypes = ['marketing', 'research', 'feature_planning'];
    
    for (const agentType of agentTypes) {
      this.messageQueues.set(agentType, []);
      
      if (this.config.performance.priority_queues) {
        const priorityQueue = new Map([
          ['urgent', []],
          ['high', []],
          ['medium', []],
          ['low', []],
        ]);
        this.priorityQueues.set(agentType, priorityQueue);
      }
    }
  }

  private validateMessage(message: AgentMessage): boolean {
    return !!(
      message.id &&
      message.type &&
      message.content &&
      message.from &&
      message.timestamp
    );
  }

  private async encryptMessage(content: any): Promise<any> {
    // Simple encryption placeholder - in production, use proper encryption
    return btoa(JSON.stringify(content));
  }

  private async decryptMessage(content: any): Promise<any> {
    // Simple decryption placeholder - in production, use proper decryption
    try {
      return JSON.parse(atob(content));
    } catch {
      return content; // Return as-is if decryption fails
    }
  }

  private getMessagePriority(message: AgentMessage): string {
    // Determine priority based on message type or content
    const urgentTypes = ['alert', 'emergency', 'critical_update'];
    const highTypes = ['task_result', 'data_update', 'coordination'];
    
    if (urgentTypes.includes(message.type)) return 'urgent';
    if (highTypes.includes(message.type)) return 'high';
    
    return message.content?.priority || 'medium';
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateResourceId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordCommunication(message: AgentMessage, status: 'sent' | 'delivered' | 'received'): void {
    const communication: AgentCommunication = {
      message_id: message.id,
      from_agent: message.from!,
      to_agent: message.to!,
      message_type: message.type,
      payload: message.content,
      timestamp: Date.now(),
      status: status,
    };

    this.messageHistory.push(communication);

    // Keep only recent history
    if (this.messageHistory.length > 10000) {
      this.messageHistory = this.messageHistory.slice(-5000);
    }
  }

  private hasResourcePermission(agentId: string, resource: SharedResource, action: 'read' | 'write' | 'delete'): boolean {
    // Owner has all permissions
    if (resource.owner_agent === agentId) {
      return true;
    }

    // Check permissions
    const permissions = resource.access_permissions[action];
    return permissions.includes(agentId) || permissions.includes('*');
  }

  private async notifyResourceSubscribers(resourceId: string, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    const subscribers = this.resourceSubscriptions.get(resourceId);
    if (!subscribers) return;

    const resource = this.sharedResources.get(resourceId);
    
    const notification: AgentMessage = {
      id: this.generateMessageId(),
      type: 'resource_notification',
      content: {
        resource_id: resourceId,
        action: action,
        resource: resource,
      },
      timestamp: Date.now(),
    };

    for (const subscriberId of subscribers) {
      await this.deliverMessage(notification, subscriberId);
    }
  }

  private async sendDeliveryConfirmation(message: AgentMessage, receivingAgent: string): Promise<void> {
    const confirmation: AgentMessage = {
      id: this.generateMessageId(),
      type: 'delivery_confirmation',
      content: {
        original_message_id: message.id,
        received_by: receivingAgent,
        received_at: Date.now(),
      },
      from: receivingAgent,
      to: message.from,
      timestamp: Date.now(),
    };

    await this.deliverMessage(confirmation, message.from!);
  }

  private async processDeliveryConfirmations(): Promise<void> {
    // Process delivery confirmations and update metrics
    // This would be implemented based on specific requirements
  }

  private async cleanupExpiredMessages(): Promise<void> {
    const now = Date.now();
    const ttl = this.config.routing.message_ttl;

    // Clean up regular queues
    for (const [agentId, queue] of this.messageQueues) {
      const validMessages = queue.filter(msg => now - msg.timestamp < ttl);
      this.messageQueues.set(agentId, validMessages);
    }

    // Clean up priority queues
    for (const [agentId, priorityQueue] of this.priorityQueues) {
      for (const [priority, queue] of priorityQueue) {
        const validMessages = queue.filter(msg => now - msg.timestamp < ttl);
        priorityQueue.set(priority, validMessages);
      }
    }

    // Clean up broadcast queue
    this.broadcastQueue = this.broadcastQueue.filter(msg => now - msg.timestamp < ttl);
  }

  private async cleanupOldMessages(): Promise<void> {
    // Remove old messages from history
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.messageHistory = this.messageHistory.filter(comm => comm.timestamp > cutoff);
  }

  private async cleanupOldCommunications(): Promise<void> {
    // Remove old delivery confirmations
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
    
    for (const [msgId, timestamp] of this.deliveryConfirmations) {
      if (timestamp < cutoff) {
        this.deliveryConfirmations.delete(msgId);
      }
    }
  }

  private async updateMetrics(): Promise<void> {
    // Update queue sizes
    for (const [agentId, queue] of this.messageQueues) {
      this.metrics.queue_sizes[agentId] = queue.length;
    }

    // Calculate error rate
    const totalMessages = this.metrics.messages_sent + this.metrics.messages_received;
    this.metrics.error_rate = totalMessages > 0 ? (this.metrics.messages_failed / totalMessages) * 100 : 0;

    this.emit('metrics_updated', this.metrics);
  }

  // Public getters
  getCommunicationMetrics(): CommunicationMetrics {
    return { ...this.metrics };
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.registeredAgents);
  }

  getMessageHistory(agentId?: string, limit?: number): AgentCommunication[] {
    let history = this.messageHistory;
    
    if (agentId) {
      history = history.filter(comm => 
        comm.from_agent === agentId || comm.to_agent === agentId
      );
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  getSharedResources(agentId?: string): SharedResource[] {
    const resources = Array.from(this.sharedResources.values());
    
    if (agentId) {
      return resources.filter(resource => 
        this.hasResourcePermission(agentId, resource, 'read')
      );
    }

    return resources;
  }

  getQueueStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [agentId, queue] of this.messageQueues) {
      status[agentId] = {
        queue_size: queue.length,
        priority_queues: this.priorityQueues.has(agentId) ? 
          Object.fromEntries(this.priorityQueues.get(agentId)!.entries()) : null,
      };
    }

    return status;
  }

  isSystemRunning(): boolean {
    return this.isRunning;
  }
}

export default InterAgentCommunication;