// Enterprise Revenue System - High-Value Client Services & Custom Solutions
// Premium enterprise services, custody solutions, and OTC trading desk

use std::sync::Arc;
use std::collections::HashMap;
use sqlx::PgPool;
use redis::aio::ConnectionManager;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc, Duration};
use serde::{Serialize, Deserialize};

use crate::core::{RevenueError, RevenueResult};

// Enterprise service types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EnterpriseServiceType {
    CustodyServices,
    OTCTrading,
    WhiteLabelSolutions,
    CustomDevelopment,
    DedicatedInfrastructure,
    ComplianceServices,
    TechnicalSupport,
    SecurityAuditing,
    PerformanceOptimization,
    DataAnalytics,
}

// Enterprise contract tiers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EnterpriseContractTier {
    Standard,    // $25K - $100K annually
    Premium,     // $100K - $500K annually  
    Enterprise,  // $500K - $2M annually
    Custom,      // $2M+ annually
}

impl EnterpriseContractTier {
    pub fn minimum_annual_value(&self) -> Decimal {
        match self {
            Self::Standard => Decimal::new(25000, 0),
            Self::Premium => Decimal::new(100000, 0),
            Self::Enterprise => Decimal::new(500000, 0),
            Self::Custom => Decimal::new(2000000, 0),
        }
    }

    pub fn service_level_agreement(&self) -> &'static str {
        match self {
            Self::Standard => "99.5% uptime, 4-hour response",
            Self::Premium => "99.9% uptime, 2-hour response, dedicated support",
            Self::Enterprise => "99.95% uptime, 1-hour response, dedicated team",
            Self::Custom => "99.99% uptime, 15-minute response, 24/7 dedicated team",
        }
    }
}

// Enterprise contract
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseContract {
    pub id: Uuid,
    pub client_id: Uuid,
    pub client_name: String,
    pub contract_tier: EnterpriseContractTier,
    pub services: Vec<EnterpriseServiceType>,
    pub annual_value: Decimal,
    pub monthly_value: Decimal,
    pub payment_terms: PaymentTerms,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub auto_renewal: bool,
    pub status: ContractStatus,
    pub service_credits: Decimal,
    pub compliance_requirements: Vec<String>,
    pub dedicated_resources: Vec<DedicatedResource>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Payment terms
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaymentTerms {
    Monthly,
    Quarterly,
    Annual,
    Custom { schedule: String },
}

// Contract status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "contract_status", rename_all = "lowercase")]
pub enum ContractStatus {
    Draft,
    Active,
    Suspended,
    Terminated,
    Expired,
    Renewal,
}

// Dedicated resources
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DedicatedResource {
    pub resource_type: String,
    pub allocation: String,
    pub monthly_cost: Decimal,
}

// OTC trading order
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OTCTradingOrder {
    pub id: Uuid,
    pub client_id: Uuid,
    pub order_type: OTCOrderType,
    pub base_currency: String,
    pub quote_currency: String,
    pub amount: Decimal,
    pub price: Option<Decimal>,
    pub total_value: Decimal,
    pub commission_rate: Decimal,
    pub commission_amount: Decimal,
    pub status: OTCOrderStatus,
    pub execution_date: Option<DateTime<Utc>>,
    pub settlement_date: Option<DateTime<Utc>>,
    pub counterparty: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

// OTC order types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OTCOrderType {
    Buy,
    Sell,
    Swap,
    Block,
}

// OTC order status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "otc_order_status", rename_all = "lowercase")]
pub enum OTCOrderStatus {
    Pending,
    Quoted,
    Executed,
    Settled,
    Cancelled,
    Failed,
}

// Custody service record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustodyService {
    pub id: Uuid,
    pub client_id: Uuid,
    pub asset_type: String,
    pub total_assets_under_management: Decimal,
    pub custody_fee_rate: Decimal, // Annual percentage
    pub monthly_fee: Decimal,
    pub insurance_coverage: Decimal,
    pub storage_type: CustodyStorageType,
    pub security_level: SecurityLevel,
    pub compliance_framework: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CustodyStorageType {
    ColdStorage,
    HotWallet,
    MultiSig,
    HSM, // Hardware Security Module
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityLevel {
    Standard,
    Enhanced,
    Institutional,
    Military,
}

// Enterprise analytics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnterpriseAnalytics {
    pub total_contracts: i64,
    pub active_contracts: i64,
    pub total_annual_value: Decimal,
    pub monthly_recurring_revenue: Decimal,
    pub average_contract_value: Decimal,
    pub client_retention_rate: f64,
    pub revenue_by_service: HashMap<String, Decimal>,
    pub revenue_by_tier: HashMap<String, Decimal>,
    pub total_assets_under_custody: Decimal,
    pub otc_trading_volume: Decimal,
    pub service_utilization: HashMap<String, f64>,
}

// Enterprise revenue manager
#[derive(Debug)]
pub struct EnterpriseRevenueManager {
    db_pool: PgPool,
    redis: ConnectionManager,
}

impl EnterpriseRevenueManager {
    pub async fn new(db_pool: PgPool, redis: ConnectionManager) -> RevenueResult<Self> {
        // Setup enterprise tables
        Self::setup_enterprise_tables(&db_pool).await?;

        Ok(Self {
            db_pool,
            redis,
        })
    }

    async fn setup_enterprise_tables(pool: &PgPool) -> RevenueResult<()> {
        // Enterprise contracts table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS enterprise_contracts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL,
                client_name VARCHAR NOT NULL,
                contract_tier VARCHAR NOT NULL,
                services JSONB NOT NULL DEFAULT '[]',
                annual_value DECIMAL(15,2) NOT NULL,
                monthly_value DECIMAL(15,2) NOT NULL,
                payment_terms VARCHAR NOT NULL DEFAULT 'monthly',
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                auto_renewal BOOLEAN DEFAULT true,
                status VARCHAR NOT NULL DEFAULT 'active',
                service_credits DECIMAL(15,2) DEFAULT 0,
                compliance_requirements JSONB DEFAULT '[]',
                dedicated_resources JSONB DEFAULT '[]',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_client ON enterprise_contracts(client_id);
            CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_status ON enterprise_contracts(status);
            CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_tier ON enterprise_contracts(contract_tier);
            CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_dates ON enterprise_contracts(start_date, end_date);
        "#).execute(pool).await?;

        // OTC trading orders table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS otc_trading_orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL,
                order_type VARCHAR NOT NULL,
                base_currency VARCHAR NOT NULL,
                quote_currency VARCHAR NOT NULL,
                amount DECIMAL(30,18) NOT NULL,
                price DECIMAL(30,18),
                total_value DECIMAL(30,18) NOT NULL,
                commission_rate DECIMAL(8,6) NOT NULL,
                commission_amount DECIMAL(30,18) NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'pending',
                execution_date TIMESTAMP,
                settlement_date TIMESTAMP,
                counterparty VARCHAR,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_otc_orders_client ON otc_trading_orders(client_id);
            CREATE INDEX IF NOT EXISTS idx_otc_orders_status ON otc_trading_orders(status);
            CREATE INDEX IF NOT EXISTS idx_otc_orders_created ON otc_trading_orders(created_at);
        "#).execute(pool).await?;

        // Custody services table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS custody_services (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL,
                asset_type VARCHAR NOT NULL,
                total_aum DECIMAL(30,18) NOT NULL DEFAULT 0,
                custody_fee_rate DECIMAL(8,6) NOT NULL,
                monthly_fee DECIMAL(15,2) NOT NULL,
                insurance_coverage DECIMAL(30,18) NOT NULL DEFAULT 0,
                storage_type VARCHAR NOT NULL,
                security_level VARCHAR NOT NULL,
                compliance_framework JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_custody_services_client ON custody_services(client_id);
            CREATE INDEX IF NOT EXISTS idx_custody_services_asset ON custody_services(asset_type);
        "#).execute(pool).await?;

        // Enterprise revenue tracking
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS enterprise_revenue_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id UUID NOT NULL,
                contract_id UUID REFERENCES enterprise_contracts(id),
                event_type VARCHAR NOT NULL, -- 'contract_signed', 'payment_received', 'service_delivery', 'renewal'
                service_type VARCHAR,
                revenue_amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR NOT NULL DEFAULT 'USD',
                billing_period_start TIMESTAMP,
                billing_period_end TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_enterprise_revenue_client ON enterprise_revenue_events(client_id);
            CREATE INDEX IF NOT EXISTS idx_enterprise_revenue_contract ON enterprise_revenue_events(contract_id);
            CREATE INDEX IF NOT EXISTS idx_enterprise_revenue_type ON enterprise_revenue_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_enterprise_revenue_created ON enterprise_revenue_events(created_at);
        "#).execute(pool).await?;

        Ok(())
    }

    // Create enterprise contract
    pub async fn create_enterprise_contract(
        &self,
        client_id: Uuid,
        client_name: String,
        contract_tier: EnterpriseContractTier,
        services: Vec<EnterpriseServiceType>,
        annual_value: Decimal,
        start_date: DateTime<Utc>,
        duration_months: i32
    ) -> RevenueResult<EnterpriseContract> {
        tracing::info!("📋 Creating enterprise contract for {}: ${}/year", client_name, annual_value);

        // Validate minimum contract value
        if annual_value < contract_tier.minimum_annual_value() {
            return Err(RevenueError::Validation(
                format!("Contract value ${} below minimum ${} for {:?} tier",
                    annual_value, contract_tier.minimum_annual_value(), contract_tier)
            ));
        }

        let contract_id = Uuid::new_v4();
        let monthly_value = annual_value / Decimal::new(12, 0);
        let end_date = start_date + Duration::days((duration_months * 30) as i64);

        // Default dedicated resources based on tier
        let dedicated_resources = self.get_default_resources(&contract_tier, annual_value);

        let record = sqlx::query!(
            r#"
            INSERT INTO enterprise_contracts 
            (id, client_id, client_name, contract_tier, services, annual_value, monthly_value,
             start_date, end_date, compliance_requirements, dedicated_resources, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, client_id, client_name, contract_tier, services, annual_value, monthly_value,
                     payment_terms, start_date, end_date, auto_renewal, status, service_credits,
                     compliance_requirements, dedicated_resources, metadata, created_at, updated_at
            "#,
            contract_id,
            client_id,
            client_name,
            self.tier_to_string(&contract_tier),
            serde_json::to_value(&services)?,
            annual_value,
            monthly_value,
            start_date,
            end_date,
            serde_json::json!(["SOC2", "ISO27001"]), // Default compliance
            serde_json::to_value(&dedicated_resources)?,
            serde_json::json!({
                "tier_benefits": contract_tier.service_level_agreement(),
                "setup_fee": annual_value * Decimal::new(5, 2) // 5% setup fee
            })
        ).fetch_one(&self.db_pool).await?;

        // Log contract creation event
        self.log_revenue_event(
            client_id,
            Some(contract_id),
            "contract_signed",
            None,
            annual_value
        ).await?;

        let contract = EnterpriseContract {
            id: record.id,
            client_id: record.client_id,
            client_name: record.client_name,
            contract_tier,
            services,
            annual_value: record.annual_value,
            monthly_value: record.monthly_value,
            payment_terms: PaymentTerms::Monthly,
            start_date: record.start_date,
            end_date: record.end_date,
            auto_renewal: record.auto_renewal,
            status: self.parse_contract_status(&record.status)?,
            service_credits: record.service_credits,
            compliance_requirements: serde_json::from_value(record.compliance_requirements)?,
            dedicated_resources,
            metadata: record.metadata,
            created_at: record.created_at,
            updated_at: record.updated_at,
        };

        tracing::info!("✅ Enterprise contract created: {} - ${}/year", contract_id, annual_value);
        Ok(contract)
    }

    // Get default resources for contract tier
    fn get_default_resources(&self, tier: &EnterpriseContractTier, annual_value: Decimal) -> Vec<DedicatedResource> {
        match tier {
            EnterpriseContractTier::Standard => vec![
                DedicatedResource {
                    resource_type: "Support Engineer".to_string(),
                    allocation: "Shared Pool".to_string(),
                    monthly_cost: annual_value * Decimal::new(5, 4), // 0.5%
                }
            ],
            EnterpriseContractTier::Premium => vec![
                DedicatedResource {
                    resource_type: "Account Manager".to_string(),
                    allocation: "Dedicated".to_string(),
                    monthly_cost: annual_value * Decimal::new(10, 4), // 1%
                },
                DedicatedResource {
                    resource_type: "Technical Support".to_string(),
                    allocation: "Dedicated".to_string(),
                    monthly_cost: annual_value * Decimal::new(5, 4), // 0.5%
                }
            ],
            EnterpriseContractTier::Enterprise => vec![
                DedicatedResource {
                    resource_type: "Account Team".to_string(),
                    allocation: "Dedicated 3-person team".to_string(),
                    monthly_cost: annual_value * Decimal::new(15, 4), // 1.5%
                },
                DedicatedResource {
                    resource_type: "Infrastructure".to_string(),
                    allocation: "Dedicated cluster".to_string(),
                    monthly_cost: annual_value * Decimal::new(10, 4), // 1%
                }
            ],
            EnterpriseContractTier::Custom => vec![
                DedicatedResource {
                    resource_type: "Executive Team".to_string(),
                    allocation: "C-level engagement".to_string(),
                    monthly_cost: annual_value * Decimal::new(20, 4), // 2%
                },
                DedicatedResource {
                    resource_type: "Development Team".to_string(),
                    allocation: "Dedicated 5-person team".to_string(),
                    monthly_cost: annual_value * Decimal::new(25, 4), // 2.5%
                }
            ]
        }
    }

    // Process OTC trading order
    pub async fn process_otc_order(
        &self,
        client_id: Uuid,
        order_type: OTCOrderType,
        base_currency: String,
        quote_currency: String,
        amount: Decimal,
        price: Option<Decimal>
    ) -> RevenueResult<OTCTradingOrder> {
        tracing::info!("🏛️ Processing OTC order: {:?} {} {}", order_type, amount, base_currency);

        let order_id = Uuid::new_v4();
        
        // Calculate total value and commission
        let market_price = price.unwrap_or_else(|| self.get_market_price(&base_currency, &quote_currency));
        let total_value = amount * market_price;
        
        // Commission rates based on volume (tiered)
        let commission_rate = self.calculate_otc_commission_rate(total_value);
        let commission_amount = total_value * commission_rate;

        let record = sqlx::query!(
            r#"
            INSERT INTO otc_trading_orders 
            (id, client_id, order_type, base_currency, quote_currency, amount, price,
             total_value, commission_rate, commission_amount, status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, client_id, order_type, base_currency, quote_currency, amount, price,
                     total_value, commission_rate, commission_amount, status, execution_date,
                     settlement_date, counterparty, metadata, created_at
            "#,
            order_id,
            client_id,
            self.order_type_to_string(&order_type),
            base_currency,
            quote_currency,
            amount,
            price,
            total_value,
            commission_rate,
            commission_amount,
            "pending",
            serde_json::json!({
                "market_price": market_price,
                "order_priority": "high",
                "execution_venue": "internal"
            })
        ).fetch_one(&self.db_pool).await?;

        // Log revenue event
        self.log_revenue_event(
            client_id,
            None,
            "otc_commission",
            Some("OTCTrading"),
            commission_amount
        ).await?;

        let order = OTCTradingOrder {
            id: record.id,
            client_id: record.client_id,
            order_type,
            base_currency: record.base_currency,
            quote_currency: record.quote_currency,
            amount: record.amount,
            price: record.price,
            total_value: record.total_value,
            commission_rate: record.commission_rate,
            commission_amount: record.commission_amount,
            status: self.parse_otc_status(&record.status)?,
            execution_date: record.execution_date,
            settlement_date: record.settlement_date,
            counterparty: record.counterparty,
            metadata: record.metadata,
            created_at: record.created_at,
        };

        tracing::info!("✅ OTC order processed: {} - Commission: ${}", order_id, commission_amount);
        Ok(order)
    }

    // Calculate OTC commission rate based on volume
    fn calculate_otc_commission_rate(&self, total_value: Decimal) -> Decimal {
        if total_value >= Decimal::new(10000000, 0) {       // $10M+
            Decimal::new(10, 4)  // 0.10%
        } else if total_value >= Decimal::new(1000000, 0) { // $1M+
            Decimal::new(25, 4)  // 0.25%
        } else if total_value >= Decimal::new(100000, 0) {  // $100K+
            Decimal::new(50, 4)  // 0.50%
        } else {
            Decimal::new(100, 4) // 1.00%
        }
    }

    // Get market price (simplified - would integrate with price feeds)
    fn get_market_price(&self, _base: &str, _quote: &str) -> Decimal {
        Decimal::new(45000, 0) // Simplified market price
    }

    // Setup custody service
    pub async fn setup_custody_service(
        &self,
        client_id: Uuid,
        asset_type: String,
        custody_fee_rate: Decimal,
        insurance_coverage: Decimal,
        storage_type: CustodyStorageType,
        security_level: SecurityLevel
    ) -> RevenueResult<CustodyService> {
        tracing::info!("🔐 Setting up custody service for client: {} - Asset: {}", client_id, asset_type);

        let service_id = Uuid::new_v4();
        let monthly_fee = custody_fee_rate * Decimal::new(10000, 0); // Base monthly fee

        let record = sqlx::query!(
            r#"
            INSERT INTO custody_services 
            (id, client_id, asset_type, custody_fee_rate, monthly_fee, insurance_coverage,
             storage_type, security_level, compliance_framework)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, client_id, asset_type, total_aum, custody_fee_rate, monthly_fee,
                     insurance_coverage, storage_type, security_level, compliance_framework, created_at
            "#,
            service_id,
            client_id,
            asset_type,
            custody_fee_rate,
            monthly_fee,
            insurance_coverage,
            self.storage_type_to_string(&storage_type),
            self.security_level_to_string(&security_level),
            serde_json::json!(["SOC2", "ISO27001", "FIPS140-2"])
        ).fetch_one(&self.db_pool).await?;

        let service = CustodyService {
            id: record.id,
            client_id: record.client_id,
            asset_type: record.asset_type,
            total_assets_under_management: record.total_aum,
            custody_fee_rate: record.custody_fee_rate,
            monthly_fee: record.monthly_fee,
            insurance_coverage: record.insurance_coverage,
            storage_type,
            security_level,
            compliance_framework: serde_json::from_value(record.compliance_framework)?,
            created_at: record.created_at,
        };

        tracing::info!("✅ Custody service setup: {} - Monthly fee: ${}", service_id, monthly_fee);
        Ok(service)
    }

    // Log revenue event
    async fn log_revenue_event(
        &self,
        client_id: Uuid,
        contract_id: Option<Uuid>,
        event_type: &str,
        service_type: Option<&str>,
        amount: Decimal
    ) -> RevenueResult<()> {
        sqlx::query!(
            r#"
            INSERT INTO enterprise_revenue_events 
            (client_id, contract_id, event_type, service_type, revenue_amount)
            VALUES ($1, $2, $3, $4, $5)
            "#,
            client_id,
            contract_id,
            event_type,
            service_type,
            amount
        ).execute(&self.db_pool).await?;

        Ok(())
    }

    // Get enterprise analytics
    pub async fn get_enterprise_analytics(&self) -> RevenueResult<EnterpriseAnalytics> {
        // Contract analytics
        let contract_stats = sqlx::query!(
            r#"
            SELECT 
                COUNT(*) as total_contracts,
                COUNT(*) FILTER (WHERE status = 'active') as active_contracts,
                SUM(annual_value) as total_annual_value,
                SUM(monthly_value) as monthly_recurring_revenue,
                AVG(annual_value) as average_contract_value
            FROM enterprise_contracts
            "#
        ).fetch_one(&self.db_pool).await?;

        // Revenue by service type
        let service_revenue = sqlx::query!(
            r#"
            SELECT 
                service_type,
                SUM(revenue_amount) as revenue
            FROM enterprise_revenue_events 
            WHERE service_type IS NOT NULL
            GROUP BY service_type
            "#
        ).fetch_all(&self.db_pool).await?;

        let revenue_by_service = service_revenue.into_iter()
            .map(|row| (row.service_type.unwrap_or_default(), row.revenue.unwrap_or(Decimal::ZERO)))
            .collect();

        // Revenue by tier
        let tier_revenue = sqlx::query!(
            r#"
            SELECT 
                contract_tier,
                SUM(monthly_value) as revenue
            FROM enterprise_contracts 
            WHERE status = 'active'
            GROUP BY contract_tier
            "#
        ).fetch_all(&self.db_pool).await?;

        let revenue_by_tier = tier_revenue.into_iter()
            .map(|row| (row.contract_tier, row.revenue.unwrap_or(Decimal::ZERO)))
            .collect();

        // Total assets under custody
        let custody_stats = sqlx::query!(
            r#"
            SELECT SUM(total_aum) as total_aum
            FROM custody_services
            "#
        ).fetch_one(&self.db_pool).await?;

        // OTC trading volume
        let otc_volume = sqlx::query!(
            r#"
            SELECT SUM(total_value) as volume
            FROM otc_trading_orders 
            WHERE status = 'executed'
              AND created_at >= DATE_TRUNC('month', NOW())
            "#
        ).fetch_one(&self.db_pool).await?;

        Ok(EnterpriseAnalytics {
            total_contracts: contract_stats.total_contracts.unwrap_or(0),
            active_contracts: contract_stats.active_contracts.unwrap_or(0),
            total_annual_value: contract_stats.total_annual_value.unwrap_or(Decimal::ZERO),
            monthly_recurring_revenue: contract_stats.monthly_recurring_revenue.unwrap_or(Decimal::ZERO),
            average_contract_value: contract_stats.average_contract_value.unwrap_or(Decimal::ZERO),
            client_retention_rate: 95.0, // Simplified
            revenue_by_service,
            revenue_by_tier,
            total_assets_under_custody: custody_stats.total_aum.unwrap_or(Decimal::ZERO),
            otc_trading_volume: otc_volume.volume.unwrap_or(Decimal::ZERO),
            service_utilization: HashMap::new(), // Would be calculated from service usage
        })
    }

    // Helper methods for enum conversions
    fn tier_to_string(&self, tier: &EnterpriseContractTier) -> String {
        match tier {
            EnterpriseContractTier::Standard => "standard".to_string(),
            EnterpriseContractTier::Premium => "premium".to_string(),
            EnterpriseContractTier::Enterprise => "enterprise".to_string(),
            EnterpriseContractTier::Custom => "custom".to_string(),
        }
    }

    fn order_type_to_string(&self, order_type: &OTCOrderType) -> String {
        match order_type {
            OTCOrderType::Buy => "buy".to_string(),
            OTCOrderType::Sell => "sell".to_string(),
            OTCOrderType::Swap => "swap".to_string(),
            OTCOrderType::Block => "block".to_string(),
        }
    }

    fn storage_type_to_string(&self, storage_type: &CustodyStorageType) -> String {
        match storage_type {
            CustodyStorageType::ColdStorage => "cold_storage".to_string(),
            CustodyStorageType::HotWallet => "hot_wallet".to_string(),
            CustodyStorageType::MultiSig => "multisig".to_string(),
            CustodyStorageType::HSM => "hsm".to_string(),
        }
    }

    fn security_level_to_string(&self, level: &SecurityLevel) -> String {
        match level {
            SecurityLevel::Standard => "standard".to_string(),
            SecurityLevel::Enhanced => "enhanced".to_string(),
            SecurityLevel::Institutional => "institutional".to_string(),
            SecurityLevel::Military => "military".to_string(),
        }
    }

    fn parse_contract_status(&self, status: &str) -> RevenueResult<ContractStatus> {
        match status {
            "draft" => Ok(ContractStatus::Draft),
            "active" => Ok(ContractStatus::Active),
            "suspended" => Ok(ContractStatus::Suspended),
            "terminated" => Ok(ContractStatus::Terminated),
            "expired" => Ok(ContractStatus::Expired),
            "renewal" => Ok(ContractStatus::Renewal),
            _ => Err(RevenueError::Validation(format!("Invalid contract status: {}", status)))
        }
    }

    fn parse_otc_status(&self, status: &str) -> RevenueResult<OTCOrderStatus> {
        match status {
            "pending" => Ok(OTCOrderStatus::Pending),
            "quoted" => Ok(OTCOrderStatus::Quoted),
            "executed" => Ok(OTCOrderStatus::Executed),
            "settled" => Ok(OTCOrderStatus::Settled),
            "cancelled" => Ok(OTCOrderStatus::Cancelled),
            "failed" => Ok(OTCOrderStatus::Failed),
            _ => Err(RevenueError::Validation(format!("Invalid OTC order status: {}", status)))
        }
    }
}

// Custody service for institutional-grade asset management
#[derive(Debug)]
pub struct CustodyService {
    enterprise_manager: Arc<EnterpriseRevenueManager>,
}

impl CustodyService {
    pub fn new(enterprise_manager: Arc<EnterpriseRevenueManager>) -> Self {
        Self { enterprise_manager }
    }

    // Update assets under management and calculate fees
    pub async fn update_assets_under_management(
        &self,
        client_id: Uuid,
        asset_type: &str,
        new_aum: Decimal
    ) -> RevenueResult<Decimal> {
        // Update AUM in database
        let result = sqlx::query!(
            r#"
            UPDATE custody_services 
            SET total_aum = $1, updated_at = NOW()
            WHERE client_id = $2 AND asset_type = $3
            RETURNING custody_fee_rate
            "#,
            new_aum,
            client_id,
            asset_type
        ).fetch_one(&self.enterprise_manager.db_pool).await?;

        // Calculate monthly fee based on AUM
        let monthly_fee = new_aum * result.custody_fee_rate / Decimal::new(12, 0) / Decimal::new(100, 0);

        // Log revenue event
        self.enterprise_manager.log_revenue_event(
            client_id,
            None,
            "custody_fee",
            Some("CustodyServices"),
            monthly_fee
        ).await?;

        tracing::info!("📊 Updated AUM for {}: ${} - Monthly fee: ${}", client_id, new_aum, monthly_fee);
        Ok(monthly_fee)
    }
}

// OTC trading desk for large transactions
#[derive(Debug)]
pub struct OTCTradingDesk {
    enterprise_manager: Arc<EnterpriseRevenueManager>,
}

impl OTCTradingDesk {
    pub fn new(enterprise_manager: Arc<EnterpriseRevenueManager>) -> Self {
        Self { enterprise_manager }
    }

    // Execute OTC order
    pub async fn execute_order(&self, order_id: Uuid) -> RevenueResult<()> {
        sqlx::query!(
            r#"
            UPDATE otc_trading_orders 
            SET status = 'executed', execution_date = NOW()
            WHERE id = $1
            "#,
            order_id
        ).execute(&self.enterprise_manager.db_pool).await?;

        tracing::info!("✅ OTC order executed: {}", order_id);
        Ok(())
    }

    // Get daily trading volume
    pub async fn get_daily_volume(&self) -> RevenueResult<Decimal> {
        let result = sqlx::query!(
            r#"
            SELECT SUM(total_value) as daily_volume
            FROM otc_trading_orders 
            WHERE status = 'executed'
              AND execution_date >= CURRENT_DATE
            "#
        ).fetch_one(&self.enterprise_manager.db_pool).await?;

        Ok(result.daily_volume.unwrap_or(Decimal::ZERO))
    }
}