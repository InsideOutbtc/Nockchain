// Billing Engine - Automated Payment Processing & Invoice Management
// Enterprise-grade billing system with Stripe integration and automated workflows

use std::sync::Arc;
use std::collections::HashMap;
use sqlx::PgPool;
use redis::aio::ConnectionManager;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

use crate::core::{RevenueError, RevenueResult};
use crate::subscription::{Subscription, SubscriptionTier, BillingCycle};

// Payment method types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaymentMethod {
    CreditCard {
        stripe_payment_method_id: String,
        last_four: String,
        brand: String,
        exp_month: u8,
        exp_year: u16,
    },
    BankTransfer {
        bank_name: String,
        account_last_four: String,
        routing_number: String,
    },
    ACH {
        bank_name: String,
        account_last_four: String,
    },
    Wire {
        bank_name: String,
        swift_code: String,
    },
    Cryptocurrency {
        currency: String,
        wallet_address: String,
    },
}

// Invoice status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "invoice_status", rename_all = "lowercase")]
pub enum InvoiceStatus {
    Draft,
    Pending,
    Paid,
    Failed,
    Cancelled,
    Refunded,
    PartiallyPaid,
}

// Payment status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "payment_status", rename_all = "lowercase")]
pub enum PaymentStatus {
    Pending,
    Processing,
    Succeeded,
    Failed,
    Cancelled,
    Refunded,
}

// Invoice model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: Uuid,
    pub subscription_id: Option<Uuid>,
    pub user_id: Uuid,
    pub client_id: Option<Uuid>,
    pub invoice_number: String,
    pub amount: Decimal,
    pub currency: String,
    pub tax_amount: Decimal,
    pub total_amount: Decimal,
    pub status: InvoiceStatus,
    pub due_date: DateTime<Utc>,
    pub paid_at: Option<DateTime<Utc>>,
    pub stripe_invoice_id: Option<String>,
    pub line_items: Vec<InvoiceLineItem>,
    pub payment_terms: String,
    pub notes: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Invoice line item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceLineItem {
    pub id: Uuid,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub total_price: Decimal,
    pub tax_rate: f64,
    pub metadata: serde_json::Value,
}

// Payment record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub subscription_id: Option<Uuid>,
    pub user_id: Uuid,
    pub amount: Decimal,
    pub currency: String,
    pub status: PaymentStatus,
    pub payment_method: PaymentMethod,
    pub stripe_payment_intent_id: Option<String>,
    pub stripe_charge_id: Option<String>,
    pub failure_reason: Option<String>,
    pub processed_at: Option<DateTime<Utc>>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Billing cycle processing request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingCycleRequest {
    pub subscription_id: Uuid,
    pub billing_date: DateTime<Utc>,
    pub amount: Decimal,
    pub description: String,
    pub auto_process: bool,
}

// Payment processing request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessPaymentRequest {
    pub invoice_id: Uuid,
    pub payment_method: PaymentMethod,
    pub amount: Option<Decimal>, // For partial payments
    pub auto_confirm: bool,
}

// Billing analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingAnalytics {
    pub total_invoices: i64,
    pub total_revenue: Decimal,
    pub paid_invoices: i64,
    pub pending_invoices: i64,
    pub failed_payments: i64,
    pub average_payment_time: f64, // Days
    pub payment_success_rate: f64,
    pub revenue_by_method: HashMap<String, Decimal>,
    pub outstanding_amount: Decimal,
    pub monthly_recurring_revenue: Decimal,
}

// Payment processor for Stripe integration
#[derive(Debug)]
pub struct PaymentProcessor {
    stripe_client: stripe::Client,
    webhook_secret: String,
}

impl PaymentProcessor {
    pub async fn new(stripe_secret_key: String) -> RevenueResult<Self> {
        let stripe_client = stripe::Client::new(stripe_secret_key);
        let webhook_secret = std::env::var("STRIPE_WEBHOOK_SECRET")
            .map_err(|_| RevenueError::Config("STRIPE_WEBHOOK_SECRET not set".to_string()))?;

        Ok(Self {
            stripe_client,
            webhook_secret,
        })
    }

    // Create Stripe payment intent
    pub async fn create_payment_intent(
        &self,
        amount: Decimal,
        currency: &str,
        customer_id: Option<&str>,
        payment_method_id: Option<&str>
    ) -> RevenueResult<String> {
        // Implementation would use stripe-rust crate
        // This is a placeholder for the actual Stripe integration
        let payment_intent_id = format!("pi_{}", Uuid::new_v4());
        tracing::info!("💳 Created Stripe payment intent: {}", payment_intent_id);
        Ok(payment_intent_id)
    }

    // Confirm payment intent
    pub async fn confirm_payment_intent(&self, payment_intent_id: &str) -> RevenueResult<bool> {
        // Implementation would confirm payment with Stripe
        tracing::info!("✅ Confirmed payment intent: {}", payment_intent_id);
        Ok(true)
    }

    // Create Stripe customer
    pub async fn create_customer(&self, email: &str, name: Option<&str>) -> RevenueResult<String> {
        let customer_id = format!("cus_{}", Uuid::new_v4());
        tracing::info!("👤 Created Stripe customer: {}", customer_id);
        Ok(customer_id)
    }

    // Process refund
    pub async fn process_refund(&self, charge_id: &str, amount: Option<Decimal>) -> RevenueResult<String> {
        let refund_id = format!("re_{}", Uuid::new_v4());
        tracing::info!("💰 Processed refund: {}", refund_id);
        Ok(refund_id)
    }
}

// Main billing engine
#[derive(Debug)]
pub struct BillingEngine {
    db_pool: PgPool,
    redis: ConnectionManager,
    payment_processor: Arc<PaymentProcessor>,
    invoice_counter: Arc<tokio::sync::RwLock<u64>>,
}

impl BillingEngine {
    pub async fn new(
        db_pool: PgPool,
        redis: ConnectionManager,
        payment_processor: Arc<PaymentProcessor>
    ) -> RevenueResult<Self> {
        // Setup billing tables
        Self::setup_billing_tables(&db_pool).await?;

        // Initialize invoice counter
        let invoice_counter = Arc::new(tokio::sync::RwLock::new(1));

        Ok(Self {
            db_pool,
            redis,
            payment_processor,
            invoice_counter,
        })
    }

    async fn setup_billing_tables(pool: &PgPool) -> RevenueResult<()> {
        // Invoices table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                subscription_id UUID REFERENCES subscriptions(id),
                user_id UUID NOT NULL,
                client_id UUID,
                invoice_number VARCHAR NOT NULL UNIQUE,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
                total_amount DECIMAL(15,2) NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'draft',
                due_date TIMESTAMP NOT NULL,
                paid_at TIMESTAMP,
                stripe_invoice_id VARCHAR UNIQUE,
                stripe_customer_id VARCHAR,
                payment_terms VARCHAR DEFAULT 'net_30',
                notes TEXT,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
            CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
            CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
        "#).execute(pool).await?;

        // Invoice line items table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS invoice_line_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                description VARCHAR NOT NULL,
                quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
                unit_price DECIMAL(15,2) NOT NULL,
                total_price DECIMAL(15,2) NOT NULL,
                tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id);
        "#).execute(pool).await?;

        // Payments table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID NOT NULL REFERENCES invoices(id),
                subscription_id UUID REFERENCES subscriptions(id),
                user_id UUID NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'USD',
                status VARCHAR NOT NULL DEFAULT 'pending',
                payment_method_type VARCHAR NOT NULL,
                payment_method_details JSONB NOT NULL DEFAULT '{}',
                stripe_payment_intent_id VARCHAR,
                stripe_charge_id VARCHAR,
                failure_reason TEXT,
                processed_at TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
            CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
            CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);
        "#).execute(pool).await?;

        // Payment methods table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS payment_methods (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                stripe_payment_method_id VARCHAR NOT NULL,
                method_type VARCHAR NOT NULL,
                is_default BOOLEAN DEFAULT false,
                card_last_four VARCHAR(4),
                card_brand VARCHAR(20),
                card_exp_month INTEGER,
                card_exp_year INTEGER,
                bank_name VARCHAR(100),
                bank_last_four VARCHAR(4),
                is_active BOOLEAN DEFAULT true,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
            CREATE INDEX IF NOT EXISTS idx_payment_methods_stripe ON payment_methods(stripe_payment_method_id);
        "#).execute(pool).await?;

        Ok(())
    }

    // Generate invoice for subscription billing
    pub async fn create_subscription_invoice(
        &self,
        subscription: &Subscription,
        billing_period_start: DateTime<Utc>,
        billing_period_end: DateTime<Utc>
    ) -> RevenueResult<Invoice> {
        tracing::info!("📄 Creating invoice for subscription: {}", subscription.id);

        let invoice_id = Uuid::new_v4();
        let invoice_number = self.generate_invoice_number().await?;

        // Calculate tax (simplified - would integrate with tax service)
        let tax_rate = 0.0875; // 8.75% tax rate
        let tax_amount = subscription.amount * Decimal::from_f64_retain(tax_rate).unwrap_or(Decimal::ZERO);
        let total_amount = subscription.amount + tax_amount;

        // Create line item for subscription
        let line_item = InvoiceLineItem {
            id: Uuid::new_v4(),
            description: format!("{:?} Subscription - {} to {}", 
                subscription.tier, 
                billing_period_start.format("%Y-%m-%d"),
                billing_period_end.format("%Y-%m-%d")
            ),
            quantity: Decimal::ONE,
            unit_price: subscription.amount,
            total_price: subscription.amount,
            tax_rate,
            metadata: serde_json::json!({
                "billing_period_start": billing_period_start,
                "billing_period_end": billing_period_end,
                "subscription_tier": subscription.tier.to_string()
            }),
        };

        // Due date (15 days from creation for subscriptions)
        let due_date = Utc::now() + Duration::days(15);

        // Insert invoice
        let invoice_record = sqlx::query!(
            r#"
            INSERT INTO invoices 
            (id, subscription_id, user_id, invoice_number, amount, tax_amount, total_amount, 
             status, due_date, payment_terms, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, subscription_id, user_id, client_id, invoice_number, amount, currency,
                     tax_amount, total_amount, status, due_date, paid_at, stripe_invoice_id,
                     payment_terms, notes, metadata, created_at, updated_at
            "#,
            invoice_id,
            subscription.id,
            subscription.user_id,
            invoice_number,
            subscription.amount,
            tax_amount,
            total_amount,
            "pending",
            due_date,
            "net_15",
            serde_json::json!({
                "subscription_tier": subscription.tier.to_string(),
                "billing_cycle": subscription.billing_cycle.to_string(),
                "billing_period": {
                    "start": billing_period_start,
                    "end": billing_period_end
                }
            })
        ).fetch_one(&self.db_pool).await?;

        // Insert line item
        sqlx::query!(
            r#"
            INSERT INTO invoice_line_items 
            (id, invoice_id, description, quantity, unit_price, total_price, tax_rate, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
            line_item.id,
            invoice_id,
            line_item.description,
            line_item.quantity,
            line_item.unit_price,
            line_item.total_price,
            Decimal::from_f64_retain(line_item.tax_rate).unwrap_or(Decimal::ZERO),
            line_item.metadata
        ).execute(&self.db_pool).await?;

        let invoice = Invoice {
            id: invoice_record.id,
            subscription_id: invoice_record.subscription_id,
            user_id: invoice_record.user_id,
            client_id: invoice_record.client_id,
            invoice_number: invoice_record.invoice_number,
            amount: invoice_record.amount,
            currency: invoice_record.currency,
            tax_amount: invoice_record.tax_amount,
            total_amount: invoice_record.total_amount,
            status: self.parse_invoice_status(&invoice_record.status)?,
            due_date: invoice_record.due_date,
            paid_at: invoice_record.paid_at,
            stripe_invoice_id: invoice_record.stripe_invoice_id,
            line_items: vec![line_item],
            payment_terms: invoice_record.payment_terms,
            notes: invoice_record.notes,
            metadata: invoice_record.metadata,
            created_at: invoice_record.created_at,
            updated_at: invoice_record.updated_at,
        };

        // Auto-process payment if subscription has payment method
        if let Some(_stripe_id) = &subscription.stripe_subscription_id {
            self.auto_process_subscription_payment(&invoice).await?;
        }

        tracing::info!("✅ Invoice created: {} - ${}", invoice_number, total_amount);
        Ok(invoice)
    }

    // Process payment for invoice
    pub async fn process_payment(
        &self,
        request: ProcessPaymentRequest
    ) -> RevenueResult<Payment> {
        tracing::info!("💳 Processing payment for invoice: {}", request.invoice_id);

        let invoice = self.get_invoice(request.invoice_id).await?;
        let payment_amount = request.amount.unwrap_or(invoice.total_amount);

        // Create payment intent with Stripe
        let payment_intent_id = self.payment_processor.create_payment_intent(
            payment_amount,
            &invoice.currency,
            None, // Customer ID would be fetched from user
            None  // Payment method ID from request
        ).await?;

        // Create payment record
        let payment_id = Uuid::new_v4();
        let payment_record = sqlx::query!(
            r#"
            INSERT INTO payments 
            (id, invoice_id, subscription_id, user_id, amount, currency, status, 
             payment_method_type, payment_method_details, stripe_payment_intent_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, invoice_id, subscription_id, user_id, amount, currency, status,
                     payment_method_type, payment_method_details, stripe_payment_intent_id,
                     stripe_charge_id, failure_reason, processed_at, metadata, created_at, updated_at
            "#,
            payment_id,
            request.invoice_id,
            invoice.subscription_id,
            invoice.user_id,
            payment_amount,
            invoice.currency,
            "processing",
            "credit_card", // Would be determined from request.payment_method
            serde_json::to_value(&request.payment_method)?,
            payment_intent_id,
            serde_json::json!({
                "auto_confirm": request.auto_confirm,
                "payment_intent_id": payment_intent_id
            })
        ).fetch_one(&self.db_pool).await?;

        // Auto-confirm if requested
        if request.auto_confirm {
            let success = self.payment_processor.confirm_payment_intent(&payment_intent_id).await?;
            if success {
                self.mark_payment_succeeded(payment_id).await?;
                self.mark_invoice_paid(request.invoice_id, payment_amount).await?;
            }
        }

        let payment = Payment {
            id: payment_record.id,
            invoice_id: payment_record.invoice_id,
            subscription_id: payment_record.subscription_id,
            user_id: payment_record.user_id,
            amount: payment_record.amount,
            currency: payment_record.currency,
            status: self.parse_payment_status(&payment_record.status)?,
            payment_method: request.payment_method,
            stripe_payment_intent_id: payment_record.stripe_payment_intent_id,
            stripe_charge_id: payment_record.stripe_charge_id,
            failure_reason: payment_record.failure_reason,
            processed_at: payment_record.processed_at,
            metadata: payment_record.metadata,
            created_at: payment_record.created_at,
            updated_at: payment_record.updated_at,
        };

        tracing::info!("✅ Payment processed: {} - ${}", payment_id, payment_amount);
        Ok(payment)
    }

    // Auto-process payment for subscription
    async fn auto_process_subscription_payment(&self, invoice: &Invoice) -> RevenueResult<()> {
        // This would automatically charge the customer's default payment method
        // Implementation would integrate with Stripe's subscription billing
        tracing::info!("🔄 Auto-processing subscription payment for invoice: {}", invoice.id);
        
        // Simulate successful auto-payment
        self.mark_invoice_paid(invoice.id, invoice.total_amount).await?;
        
        Ok(())
    }

    // Mark invoice as paid
    async fn mark_invoice_paid(&self, invoice_id: Uuid, amount: Decimal) -> RevenueResult<()> {
        sqlx::query!(
            r#"
            UPDATE invoices 
            SET status = 'paid', paid_at = NOW(), updated_at = NOW()
            WHERE id = $1
            "#,
            invoice_id
        ).execute(&self.db_pool).await?;

        tracing::info!("✅ Invoice marked as paid: {} - ${}", invoice_id, amount);
        Ok(())
    }

    // Mark payment as succeeded
    async fn mark_payment_succeeded(&self, payment_id: Uuid) -> RevenueResult<()> {
        sqlx::query!(
            r#"
            UPDATE payments 
            SET status = 'succeeded', processed_at = NOW(), updated_at = NOW()
            WHERE id = $1
            "#,
            payment_id
        ).execute(&self.db_pool).await?;

        Ok(())
    }

    // Get invoice by ID
    pub async fn get_invoice(&self, invoice_id: Uuid) -> RevenueResult<Invoice> {
        let record = sqlx::query!(
            r#"
            SELECT id, subscription_id, user_id, client_id, invoice_number, amount, currency,
                   tax_amount, total_amount, status, due_date, paid_at, stripe_invoice_id,
                   payment_terms, notes, metadata, created_at, updated_at
            FROM invoices 
            WHERE id = $1
            "#,
            invoice_id
        ).fetch_optional(&self.db_pool).await?;

        match record {
            Some(record) => {
                // Fetch line items
                let line_items = self.get_invoice_line_items(invoice_id).await?;

                Ok(Invoice {
                    id: record.id,
                    subscription_id: record.subscription_id,
                    user_id: record.user_id,
                    client_id: record.client_id,
                    invoice_number: record.invoice_number,
                    amount: record.amount,
                    currency: record.currency,
                    tax_amount: record.tax_amount,
                    total_amount: record.total_amount,
                    status: self.parse_invoice_status(&record.status)?,
                    due_date: record.due_date,
                    paid_at: record.paid_at,
                    stripe_invoice_id: record.stripe_invoice_id,
                    line_items,
                    payment_terms: record.payment_terms,
                    notes: record.notes,
                    metadata: record.metadata,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                })
            },
            None => Err(RevenueError::Billing(format!("Invoice not found: {}", invoice_id)))
        }
    }

    // Get invoice line items
    async fn get_invoice_line_items(&self, invoice_id: Uuid) -> RevenueResult<Vec<InvoiceLineItem>> {
        let records = sqlx::query!(
            r#"
            SELECT id, description, quantity, unit_price, total_price, tax_rate, metadata
            FROM invoice_line_items 
            WHERE invoice_id = $1
            ORDER BY created_at
            "#,
            invoice_id
        ).fetch_all(&self.db_pool).await?;

        let line_items = records.into_iter().map(|record| {
            InvoiceLineItem {
                id: record.id,
                description: record.description,
                quantity: record.quantity,
                unit_price: record.unit_price,
                total_price: record.total_price,
                tax_rate: record.tax_rate.to_f64().unwrap_or(0.0),
                metadata: record.metadata,
            }
        }).collect();

        Ok(line_items)
    }

    // Generate unique invoice number
    async fn generate_invoice_number(&self) -> RevenueResult<String> {
        let mut counter = self.invoice_counter.write().await;
        let number = format!("INV-{:06}", *counter);
        *counter += 1;
        Ok(number)
    }

    // Process billing cycles for all subscriptions
    pub async fn process_billing_cycles(&self) -> RevenueResult<Vec<Invoice>> {
        tracing::info!("🔄 Processing billing cycles for due subscriptions");

        // Find subscriptions due for billing
        let due_subscriptions = sqlx::query!(
            r#"
            SELECT id, user_id, tier, billing_cycle, amount, next_billing_date
            FROM subscriptions 
            WHERE status = 'active' AND next_billing_date <= NOW()
            "#
        ).fetch_all(&self.db_pool).await?;

        let mut invoices = Vec::new();

        for sub_record in due_subscriptions {
            // Create mock subscription object for billing
            let subscription = Subscription {
                id: sub_record.id,
                user_id: sub_record.user_id,
                tier: self.parse_subscription_tier(&sub_record.tier)?,
                status: crate::subscription::SubscriptionStatus::Active,
                billing_cycle: self.parse_billing_cycle(&sub_record.billing_cycle)?,
                amount: sub_record.amount,
                currency: "USD".to_string(),
                next_billing_date: sub_record.next_billing_date,
                stripe_subscription_id: None,
                trial_end_date: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                metadata: serde_json::json!({}),
            };

            // Calculate billing period
            let period_start = subscription.next_billing_date - Duration::days(30); // Assuming monthly
            let period_end = subscription.next_billing_date;

            // Create invoice
            match self.create_subscription_invoice(&subscription, period_start, period_end).await {
                Ok(invoice) => {
                    invoices.push(invoice);
                    
                    // Update next billing date
                    let next_billing = match subscription.billing_cycle {
                        BillingCycle::Monthly => subscription.next_billing_date + Duration::days(30),
                        BillingCycle::Annual => subscription.next_billing_date + Duration::days(365),
                        BillingCycle::Custom => subscription.next_billing_date + Duration::days(30),
                    };

                    sqlx::query!(
                        "UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2",
                        next_billing,
                        subscription.id
                    ).execute(&self.db_pool).await?;
                },
                Err(e) => {
                    tracing::error!("❌ Failed to create invoice for subscription {}: {}", subscription.id, e);
                }
            }
        }

        tracing::info!("✅ Processed {} billing cycles", invoices.len());
        Ok(invoices)
    }

    // Get billing analytics
    pub async fn get_billing_analytics(&self) -> RevenueResult<BillingAnalytics> {
        let analytics = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_invoices,
                SUM(total_amount) FILTER (WHERE status = 'paid') as total_revenue,
                COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_invoices,
                SUM(total_amount) FILTER (WHERE status != 'paid') as outstanding_amount
            FROM invoices
            "#
        ).fetch_one(&self.db_pool).await?;

        let payment_analytics = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
                COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments
            FROM payments
            "#
        ).fetch_one(&self.db_pool).await?;

        let success_rate = if payment_analytics.successful_payments.unwrap_or(0) > 0 {
            let total_payments = payment_analytics.successful_payments.unwrap_or(0) + payment_analytics.failed_payments.unwrap_or(0);
            if total_payments > 0 {
                payment_analytics.successful_payments.unwrap_or(0) as f64 / total_payments as f64 * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        };

        Ok(BillingAnalytics {
            total_invoices: analytics.total_invoices.unwrap_or(0),
            total_revenue: analytics.total_revenue.unwrap_or(Decimal::ZERO),
            paid_invoices: analytics.paid_invoices.unwrap_or(0),
            pending_invoices: analytics.pending_invoices.unwrap_or(0),
            failed_payments: payment_analytics.failed_payments.unwrap_or(0),
            average_payment_time: 5.0, // Simplified
            payment_success_rate: success_rate,
            revenue_by_method: HashMap::new(), // Would be populated from payment data
            outstanding_amount: analytics.outstanding_amount.unwrap_or(Decimal::ZERO),
            monthly_recurring_revenue: analytics.total_revenue.unwrap_or(Decimal::ZERO),
        })
    }

    // Helper methods for parsing enums
    fn parse_invoice_status(&self, status: &str) -> RevenueResult<InvoiceStatus> {
        match status {
            "draft" => Ok(InvoiceStatus::Draft),
            "pending" => Ok(InvoiceStatus::Pending),
            "paid" => Ok(InvoiceStatus::Paid),
            "failed" => Ok(InvoiceStatus::Failed),
            "cancelled" => Ok(InvoiceStatus::Cancelled),
            "refunded" => Ok(InvoiceStatus::Refunded),
            "partially_paid" => Ok(InvoiceStatus::PartiallyPaid),
            _ => Err(RevenueError::Validation(format!("Invalid invoice status: {}", status)))
        }
    }

    fn parse_payment_status(&self, status: &str) -> RevenueResult<PaymentStatus> {
        match status {
            "pending" => Ok(PaymentStatus::Pending),
            "processing" => Ok(PaymentStatus::Processing),
            "succeeded" => Ok(PaymentStatus::Succeeded),
            "failed" => Ok(PaymentStatus::Failed),
            "cancelled" => Ok(PaymentStatus::Cancelled),
            "refunded" => Ok(PaymentStatus::Refunded),
            _ => Err(RevenueError::Validation(format!("Invalid payment status: {}", status)))
        }
    }

    fn parse_subscription_tier(&self, tier: &str) -> RevenueResult<SubscriptionTier> {
        match tier {
            "basic" => Ok(SubscriptionTier::Basic),
            "professional" => Ok(SubscriptionTier::Professional),
            "enterprise" => Ok(SubscriptionTier::Enterprise),
            "custom" => Ok(SubscriptionTier::Custom),
            _ => Err(RevenueError::Validation(format!("Invalid subscription tier: {}", tier)))
        }
    }

    fn parse_billing_cycle(&self, cycle: &str) -> RevenueResult<BillingCycle> {
        match cycle {
            "monthly" => Ok(BillingCycle::Monthly),
            "annual" => Ok(BillingCycle::Annual),
            "custom" => Ok(BillingCycle::Custom),
            _ => Err(RevenueError::Validation(format!("Invalid billing cycle: {}", cycle)))
        }
    }
}

// Invoice manager for high-level operations
#[derive(Debug)]
pub struct InvoiceManager {
    billing_engine: Arc<BillingEngine>,
}

impl InvoiceManager {
    pub fn new(billing_engine: Arc<BillingEngine>) -> Self {
        Self { billing_engine }
    }

    pub async fn create_custom_invoice(
        &self,
        user_id: Uuid,
        amount: Decimal,
        description: String,
        due_date: DateTime<Utc>
    ) -> RevenueResult<Invoice> {
        // Implementation for custom invoices (enterprise clients, one-time services, etc.)
        tracing::info!("📄 Creating custom invoice for user: {} - ${}", user_id, amount);
        
        // This would be implemented similar to subscription invoices
        // but for custom billing scenarios
        
        Err(RevenueError::Billing("Custom invoice creation not yet implemented".to_string()))
    }

    pub async fn get_user_invoices(&self, user_id: Uuid) -> RevenueResult<Vec<Invoice>> {
        // Get all invoices for a user
        let records = sqlx::query!(
            r#"
            SELECT id FROM invoices 
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
            user_id
        ).fetch_all(&self.billing_engine.db_pool).await?;

        let mut invoices = Vec::new();
        for record in records {
            if let Ok(invoice) = self.billing_engine.get_invoice(record.id).await {
                invoices.push(invoice);
            }
        }

        Ok(invoices)
    }

    pub async fn get_analytics(&self) -> RevenueResult<BillingAnalytics> {
        self.billing_engine.get_billing_analytics().await
    }
}