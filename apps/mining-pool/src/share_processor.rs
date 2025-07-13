// High-performance share processing engine
// Designed for sub-millisecond share validation and processing

use anyhow::Result;
use std::sync::{Arc, atomic::{AtomicBool, AtomicU64, Ordering}};
use tokio::sync::{mpsc, RwLock};
use dashmap::DashMap;
use parking_lot::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sha2::{Sha256, Digest};
use blake3;

use crate::{
    config::Config,
    database::Database,
    metrics::Metrics,
    mining::{Share, ShareStatus, ShareValidationResult, Miner},
};

// Share processing statistics
#[derive(Debug, Default)]
pub struct ShareProcessingStats {
    pub total_processed: AtomicU64,
    pub valid_shares: AtomicU64,
    pub invalid_shares: AtomicU64,
    pub stale_shares: AtomicU64,
    pub duplicate_shares: AtomicU64,
    pub processing_time_sum: AtomicU64, // nanoseconds
    pub blocks_found: AtomicU64,
}

// Rate limiting for miners
#[derive(Debug)]
struct MinerRateLimit {
    shares_submitted: AtomicU64,
    last_reset: Mutex<Instant>,
    violations: AtomicU64,
}

impl MinerRateLimit {
    fn new() -> Self {
        Self {
            shares_submitted: AtomicU64::new(0),
            last_reset: Mutex::new(Instant::now()),
            violations: AtomicU64::new(0),
        }
    }

    fn check_rate_limit(&self, max_shares_per_second: u64, window: Duration) -> bool {
        let now = Instant::now();
        let mut last_reset = self.last_reset.lock();
        
        if now.duration_since(*last_reset) >= window {
            self.shares_submitted.store(0, Ordering::Relaxed);
            *last_reset = now;
        }
        
        let current_count = self.shares_submitted.fetch_add(1, Ordering::Relaxed);
        let window_secs = window.as_secs();
        let max_in_window = max_shares_per_second * window_secs;
        
        if current_count >= max_in_window {
            self.violations.fetch_add(1, Ordering::Relaxed);
            false
        } else {
            true
        }
    }
}

pub struct ShareProcessor {
    config: Arc<Config>,
    database: Arc<Database>,
    metrics: Arc<Metrics>,
    
    // Processing state
    is_running: AtomicBool,
    stats: ShareProcessingStats,
    
    // Rate limiting
    miner_rate_limits: Arc<DashMap<String, MinerRateLimit>>,
    
    // Share deduplication
    recent_shares: Arc<RwLock<DashMap<String, Instant>>>,
    
    // Processing queue
    share_queue: Arc<mpsc::UnboundedSender<ShareProcessingTask>>,
    _queue_receiver: mpsc::UnboundedReceiver<ShareProcessingTask>,
    
    // Block template cache
    current_block_hash: Arc<RwLock<Option<String>>>,
    current_target: Arc<RwLock<Vec<u8>>>,
}

#[derive(Debug)]
struct ShareProcessingTask {
    share: Share,
    response_sender: tokio::sync::oneshot::Sender<Result<ShareValidationResult>>,
}

impl ShareProcessor {
    pub async fn new(
        config: Arc<Config>,
        database: Arc<Database>,
        metrics: Arc<Metrics>,
    ) -> Result<Self> {
        let (share_sender, share_receiver) = mpsc::unbounded_channel();
        
        Ok(Self {
            config,
            database,
            metrics,
            is_running: AtomicBool::new(false),
            stats: ShareProcessingStats::default(),
            miner_rate_limits: Arc::new(DashMap::new()),
            recent_shares: Arc::new(RwLock::new(DashMap::new())),
            share_queue: Arc::new(share_sender),
            _queue_receiver: share_receiver,
            current_block_hash: Arc::new(RwLock::new(None)),
            current_target: Arc::new(RwLock::new(vec![0u8; 32])),
        })
    }

    pub async fn start(&self) -> Result<()> {
        if self.is_running.load(Ordering::Relaxed) {
            return Ok(());
        }

        self.is_running.store(true, Ordering::Relaxed);
        
        // Start background tasks
        self.start_processing_loop().await?;
        self.start_cleanup_task().await?;
        self.start_metrics_collection().await?;
        
        tracing::info!("Share processor started");
        Ok(())
    }

    pub async fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
        tracing::info!("Share processor stopped");
    }

    pub async fn is_running(&self) -> bool {
        self.is_running.load(Ordering::Relaxed)
    }

    pub async fn process_share(&self, share: Share) -> Result<ShareValidationResult> {
        let start_time = Instant::now();
        
        // Rate limiting check
        if !self.check_rate_limit(&share.miner_id).await {
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Rate limit exceeded".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        // Duplicate check
        if self.is_duplicate(&share).await {
            self.stats.duplicate_shares.fetch_add(1, Ordering::Relaxed);
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Duplicate share".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        // Validate share format and basic checks
        let validation_result = self.validate_share_format(&share).await?;
        if validation_result.status != ShareStatus::Valid {
            return Ok(validation_result);
        }

        // Check if share is stale
        if self.is_stale(&share).await {
            self.stats.stale_shares.fetch_add(1, Ordering::Relaxed);
            return Ok(ShareValidationResult {
                status: ShareStatus::Stale,
                error: Some("Stale share".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        // Perform cryptographic validation
        let crypto_result = self.validate_share_cryptography(&share).await?;
        
        // Record share in deduplication cache
        self.record_share(&share).await;
        
        // Update statistics
        let processing_time = start_time.elapsed();
        self.update_statistics(&crypto_result, processing_time).await;
        
        // Store in database if valid
        if crypto_result.status == ShareStatus::Valid {
            if let Err(e) = self.database.store_share(&share, &crypto_result).await {
                tracing::error!("Failed to store share in database: {}", e);
            }
            
            // Check if this share solves a block
            if crypto_result.is_block_solution {
                if let Err(e) = self.handle_block_solution(&share, &crypto_result).await {
                    tracing::error!("Failed to handle block solution: {}", e);
                }
            }
        }

        Ok(crypto_result)
    }

    async fn check_rate_limit(&self, miner_id: &str) -> bool {
        let rate_limit = self.miner_rate_limits
            .entry(miner_id.to_string())
            .or_insert_with(|| MinerRateLimit::new());
        
        rate_limit.check_rate_limit(
            self.config.security.max_shares_per_second as u64,
            Duration::from_secs(1),
        )
    }

    async fn is_duplicate(&self, share: &Share) -> bool {
        let share_key = format!("{}:{}:{}", share.miner_id, share.nonce, share.timestamp);
        let recent_shares = self.recent_shares.read().await;
        recent_shares.contains_key(&share_key)
    }

    async fn record_share(&self, share: &Share) {
        let share_key = format!("{}:{}:{}", share.miner_id, share.nonce, share.timestamp);
        let mut recent_shares = self.recent_shares.write().await;
        recent_shares.insert(share_key, Instant::now());
    }

    async fn is_stale(&self, share: &Share) -> bool {
        let current_block_hash = self.current_block_hash.read().await;
        
        if let Some(ref current_hash) = *current_block_hash {
            if &share.prev_block_hash != current_hash {
                return true;
            }
        }

        // Check timestamp staleness (older than 5 minutes)
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let share_time = share.timestamp as u64;
        if now.saturating_sub(share_time) > 300 {
            return true;
        }

        false
    }

    async fn validate_share_format(&self, share: &Share) -> Result<ShareValidationResult> {
        let start_time = Instant::now();
        
        // Check required fields
        if share.miner_id.is_empty() {
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Missing miner ID".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        if share.nonce.is_empty() {
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Missing nonce".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        // Validate nonce format (should be hex)
        if hex::decode(&share.nonce).is_err() {
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Invalid nonce format".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        // Validate difficulty
        if share.difficulty == 0 {
            return Ok(ShareValidationResult {
                status: ShareStatus::Invalid,
                error: Some("Invalid difficulty".to_string()),
                is_block_solution: false,
                difficulty_achieved: 0,
                processing_time: start_time.elapsed(),
            });
        }

        Ok(ShareValidationResult {
            status: ShareStatus::Valid,
            error: None,
            is_block_solution: false,
            difficulty_achieved: 0,
            processing_time: start_time.elapsed(),
        })
    }

    async fn validate_share_cryptography(&self, share: &Share) -> Result<ShareValidationResult> {
        let start_time = Instant::now();
        
        // Construct block header for hashing
        let block_header = self.construct_block_header(share).await?;
        
        // Calculate hash using Blake3 (Nockchain's hash function)
        let hash = blake3::hash(&block_header);
        let hash_bytes = hash.as_bytes();
        
        // Calculate difficulty achieved
        let difficulty_achieved = self.calculate_difficulty_from_hash(hash_bytes);
        
        // Check if share meets minimum difficulty
        let is_valid = difficulty_achieved >= share.difficulty;
        
        // Check if this is a block solution
        let current_target = self.current_target.read().await;
        let is_block_solution = self.hash_meets_target(hash_bytes, &current_target);
        
        let status = if is_valid {
            ShareStatus::Valid
        } else {
            ShareStatus::Invalid
        };

        Ok(ShareValidationResult {
            status,
            error: if is_valid { None } else { Some("Hash does not meet difficulty target".to_string()) },
            is_block_solution,
            difficulty_achieved,
            processing_time: start_time.elapsed(),
        })
    }

    async fn construct_block_header(&self, share: &Share) -> Result<Vec<u8>> {
        // Construct block header according to Nockchain protocol
        let mut header = Vec::new();
        
        // Version (4 bytes)
        header.extend_from_slice(&1u32.to_le_bytes());
        
        // Previous block hash (32 bytes)
        let prev_hash = hex::decode(&share.prev_block_hash)?;
        header.extend_from_slice(&prev_hash);
        
        // Merkle root (32 bytes) - simplified for now
        header.extend_from_slice(&[0u8; 32]);
        
        // Timestamp (8 bytes)
        header.extend_from_slice(&share.timestamp.to_le_bytes());
        
        // Difficulty target (4 bytes)
        header.extend_from_slice(&(share.difficulty as u32).to_le_bytes());
        
        // Nonce (4 bytes)
        let nonce_bytes = hex::decode(&share.nonce)?;
        header.extend_from_slice(&nonce_bytes);
        
        Ok(header)
    }

    fn calculate_difficulty_from_hash(&self, hash: &[u8]) -> u64 {
        // Calculate difficulty as 2^256 / hash_as_number
        // Simplified implementation for demonstration
        let mut difficulty = 0u64;
        for (i, &byte) in hash.iter().take(8).enumerate() {
            difficulty |= (byte as u64) << (i * 8);
        }
        
        if difficulty == 0 {
            return u64::MAX;
        }
        
        u64::MAX / difficulty
    }

    fn hash_meets_target(&self, hash: &[u8], target: &[u8]) -> bool {
        for (h, t) in hash.iter().zip(target.iter()) {
            match h.cmp(t) {
                std::cmp::Ordering::Less => return true,
                std::cmp::Ordering::Greater => return false,
                std::cmp::Ordering::Equal => continue,
            }
        }
        true
    }

    async fn handle_block_solution(&self, share: &Share, result: &ShareValidationResult) -> Result<()> {
        tracing::info!("Block solution found by miner: {}", share.miner_id);
        
        // Store block in database
        self.database.store_block_solution(share, result).await?;
        
        // Update metrics
        self.metrics.record_block_found(&share.miner_id).await;
        
        // Broadcast block found event
        // This would typically notify other pool components and miners
        
        Ok(())
    }

    async fn update_statistics(&self, result: &ShareValidationResult, processing_time: Duration) {
        self.stats.total_processed.fetch_add(1, Ordering::Relaxed);
        
        match result.status {
            ShareStatus::Valid => {
                self.stats.valid_shares.fetch_add(1, Ordering::Relaxed);
                if result.is_block_solution {
                    self.stats.blocks_found.fetch_add(1, Ordering::Relaxed);
                }
            },
            ShareStatus::Invalid => {
                self.stats.invalid_shares.fetch_add(1, Ordering::Relaxed);
            },
            ShareStatus::Stale => {
                self.stats.stale_shares.fetch_add(1, Ordering::Relaxed);
            },
        }
        
        self.stats.processing_time_sum.fetch_add(
            processing_time.as_nanos() as u64,
            Ordering::Relaxed
        );
    }

    async fn start_processing_loop(&self) -> Result<()> {
        // In a real implementation, this would process shares from the queue
        // For now, we handle synchronous processing
        Ok(())
    }

    async fn start_cleanup_task(&self) -> Result<()> {
        let recent_shares = self.recent_shares.clone();
        let is_running = self.is_running.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            
            while is_running.load(Ordering::Relaxed) {
                interval.tick().await;
                
                let now = Instant::now();
                let mut shares = recent_shares.write().await;
                
                // Remove shares older than 10 minutes
                shares.retain(|_, timestamp| {
                    now.duration_since(*timestamp) < Duration::from_secs(600)
                });
            }
        });
        
        Ok(())
    }

    async fn start_metrics_collection(&self) -> Result<()> {
        let stats = &self.stats as *const ShareProcessingStats;
        let metrics = self.metrics.clone();
        let is_running = self.is_running.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(10));
            
            while is_running.load(Ordering::Relaxed) {
                interval.tick().await;
                
                unsafe {
                    let stats = &*stats;
                    let total = stats.total_processed.load(Ordering::Relaxed);
                    let valid = stats.valid_shares.load(Ordering::Relaxed);
                    let invalid = stats.invalid_shares.load(Ordering::Relaxed);
                    let stale = stats.stale_shares.load(Ordering::Relaxed);
                    let blocks = stats.blocks_found.load(Ordering::Relaxed);
                    let processing_time_sum = stats.processing_time_sum.load(Ordering::Relaxed);
                    
                    if let Err(e) = metrics.record_share_processing_stats(
                        total, valid, invalid, stale, blocks, processing_time_sum
                    ).await {
                        tracing::error!("Failed to record share processing metrics: {}", e);
                    }
                }
            }
        });
        
        Ok(())
    }

    pub async fn get_statistics(&self) -> ShareProcessingStats {
        ShareProcessingStats {
            total_processed: AtomicU64::new(self.stats.total_processed.load(Ordering::Relaxed)),
            valid_shares: AtomicU64::new(self.stats.valid_shares.load(Ordering::Relaxed)),
            invalid_shares: AtomicU64::new(self.stats.invalid_shares.load(Ordering::Relaxed)),
            stale_shares: AtomicU64::new(self.stats.stale_shares.load(Ordering::Relaxed)),
            duplicate_shares: AtomicU64::new(self.stats.duplicate_shares.load(Ordering::Relaxed)),
            processing_time_sum: AtomicU64::new(self.stats.processing_time_sum.load(Ordering::Relaxed)),
            blocks_found: AtomicU64::new(self.stats.blocks_found.load(Ordering::Relaxed)),
        }
    }

    pub async fn update_block_target(&self, block_hash: String, target: Vec<u8>) {
        *self.current_block_hash.write().await = Some(block_hash);
        *self.current_target.write().await = target;
    }
}