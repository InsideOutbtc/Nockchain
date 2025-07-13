// Mining pool core module
// Orchestrates all mining operations with enterprise-grade architecture

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;
use parking_lot::Mutex;
use std::time::{Duration, Instant};

use crate::{
    config::Config,
    database::Database,
    metrics::Metrics,
    share_processor::ShareProcessor,
    payout_engine::PayoutEngine,
    block_finder::BlockFinder,
    difficulty_adjuster::DifficultyAdjuster,
};

pub mod miner;
pub mod share;
pub mod block;
pub mod difficulty;

pub use miner::{Miner, MinerStats, MinerConnection};
pub use share::{Share, ShareStatus, ShareValidationResult};
pub use block::{Block, BlockTemplate, BlockSolution};
pub use difficulty::{DifficultyManager, VariableDifficulty};

// Core mining pool structure
pub struct MiningPool {
    pub config: Arc<Config>,
    pub database: Arc<Database>,
    pub metrics: Arc<Metrics>,
    
    // Core components
    pub share_processor: Arc<ShareProcessor>,
    pub payout_engine: Arc<PayoutEngine>,
    pub block_finder: Arc<BlockFinder>,
    pub difficulty_adjuster: Arc<DifficultyAdjuster>,
    
    // Active miners and connections
    pub active_miners: Arc<DashMap<String, Arc<Miner>>>,
    pub connections: Arc<DashMap<String, Arc<MinerConnection>>>,
    
    // Pool state
    pub pool_stats: Arc<RwLock<PoolStats>>,
    pub current_difficulty: Arc<RwLock<u64>>,
    pub block_template: Arc<RwLock<Option<BlockTemplate>>>,
    
    // Performance tracking
    pub performance_metrics: Arc<Mutex<PerformanceMetrics>>,
    pub start_time: Instant,
}

#[derive(Debug, Clone)]
pub struct PoolStats {
    pub total_hashrate: f64,
    pub active_miners: usize,
    pub blocks_found: u64,
    pub total_shares: u64,
    pub valid_shares: u64,
    pub stale_shares: u64,
    pub invalid_shares: u64,
    pub luck: f64,
    pub effort: f64,
    pub network_difficulty: u64,
    pub pool_difficulty: u64,
    pub last_block_time: Option<Instant>,
    pub uptime: Duration,
}

#[derive(Debug)]
pub struct PerformanceMetrics {
    pub shares_per_second: f64,
    pub average_processing_time: Duration,
    pub peak_hashrate: f64,
    pub connection_count: usize,
    pub memory_usage: u64,
    pub cpu_usage: f64,
}

impl MiningPool {
    pub async fn new(
        config: Arc<Config>,
        database: Arc<Database>,
        metrics: Arc<Metrics>,
    ) -> Result<Self> {
        let share_processor = Arc::new(
            ShareProcessor::new(
                config.clone(),
                database.clone(),
                metrics.clone(),
            ).await?
        );

        let payout_engine = Arc::new(
            PayoutEngine::new(
                config.clone(),
                database.clone(),
                metrics.clone(),
            ).await?
        );

        let block_finder = Arc::new(
            BlockFinder::new(
                config.clone(),
                database.clone(),
                metrics.clone(),
            ).await?
        );

        let difficulty_adjuster = Arc::new(
            DifficultyAdjuster::new(
                config.clone(),
                database.clone(),
                metrics.clone(),
            ).await?
        );

        let pool_stats = PoolStats {
            total_hashrate: 0.0,
            active_miners: 0,
            blocks_found: 0,
            total_shares: 0,
            valid_shares: 0,
            stale_shares: 0,
            invalid_shares: 0,
            luck: 1.0,
            effort: 1.0,
            network_difficulty: config.mining.minimum_difficulty,
            pool_difficulty: config.mining.minimum_difficulty,
            last_block_time: None,
            uptime: Duration::from_secs(0),
        };

        let performance_metrics = PerformanceMetrics {
            shares_per_second: 0.0,
            average_processing_time: Duration::from_millis(0),
            peak_hashrate: 0.0,
            connection_count: 0,
            memory_usage: 0,
            cpu_usage: 0.0,
        };

        Ok(Self {
            config,
            database,
            metrics,
            share_processor,
            payout_engine,
            block_finder,
            difficulty_adjuster,
            active_miners: Arc::new(DashMap::new()),
            connections: Arc::new(DashMap::new()),
            pool_stats: Arc::new(RwLock::new(pool_stats)),
            current_difficulty: Arc::new(RwLock::new(config.mining.minimum_difficulty)),
            block_template: Arc::new(RwLock::new(None)),
            performance_metrics: Arc::new(Mutex::new(performance_metrics)),
            start_time: Instant::now(),
        })
    }

    // Miner management
    pub async fn register_miner(&self, miner: Miner) -> Result<()> {
        let miner_id = miner.id.clone();
        let miner_arc = Arc::new(miner);
        
        // Store in active miners
        self.active_miners.insert(miner_id.clone(), miner_arc.clone());
        
        // Update database
        self.database.upsert_miner(&miner_arc).await?;
        
        // Update metrics
        self.metrics.record_miner_connected(&miner_id).await;
        
        // Update pool stats
        self.update_pool_stats().await;
        
        tracing::info!("Miner registered: {}", miner_id);
        Ok(())
    }

    pub async fn unregister_miner(&self, miner_id: &str) -> Result<()> {
        // Remove from active miners
        if let Some((_, miner)) = self.active_miners.remove(miner_id) {
            // Update database
            self.database.set_miner_inactive(&miner.id).await?;
            
            // Update metrics
            self.metrics.record_miner_disconnected(&miner.id).await;
            
            // Update pool stats
            self.update_pool_stats().await;
            
            tracing::info!("Miner unregistered: {}", miner_id);
        }
        
        Ok(())
    }

    pub async fn get_miner(&self, miner_id: &str) -> Option<Arc<Miner>> {
        self.active_miners.get(miner_id).map(|entry| entry.value().clone())
    }

    pub async fn get_active_miners(&self) -> Vec<Arc<Miner>> {
        self.active_miners
            .iter()
            .map(|entry| entry.value().clone())
            .collect()
    }

    // Share processing
    pub async fn submit_share(&self, share: Share) -> Result<ShareValidationResult> {
        let start_time = Instant::now();
        
        // Validate share
        let result = self.share_processor.process_share(share).await?;
        
        // Update performance metrics
        let processing_time = start_time.elapsed();
        self.update_performance_metrics(processing_time).await;
        
        // Update pool stats based on result
        self.update_stats_from_share_result(&result).await;
        
        Ok(result)
    }

    // Pool statistics
    pub async fn get_pool_stats(&self) -> PoolStats {
        let mut stats = self.pool_stats.read().await.clone();
        stats.uptime = self.start_time.elapsed();
        stats
    }

    pub async fn update_pool_stats(&self) -> Result<()> {
        let active_miners = self.active_miners.len();
        let total_hashrate = self.calculate_total_hashrate().await;
        
        let mut stats = self.pool_stats.write().await;
        stats.active_miners = active_miners;
        stats.total_hashrate = total_hashrate;
        
        // Update performance tracking
        {
            let mut perf = self.performance_metrics.lock();
            perf.connection_count = active_miners;
            if total_hashrate > perf.peak_hashrate {
                perf.peak_hashrate = total_hashrate;
            }
        }
        
        // Record metrics
        self.metrics.record_pool_stats(&stats).await;
        
        Ok(())
    }

    async fn calculate_total_hashrate(&self) -> f64 {
        let mut total = 0.0;
        for entry in self.active_miners.iter() {
            total += entry.value().current_hashrate.load(std::sync::atomic::Ordering::Relaxed);
        }
        total
    }

    async fn update_stats_from_share_result(&self, result: &ShareValidationResult) {
        let mut stats = self.pool_stats.write().await;
        stats.total_shares += 1;
        
        match result.status {
            ShareStatus::Valid => {
                stats.valid_shares += 1;
                if result.is_block_solution {
                    stats.blocks_found += 1;
                    stats.last_block_time = Some(Instant::now());
                }
            },
            ShareStatus::Stale => stats.stale_shares += 1,
            ShareStatus::Invalid => stats.invalid_shares += 1,
        }
        
        // Calculate luck and effort
        if stats.blocks_found > 0 {
            stats.luck = (stats.valid_shares as f64) / (stats.blocks_found as f64 * stats.network_difficulty as f64);
            stats.effort = (stats.total_shares as f64) / (stats.blocks_found as f64 * stats.pool_difficulty as f64);
        }
    }

    async fn update_performance_metrics(&self, processing_time: Duration) {
        let mut perf = self.performance_metrics.lock();
        
        // Update average processing time (exponential moving average)
        let alpha = 0.1;
        let new_time_ms = processing_time.as_nanos() as f64 / 1_000_000.0;
        let current_avg_ms = perf.average_processing_time.as_nanos() as f64 / 1_000_000.0;
        let new_avg_ms = alpha * new_time_ms + (1.0 - alpha) * current_avg_ms;
        perf.average_processing_time = Duration::from_nanos((new_avg_ms * 1_000_000.0) as u64);
        
        // Calculate shares per second
        let uptime_secs = self.start_time.elapsed().as_secs_f64();
        if uptime_secs > 0.0 {
            let stats = self.pool_stats.read().await;
            perf.shares_per_second = stats.total_shares as f64 / uptime_secs;
        }
    }

    // Health checking
    pub async fn is_healthy(&self) -> bool {
        // Check database connectivity
        if !self.database.is_healthy().await {
            return false;
        }
        
        // Check if core components are running
        if !self.share_processor.is_running().await {
            return false;
        }
        
        if !self.payout_engine.is_running().await {
            return false;
        }
        
        // Check performance metrics
        let perf = self.performance_metrics.lock();
        if perf.average_processing_time > Duration::from_millis(100) {
            tracing::warn!("High share processing latency detected");
            return false;
        }
        
        true
    }

    // Difficulty management
    pub async fn get_current_difficulty(&self) -> u64 {
        *self.current_difficulty.read().await
    }

    pub async fn set_difficulty(&self, difficulty: u64) -> Result<()> {
        *self.current_difficulty.write().await = difficulty;
        
        // Update pool stats
        {
            let mut stats = self.pool_stats.write().await;
            stats.pool_difficulty = difficulty;
        }
        
        // Notify miners of difficulty change
        self.broadcast_difficulty_change(difficulty).await;
        
        tracing::info!("Pool difficulty updated to: {}", difficulty);
        Ok(())
    }

    async fn broadcast_difficulty_change(&self, difficulty: u64) {
        for entry in self.connections.iter() {
            let connection = entry.value();
            if let Err(e) = connection.send_difficulty_update(difficulty).await {
                tracing::warn!("Failed to send difficulty update to {}: {}", entry.key(), e);
            }
        }
    }

    // Block template management
    pub async fn update_block_template(&self, template: BlockTemplate) -> Result<()> {
        *self.block_template.write().await = Some(template.clone());
        
        // Broadcast new work to miners
        self.broadcast_new_work(&template).await;
        
        tracing::info!("Block template updated: height {}", template.height);
        Ok(())
    }

    async fn broadcast_new_work(&self, template: &BlockTemplate) {
        for entry in self.connections.iter() {
            let connection = entry.value();
            if let Err(e) = connection.send_new_work(template).await {
                tracing::warn!("Failed to send new work to {}: {}", entry.key(), e);
            }
        }
    }

    pub async fn get_current_block_template(&self) -> Option<BlockTemplate> {
        self.block_template.read().await.clone()
    }

    // Performance monitoring
    pub async fn get_performance_metrics(&self) -> PerformanceMetrics {
        let perf = self.performance_metrics.lock();
        PerformanceMetrics {
            shares_per_second: perf.shares_per_second,
            average_processing_time: perf.average_processing_time,
            peak_hashrate: perf.peak_hashrate,
            connection_count: perf.connection_count,
            memory_usage: perf.memory_usage,
            cpu_usage: perf.cpu_usage,
        }
    }
}