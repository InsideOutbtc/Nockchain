// Configuration management for mining pool
// Handles environment variables, file configs, and validation

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database_url: String,
    pub redis_url: String,
    pub mining: MiningConfig,
    pub payout: PayoutConfig,
    pub security: SecurityConfig,
    pub metrics: MetricsConfig,
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
    pub max_connections: usize,
    pub keep_alive: Duration,
    pub request_timeout: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiningConfig {
    pub pool_fee: f64,
    pub minimum_difficulty: u64,
    pub maximum_difficulty: u64,
    pub target_block_time: Duration,
    pub difficulty_adjustment_interval: Duration,
    pub share_window_size: usize,
    pub vardiff_enabled: bool,
    pub vardiff_target_time: Duration,
    pub vardiff_retarget_time: Duration,
    pub vardiff_variance_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayoutConfig {
    pub scheme: PayoutScheme,
    pub minimum_payout: f64,
    pub payout_interval: Duration,
    pub transaction_fee: f64,
    pub auto_payout_enabled: bool,
    pub max_pending_payouts: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PayoutScheme {
    PPS,    // Pay Per Share
    PPLNS,  // Pay Per Last N Shares
    SOLO,   // Solo mining
    HYBRID, // Hybrid approach
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub max_shares_per_second: usize,
    pub ban_threshold: usize,
    pub ban_duration: Duration,
    pub ddos_protection: bool,
    pub rate_limit_window: Duration,
    pub max_connections_per_ip: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub prometheus_port: u16,
    pub collection_interval: Duration,
    pub retention_period: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub format: String,
    pub file_enabled: bool,
    pub file_path: Option<String>,
    pub rotation_size: Option<u64>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok(); // Load .env file if present

        let config = Config {
            server: ServerConfig {
                host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
                port: std::env::var("PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .context("Invalid PORT")?,
                workers: std::env::var("WORKERS")
                    .unwrap_or_else(|_| num_cpus::get().to_string())
                    .parse()
                    .context("Invalid WORKERS")?,
                max_connections: std::env::var("MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "10000".to_string())
                    .parse()
                    .context("Invalid MAX_CONNECTIONS")?,
                keep_alive: Duration::from_secs(
                    std::env::var("KEEP_ALIVE_SECONDS")
                        .unwrap_or_else(|_| "75".to_string())
                        .parse()
                        .context("Invalid KEEP_ALIVE_SECONDS")?
                ),
                request_timeout: Duration::from_secs(
                    std::env::var("REQUEST_TIMEOUT_SECONDS")
                        .unwrap_or_else(|_| "30".to_string())
                        .parse()
                        .context("Invalid REQUEST_TIMEOUT_SECONDS")?
                ),
            },

            database_url: std::env::var("DATABASE_URL")
                .context("DATABASE_URL must be set")?,

            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),

            mining: MiningConfig {
                pool_fee: std::env::var("POOL_FEE")
                    .unwrap_or_else(|_| "0.025".to_string())
                    .parse()
                    .context("Invalid POOL_FEE")?,
                minimum_difficulty: std::env::var("MIN_DIFFICULTY")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()
                    .context("Invalid MIN_DIFFICULTY")?,
                maximum_difficulty: std::env::var("MAX_DIFFICULTY")
                    .unwrap_or_else(|_| "1000000000".to_string())
                    .parse()
                    .context("Invalid MAX_DIFFICULTY")?,
                target_block_time: Duration::from_secs(
                    std::env::var("TARGET_BLOCK_TIME")
                        .unwrap_or_else(|_| "120".to_string())
                        .parse()
                        .context("Invalid TARGET_BLOCK_TIME")?
                ),
                difficulty_adjustment_interval: Duration::from_secs(
                    std::env::var("DIFFICULTY_ADJUSTMENT_INTERVAL")
                        .unwrap_or_else(|_| "600".to_string())
                        .parse()
                        .context("Invalid DIFFICULTY_ADJUSTMENT_INTERVAL")?
                ),
                share_window_size: std::env::var("SHARE_WINDOW_SIZE")
                    .unwrap_or_else(|_| "8192".to_string())
                    .parse()
                    .context("Invalid SHARE_WINDOW_SIZE")?,
                vardiff_enabled: std::env::var("VARDIFF_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .context("Invalid VARDIFF_ENABLED")?,
                vardiff_target_time: Duration::from_secs(
                    std::env::var("VARDIFF_TARGET_TIME")
                        .unwrap_or_else(|_| "15".to_string())
                        .parse()
                        .context("Invalid VARDIFF_TARGET_TIME")?
                ),
                vardiff_retarget_time: Duration::from_secs(
                    std::env::var("VARDIFF_RETARGET_TIME")
                        .unwrap_or_else(|_| "90".to_string())
                        .parse()
                        .context("Invalid VARDIFF_RETARGET_TIME")?
                ),
                vardiff_variance_percent: std::env::var("VARDIFF_VARIANCE_PERCENT")
                    .unwrap_or_else(|_| "30.0".to_string())
                    .parse()
                    .context("Invalid VARDIFF_VARIANCE_PERCENT")?,
            },

            payout: PayoutConfig {
                scheme: match std::env::var("PAYOUT_SCHEME")
                    .unwrap_or_else(|_| "PPLNS".to_string())
                    .to_uppercase()
                    .as_str() {
                    "PPS" => PayoutScheme::PPS,
                    "PPLNS" => PayoutScheme::PPLNS,
                    "SOLO" => PayoutScheme::SOLO,
                    "HYBRID" => PayoutScheme::HYBRID,
                    _ => PayoutScheme::PPLNS,
                },
                minimum_payout: std::env::var("MINIMUM_PAYOUT")
                    .unwrap_or_else(|_| "10.0".to_string())
                    .parse()
                    .context("Invalid MINIMUM_PAYOUT")?,
                payout_interval: Duration::from_secs(
                    std::env::var("PAYOUT_INTERVAL_SECONDS")
                        .unwrap_or_else(|_| "3600".to_string())
                        .parse()
                        .context("Invalid PAYOUT_INTERVAL_SECONDS")?
                ),
                transaction_fee: std::env::var("TRANSACTION_FEE")
                    .unwrap_or_else(|_| "0.001".to_string())
                    .parse()
                    .context("Invalid TRANSACTION_FEE")?,
                auto_payout_enabled: std::env::var("AUTO_PAYOUT_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .context("Invalid AUTO_PAYOUT_ENABLED")?,
                max_pending_payouts: std::env::var("MAX_PENDING_PAYOUTS")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()
                    .context("Invalid MAX_PENDING_PAYOUTS")?,
            },

            security: SecurityConfig {
                max_shares_per_second: std::env::var("MAX_SHARES_PER_SECOND")
                    .unwrap_or_else(|_| "10".to_string())
                    .parse()
                    .context("Invalid MAX_SHARES_PER_SECOND")?,
                ban_threshold: std::env::var("BAN_THRESHOLD")
                    .unwrap_or_else(|_| "100".to_string())
                    .parse()
                    .context("Invalid BAN_THRESHOLD")?,
                ban_duration: Duration::from_secs(
                    std::env::var("BAN_DURATION_SECONDS")
                        .unwrap_or_else(|_| "3600".to_string())
                        .parse()
                        .context("Invalid BAN_DURATION_SECONDS")?
                ),
                ddos_protection: std::env::var("DDOS_PROTECTION")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .context("Invalid DDOS_PROTECTION")?,
                rate_limit_window: Duration::from_secs(
                    std::env::var("RATE_LIMIT_WINDOW_SECONDS")
                        .unwrap_or_else(|_| "60".to_string())
                        .parse()
                        .context("Invalid RATE_LIMIT_WINDOW_SECONDS")?
                ),
                max_connections_per_ip: std::env::var("MAX_CONNECTIONS_PER_IP")
                    .unwrap_or_else(|_| "10".to_string())
                    .parse()
                    .context("Invalid MAX_CONNECTIONS_PER_IP")?,
            },

            metrics: MetricsConfig {
                enabled: std::env::var("METRICS_ENABLED")
                    .unwrap_or_else(|_| "true".to_string())
                    .parse()
                    .context("Invalid METRICS_ENABLED")?,
                prometheus_port: std::env::var("PROMETHEUS_PORT")
                    .unwrap_or_else(|_| "9090".to_string())
                    .parse()
                    .context("Invalid PROMETHEUS_PORT")?,
                collection_interval: Duration::from_secs(
                    std::env::var("METRICS_COLLECTION_INTERVAL")
                        .unwrap_or_else(|_| "10".to_string())
                        .parse()
                        .context("Invalid METRICS_COLLECTION_INTERVAL")?
                ),
                retention_period: Duration::from_secs(
                    std::env::var("METRICS_RETENTION_SECONDS")
                        .unwrap_or_else(|_| "604800".to_string()) // 7 days
                        .parse()
                        .context("Invalid METRICS_RETENTION_SECONDS")?
                ),
            },

            logging: LoggingConfig {
                level: std::env::var("LOG_LEVEL")
                    .unwrap_or_else(|_| "info".to_string()),
                format: std::env::var("LOG_FORMAT")
                    .unwrap_or_else(|_| "json".to_string()),
                file_enabled: std::env::var("LOG_FILE_ENABLED")
                    .unwrap_or_else(|_| "false".to_string())
                    .parse()
                    .context("Invalid LOG_FILE_ENABLED")?,
                file_path: std::env::var("LOG_FILE_PATH").ok(),
                rotation_size: std::env::var("LOG_ROTATION_SIZE")
                    .ok()
                    .and_then(|s| s.parse().ok()),
            },
        };

        // Validate configuration
        config.validate()?;

        Ok(config)
    }

    fn validate(&self) -> Result<()> {
        // Validate server configuration
        if self.server.port == 0 {
            anyhow::bail!("Server port cannot be 0");
        }

        if self.server.max_connections == 0 {
            anyhow::bail!("Max connections must be greater than 0");
        }

        // Validate mining configuration
        if self.mining.pool_fee < 0.0 || self.mining.pool_fee > 1.0 {
            anyhow::bail!("Pool fee must be between 0.0 and 1.0");
        }

        if self.mining.minimum_difficulty >= self.mining.maximum_difficulty {
            anyhow::bail!("Minimum difficulty must be less than maximum difficulty");
        }

        // Validate payout configuration
        if self.payout.minimum_payout <= 0.0 {
            anyhow::bail!("Minimum payout must be greater than 0");
        }

        if self.payout.transaction_fee < 0.0 {
            anyhow::bail!("Transaction fee cannot be negative");
        }

        // Validate security configuration
        if self.security.max_shares_per_second == 0 {
            anyhow::bail!("Max shares per second must be greater than 0");
        }

        if self.security.max_connections_per_ip == 0 {
            anyhow::bail!("Max connections per IP must be greater than 0");
        }

        Ok(())
    }

    pub fn is_development(&self) -> bool {
        std::env::var("NODE_ENV").unwrap_or_default() == "development"
    }

    pub fn is_production(&self) -> bool {
        std::env::var("NODE_ENV").unwrap_or_default() == "production"
    }
}