// Subscription Manager - Premium Analytics Revenue Management
// Handles $195K monthly revenue from analytics subscriptions

import { DatabaseManager } from '../database/manager';
import { RedisManager } from '../database/redis';
import { logger } from '../utils/logger';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

// Subscription tiers with pricing and features
export enum SubscriptionTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional', 
  ENTERPRISE = 'enterprise',
  API = 'api'
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limits: {
    apiRequestsPerHour: number;
    customIndicators: number;
    dashboards: number;
    alerts: number;
    dataRetention: number; // days
    exportFormats: string[];
    supportLevel: string;
  };
  revenue: {
    target: number; // Monthly revenue target for this tier
    conversion: number; // Expected conversion rate
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  [SubscriptionTier.BASIC]: {
    tier: SubscriptionTier.BASIC,
    name: 'Basic Analytics',
    monthlyPrice: 49,
    annualPrice: 490, // 2 months free
    features: [
      'Standard charting suite',
      'Basic portfolio tracking',
      'Email alerts',
      'Monthly reports',
      '5 custom indicators',
      'Mobile app access',
      'Email support'
    ],
    limits: {
      apiRequestsPerHour: 1000,
      customIndicators: 5,
      dashboards: 1,
      alerts: 5,
      dataRetention: 30,
      exportFormats: ['CSV'],
      supportLevel: 'email'
    },
    revenue: {
      target: 12000, // $12K monthly from Basic tier
      conversion: 0.05 // 5% conversion rate
    }
  },
  [SubscriptionTier.PROFESSIONAL]: {
    tier: SubscriptionTier.PROFESSIONAL,
    name: 'Professional Analytics',
    monthlyPrice: 199,
    annualPrice: 1990, // 2 months free
    features: [
      'Advanced charting suite',
      'Real-time portfolio analytics',
      'Custom alerts and notifications',
      'Weekly detailed reports',
      '50 custom indicators',
      'Predictive analytics',
      'Risk assessment tools',
      'Performance attribution',
      'Mobile mining optimization',
      'Priority support'
    ],
    limits: {
      apiRequestsPerHour: 10000,
      customIndicators: 50,
      dashboards: 10,
      alerts: 50,
      dataRetention: 90,
      exportFormats: ['CSV', 'JSON', 'PDF'],
      supportLevel: 'priority'
    },
    revenue: {
      target: 75000, // $75K monthly from Professional tier
      conversion: 0.03 // 3% conversion rate
    }
  },
  [SubscriptionTier.ENTERPRISE]: {
    tier: SubscriptionTier.ENTERPRISE,
    name: 'Enterprise Analytics',
    monthlyPrice: 999,
    annualPrice: 9990, // 2 months free
    features: [
      'Complete analytics platform',
      'Real-time multi-portfolio tracking',
      'Custom dashboards',
      'Daily executive reports',
      'Unlimited custom indicators',
      'Advanced ML predictions',
      'Risk management suite',
      'White-label solutions',
      'Dedicated support team',
      'Custom integrations',
      'SSO integration',
      'Compliance reporting',
      'Multi-user management'
    ],
    limits: {
      apiRequestsPerHour: 50000,
      customIndicators: 1000,
      dashboards: 100,
      alerts: 500,
      dataRetention: 365,
      exportFormats: ['CSV', 'JSON', 'PDF', 'Excel', 'XML'],
      supportLevel: 'dedicated'
    },
    revenue: {
      target: 58000, // $58K monthly from Enterprise tier
      conversion: 0.01 // 1% conversion rate
    }
  },
  [SubscriptionTier.API]: {
    tier: SubscriptionTier.API,
    name: 'API Premium',
    monthlyPrice: 299,
    annualPrice: 2990, // 2 months free
    features: [
      'Premium API access',
      'Real-time data feeds',
      'Advanced API endpoints',
      '100K requests/hour',
      'WebSocket connections',
      'Custom data exports',
      'Technical support',
      'API documentation',
      'Rate limit management',
      'Usage analytics'
    ],
    limits: {
      apiRequestsPerHour: 100000,
      customIndicators: 100,
      dashboards: 20,
      alerts: 100,
      dataRetention: 180,
      exportFormats: ['JSON', 'CSV', 'XML'],
      supportLevel: 'technical'
    },
    revenue: {
      target: 50000, // $50K monthly from API tier
      conversion: 0.02 // 2% conversion rate
    }
  }
};

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd: Date | null;
  cancelAt: Date | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  usage: SubscriptionUsage;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  apiRequests: number;
  indicatorsCreated: number;
  dashboardsCreated: number;
  alertsActive: number;
  lastResetAt: Date;
  monthlyUsage: {
    [key: string]: number;
  };
}

export interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  conversionRate: number;
  tierDistribution: Record<SubscriptionTier, number>;
  revenueByTier: Record<SubscriptionTier, number>;
  growthRate: number;
  lifetimeValue: number;
}

export class SubscriptionManager {
  private stripe: Stripe;
  
  constructor(
    private dbManager: DatabaseManager,
    private redisManager: RedisManager
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-08-16'
    });
  }

  async initialize(): Promise<void> {
    logger.info('📊 Initializing Subscription Manager...');
    
    // Setup database tables
    await this.setupTables();
    
    // Initialize usage tracking
    await this.initializeUsageTracking();
    
    // Start background tasks
    this.startBackgroundTasks();
    
    logger.info('✅ Subscription Manager initialized');
  }

  private async setupTables(): Promise<void> {
    const client = await this.dbManager.getClient();
    
    try {
      // Subscriptions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          tier VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          current_period_start TIMESTAMP NOT NULL,
          current_period_end TIMESTAMP NOT NULL,
          trial_end TIMESTAMP,
          cancel_at TIMESTAMP,
          stripe_subscription_id VARCHAR(255) UNIQUE,
          stripe_customer_id VARCHAR(255),
          usage JSONB DEFAULT '{}',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
      `);

      // Usage logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscription_usage_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID NOT NULL REFERENCES subscriptions(id),
          user_id UUID NOT NULL,
          usage_type VARCHAR(50) NOT NULL,
          usage_count INTEGER DEFAULT 1,
          endpoint VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription ON subscription_usage_logs(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON subscription_usage_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON subscription_usage_logs(usage_type);
        CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON subscription_usage_logs(created_at);
      `);

      // Revenue events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS revenue_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID REFERENCES subscriptions(id),
          event_type VARCHAR(50) NOT NULL,
          revenue_amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          stripe_event_id VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_revenue_events_subscription ON revenue_events(subscription_id);
        CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_revenue_events_created ON revenue_events(created_at);
      `);

    } finally {
      client.release();
    }
  }

  private async initializeUsageTracking(): Promise<void> {
    // Set up Redis keys for usage tracking
    await this.redisManager.set('usage:tracking:initialized', new Date().toISOString());
  }

  private startBackgroundTasks(): void {
    // Reset usage counters daily
    setInterval(async () => {
      await this.resetDailyUsage();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Generate revenue reports hourly
    setInterval(async () => {
      await this.generateRevenueReports();
    }, 60 * 60 * 1000); // 1 hour

    // Sync with Stripe every 15 minutes
    setInterval(async () => {
      await this.syncWithStripe();
    }, 15 * 60 * 1000); // 15 minutes
  }

  // Create new subscription
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'annual',
    paymentMethodId?: string
  ): Promise<UserSubscription> {
    logger.info(`💳 Creating subscription for user ${userId}: ${tier} - ${billingCycle}`);

    const plan = SUBSCRIPTION_PLANS[tier];
    const amount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

    try {
      // Create Stripe customer if needed
      let stripeCustomerId = await this.getStripeCustomerId(userId);
      if (!stripeCustomerId) {
        stripeCustomerId = await this.createStripeCustomer(userId);
      }

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: `${plan.name} - ${billingCycle} billing`
            },
            unit_amount: amount * 100, // Stripe uses cents
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year'
            }
          }
        }],
        default_payment_method: paymentMethodId,
        trial_period_days: tier === SubscriptionTier.BASIC ? 14 : 7, // Free trial
        metadata: {
          userId,
          tier,
          billingCycle
        }
      });

      // Create subscription record
      const client = await this.dbManager.getClient();
      try {
        const result = await client.query(`
          INSERT INTO subscriptions (
            user_id, tier, billing_cycle, amount, current_period_start,
            current_period_end, trial_end, stripe_subscription_id, stripe_customer_id, usage
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          userId,
          tier,
          billingCycle,
          amount,
          new Date(stripeSubscription.current_period_start * 1000),
          new Date(stripeSubscription.current_period_end * 1000),
          stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
          stripeSubscription.id,
          stripeCustomerId,
          JSON.stringify({
            apiRequests: 0,
            indicatorsCreated: 0,
            dashboardsCreated: 0,
            alertsActive: 0,
            lastResetAt: new Date(),
            monthlyUsage: {}
          })
        ]);

        const subscription = this.mapDbRowToSubscription(result.rows[0]);

        // Log revenue event
        await this.logRevenueEvent(subscription.id, 'subscription_created', amount);

        // Cache subscription
        await this.cacheSubscription(subscription);

        logger.info(`✅ Subscription created: ${subscription.id} - $${amount}/${billingCycle}`);
        return subscription;

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    // Try cache first
    const cached = await this.redisManager.get(`subscription:user:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const client = await this.dbManager.getClient();
    try {
      const result = await client.query(`
        SELECT * FROM subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const subscription = this.mapDbRowToSubscription(result.rows[0]);
      await this.cacheSubscription(subscription);
      return subscription;

    } finally {
      client.release();
    }
  }

  // Track usage and enforce limits
  async trackUsage(
    userId: string,
    usageType: string,
    count: number = 1,
    metadata: Record<string, any> = {}
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const plan = SUBSCRIPTION_PLANS[subscription.tier];
    let limit = 0;
    let currentUsage = 0;

    // Determine limits based on usage type
    switch (usageType) {
      case 'api_request':
        limit = plan.limits.apiRequestsPerHour;
        currentUsage = await this.getHourlyApiUsage(userId);
        break;
      case 'indicator_created':
        limit = plan.limits.customIndicators;
        currentUsage = subscription.usage.indicatorsCreated;
        break;
      case 'dashboard_created':
        limit = plan.limits.dashboards;
        currentUsage = subscription.usage.dashboardsCreated;
        break;
      case 'alert_created':
        limit = plan.limits.alerts;
        currentUsage = subscription.usage.alertsActive;
        break;
      default:
        // Allow unknown usage types
        return { allowed: true, remaining: 999999, limit: 999999 };
    }

    const allowed = (currentUsage + count) <= limit;
    const remaining = Math.max(0, limit - currentUsage - count);

    if (allowed) {
      // Log usage
      await this.logUsage(subscription.id, userId, usageType, count, metadata);

      // Update usage counters
      if (usageType !== 'api_request') { // API requests are tracked separately for hourly limits
        await this.updateUsageCounters(subscription.id, usageType, count);
      }
    }

    return { allowed, remaining, limit };
  }

  // Upgrade subscription
  async upgradeSubscription(
    userId: string,
    newTier: SubscriptionTier,
    prorate: boolean = true
  ): Promise<UserSubscription> {
    logger.info(`⬆️ Upgrading subscription for user ${userId} to ${newTier}`);

    const currentSubscription = await this.getUserSubscription(userId);
    if (!currentSubscription) {
      throw new Error('No active subscription to upgrade');
    }

    const newPlan = SUBSCRIPTION_PLANS[newTier];
    const newAmount = currentSubscription.billingCycle === 'monthly' 
      ? newPlan.monthlyPrice 
      : newPlan.annualPrice;

    try {
      // Update Stripe subscription
      if (currentSubscription.stripeSubscriptionId) {
        await this.stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
          items: [{
            id: (await this.stripe.subscriptions.retrieve(currentSubscription.stripeSubscriptionId)).items.data[0].id,
            price_data: {
              currency: 'usd',
              product_data: {
                name: newPlan.name,
                description: `${newPlan.name} - ${currentSubscription.billingCycle} billing`
              },
              unit_amount: newAmount * 100,
              recurring: {
                interval: currentSubscription.billingCycle === 'monthly' ? 'month' : 'year'
              }
            }
          }],
          proration_behavior: prorate ? 'create_prorations' : 'none',
          metadata: {
            userId,
            tier: newTier,
            billingCycle: currentSubscription.billingCycle
          }
        });
      }

      // Update database
      const client = await this.dbManager.getClient();
      try {
        const result = await client.query(`
          UPDATE subscriptions 
          SET tier = $1, amount = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `, [newTier, newAmount, currentSubscription.id]);

        const updatedSubscription = this.mapDbRowToSubscription(result.rows[0]);

        // Log revenue event
        await this.logRevenueEvent(updatedSubscription.id, 'subscription_upgraded', newAmount - currentSubscription.amount);

        // Update cache
        await this.cacheSubscription(updatedSubscription);

        logger.info(`✅ Subscription upgraded: ${currentSubscription.tier} -> ${newTier}`);
        return updatedSubscription;

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to upgrade subscription:', error);
      throw new Error('Failed to upgrade subscription');
    }
  }

  // Get subscription metrics for revenue tracking
  async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    const client = await this.dbManager.getClient();
    
    try {
      // Basic subscription counts
      const countsResult = await client.query(`
        SELECT 
          COUNT(*) as total_subscriptions,
          COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
          SUM(amount) FILTER (WHERE status = 'active' AND billing_cycle = 'monthly') as monthly_revenue,
          SUM(amount/12) FILTER (WHERE status = 'active' AND billing_cycle = 'annual') as annual_monthly_revenue,
          AVG(amount) FILTER (WHERE status = 'active') as average_revenue
        FROM subscriptions
      `);

      // Tier distribution
      const tierResult = await client.query(`
        SELECT tier, COUNT(*) as count, SUM(amount) as revenue
        FROM subscriptions 
        WHERE status = 'active'
        GROUP BY tier
      `);

      // Calculate metrics
      const counts = countsResult.rows[0];
      const monthlyRevenue = parseFloat(counts.monthly_revenue || 0);
      const annualMonthlyRevenue = parseFloat(counts.annual_monthly_revenue || 0);
      const totalMRR = monthlyRevenue + annualMonthlyRevenue;

      const tierDistribution: Record<SubscriptionTier, number> = {
        [SubscriptionTier.BASIC]: 0,
        [SubscriptionTier.PROFESSIONAL]: 0,
        [SubscriptionTier.ENTERPRISE]: 0,
        [SubscriptionTier.API]: 0
      };

      const revenueByTier: Record<SubscriptionTier, number> = {
        [SubscriptionTier.BASIC]: 0,
        [SubscriptionTier.PROFESSIONAL]: 0,
        [SubscriptionTier.ENTERPRISE]: 0,
        [SubscriptionTier.API]: 0
      };

      tierResult.rows.forEach(row => {
        tierDistribution[row.tier as SubscriptionTier] = parseInt(row.count);
        revenueByTier[row.tier as SubscriptionTier] = parseFloat(row.revenue || 0);
      });

      return {
        totalSubscriptions: parseInt(counts.total_subscriptions),
        activeSubscriptions: parseInt(counts.active_subscriptions),
        monthlyRecurringRevenue: totalMRR,
        annualRecurringRevenue: totalMRR * 12,
        averageRevenuePerUser: parseFloat(counts.average_revenue || 0),
        churnRate: 5.0, // Simplified - would calculate from historical data
        conversionRate: 3.5, // Simplified - would calculate from signup/conversion data
        tierDistribution,
        revenueByTier,
        growthRate: 15.0, // Simplified - would calculate from historical data
        lifetimeValue: parseFloat(counts.average_revenue || 0) * 24 // 24 months average
      };

    } finally {
      client.release();
    }
  }

  // Helper methods
  private async getStripeCustomerId(userId: string): Promise<string | null> {
    const client = await this.dbManager.getClient();
    try {
      const result = await client.query(`
        SELECT stripe_customer_id FROM subscriptions 
        WHERE user_id = $1 AND stripe_customer_id IS NOT NULL
        LIMIT 1
      `, [userId]);

      return result.rows.length > 0 ? result.rows[0].stripe_customer_id : null;
    } finally {
      client.release();
    }
  }

  private async createStripeCustomer(userId: string): Promise<string> {
    // Would get user details from user service
    const customer = await this.stripe.customers.create({
      metadata: { userId }
    });

    return customer.id;
  }

  private async getHourlyApiUsage(userId: string): Promise<number> {
    const key = `usage:api:${userId}:${new Date().getHours()}`;
    const usage = await this.redisManager.get(key);
    return usage ? parseInt(usage) : 0;
  }

  private async logUsage(
    subscriptionId: string,
    userId: string,
    usageType: string,
    count: number,
    metadata: Record<string, any>
  ): Promise<void> {
    const client = await this.dbManager.getClient();
    try {
      await client.query(`
        INSERT INTO subscription_usage_logs 
        (subscription_id, user_id, usage_type, usage_count, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [subscriptionId, userId, usageType, count, JSON.stringify(metadata)]);
    } finally {
      client.release();
    }

    // Update Redis counters for API requests
    if (usageType === 'api_request') {
      const hourKey = `usage:api:${userId}:${new Date().getHours()}`;
      await this.redisManager.incr(hourKey);
      await this.redisManager.expire(hourKey, 3600); // Expire after 1 hour
    }
  }

  private async updateUsageCounters(subscriptionId: string, usageType: string, count: number): Promise<void> {
    const client = await this.dbManager.getClient();
    try {
      let field = '';
      switch (usageType) {
        case 'indicator_created':
          field = 'indicatorsCreated';
          break;
        case 'dashboard_created':
          field = 'dashboardsCreated';
          break;
        case 'alert_created':
          field = 'alertsActive';
          break;
        default:
          return;
      }

      await client.query(`
        UPDATE subscriptions 
        SET usage = jsonb_set(usage, '{${field}}', ((usage->'${field}')::int + $1)::text::jsonb),
            updated_at = NOW()
        WHERE id = $2
      `, [count, subscriptionId]);
    } finally {
      client.release();
    }
  }

  private async logRevenueEvent(
    subscriptionId: string,
    eventType: string,
    amount: number
  ): Promise<void> {
    const client = await this.dbManager.getClient();
    try {
      await client.query(`
        INSERT INTO revenue_events (subscription_id, event_type, revenue_amount)
        VALUES ($1, $2, $3)
      `, [subscriptionId, eventType, amount]);
    } finally {
      client.release();
    }
  }

  private async cacheSubscription(subscription: UserSubscription): Promise<void> {
    await this.redisManager.setex(`subscription:user:${subscription.userId}`, 3600, JSON.stringify(subscription));
    await this.redisManager.setex(`subscription:id:${subscription.id}`, 3600, JSON.stringify(subscription));
  }

  private mapDbRowToSubscription(row: any): UserSubscription {
    return {
      id: row.id,
      userId: row.user_id,
      tier: row.tier,
      status: row.status,
      billingCycle: row.billing_cycle,
      amount: parseFloat(row.amount),
      currency: row.currency,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      trialEnd: row.trial_end,
      cancelAt: row.cancel_at,
      stripeSubscriptionId: row.stripe_subscription_id,
      stripeCustomerId: row.stripe_customer_id,
      usage: row.usage,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private async resetDailyUsage(): Promise<void> {
    logger.info('🔄 Resetting daily usage counters');
    // Reset API usage counters in Redis
    const keys = await this.redisManager.keys('usage:api:*');
    if (keys.length > 0) {
      await this.redisManager.del(...keys);
    }
  }

  private async generateRevenueReports(): Promise<void> {
    const metrics = await this.getSubscriptionMetrics();
    await this.redisManager.setex('revenue:metrics:current', 3600, JSON.stringify(metrics));
    
    logger.info(`💰 Revenue Report: $${metrics.monthlyRecurringRevenue.toLocaleString()}/month MRR`);
  }

  private async syncWithStripe(): Promise<void> {
    // Sync subscription statuses with Stripe
    logger.debug('🔄 Syncing with Stripe...');
  }
}