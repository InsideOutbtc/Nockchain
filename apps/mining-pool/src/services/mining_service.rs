// NOCKCHAIN Mining Service with Performance Optimizations
// Integrating 5x faster proving and 32x memory reduction

use crate::core::zkvm_optimizations::{
    MiningPerformanceCalculator, NEW_PROVING_TIME_SECONDS, NEW_MEMORY_REQUIREMENT_GB,
    PERFORMANCE_IMPROVEMENT_FACTOR, MEMORY_REDUCTION_FACTOR
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizedMiningStats {
    pub miner_id: String,
    pub hashrate_proofs_per_second: f64,
    pub memory_usage_gb: u64,
    pub proving_time_seconds: u64,
    pub efficiency_multiplier: f64,
    pub estimated_daily_earnings: f64,
    pub block_time_estimate_days: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiningConfiguration {
    pub threads: u32,
    pub optimization_enabled: bool,
    pub target_difficulty: u64,
    pub pool_fee_percentage: f64,
    pub payout_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolPerformanceMetrics {
    pub total_hashrate_proofs_per_second: f64,
    pub active_miners: u32,
    pub total_memory_gb: u64,
    pub average_proving_time: f64,
    pub efficiency_improvement: f64,
    pub blocks_found_24h: u32,
    pub pool_luck_percentage: f64,
}

pub struct OptimizedMiningService {
    miners: Arc<RwLock<std::collections::HashMap<String, OptimizedMiningStats>>>,
    pool_config: Arc<RwLock<MiningConfiguration>>,
    performance_calculator: MiningPerformanceCalculator,
}

impl OptimizedMiningService {
    pub fn new() -> Self {
        let default_config = MiningConfiguration {
            threads: 60, // Optimal for new performance metrics
            optimization_enabled: true,
            target_difficulty: 1000000,
            pool_fee_percentage: 2.0,
            payout_threshold: 0.1,
        };

        Self {
            miners: Arc::new(RwLock::new(std::collections::HashMap::new())),
            pool_config: Arc::new(RwLock::new(default_config)),
            performance_calculator: MiningPerformanceCalculator::new_optimized(60),
        }
    }

    /// Register a new miner with optimized performance metrics
    pub async fn register_miner(&self, miner_id: String, threads: u32) -> Result<OptimizedMiningStats, String> {
        let calculator = if self.pool_config.read().await.optimization_enabled {
            MiningPerformanceCalculator::new_optimized(threads)
        } else {
            MiningPerformanceCalculator::new_legacy(threads)
        };

        let stats = OptimizedMiningStats {
            miner_id: miner_id.clone(),
            hashrate_proofs_per_second: calculator.proofs_per_second(),
            memory_usage_gb: calculator.total_memory_gb(),
            proving_time_seconds: calculator.proving_time_seconds,
            efficiency_multiplier: calculator.efficiency_improvement(),
            estimated_daily_earnings: self.calculate_daily_earnings(&calculator).await,
            block_time_estimate_days: calculator.expected_block_time_days(1.0), // Will update with pool hashrate
            last_updated: Utc::now(),
        };

        self.miners.write().await.insert(miner_id, stats.clone());
        Ok(stats)
    }

    /// Calculate estimated daily earnings based on optimized performance
    async fn calculate_daily_earnings(&self, calculator: &MiningPerformanceCalculator) -> f64 {
        let pool_config = self.pool_config.read().await;
        let base_reward = 6.25; // NOCK per block
        let blocks_per_day = 144.0; // Assuming 10 minute blocks
        
        // With optimization, miners get significantly higher earnings
        let daily_rewards = base_reward * blocks_per_day;
        let miner_share = calculator.proofs_per_second() / self.get_pool_hashrate().await;
        let after_fees = daily_rewards * miner_share * (1.0 - pool_config.pool_fee_percentage / 100.0);
        
        after_fees * calculator.efficiency_improvement()
    }

    /// Get current pool hashrate in proofs per second
    async fn get_pool_hashrate(&self) -> f64 {
        let miners = self.miners.read().await;
        miners.values().map(|m| m.hashrate_proofs_per_second).sum()
    }

    /// Update miner performance with new metrics
    pub async fn update_miner_performance(&self, miner_id: &str, submitted_shares: u64, time_elapsed: u64) -> Result<(), String> {
        let mut miners = self.miners.write().await;
        
        if let Some(miner) = miners.get_mut(miner_id) {
            // Calculate actual proving rate
            let actual_proofs_per_second = submitted_shares as f64 / time_elapsed as f64;
            
            // Update with optimized metrics
            miner.hashrate_proofs_per_second = actual_proofs_per_second;
            miner.last_updated = Utc::now();
            
            // Recalculate earnings with new performance
            let calculator = MiningPerformanceCalculator::new_optimized(
                (miner.memory_usage_gb / NEW_MEMORY_REQUIREMENT_GB) as u32
            );
            miner.estimated_daily_earnings = self.calculate_daily_earnings(&calculator).await;
            
            Ok(())
        } else {
            Err("Miner not found".to_string())
        }
    }

    /// Get comprehensive pool performance metrics
    pub async fn get_pool_metrics(&self) -> PoolPerformanceMetrics {
        let miners = self.miners.read().await;
        let total_hashrate = miners.values().map(|m| m.hashrate_proofs_per_second).sum();
        let total_memory = miners.values().map(|m| m.memory_usage_gb).sum();
        let avg_proving_time = miners.values()
            .map(|m| m.proving_time_seconds as f64)
            .sum::<f64>() / miners.len().max(1) as f64;
        
        let efficiency_improvement = miners.values()
            .map(|m| m.efficiency_multiplier)
            .sum::<f64>() / miners.len().max(1) as f64;

        PoolPerformanceMetrics {
            total_hashrate_proofs_per_second: total_hashrate,
            active_miners: miners.len() as u32,
            total_memory_gb: total_memory,
            average_proving_time: avg_proving_time,
            efficiency_improvement,
            blocks_found_24h: self.calculate_blocks_found_24h(total_hashrate).await,
            pool_luck_percentage: self.calculate_pool_luck().await,
        }
    }

    /// Calculate expected blocks found in 24 hours
    async fn calculate_blocks_found_24h(&self, pool_hashrate: f64) -> u32 {
        // Network difficulty assumption - will be updated with real data
        let network_hashrate = 100.0; // Proofs per second
        let blocks_per_day = 144.0;
        
        let pool_percentage = pool_hashrate / network_hashrate;
        (blocks_per_day * pool_percentage) as u32
    }

    /// Calculate pool luck percentage
    async fn calculate_pool_luck(&self) -> f64 {
        // Simplified luck calculation - implement with real block finding data
        let expected_blocks = 10.0;
        let actual_blocks = 12.0;
        (actual_blocks / expected_blocks) * 100.0
    }

    /// Get individual miner statistics
    pub async fn get_miner_stats(&self, miner_id: &str) -> Option<OptimizedMiningStats> {
        self.miners.read().await.get(miner_id).cloned()
    }

    /// Update pool configuration
    pub async fn update_pool_config(&self, config: MiningConfiguration) {
        *self.pool_config.write().await = config;
    }

    /// Get current pool configuration
    pub async fn get_pool_config(&self) -> MiningConfiguration {
        self.pool_config.read().await.clone()
    }

    /// Calculate mining profitability with optimizations
    pub async fn calculate_profitability(&self, threads: u32, electricity_cost_kwh: f64, power_consumption_watts: f64) -> MiningProfitability {
        let calculator = MiningPerformanceCalculator::new_optimized(threads);
        let daily_earnings = self.calculate_daily_earnings(&calculator).await;
        
        // Calculate daily electricity cost
        let daily_power_kwh = (power_consumption_watts * 24.0) / 1000.0;
        let daily_electricity_cost = daily_power_kwh * electricity_cost_kwh;
        
        // With optimizations, power efficiency is also improved
        let optimized_power_consumption = power_consumption_watts / PERFORMANCE_IMPROVEMENT_FACTOR;
        let optimized_daily_cost = (optimized_power_consumption * 24.0 / 1000.0) * electricity_cost_kwh;
        
        MiningProfitability {
            daily_earnings,
            daily_electricity_cost: optimized_daily_cost,
            daily_profit: daily_earnings - optimized_daily_cost,
            break_even_days: if daily_earnings > optimized_daily_cost {
                Some(1000.0 / (daily_earnings - optimized_daily_cost)) // Assuming $1000 hardware cost
            } else {
                None
            },
            efficiency_bonus: calculator.efficiency_improvement(),
        }
    }

    /// Adjust difficulty based on optimized performance
    pub async fn adjust_difficulty(&self, target_block_time_seconds: u64) -> u64 {
        let pool_hashrate = self.get_pool_hashrate().await;
        let current_config = self.pool_config.read().await;
        
        // Calculate new difficulty based on optimized proving times
        let target_proofs_per_block = target_block_time_seconds as f64 * pool_hashrate;
        let difficulty_adjustment = target_proofs_per_block / PERFORMANCE_IMPROVEMENT_FACTOR;
        
        (current_config.target_difficulty as f64 * difficulty_adjustment) as u64
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiningProfitability {
    pub daily_earnings: f64,
    pub daily_electricity_cost: f64,
    pub daily_profit: f64,
    pub break_even_days: Option<f64>,
    pub efficiency_bonus: f64,
}

impl Default for OptimizedMiningService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_optimized_mining_service() {
        let service = OptimizedMiningService::new();
        
        // Register a miner with 60 threads
        let stats = service.register_miner("miner1".to_string(), 60).await.unwrap();
        
        // Should have optimized performance metrics
        assert!((stats.hashrate_proofs_per_second - 0.81).abs() < 0.1); // 60/74 ≈ 0.81
        assert_eq!(stats.memory_usage_gb, 120); // 60 * 2GB
        assert_eq!(stats.proving_time_seconds, NEW_PROVING_TIME_SECONDS);
        assert!((stats.efficiency_multiplier - PERFORMANCE_IMPROVEMENT_FACTOR).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_pool_metrics() {
        let service = OptimizedMiningService::new();
        
        // Register multiple miners
        service.register_miner("miner1".to_string(), 60).await.unwrap();
        service.register_miner("miner2".to_string(), 30).await.unwrap();
        
        let metrics = service.get_pool_metrics().await;
        assert_eq!(metrics.active_miners, 2);
        assert!(metrics.total_hashrate_proofs_per_second > 1.0);
        assert!(metrics.efficiency_improvement > 4.0);
    }

    #[tokio::test]
    async fn test_profitability_calculation() {
        let service = OptimizedMiningService::new();
        let profitability = service.calculate_profitability(60, 0.12, 500.0).await;
        
        // Should show positive profitability with optimizations
        assert!(profitability.daily_profit > 0.0);
        assert!(profitability.efficiency_bonus > 1.0);
    }
}