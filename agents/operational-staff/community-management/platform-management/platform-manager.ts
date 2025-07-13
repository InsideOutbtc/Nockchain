import { EventEmitter } from 'events';
import { Logger } from '../../../shared/utils/logger';
import { DiscordStrategy } from './strategies/discord-strategy';
import { TwitterStrategy } from './strategies/twitter-strategy';
import { TelegramStrategy } from './strategies/telegram-strategy';
import { RedditStrategy } from './strategies/reddit-strategy';
import { InstagramStrategy } from './strategies/instagram-strategy';
import { TikTokStrategy } from './strategies/tiktok-strategy';

export interface PlatformConnection {
  platform: string;
  status: 'connected' | 'disconnected' | 'error' | 'rate_limited';
  last_activity: Date;
  rate_limit_remaining: number;
  rate_limit_reset: Date;
  error_count: number;
  health_score: number;
}

export interface PlatformActivity {
  platform: string;
  activity_type: 'mention' | 'dm' | 'post' | 'comment' | 'reaction' | 'follow';
  content: string;
  user_id: string;
  timestamp: Date;
  metadata: any;
}

export interface TrendingTopic {
  platform: string;
  topic: string;
  volume: number;
  sentiment: number;
  hashtags: string[];
  relevance_score: number;
  trending_since: Date;
}

export interface PlatformMetrics {
  platform: string;
  followers: number;
  following: number;
  posts_today: number;
  engagement_rate: number;
  reach: number;
  impressions: number;
  clicks: number;
  shares: number;
  mentions: number;
  direct_messages: number;
  growth_rate: number;
}

export class PlatformManager extends EventEmitter {
  private logger: Logger;
  private strategies: Map<string, any> = new Map();
  private connections: Map<string, PlatformConnection> = new Map();
  private activityBuffer: PlatformActivity[] = [];
  private trendingTopics: Map<string, TrendingTopic[]> = new Map();
  private metrics: Map<string, PlatformMetrics> = new Map();
  private isActive: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.logger = new Logger('PlatformManager');
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Initialize platform-specific strategies
    this.strategies.set('discord', new DiscordStrategy());
    this.strategies.set('twitter', new TwitterStrategy());
    this.strategies.set('telegram', new TelegramStrategy());
    this.strategies.set('reddit', new RedditStrategy());
    this.strategies.set('instagram', new InstagramStrategy());
    this.strategies.set('tiktok', new TikTokStrategy());

    // Set up strategy event handlers
    for (const [platform, strategy] of this.strategies) {
      strategy.on('activity_detected', (activity: PlatformActivity) => {
        this.handlePlatformActivity(activity);
      });

      strategy.on('mention_detected', (mention: any) => {
        this.emit('mention_detected', { ...mention, platform });
      });

      strategy.on('dm_received', (dm: any) => {
        this.emit('dm_received', { ...dm, platform });
      });

      strategy.on('trending_topic', (topic: TrendingTopic) => {
        this.handleTrendingTopic(topic);
      });

      strategy.on('connection_error', (error: any) => {
        this.handleConnectionError(platform, error);
      });

      strategy.on('rate_limit_hit', (info: any) => {
        this.handleRateLimit(platform, info);
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Platform Manager');

      // Initialize all platform strategies
      const initPromises = Array.from(this.strategies.entries()).map(async ([platform, strategy]) => {
        try {
          await strategy.initialize();
          
          // Initialize connection tracking
          this.connections.set(platform, {
            platform,
            status: 'connected',
            last_activity: new Date(),
            rate_limit_remaining: 1000,
            rate_limit_reset: new Date(Date.now() + 3600000),
            error_count: 0,
            health_score: 1.0
          });

          // Initialize metrics
          this.metrics.set(platform, {
            platform,
            followers: 0,
            following: 0,
            posts_today: 0,
            engagement_rate: 0,
            reach: 0,
            impressions: 0,
            clicks: 0,
            shares: 0,
            mentions: 0,
            direct_messages: 0,
            growth_rate: 0
          });

          this.logger.info(`${platform} strategy initialized successfully`);
        } catch (error) {
          this.logger.error(`Failed to initialize ${platform} strategy`, error);
          
          this.connections.set(platform, {
            platform,
            status: 'error',
            last_activity: new Date(),
            rate_limit_remaining: 0,
            rate_limit_reset: new Date(),
            error_count: 1,
            health_score: 0.0
          });
        }
      });

      await Promise.all(initPromises);

      this.isActive = true;
      this.logger.info('Platform Manager initialized successfully');

      // Start monitoring and management
      this.startPlatformMonitoring();

    } catch (error) {
      this.logger.error('Failed to initialize Platform Manager', error);
      throw error;
    }
  }

  private startPlatformMonitoring(): void {
    // Monitor platform health
    const healthInterval = setInterval(() => {
      this.monitorPlatformHealth();
    }, 30000); // Every 30 seconds

    this.monitoringIntervals.set('health', healthInterval);

    // Update metrics
    const metricsInterval = setInterval(() => {
      this.updatePlatformMetrics();
    }, 300000); // Every 5 minutes

    this.monitoringIntervals.set('metrics', metricsInterval);

    // Process activity buffer
    const activityInterval = setInterval(() => {
      this.processActivityBuffer();
    }, 5000); // Every 5 seconds

    this.monitoringIntervals.set('activity', activityInterval);

    // Update trending topics
    const trendingInterval = setInterval(() => {
      this.updateTrendingTopics();
    }, 900000); // Every 15 minutes

    this.monitoringIntervals.set('trending', trendingInterval);

    // Optimize connections
    const optimizationInterval = setInterval(() => {
      this.optimizeConnections();
    }, 1800000); // Every 30 minutes

    this.monitoringIntervals.set('optimization', optimizationInterval);
  }

  private async monitorPlatformHealth(): Promise<void> {
    for (const [platform, connection] of this.connections) {
      try {
        const strategy = this.strategies.get(platform);
        if (strategy) {
          const health = await strategy.healthCheck();
          
          // Update connection status
          connection.health_score = health.score;
          connection.status = health.status;
          
          if (health.status === 'error') {
            connection.error_count++;
            this.logger.warn(`Platform ${platform} health check failed`, health);
            
            // Attempt reconnection if needed
            if (connection.error_count >= 3) {
              await this.reconnectPlatform(platform);
            }
          } else {
            connection.error_count = 0;
          }
          
          connection.last_activity = new Date();
          this.connections.set(platform, connection);
        }
      } catch (error) {
        this.logger.error(`Health check failed for ${platform}`, error);
      }
    }
  }

  private async reconnectPlatform(platform: string): Promise<void> {
    try {
      this.logger.info(`Attempting to reconnect to ${platform}`);
      
      const strategy = this.strategies.get(platform);
      if (strategy) {
        await strategy.reconnect();
        
        const connection = this.connections.get(platform)!;
        connection.status = 'connected';
        connection.error_count = 0;
        connection.health_score = 1.0;
        this.connections.set(platform, connection);
        
        this.logger.info(`Successfully reconnected to ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to reconnect to ${platform}`, error);
    }
  }

  private async updatePlatformMetrics(): Promise<void> {
    for (const [platform, strategy] of this.strategies) {
      try {
        const platformMetrics = await strategy.getMetrics();
        
        // Update metrics
        const existingMetrics = this.metrics.get(platform)!;
        const updatedMetrics = {
          ...existingMetrics,
          ...platformMetrics,
          platform
        };
        
        this.metrics.set(platform, updatedMetrics);
        
        this.logger.debug(`Updated metrics for ${platform}`, updatedMetrics);
      } catch (error) {
        this.logger.error(`Failed to update metrics for ${platform}`, error);
      }
    }
  }

  private processActivityBuffer(): void {
    while (this.activityBuffer.length > 0) {
      const activity = this.activityBuffer.shift()!;
      this.processActivity(activity);
    }
  }

  private processActivity(activity: PlatformActivity): void {
    // Process platform activity
    this.logger.debug('Processing platform activity', {
      platform: activity.platform,
      type: activity.activity_type,
      user: activity.user_id
    });

    // Update metrics based on activity
    const metrics = this.metrics.get(activity.platform);
    if (metrics) {
      switch (activity.activity_type) {
        case 'mention':
          metrics.mentions++;
          break;
        case 'dm':
          metrics.direct_messages++;
          break;
        case 'post':
          metrics.posts_today++;
          break;
        case 'reaction':
          metrics.engagement_rate += 0.01;
          break;
      }
      
      this.metrics.set(activity.platform, metrics);
    }

    // Emit activity event for other systems
    this.emit('activity_processed', activity);
  }

  private async updateTrendingTopics(): Promise<void> {
    for (const [platform, strategy] of this.strategies) {
      try {
        const topics = await strategy.getTrendingTopics();
        this.trendingTopics.set(platform, topics);
        
        // Emit trending topics for each platform
        for (const topic of topics) {
          this.emit('trending_topic', topic);
        }
      } catch (error) {
        this.logger.error(`Failed to update trending topics for ${platform}`, error);
      }
    }
  }

  private async optimizeConnections(): Promise<void> {
    this.logger.info('Optimizing platform connections');
    
    for (const [platform, connection] of this.connections) {
      try {
        const strategy = this.strategies.get(platform);
        if (strategy && connection.health_score < 0.8) {
          // Optimize connection for poorly performing platforms
          await strategy.optimize({
            health_score: connection.health_score,
            error_count: connection.error_count,
            metrics: this.metrics.get(platform)
          });
        }
      } catch (error) {
        this.logger.error(`Failed to optimize connection for ${platform}`, error);
      }
    }
  }

  private handlePlatformActivity(activity: PlatformActivity): void {
    // Add to activity buffer for processing
    this.activityBuffer.push(activity);
    
    // Update connection last activity
    const connection = this.connections.get(activity.platform);
    if (connection) {
      connection.last_activity = new Date();
      this.connections.set(activity.platform, connection);
    }
  }

  private handleTrendingTopic(topic: TrendingTopic): void {
    // Add to trending topics
    const existingTopics = this.trendingTopics.get(topic.platform) || [];
    existingTopics.push(topic);
    
    // Keep only recent topics (last 24 hours)
    const recentTopics = existingTopics.filter(t => 
      Date.now() - t.trending_since.getTime() < 24 * 60 * 60 * 1000
    );
    
    this.trendingTopics.set(topic.platform, recentTopics);
    
    // Emit trending topic event
    this.emit('trending_topic', topic);
  }

  private handleConnectionError(platform: string, error: any): void {
    this.logger.error(`Connection error for ${platform}`, error);
    
    const connection = this.connections.get(platform);
    if (connection) {
      connection.status = 'error';
      connection.error_count++;
      connection.health_score = Math.max(0, connection.health_score - 0.1);
      this.connections.set(platform, connection);
    }
  }

  private handleRateLimit(platform: string, info: any): void {
    this.logger.warn(`Rate limit hit for ${platform}`, info);
    
    const connection = this.connections.get(platform);
    if (connection) {
      connection.status = 'rate_limited';
      connection.rate_limit_remaining = info.remaining || 0;
      connection.rate_limit_reset = new Date(info.reset_time || Date.now() + 3600000);
      this.connections.set(platform, connection);
    }
  }

  // Public methods for external integration
  async postContent(platform: string, content: any): Promise<void> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      const connection = this.connections.get(platform);
      if (!connection || connection.status !== 'connected') {
        throw new Error(`Platform ${platform} is not connected`);
      }

      await strategy.post(content);
      
      // Update metrics
      const metrics = this.metrics.get(platform);
      if (metrics) {
        metrics.posts_today++;
        this.metrics.set(platform, metrics);
      }

      this.logger.info(`Content posted to ${platform}`, { content });
    } catch (error) {
      this.logger.error(`Failed to post content to ${platform}`, error);
      throw error;
    }
  }

  async sendDirectMessage(platform: string, userId: string, message: string): Promise<void> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      await strategy.sendDirectMessage(userId, message);
      
      this.logger.info(`DM sent on ${platform}`, { userId, message });
    } catch (error) {
      this.logger.error(`Failed to send DM on ${platform}`, error);
      throw error;
    }
  }

  async reactToPost(platform: string, postId: string, reaction: string): Promise<void> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      await strategy.react(postId, reaction);
      
      this.logger.info(`Reaction added on ${platform}`, { postId, reaction });
    } catch (error) {
      this.logger.error(`Failed to react on ${platform}`, error);
      throw error;
    }
  }

  async followUser(platform: string, userId: string): Promise<void> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      await strategy.follow(userId);
      
      // Update metrics
      const metrics = this.metrics.get(platform);
      if (metrics) {
        metrics.following++;
        this.metrics.set(platform, metrics);
      }

      this.logger.info(`User followed on ${platform}`, { userId });
    } catch (error) {
      this.logger.error(`Failed to follow user on ${platform}`, error);
      throw error;
    }
  }

  async getRecentActivity(platform: string, limit: number = 50): Promise<PlatformActivity[]> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      return await strategy.getRecentActivity(limit);
    } catch (error) {
      this.logger.error(`Failed to get recent activity for ${platform}`, error);
      return [];
    }
  }

  async getTrendingTopics(platform: string): Promise<TrendingTopic[]> {
    return this.trendingTopics.get(platform) || [];
  }

  async searchContent(platform: string, query: string): Promise<any[]> {
    try {
      const strategy = this.strategies.get(platform);
      if (!strategy) {
        throw new Error(`No strategy found for platform: ${platform}`);
      }

      return await strategy.search(query);
    } catch (error) {
      this.logger.error(`Failed to search on ${platform}`, error);
      return [];
    }
  }

  async increaseMonitoring(platform: string): Promise<void> {
    try {
      const strategy = this.strategies.get(platform);
      if (strategy) {
        await strategy.increaseMonitoring();
        this.logger.info(`Increased monitoring for ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Failed to increase monitoring for ${platform}`, error);
    }
  }

  async updateFocus(analysis: any): Promise<void> {
    try {
      // Update platform focus based on performance analysis
      const platformPerformance = analysis.platform_performance || {};
      
      // Adjust monitoring frequency based on performance
      for (const [platform, performance] of Object.entries(platformPerformance)) {
        const strategy = this.strategies.get(platform);
        if (strategy) {
          await strategy.updateFocus(performance);
        }
      }
      
      this.logger.info('Platform focus updated based on analysis');
    } catch (error) {
      this.logger.error('Failed to update platform focus', error);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; platforms: any }> {
    const platformHealth = {};
    let overallHealthy = true;

    for (const [platform, connection] of this.connections) {
      const healthy = connection.status === 'connected' && connection.health_score > 0.5;
      platformHealth[platform] = {
        status: connection.status,
        health_score: connection.health_score,
        healthy
      };
      
      if (!healthy) {
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      platforms: platformHealth
    };
  }

  async restart(): Promise<void> {
    this.logger.info('Restarting Platform Manager');
    
    // Stop monitoring
    for (const [, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Restart all strategies
    for (const [platform, strategy] of this.strategies) {
      try {
        await strategy.restart();
      } catch (error) {
        this.logger.error(`Failed to restart ${platform} strategy`, error);
      }
    }

    // Clear state
    this.activityBuffer = [];
    this.connections.clear();
    this.metrics.clear();
    this.trendingTopics.clear();

    // Reinitialize
    await this.initialize();
  }

  async getStatus(): Promise<any> {
    return {
      is_active: this.isActive,
      connections: Object.fromEntries(this.connections),
      metrics: Object.fromEntries(this.metrics),
      trending_topics: Object.fromEntries(this.trendingTopics),
      activity_buffer_size: this.activityBuffer.length,
      strategies: Array.from(this.strategies.keys())
    };
  }

  async shutdown(): Promise<void> {
    this.isActive = false;
    
    // Stop monitoring
    for (const [, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    // Shutdown all strategies
    const shutdownPromises = Array.from(this.strategies.values()).map(strategy => 
      strategy.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    
    this.logger.info('Platform Manager shutdown complete');
  }
}

export default PlatformManager;