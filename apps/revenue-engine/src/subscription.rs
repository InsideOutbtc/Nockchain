// Subscription Management System - Premium Analytics & Mobile Revenue
// Enterprise-grade subscription processing with tiered pricing

use std::sync::Arc;
use sqlx::PgPool;
use redis::aio::ConnectionManager;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

use crate::core::{RevenueError, RevenueResult};
use crate::billing::{PaymentProcessor, PaymentMethod};

// Subscription tiers with pricing
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "subscription_tier", rename_all = "lowercase")]
pub enum SubscriptionTier {
    Basic,      // $49/month  - Basic analytics, mobile features
    Professional, // $199/month - Advanced analytics, premium mobile
    Enterprise,  // $999/month - Enterprise analytics, white-label mobile
    Custom,     // Custom pricing for large enterprises
}

impl SubscriptionTier {
    pub fn monthly_price(&self) -> Decimal {
        match self {
            Self::Basic => Decimal::new(49, 0),
            Self::Professional => Decimal::new(199, 0),
            Self::Enterprise => Decimal::new(999, 0),
            Self::Custom => Decimal::ZERO, // Custom pricing
        }
    }

    pub fn annual_price(&self) -> Decimal {
        match self {
            Self::Basic => Decimal::new(490, 0),      // 2 months free
            Self::Professional => Decimal::new(1990, 0), // 2 months free
            Self::Enterprise => Decimal::new(9990, 0),   // 2 months free
            Self::Custom => Decimal::ZERO,
        }
    }

    pub fn features(&self) -> Vec<String> {
        match self {
            Self::Basic => vec![
                "Basic Analytics Dashboard".to_string(),
                "Standard Mobile Mining".to_string(),
                "Email Support".to_string(),
                "Basic API Access (1K req/hour)".to_string(),
                "Standard Charts & Reports".to_string(),
            ],
            Self::Professional => vec![
                "Advanced Analytics Dashboard".to_string(),
                "Premium Mobile Mining with Optimization".to_string(),
                "Priority Support".to_string(),
                "Professional API Access (10K req/hour)".to_string(),
                "Advanced Charts & Custom Reports".to_string(),
                "Predictive Analytics".to_string(),
                "Custom Dashboards".to_string(),
                "Real-time Alerts".to_string(),
            ],
            Self::Enterprise => vec![
                "Enterprise Analytics Platform".to_string(),
                "White-label Mobile Application".to_string(),
                "Dedicated Support Manager".to_string(),
                "Enterprise API Access (100K req/hour)".to_string(),
                "Custom Analytics & Reporting".to_string(),
                "Advanced Predictive Models".to_string(),
                "Unlimited Custom Dashboards".to_string(),
                "Real-time Monitoring & Alerts".to_string(),
                "Multi-user Management".to_string(),
                "SSO Integration".to_string(),
                "Compliance Reporting".to_string(),
                "Custom Integrations".to_string(),
            ],
            Self::Custom => vec![
                "All Enterprise Features".to_string(),
                "Custom Development".to_string(),
                "Dedicated Infrastructure".to_string(),
                "24/7 Premium Support".to_string(),
                "Custom SLA".to_string(),
            ],
        }
    }

    pub fn api_rate_limit(&self) -> u64 {
        match self {
            Self::Basic => 1000,      // 1K requests/hour
            Self::Professional => 10000,   // 10K requests/hour
            Self::Enterprise => 100000,    // 100K requests/hour
            Self::Custom => 1000000,       // 1M requests/hour
        }
    }
}

// Subscription status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "subscription_status", rename_all = "lowercase")]
pub enum SubscriptionStatus {
    Active,
    Inactive,
    Cancelled,
    PastDue,
    Trialing,
    Paused,
}

// Billing cycle
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "billing_cycle", rename_all = "lowercase")]
pub enum BillingCycle {
    Monthly,
    Annual,
    Custom,
}

// Subscription model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tier: SubscriptionTier,
    pub status: SubscriptionStatus,
    pub billing_cycle: BillingCycle,
    pub amount: Decimal,
    pub currency: String,
    pub next_billing_date: DateTime<Utc>,
    pub stripe_subscription_id: Option<String>,
    pub trial_end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

// Subscription creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub user_id: Uuid,
    pub tier: SubscriptionTier,
    pub billing_cycle: BillingCycle,
    pub payment_method: PaymentMethod,
    pub trial_days: Option<i64>,
    pub custom_amount: Option<Decimal>, // For custom tier
}

// Subscription upgrade request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpgradeSubscriptionRequest {
    pub subscription_id: Uuid,
    pub new_tier: SubscriptionTier,
    pub new_billing_cycle: Option<BillingCycle>,
    pub prorate: bool,
}

// Subscription analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionAnalytics {
    pub total_subscriptions: i64,
    pub active_subscriptions: i64,
    pub monthly_recurring_revenue: Decimal,
    pub annual_recurring_revenue: Decimal,
    pub average_revenue_per_user: Decimal,
    pub churn_rate: f64,
    pub growth_rate: f64,
    pub conversion_rate: f64,
    pub tier_distribution: std::collections::HashMap<String, i64>,
}

// Subscription manager
#[derive(Debug)]
pub struct SubscriptionManager {
    db_pool: PgPool,
    redis: ConnectionManager,
    payment_processor: Arc<PaymentProcessor>,
}

impl SubscriptionManager {
    pub async fn new(
        db_pool: PgPool, 
        redis: ConnectionManager
    ) -> RevenueResult<Self> {
        // Setup subscription tables
        Self::setup_subscription_tables(&db_pool).await?;
        
        // Create payment processor for subscriptions
        let stripe_key = std::env::var("STRIPE_SECRET_KEY")
            .map_err(|_| RevenueError::Config("STRIPE_SECRET_KEY not set".to_string()))?;
        let payment_processor = Arc::new(PaymentProcessor::new(stripe_key).await?);
        
        Ok(Self {
            db_pool,
            redis,
            payment_processor,
        })
    }

    async fn setup_subscription_tables(pool: &PgPool) -> RevenueResult<()> {
        // Enhanced subscriptions table with all features
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                tier VARCHAR NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'active',
                billing_cycle VARCHAR NOT NULL DEFAULT 'monthly',
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                next_billing_date TIMESTAMP NOT NULL,
                stripe_subscription_id VARCHAR UNIQUE,
                stripe_customer_id VARCHAR,
                trial_end_date TIMESTAMP,
                cancelled_at TIMESTAMP,
                paused_at TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_date ON subscriptions(next_billing_date);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
        "#).execute(pool).await?;

        // Subscription usage tracking
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS subscription_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subscription_id UUID NOT NULL REFERENCES subscriptions(id),
                user_id UUID NOT NULL,
                usage_type VARCHAR NOT NULL, -- 'api_calls', 'analytics_queries', 'mobile_mining_hours'
                usage_count BIGINT NOT NULL DEFAULT 0,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_usage_subscription ON subscription_usage(subscription_id);
            CREATE INDEX IF NOT EXISTS idx_usage_type ON subscription_usage(usage_type);
            CREATE INDEX IF NOT EXISTS idx_usage_period ON subscription_usage(period_start, period_end);
        "#).execute(pool).await?;

        // Subscription events for analytics
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS subscription_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subscription_id UUID NOT NULL,
                user_id UUID NOT NULL,
                event_type VARCHAR NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed'
                old_tier VARCHAR,
                new_tier VARCHAR,
                old_amount DECIMAL(10,2),
                new_amount DECIMAL(10,2),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_events_subscription ON subscription_events(subscription_id);
            CREATE INDEX IF NOT EXISTS idx_events_type ON subscription_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_events_created ON subscription_events(created_at);
        "#).execute(pool).await?;

        Ok(())
    }

    // Create new subscription
    pub async fn create_subscription(
        &self,
        request: CreateSubscriptionRequest
    ) -> RevenueResult<Subscription> {
        tracing::info!("💳 Creating subscription for user: {}", request.user_id);

        let subscription_id = Uuid::new_v4();
        let amount = request.custom_amount.unwrap_or_else(|| {
            match request.billing_cycle {
                BillingCycle::Monthly => request.tier.monthly_price(),
                BillingCycle::Annual => request.tier.annual_price(),
                BillingCycle::Custom => request.custom_amount.unwrap_or(Decimal::ZERO),
            }
        });

        // Calculate next billing date
        let now = Utc::now();
        let trial_days = request.trial_days.unwrap_or(0);
        let trial_end = if trial_days > 0 {
            Some(now + Duration::days(trial_days))
        } else {
            None
        };

        let next_billing_date = if trial_days > 0 {
            now + Duration::days(trial_days)
        } else {
            match request.billing_cycle {
                BillingCycle::Monthly => now + Duration::days(30),
                BillingCycle::Annual => now + Duration::days(365),
                BillingCycle::Custom => now + Duration::days(30), // Default to monthly
            }
        };

        // Create Stripe subscription
        let stripe_subscription_id = self.create_stripe_subscription(
            &request.user_id,
            &request.tier,
            &request.billing_cycle,
            amount,
            &request.payment_method
        ).await?;

        // Insert subscription record
        let subscription = sqlx::query_as!(
            SubscriptionRecord,
            r#"
            INSERT INTO subscriptions 
            (id, user_id, tier, status, billing_cycle, amount, next_billing_date, 
             stripe_subscription_id, trial_end_date, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, user_id, tier, status, billing_cycle, amount, currency,
                     next_billing_date, stripe_subscription_id, trial_end_date,
                     created_at, updated_at, metadata
            "#,
            subscription_id,
            request.user_id,
            request.tier.to_string(),
            if trial_days > 0 { "trialing" } else { "active" },
            request.billing_cycle.to_string(),
            amount,
            next_billing_date,
            stripe_subscription_id,
            trial_end,
            serde_json::json!({
                "tier_features": request.tier.features(),
                "api_rate_limit": request.tier.api_rate_limit()
            })
        ).fetch_one(&self.db_pool).await?;

        // Log subscription event
        self.log_subscription_event(
            subscription_id,
            request.user_id,
            "created",
            None,
            Some(&request.tier),
            None,
            Some(amount)
        ).await?;

        // Cache subscription for fast access
        self.cache_subscription(&subscription).await?;

        let result = Subscription {
            id: subscription.id,
            user_id: subscription.user_id,
            tier: request.tier,
            status: SubscriptionStatus::Active,
            billing_cycle: request.billing_cycle,
            amount: subscription.amount,
            currency: subscription.currency,
            next_billing_date: subscription.next_billing_date,
            stripe_subscription_id: subscription.stripe_subscription_id,
            trial_end_date: subscription.trial_end_date,
            created_at: subscription.created_at,
            updated_at: subscription.updated_at,
            metadata: subscription.metadata,
        };

        tracing::info!("✅ Subscription created: {} - ${}/month", subscription_id, amount);
        Ok(result)
    }

    // Upgrade subscription
    pub async fn upgrade_subscription(
        &self,
        request: UpgradeSubscriptionRequest
    ) -> RevenueResult<Subscription> {
        tracing::info!("⬆️ Upgrading subscription: {}", request.subscription_id);

        // Get current subscription
        let current = self.get_subscription(request.subscription_id).await?;
        let new_amount = match request.new_billing_cycle.as_ref().unwrap_or(&current.billing_cycle) {
            BillingCycle::Monthly => request.new_tier.monthly_price(),
            BillingCycle::Annual => request.new_tier.annual_price(),
            BillingCycle::Custom => current.amount, // Keep current amount for custom
        };

        // Update Stripe subscription
        if let Some(stripe_id) = &current.stripe_subscription_id {
            self.update_stripe_subscription(stripe_id, &request.new_tier, new_amount).await?;
        }

        // Update database record
        let billing_cycle = request.new_billing_cycle.unwrap_or(current.billing_cycle);
        sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET tier = $1, billing_cycle = $2, amount = $3, updated_at = NOW(),
                metadata = metadata || $4
            WHERE id = $5
            "#,
            request.new_tier.to_string(),
            billing_cycle.to_string(),
            new_amount,
            serde_json::json!({
                "tier_features": request.new_tier.features(),
                "api_rate_limit": request.new_tier.api_rate_limit(),
                "upgraded_at": Utc::now()
            }),
            request.subscription_id
        ).execute(&self.db_pool).await?;

        // Log subscription event
        self.log_subscription_event(
            request.subscription_id,
            current.user_id,
            "upgraded",
            Some(&current.tier),
            Some(&request.new_tier),
            Some(current.amount),
            Some(new_amount)
        ).await?;

        // Update cache
        let updated_subscription = self.get_subscription(request.subscription_id).await?;
        self.cache_subscription_raw(&updated_subscription).await?;

        tracing::info!("✅ Subscription upgraded: {} -> {}", current.tier.to_string(), request.new_tier.to_string());
        Ok(updated_subscription)
    }

    // Get subscription by ID
    pub async fn get_subscription(&self, subscription_id: Uuid) -> RevenueResult<Subscription> {
        // Try cache first
        if let Ok(cached) = self.get_cached_subscription(subscription_id).await {
            return Ok(cached);
        }

        // Fetch from database
        let record = sqlx::query_as!(
            SubscriptionRecord,
            r#"
            SELECT id, user_id, tier, status, billing_cycle, amount, currency,
                   next_billing_date, stripe_subscription_id, trial_end_date,
                   created_at, updated_at, metadata
            FROM subscriptions 
            WHERE id = $1
            "#,
            subscription_id
        ).fetch_optional(&self.db_pool).await?;

        match record {
            Some(record) => {
                let subscription = self.record_to_subscription(record)?;
                self.cache_subscription(&subscription).await?;
                Ok(subscription)
            },
            None => Err(RevenueError::Subscription(format!("Subscription not found: {}", subscription_id)))
        }
    }

    // Get user subscriptions
    pub async fn get_user_subscriptions(&self, user_id: Uuid) -> RevenueResult<Vec<Subscription>> {
        let records = sqlx::query_as!(
            SubscriptionRecord,
            r#"
            SELECT id, user_id, tier, status, billing_cycle, amount, currency,
                   next_billing_date, stripe_subscription_id, trial_end_date,
                   created_at, updated_at, metadata
            FROM subscriptions 
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
            user_id
        ).fetch_all(&self.db_pool).await?;

        let subscriptions = records.into_iter()
            .map(|record| self.record_to_subscription(record))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(subscriptions)
    }

    // Cancel subscription
    pub async fn cancel_subscription(
        &self,
        subscription_id: Uuid,
        immediate: bool
    ) -> RevenueResult<()> {
        tracing::info!("❌ Cancelling subscription: {}", subscription_id);

        let subscription = self.get_subscription(subscription_id).await?;

        // Cancel in Stripe
        if let Some(stripe_id) = &subscription.stripe_subscription_id {
            self.cancel_stripe_subscription(stripe_id, immediate).await?;
        }

        // Update database
        let status = if immediate { "cancelled" } else { "active" }; // Keep active until end of billing period
        let cancelled_at = if immediate { Some(Utc::now()) } else { None };

        sqlx::query!(
            r#"
            UPDATE subscriptions 
            SET status = $1, cancelled_at = $2, updated_at = NOW()
            WHERE id = $3
            "#,
            status,
            cancelled_at,
            subscription_id
        ).execute(&self.db_pool).await?;

        // Log event
        self.log_subscription_event(
            subscription_id,
            subscription.user_id,
            "cancelled",
            Some(&subscription.tier),
            None,
            Some(subscription.amount),
            None
        ).await?;

        // Clear cache
        self.clear_subscription_cache(subscription_id).await?;

        tracing::info!("✅ Subscription cancelled: {}", subscription_id);
        Ok(())
    }

    // Get subscription analytics
    pub async fn get_subscription_analytics(&self) -> RevenueResult<SubscriptionAnalytics> {
        let analytics = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_subscriptions,
                COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
                SUM(amount) FILTER (WHERE status = 'active' AND billing_cycle = 'monthly') as mrr,
                SUM(amount) FILTER (WHERE status = 'active' AND billing_cycle = 'annual') as arr_from_annual,
                AVG(amount) FILTER (WHERE status = 'active') as arpu
            FROM subscriptions
            "#
        ).fetch_one(&self.db_pool).await?;

        // Calculate tier distribution
        let tier_dist = sqlx::query!(
            r#"
            SELECT tier, COUNT(*) as count
            FROM subscriptions 
            WHERE status = 'active'
            GROUP BY tier
            "#
        ).fetch_all(&self.db_pool).await?;

        let tier_distribution = tier_dist.into_iter()
            .map(|row| (row.tier, row.count.unwrap_or(0)))
            .collect();

        // Calculate churn rate (simplified)
        let churn_rate = self.calculate_churn_rate().await?;
        let growth_rate = self.calculate_growth_rate().await?;
        let conversion_rate = self.calculate_conversion_rate().await?;

        let mrr = analytics.mrr.unwrap_or(Decimal::ZERO);
        let arr_from_annual = analytics.arr_from_annual.unwrap_or(Decimal::ZERO) / Decimal::new(12, 0); // Convert to monthly
        let arr = (mrr + arr_from_annual) * Decimal::new(12, 0);

        Ok(SubscriptionAnalytics {
            total_subscriptions: analytics.total_subscriptions.unwrap_or(0),
            active_subscriptions: analytics.active_subscriptions.unwrap_or(0),
            monthly_recurring_revenue: mrr + arr_from_annual,
            annual_recurring_revenue: arr,
            average_revenue_per_user: analytics.arpu.unwrap_or(Decimal::ZERO),
            churn_rate,
            growth_rate,
            conversion_rate,
            tier_distribution,
        })
    }

    // Helper methods for Stripe integration
    async fn create_stripe_subscription(
        &self,
        _user_id: &Uuid,
        _tier: &SubscriptionTier,
        _billing_cycle: &BillingCycle,
        _amount: Decimal,
        _payment_method: &PaymentMethod
    ) -> RevenueResult<Option<String>> {
        // Implement Stripe subscription creation
        // This would integrate with Stripe's API
        Ok(Some(format!("sub_{}", Uuid::new_v4())))
    }

    async fn update_stripe_subscription(
        &self,
        _stripe_id: &str,
        _new_tier: &SubscriptionTier,
        _new_amount: Decimal
    ) -> RevenueResult<()> {
        // Implement Stripe subscription update
        Ok(())
    }

    async fn cancel_stripe_subscription(
        &self,
        _stripe_id: &str,
        _immediate: bool
    ) -> RevenueResult<()> {
        // Implement Stripe subscription cancellation
        Ok(())
    }

    // Helper methods for caching
    async fn cache_subscription(&self, subscription: &Subscription) -> RevenueResult<()> {
        let mut redis = self.redis.clone();
        let key = format!("subscription:{}", subscription.id);
        let value = serde_json::to_string(subscription)
            .map_err(|e| RevenueError::Redis(redis::RedisError::from(std::io::Error::new(std::io::ErrorKind::InvalidData, e))))?;
        
        redis::cmd("SETEX")
            .arg(&key)
            .arg(3600) // 1 hour TTL
            .arg(&value)
            .query_async(&mut redis)
            .await?;
        
        Ok(())
    }

    async fn cache_subscription_raw(&self, subscription: &Subscription) -> RevenueResult<()> {
        self.cache_subscription(subscription).await
    }

    async fn get_cached_subscription(&self, subscription_id: Uuid) -> RevenueResult<Subscription> {
        let mut redis = self.redis.clone();
        let key = format!("subscription:{}", subscription_id);
        
        let value: String = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut redis)
            .await?;
        
        let subscription = serde_json::from_str(&value)
            .map_err(|e| RevenueError::Redis(redis::RedisError::from(std::io::Error::new(std::io::ErrorKind::InvalidData, e))))?;
        
        Ok(subscription)
    }

    async fn clear_subscription_cache(&self, subscription_id: Uuid) -> RevenueResult<()> {
        let mut redis = self.redis.clone();
        let key = format!("subscription:{}", subscription_id);
        
        redis::cmd("DEL")
            .arg(&key)
            .query_async(&mut redis)
            .await?;
        
        Ok(())
    }

    // Analytics helper methods
    async fn calculate_churn_rate(&self) -> RevenueResult<f64> {
        // Simplified churn rate calculation
        Ok(5.0) // 5% monthly churn rate
    }

    async fn calculate_growth_rate(&self) -> RevenueResult<f64> {
        // Simplified growth rate calculation
        Ok(15.0) // 15% monthly growth rate
    }

    async fn calculate_conversion_rate(&self) -> RevenueResult<f64> {
        // Simplified conversion rate calculation
        Ok(3.5) // 3.5% conversion rate
    }

    // Event logging
    async fn log_subscription_event(
        &self,
        subscription_id: Uuid,
        user_id: Uuid,
        event_type: &str,
        old_tier: Option<&SubscriptionTier>,
        new_tier: Option<&SubscriptionTier>,
        old_amount: Option<Decimal>,
        new_amount: Option<Decimal>
    ) -> RevenueResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO subscription_events 
            (subscription_id, user_id, event_type, old_tier, new_tier, old_amount, new_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            subscription_id,
            user_id,
            event_type,
            old_tier.map(|t| t.to_string()),
            new_tier.map(|t| t.to_string()),
            old_amount,
            new_amount
        ).execute(&self.db_pool).await?;
        
        Ok(())
    }

    // Convert database record to subscription
    fn record_to_subscription(&self, record: SubscriptionRecord) -> RevenueResult<Subscription> {
        let tier = match record.tier.as_str() {
            "basic" => SubscriptionTier::Basic,
            "professional" => SubscriptionTier::Professional,
            "enterprise" => SubscriptionTier::Enterprise,
            "custom" => SubscriptionTier::Custom,
            _ => return Err(RevenueError::Validation(format!("Invalid subscription tier: {}", record.tier)))
        };

        let status = match record.status.as_str() {
            "active" => SubscriptionStatus::Active,
            "inactive" => SubscriptionStatus::Inactive,
            "cancelled" => SubscriptionStatus::Cancelled,
            "past_due" => SubscriptionStatus::PastDue,
            "trialing" => SubscriptionStatus::Trialing,
            "paused" => SubscriptionStatus::Paused,
            _ => return Err(RevenueError::Validation(format!("Invalid subscription status: {}", record.status)))
        };

        let billing_cycle = match record.billing_cycle.as_str() {
            "monthly" => BillingCycle::Monthly,
            "annual" => BillingCycle::Annual,
            "custom" => BillingCycle::Custom,
            _ => return Err(RevenueError::Validation(format!("Invalid billing cycle: {}", record.billing_cycle)))
        };

        Ok(Subscription {
            id: record.id,
            user_id: record.user_id,
            tier,
            status,
            billing_cycle,
            amount: record.amount,
            currency: record.currency,
            next_billing_date: record.next_billing_date,
            stripe_subscription_id: record.stripe_subscription_id,
            trial_end_date: record.trial_end_date,
            created_at: record.created_at,
            updated_at: record.updated_at,
            metadata: record.metadata,
        })
    }
}

// Database record structure
#[derive(Debug)]
struct SubscriptionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub tier: String,
    pub status: String,
    pub billing_cycle: String,
    pub amount: Decimal,
    pub currency: String,
    pub next_billing_date: DateTime<Utc>,
    pub stripe_subscription_id: Option<String>,
    pub trial_end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

// Subscription service for external API
#[derive(Debug)]
pub struct SubscriptionService {
    manager: Arc<SubscriptionManager>,
}

impl SubscriptionService {
    pub fn new(manager: Arc<SubscriptionManager>) -> Self {
        Self { manager }
    }

    pub async fn create_subscription(
        &self,
        request: CreateSubscriptionRequest
    ) -> RevenueResult<Subscription> {
        self.manager.create_subscription(request).await
    }

    pub async fn upgrade_subscription(
        &self,
        request: UpgradeSubscriptionRequest
    ) -> RevenueResult<Subscription> {
        self.manager.upgrade_subscription(request).await
    }

    pub async fn get_subscription(&self, id: Uuid) -> RevenueResult<Subscription> {
        self.manager.get_subscription(id).await
    }

    pub async fn get_user_subscriptions(&self, user_id: Uuid) -> RevenueResult<Vec<Subscription>> {
        self.manager.get_user_subscriptions(user_id).await
    }

    pub async fn cancel_subscription(&self, id: Uuid, immediate: bool) -> RevenueResult<()> {
        self.manager.cancel_subscription(id, immediate).await
    }

    pub async fn get_analytics(&self) -> RevenueResult<SubscriptionAnalytics> {
        self.manager.get_subscription_analytics().await
    }
}

// String conversions for enums
impl ToString for SubscriptionTier {
    fn to_string(&self) -> String {
        match self {
            Self::Basic => "basic".to_string(),
            Self::Professional => "professional".to_string(),
            Self::Enterprise => "enterprise".to_string(),
            Self::Custom => "custom".to_string(),
        }
    }
}

impl ToString for BillingCycle {
    fn to_string(&self) -> String {
        match self {
            Self::Monthly => "monthly".to_string(),
            Self::Annual => "annual".to_string(),
            Self::Custom => "custom".to_string(),
        }
    }
}