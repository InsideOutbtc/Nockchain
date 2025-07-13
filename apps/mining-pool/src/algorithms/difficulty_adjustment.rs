// NOCKCHAIN Difficulty Adjustment Algorithm with Performance Optimizations
// Adapting to 5x faster proving times and dynamic network conditions

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use chrono::{DateTime, Utc, Duration};

// Performance constants from optimizations
const OPTIMIZED_PROVING_TIME_SECONDS: u64 = 74;
const LEGACY_PROVING_TIME_SECONDS: u64 = 300;
const TARGET_BLOCK_TIME_SECONDS: u64 = 600; // 10 minutes
const DIFFICULTY_ADJUSTMENT_WINDOW: usize = 144; // 24 hours of blocks
const MAX_DIFFICULTY_CHANGE: f64 = 4.0; // Maximum 4x change per adjustment
const MIN_DIFFICULTY_CHANGE: f64 = 0.25; // Minimum 0.25x change per adjustment

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockData {
    pub height: u64,
    pub timestamp: DateTime<Utc>,
    pub difficulty: u64,
    pub solving_time_seconds: u64,
    pub optimization_enabled: bool,
    pub network_hashrate_proofs_per_second: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DifficultyAdjustment {
    pub old_difficulty: u64,
    pub new_difficulty: u64,
    pub adjustment_factor: f64,
    pub reason: String,
    pub timestamp: DateTime<Utc>,
    pub optimization_impact: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub total_hashrate_proofs_per_second: f64,
    pub optimized_miners_percentage: f64,
    pub average_proving_time: f64,
    pub expected_blocks_per_day: f64,
    pub difficulty_stability_score: f64,
}

pub struct OptimizedDifficultyAdjuster {
    block_history: VecDeque<BlockData>,
    adjustment_history: VecDeque<DifficultyAdjustment>,
    current_difficulty: u64,
    optimization_factor: f64,
}

impl OptimizedDifficultyAdjuster {
    pub fn new(initial_difficulty: u64) -> Self {
        Self {
            block_history: VecDeque::with_capacity(DIFFICULTY_ADJUSTMENT_WINDOW * 2),
            adjustment_history: VecDeque::with_capacity(100),
            current_difficulty: initial_difficulty,
            optimization_factor: 1.0,
        }
    }

    /// Add a new block to the history and potentially trigger difficulty adjustment
    pub fn add_block(&mut self, block: BlockData) -> Option<DifficultyAdjustment> {
        self.block_history.push_back(block.clone());
        
        // Keep only the last adjustment window + buffer
        while self.block_history.len() > DIFFICULTY_ADJUSTMENT_WINDOW * 2 {
            self.block_history.pop_front();
        }

        // Update optimization factor based on network adoption
        self.update_optimization_factor();

        // Check if we need to adjust difficulty
        if self.should_adjust_difficulty() {
            self.calculate_difficulty_adjustment()
        } else {
            None
        }
    }

    /// Determine if difficulty should be adjusted
    fn should_adjust_difficulty(&self) -> bool {
        // Adjust every DIFFICULTY_ADJUSTMENT_WINDOW blocks
        self.block_history.len() >= DIFFICULTY_ADJUSTMENT_WINDOW &&
        self.block_history.len() % DIFFICULTY_ADJUSTMENT_WINDOW == 0
    }

    /// Update the optimization factor based on network adoption
    fn update_optimization_factor(&mut self) {
        if self.block_history.len() < 10 {
            return;
        }

        let recent_blocks: Vec<_> = self.block_history.iter().rev().take(144).collect();
        let optimized_count = recent_blocks.iter().filter(|b| b.optimization_enabled).count();
        let optimization_percentage = optimized_count as f64 / recent_blocks.len() as f64;

        // Calculate weighted optimization factor
        // More optimized miners = higher overall network performance
        self.optimization_factor = 1.0 + (optimization_percentage * 4.0); // Up to 5x factor
    }

    /// Calculate the new difficulty adjustment
    fn calculate_difficulty_adjustment(&mut self) -> Option<DifficultyAdjustment> {
        if self.block_history.len() < DIFFICULTY_ADJUSTMENT_WINDOW {
            return None;
        }

        let adjustment_window: Vec<_> = self.block_history.iter()
            .rev()
            .take(DIFFICULTY_ADJUSTMENT_WINDOW)
            .collect();

        let actual_time = self.calculate_actual_time(&adjustment_window);
        let expected_time = TARGET_BLOCK_TIME_SECONDS * DIFFICULTY_ADJUSTMENT_WINDOW as u64;
        
        // Calculate base adjustment factor
        let base_factor = expected_time as f64 / actual_time as f64;
        
        // Apply optimization factor to prevent wild swings due to performance improvements
        let optimization_adjusted_factor = self.apply_optimization_compensation(base_factor);
        
        // Clamp the adjustment to prevent extreme changes
        let clamped_factor = optimization_adjusted_factor.max(MIN_DIFFICULTY_CHANGE).min(MAX_DIFFICULTY_CHANGE);
        
        let old_difficulty = self.current_difficulty;
        let new_difficulty = (old_difficulty as f64 * clamped_factor) as u64;
        
        // Ensure minimum difficulty
        let final_difficulty = new_difficulty.max(1000);
        
        let adjustment = DifficultyAdjustment {
            old_difficulty,
            new_difficulty: final_difficulty,
            adjustment_factor: clamped_factor,
            reason: self.generate_adjustment_reason(base_factor, optimization_adjusted_factor, &adjustment_window),
            timestamp: Utc::now(),
            optimization_impact: self.optimization_factor,
        };

        self.current_difficulty = final_difficulty;
        self.adjustment_history.push_back(adjustment.clone());
        
        // Keep adjustment history manageable
        while self.adjustment_history.len() > 100 {
            self.adjustment_history.pop_front();
        }

        Some(adjustment)
    }

    /// Apply compensation for optimization improvements
    fn apply_optimization_compensation(&self, base_factor: f64) -> f64 {
        // If optimization adoption is high, compensate for the performance boost
        if self.optimization_factor > 2.0 {
            // Reduce difficulty adjustments when optimizations are widely adopted
            let compensation = 1.0 + ((self.optimization_factor - 1.0) * 0.3);
            base_factor / compensation
        } else {
            base_factor
        }
    }

    /// Calculate actual time elapsed for the adjustment window
    fn calculate_actual_time(&self, blocks: &[&BlockData]) -> u64 {
        if blocks.len() < 2 {
            return TARGET_BLOCK_TIME_SECONDS;
        }

        let latest = blocks.first().unwrap();
        let earliest = blocks.last().unwrap();
        
        let duration = latest.timestamp.signed_duration_since(earliest.timestamp);
        duration.num_seconds().max(1) as u64
    }

    /// Generate a human-readable reason for the adjustment
    fn generate_adjustment_reason(&self, base_factor: f64, adjusted_factor: f64, blocks: &[&BlockData]) -> String {
        let avg_solve_time = blocks.iter()
            .map(|b| b.solving_time_seconds as f64)
            .sum::<f64>() / blocks.len() as f64;

        let optimized_percentage = blocks.iter()
            .filter(|b| b.optimization_enabled)
            .count() as f64 / blocks.len() as f64 * 100.0;

        if adjusted_factor > 1.1 {
            format!(
                "Increasing difficulty by {:.1}% - blocks solving too fast (avg: {:.0}s, target: {}s). Network optimization: {:.1}%",
                (adjusted_factor - 1.0) * 100.0,
                avg_solve_time,
                TARGET_BLOCK_TIME_SECONDS,
                optimized_percentage
            )
        } else if adjusted_factor < 0.9 {
            format!(
                "Decreasing difficulty by {:.1}% - blocks solving too slow (avg: {:.0}s, target: {}s). Network optimization: {:.1}%",
                (1.0 - adjusted_factor) * 100.0,
                avg_solve_time,
                TARGET_BLOCK_TIME_SECONDS,
                optimized_percentage
            )
        } else {
            format!(
                "Minor adjustment ({:.1}%) - network stability. Avg solve time: {:.0}s, optimization: {:.1}%",
                (adjusted_factor - 1.0) * 100.0,
                avg_solve_time,
                optimized_percentage
            )
        }
    }

    /// Get current network metrics
    pub fn get_network_metrics(&self) -> NetworkMetrics {
        if self.block_history.is_empty() {
            return NetworkMetrics {
                total_hashrate_proofs_per_second: 0.0,
                optimized_miners_percentage: 0.0,
                average_proving_time: LEGACY_PROVING_TIME_SECONDS as f64,
                expected_blocks_per_day: 144.0,
                difficulty_stability_score: 100.0,
            };
        }

        let recent_blocks: Vec<_> = self.block_history.iter().rev().take(144).collect();
        
        let total_hashrate = recent_blocks.iter()
            .map(|b| b.network_hashrate_proofs_per_second)
            .sum::<f64>() / recent_blocks.len() as f64;

        let optimized_percentage = recent_blocks.iter()
            .filter(|b| b.optimization_enabled)
            .count() as f64 / recent_blocks.len() as f64 * 100.0;

        let average_proving_time = recent_blocks.iter()
            .map(|b| b.solving_time_seconds as f64)
            .sum::<f64>() / recent_blocks.len() as f64;

        let expected_blocks_per_day = 86400.0 / average_proving_time;

        // Calculate stability score based on difficulty adjustment variance
        let stability_score = self.calculate_stability_score();

        NetworkMetrics {
            total_hashrate_proofs_per_second: total_hashrate,
            optimized_miners_percentage: optimized_percentage,
            average_proving_time,
            expected_blocks_per_day,
            difficulty_stability_score: stability_score,
        }
    }

    /// Calculate network stability score based on difficulty adjustments
    fn calculate_stability_score(&self) -> f64 {
        if self.adjustment_history.len() < 5 {
            return 100.0;
        }

        let recent_adjustments: Vec<_> = self.adjustment_history.iter().rev().take(10).collect();
        let adjustment_variance = recent_adjustments.iter()
            .map(|adj| (adj.adjustment_factor - 1.0).abs())
            .sum::<f64>() / recent_adjustments.len() as f64;

        // Convert variance to stability score (0-100)
        let stability = (1.0 - adjustment_variance.min(1.0)) * 100.0;
        stability.max(0.0).min(100.0)
    }

    /// Predict next difficulty adjustment
    pub fn predict_next_adjustment(&self) -> Option<f64> {
        if self.block_history.len() < 10 {
            return None;
        }

        let recent_blocks: Vec<_> = self.block_history.iter().rev().take(10).collect();
        let avg_solve_time = recent_blocks.iter()
            .map(|b| b.solving_time_seconds as f64)
            .sum::<f64>() / recent_blocks.len() as f64;

        let predicted_factor = TARGET_BLOCK_TIME_SECONDS as f64 / avg_solve_time;
        let optimization_adjusted = self.apply_optimization_compensation(predicted_factor);
        
        Some(optimization_adjusted.max(MIN_DIFFICULTY_CHANGE).min(MAX_DIFFICULTY_CHANGE))
    }

    /// Get current difficulty
    pub fn get_current_difficulty(&self) -> u64 {
        self.current_difficulty
    }

    /// Get adjustment history
    pub fn get_adjustment_history(&self) -> &VecDeque<DifficultyAdjustment> {
        &self.adjustment_history
    }

    /// Calculate optimal mining configuration for current network state
    pub fn get_optimal_mining_config(&self, available_threads: u32) -> OptimalMiningConfig {
        let network_metrics = self.get_network_metrics();
        
        // Determine if optimizations are beneficial
        let should_use_optimizations = network_metrics.optimized_miners_percentage < 80.0;
        
        let proving_time = if should_use_optimizations {
            OPTIMIZED_PROVING_TIME_SECONDS
        } else {
            LEGACY_PROVING_TIME_SECONDS
        };

        let expected_proofs_per_second = available_threads as f64 / proving_time as f64;
        let estimated_daily_blocks = expected_proofs_per_second * 86400.0 / TARGET_BLOCK_TIME_SECONDS as f64;

        OptimalMiningConfig {
            recommended_threads: available_threads,
            use_optimizations: should_use_optimizations,
            expected_proofs_per_second,
            estimated_daily_blocks,
            competitive_advantage: if should_use_optimizations { 5.0 } else { 1.0 },
            reasoning: if should_use_optimizations {
                "Optimizations provide 5x advantage - early adoption opportunity".to_string()
            } else {
                "Network mostly optimized - standard performance expected".to_string()
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimalMiningConfig {
    pub recommended_threads: u32,
    pub use_optimizations: bool,
    pub expected_proofs_per_second: f64,
    pub estimated_daily_blocks: f64,
    pub competitive_advantage: f64,
    pub reasoning: String,
}

impl Default for OptimizedDifficultyAdjuster {
    fn default() -> Self {
        Self::new(1000000) // Default difficulty
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_difficulty_adjustment_with_optimizations() {
        let mut adjuster = OptimizedDifficultyAdjuster::new(1000000);
        
        // Add blocks with optimization enabled (faster solving)
        for i in 0..DIFFICULTY_ADJUSTMENT_WINDOW {
            let block = BlockData {
                height: i as u64,
                timestamp: Utc::now() - Duration::seconds((DIFFICULTY_ADJUSTMENT_WINDOW - i) as i64 * 300), // 5 min intervals
                difficulty: 1000000,
                solving_time_seconds: OPTIMIZED_PROVING_TIME_SECONDS,
                optimization_enabled: true,
                network_hashrate_proofs_per_second: 100.0,
            };
            
            if let Some(adjustment) = adjuster.add_block(block) {
                // Should increase difficulty due to faster solving
                assert!(adjustment.new_difficulty > adjustment.old_difficulty);
                assert!(adjustment.optimization_impact > 1.0);
            }
        }
    }

    #[test]
    fn test_network_metrics_calculation() {
        let mut adjuster = OptimizedDifficultyAdjuster::new(1000000);
        
        // Add mixed optimization blocks
        for i in 0..50 {
            let block = BlockData {
                height: i as u64,
                timestamp: Utc::now() - Duration::seconds((50 - i) as i64 * 600),
                difficulty: 1000000,
                solving_time_seconds: if i % 2 == 0 { OPTIMIZED_PROVING_TIME_SECONDS } else { LEGACY_PROVING_TIME_SECONDS },
                optimization_enabled: i % 2 == 0,
                network_hashrate_proofs_per_second: 100.0,
            };
            adjuster.add_block(block);
        }

        let metrics = adjuster.get_network_metrics();
        assert!(metrics.optimized_miners_percentage > 40.0);
        assert!(metrics.optimized_miners_percentage < 60.0);
        assert!(metrics.total_hashrate_proofs_per_second > 0.0);
    }

    #[test]
    fn test_optimal_mining_config() {
        let mut adjuster = OptimizedDifficultyAdjuster::new(1000000);
        
        // Simulate low optimization adoption
        for i in 0..20 {
            let block = BlockData {
                height: i as u64,
                timestamp: Utc::now() - Duration::seconds((20 - i) as i64 * 600),
                difficulty: 1000000,
                solving_time_seconds: LEGACY_PROVING_TIME_SECONDS,
                optimization_enabled: false,
                network_hashrate_proofs_per_second: 50.0,
            };
            adjuster.add_block(block);
        }

        let config = adjuster.get_optimal_mining_config(60);
        assert!(config.use_optimizations); // Should recommend optimizations
        assert!(config.competitive_advantage > 4.0); // Significant advantage
    }
}