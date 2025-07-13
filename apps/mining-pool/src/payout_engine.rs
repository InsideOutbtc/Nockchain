// Advanced payout calculation engine for mining pool
// Supports multiple payout schemes with enterprise-grade accuracy

use anyhow::Result;
use std::collections::HashMap;
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tokio::sync::RwLock;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

use crate::{
    config::{Config, PayoutScheme},
    database::Database,
    metrics::Metrics,
    mining::{Share, Miner},
    websocket::{broadcast_payout_sent, PayoutData},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payout {
    pub id: String,
    pub miner_id: String,
    pub amount: f64,
    pub transaction_hash: Option<String>,
    pub status: PayoutStatus,
    pub created_at: SystemTime,
    pub completed_at: Option<SystemTime>,
    pub failure_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PayoutStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

#[derive(Debug, Clone)]
pub struct MinerBalance {
    pub miner_id: String,
    pub confirmed_balance: f64,
    pub unconfirmed_balance: f64,
    pub total_earned: f64,
    pub total_paid: f64,
    pub last_payout: Option<SystemTime>,
    pub pending_payouts: Vec<String>, // payout IDs
}

#[derive(Debug, Clone)]
pub struct PayoutCalculation {
    pub miner_id: String,
    pub amount: f64,
    pub shares_considered: u64,
    pub calculation_method: String,
    pub breakdown: PayoutBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayoutBreakdown {
    pub base_reward: f64,
    pub bonus_reward: f64,
    pub pool_fee: f64,
    pub transaction_fee: f64,
    pub final_amount: f64,
}

// PPLNS (Pay Per Last N Shares) calculation data
#[derive(Debug, Clone)]
pub struct PPLNSData {
    pub window_size: u64,
    pub current_shares: Vec<PPLNSShare>,
    pub last_block_shares: HashMap<String, u64>, // miner_id -> share count
}

#[derive(Debug, Clone)]
pub struct PPLNSShare {
    pub miner_id: String,
    pub difficulty: f64,
    pub timestamp: SystemTime,
    pub block_height: Option<u64>,
}

pub struct PayoutEngine {
    config: Arc<Config>,
    database: Arc<Database>,
    metrics: Arc<Metrics>,
    
    // Engine state
    is_running: AtomicBool,
    
    // Miner balances cache
    miner_balances: Arc<RwLock<HashMap<String, MinerBalance>>>,
    
    // PPLNS state for fair share calculation
    pplns_data: Arc<RwLock<PPLNSData>>,
    
    // Pending payouts queue
    pending_payouts: Arc<RwLock<Vec<Payout>>>,
    
    // Statistics
    total_payouts_processed: Arc<std::sync::atomic::AtomicU64>,
    total_amount_paid: Arc<RwLock<f64>>,
}

impl PayoutEngine {
    pub async fn new(
        config: Arc<Config>,
        database: Arc<Database>,
        metrics: Arc<Metrics>,
    ) -> Result<Self> {
        let window_size = config.mining.share_window_size as u64;
        
        let pplns_data = PPLNSData {
            window_size,
            current_shares: Vec::new(),
            last_block_shares: HashMap::new(),
        };

        let engine = Self {
            config,
            database,
            metrics,
            is_running: AtomicBool::new(false),
            miner_balances: Arc::new(RwLock::new(HashMap::new())),
            pplns_data: Arc::new(RwLock::new(pplns_data)),
            pending_payouts: Arc::new(RwLock::new(Vec::new())),
            total_payouts_processed: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            total_amount_paid: Arc::new(RwLock::new(0.0)),
        };

        // Load existing data from database
        engine.load_miner_balances().await?;
        engine.load_pending_payouts().await?;

        Ok(engine)
    }

    pub async fn start(&self) -> Result<()> {
        if self.is_running.load(Ordering::Relaxed) {
            return Ok(());
        }

        self.is_running.store(true, Ordering::Relaxed);

        // Start payout processing loop
        self.start_payout_processor().await?;
        
        // Start balance updater
        self.start_balance_updater().await?;
        
        // Start PPLNS share tracker
        self.start_pplns_tracker().await?;

        tracing::info!("Payout engine started");
        Ok(())
    }

    pub async fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
        tracing::info!("Payout engine stopped");
    }

    pub async fn is_running(&self) -> bool {
        self.is_running.load(Ordering::Relaxed)
    }

    // Process a new share for payout calculations
    pub async fn process_share(&self, share: &Share, is_valid: bool, is_block: bool) -> Result<()> {
        if !is_valid {
            return Ok(());
        }

        // Update PPLNS data
        self.update_pplns_shares(share).await;

        // If this share found a block, calculate payouts
        if is_block {
            self.calculate_block_payouts(share).await?;
        }

        // Update miner balance
        self.update_miner_balance_from_share(share, is_block).await?;

        Ok(())
    }

    async fn calculate_block_payouts(&self, block_share: &Share) -> Result<()> {
        let block_reward = 65536.0; // NOCK block reward
        let pool_fee = self.config.payout.transaction_fee;
        let net_reward = block_reward * (1.0 - pool_fee);

        match self.config.payout.scheme {
            PayoutScheme::PPS => {
                self.calculate_pps_payouts(net_reward, block_share).await?;
            },
            PayoutScheme::PPLNS => {
                self.calculate_pplns_payouts(net_reward, block_share).await?;
            },
            PayoutScheme::SOLO => {
                self.calculate_solo_payout(net_reward, block_share).await?;
            },
            PayoutScheme::HYBRID => {
                self.calculate_hybrid_payouts(net_reward, block_share).await?;
            },
        }

        // Record block found metrics
        self.metrics.record_block_reward_distributed(net_reward).await;

        Ok(())
    }

    // Pay Per Share (PPS) - Fixed payment per share regardless of blocks found
    async fn calculate_pps_payouts(&self, net_reward: f64, _block_share: &Share) -> Result<()> {
        let balances = self.miner_balances.read().await;
        let mut calculations = Vec::new();

        // Calculate total difficulty of all recent shares
        let total_difficulty = self.calculate_total_recent_difficulty().await;

        if total_difficulty == 0.0 {
            return Ok(());
        }

        for (miner_id, balance) in balances.iter() {
            let miner_difficulty = self.get_miner_recent_difficulty(miner_id).await;
            let share_ratio = miner_difficulty / total_difficulty;
            let payout_amount = net_reward * share_ratio;

            if payout_amount >= self.config.payout.minimum_payout {
                let calculation = PayoutCalculation {
                    miner_id: miner_id.clone(),
                    amount: payout_amount,
                    shares_considered: 0, // TODO: count actual shares
                    calculation_method: "PPS".to_string(),
                    breakdown: PayoutBreakdown {
                        base_reward: payout_amount,
                        bonus_reward: 0.0,
                        pool_fee: net_reward * self.config.payout.transaction_fee,
                        transaction_fee: self.config.payout.transaction_fee,
                        final_amount: payout_amount,
                    },
                };

                calculations.push(calculation);
            }
        }

        // Create payouts
        for calc in calculations {
            self.create_payout(&calc).await?;
        }

        Ok(())
    }

    // Pay Per Last N Shares (PPLNS) - Fair distribution based on recent contribution
    async fn calculate_pplns_payouts(&self, net_reward: f64, _block_share: &Share) -> Result<()> {
        let pplns_data = self.pplns_data.read().await;
        let mut miner_shares: HashMap<String, f64> = HashMap::new();
        let mut total_difficulty = 0.0;

        // Sum up shares for each miner in the window
        for share in &pplns_data.current_shares {
            *miner_shares.entry(share.miner_id.clone()).or_insert(0.0) += share.difficulty;
            total_difficulty += share.difficulty;
        }

        if total_difficulty == 0.0 {
            return Ok(());
        }

        let mut calculations = Vec::new();

        for (miner_id, miner_difficulty) in miner_shares {
            let share_ratio = miner_difficulty / total_difficulty;
            let payout_amount = net_reward * share_ratio;

            if payout_amount >= self.config.payout.minimum_payout {
                let calculation = PayoutCalculation {
                    miner_id: miner_id.clone(),
                    amount: payout_amount,
                    shares_considered: pplns_data.current_shares.len() as u64,
                    calculation_method: "PPLNS".to_string(),
                    breakdown: PayoutBreakdown {
                        base_reward: payout_amount,
                        bonus_reward: 0.0,
                        pool_fee: net_reward * self.config.payout.transaction_fee,
                        transaction_fee: self.config.payout.transaction_fee,
                        final_amount: payout_amount,
                    },
                };

                calculations.push(calculation);
            }
        }

        // Create payouts
        for calc in calculations {
            self.create_payout(&calc).await?;
        }

        Ok(())
    }

    // Solo mining - All reward goes to the miner who found the block
    async fn calculate_solo_payout(&self, net_reward: f64, block_share: &Share) -> Result<()> {
        let calculation = PayoutCalculation {
            miner_id: block_share.miner_id.clone(),
            amount: net_reward,
            shares_considered: 1,
            calculation_method: "SOLO".to_string(),
            breakdown: PayoutBreakdown {
                base_reward: net_reward,
                bonus_reward: 0.0,
                pool_fee: net_reward * self.config.payout.transaction_fee,
                transaction_fee: self.config.payout.transaction_fee,
                final_amount: net_reward,
            },
        };

        self.create_payout(&calculation).await?;
        Ok(())
    }

    // Hybrid approach - Combination of PPS and PPLNS
    async fn calculate_hybrid_payouts(&self, net_reward: f64, block_share: &Share) -> Result<()> {
        // 70% PPLNS, 30% PPS
        let pplns_portion = net_reward * 0.7;
        let pps_portion = net_reward * 0.3;

        // Calculate PPLNS portion
        self.calculate_pplns_payouts(pplns_portion, block_share).await?;

        // Calculate PPS portion
        self.calculate_pps_payouts(pps_portion, block_share).await?;

        Ok(())
    }

    async fn create_payout(&self, calculation: &PayoutCalculation) -> Result<()> {
        let payout = Payout {
            id: Uuid::new_v4().to_string(),
            miner_id: calculation.miner_id.clone(),
            amount: calculation.amount,
            transaction_hash: None,
            status: PayoutStatus::Pending,
            created_at: SystemTime::now(),
            completed_at: None,
            failure_reason: None,
        };

        // Add to pending payouts
        {
            let mut pending = self.pending_payouts.write().await;
            pending.push(payout.clone());
        }

        // Update miner balance
        {
            let mut balances = self.miner_balances.write().await;
            if let Some(balance) = balances.get_mut(&calculation.miner_id) {
                balance.unconfirmed_balance += calculation.amount;
                balance.pending_payouts.push(payout.id.clone());
            }
        }

        // Store in database
        self.database.create_payout(&payout).await?;

        tracing::info!("Created payout: {} NOCK for miner {}", calculation.amount, calculation.miner_id);

        Ok(())
    }

    async fn update_pplns_shares(&self, share: &Share) {
        let mut pplns_data = self.pplns_data.write().await;
        
        let pplns_share = PPLNSShare {
            miner_id: share.miner_id.clone(),
            difficulty: share.difficulty as f64,
            timestamp: SystemTime::now(),
            block_height: None, // Would be set when block is found
        };

        pplns_data.current_shares.push(pplns_share);

        // Keep only the last N shares
        if pplns_data.current_shares.len() > pplns_data.window_size as usize {
            pplns_data.current_shares.remove(0);
        }
    }

    async fn update_miner_balance_from_share(&self, share: &Share, is_block: bool) -> Result<()> {
        let mut balances = self.miner_balances.write().await;
        
        let balance = balances.entry(share.miner_id.clone()).or_insert(MinerBalance {
            miner_id: share.miner_id.clone(),
            confirmed_balance: 0.0,
            unconfirmed_balance: 0.0,
            total_earned: 0.0,
            total_paid: 0.0,
            last_payout: None,
            pending_payouts: Vec::new(),
        });

        // Update statistics but don't add balance for individual shares
        // Balance is added when block rewards are distributed
        
        if is_block {
            // Block finder gets a small bonus (configurable)
            let block_finder_bonus = 0.01; // 1% bonus
            balance.unconfirmed_balance += block_finder_bonus;
        }

        Ok(())
    }

    async fn calculate_total_recent_difficulty(&self) -> f64 {
        let pplns_data = self.pplns_data.read().await;
        pplns_data.current_shares.iter().map(|s| s.difficulty).sum()
    }

    async fn get_miner_recent_difficulty(&self, miner_id: &str) -> f64 {
        let pplns_data = self.pplns_data.read().await;
        pplns_data.current_shares
            .iter()
            .filter(|s| s.miner_id == miner_id)
            .map(|s| s.difficulty)
            .sum()
    }

    // Background task: Process pending payouts
    async fn start_payout_processor(&self) -> Result<()> {
        let pending_payouts = self.pending_payouts.clone();
        let database = self.database.clone();
        let metrics = self.metrics.clone();
        let config = self.config.clone();
        let is_running = self.is_running.clone();
        let total_payouts = self.total_payouts_processed.clone();
        let total_paid = self.total_amount_paid.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(config.payout.payout_interval);

            while is_running.load(Ordering::Relaxed) {
                interval.tick().await;

                let mut payouts_to_process = Vec::new();
                
                // Get pending payouts
                {
                    let mut pending = pending_payouts.write().await;
                    let mut i = 0;
                    while i < pending.len() {
                        if pending[i].status == PayoutStatus::Pending && 
                           pending[i].amount >= config.payout.minimum_payout {
                            payouts_to_process.push(pending.remove(i));
                        } else {
                            i += 1;
                        }
                    }
                }

                // Process payouts
                for mut payout in payouts_to_process {
                    payout.status = PayoutStatus::Processing;
                    
                    if let Err(e) = database.update_payout_status(&payout.id, &payout.status).await {
                        tracing::error!("Failed to update payout status: {}", e);
                        continue;
                    }

                    // Simulate transaction processing (in real implementation, this would interact with Nockchain)
                    match Self::process_transaction(&payout).await {
                        Ok(tx_hash) => {
                            payout.transaction_hash = Some(tx_hash.clone());
                            payout.status = PayoutStatus::Completed;
                            payout.completed_at = Some(SystemTime::now());
                            
                            if let Err(e) = database.complete_payout(&payout.id, &tx_hash).await {
                                tracing::error!("Failed to complete payout: {}", e);
                                continue;
                            }

                            // Update metrics
                            total_payouts.fetch_add(1, Ordering::Relaxed);
                            {
                                let mut total = total_paid.write().await;
                                *total += payout.amount;
                            }
                            
                            // Broadcast payout event
                            let payout_data = PayoutData {
                                miner_id: payout.miner_id.clone(),
                                amount: payout.amount,
                                transaction_hash: tx_hash,
                                timestamp: SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs(),
                            };
                            
                            broadcast_payout_sent(payout_data).await;
                            
                            tracing::info!("Payout completed: {} NOCK to {}", payout.amount, payout.miner_id);
                        },
                        Err(e) => {
                            payout.status = PayoutStatus::Failed;
                            payout.failure_reason = Some(e.to_string());
                            
                            if let Err(e) = database.fail_payout(&payout.id, &e.to_string()).await {
                                tracing::error!("Failed to mark payout as failed: {}", e);
                            }
                            
                            tracing::error!("Payout failed: {}", e);
                        }
                    }
                }
            }
        });

        Ok(())
    }

    // Simulate transaction processing (would be replaced with real blockchain interaction)
    async fn process_transaction(payout: &Payout) -> Result<String> {
        // Simulate network delay
        tokio::time::sleep(Duration::from_millis(100)).await;
        
        // Generate fake transaction hash
        let tx_hash = format!("0x{}", hex::encode(&rand::random::<[u8; 32]>()));
        
        Ok(tx_hash)
    }

    // Background task: Update miner balances
    async fn start_balance_updater(&self) -> Result<()> {
        let miner_balances = self.miner_balances.clone();
        let database = self.database.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));

            while is_running.load(Ordering::Relaxed) {
                interval.tick().await;

                // Update balances from database
                let balances = miner_balances.read().await;
                for (miner_id, _) in balances.iter() {
                    if let Err(e) = database.update_miner_balance_cache(miner_id).await {
                        tracing::warn!("Failed to update balance for miner {}: {}", miner_id, e);
                    }
                }
            }
        });

        Ok(())
    }

    // Background task: Track PPLNS shares
    async fn start_pplns_tracker(&self) -> Result<()> {
        let pplns_data = self.pplns_data.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));

            while is_running.load(Ordering::Relaxed) {
                interval.tick().await;

                // Clean up old shares (older than 24 hours)
                let cutoff = SystemTime::now() - Duration::from_secs(24 * 60 * 60);
                let mut data = pplns_data.write().await;
                data.current_shares.retain(|share| share.timestamp > cutoff);
            }
        });

        Ok(())
    }

    // Load existing data from database
    async fn load_miner_balances(&self) -> Result<()> {
        let balances = self.database.load_all_miner_balances().await?;
        let mut miner_balances = self.miner_balances.write().await;
        
        for balance in balances {
            miner_balances.insert(balance.miner_id.clone(), balance);
        }

        Ok(())
    }

    async fn load_pending_payouts(&self) -> Result<()> {
        let payouts = self.database.load_pending_payouts().await?;
        let mut pending = self.pending_payouts.write().await;
        *pending = payouts;

        Ok(())
    }

    // Public API methods
    pub async fn get_miner_balance(&self, miner_id: &str) -> Option<MinerBalance> {
        let balances = self.miner_balances.read().await;
        balances.get(miner_id).cloned()
    }

    pub async fn get_pending_payouts(&self, miner_id: Option<&str>) -> Vec<Payout> {
        let pending = self.pending_payouts.read().await;
        
        if let Some(miner_id) = miner_id {
            pending.iter()
                .filter(|p| p.miner_id == miner_id)
                .cloned()
                .collect()
        } else {
            pending.clone()
        }
    }

    pub async fn get_payout_statistics(&self) -> (u64, f64) {
        let total_payouts = self.total_payouts_processed.load(Ordering::Relaxed);
        let total_paid = *self.total_amount_paid.read().await;
        (total_payouts, total_paid)
    }

    pub async fn force_payout(&self, miner_id: &str) -> Result<()> {
        // Force payout regardless of minimum threshold
        let balance = self.get_miner_balance(miner_id).await;
        
        if let Some(balance) = balance {
            if balance.confirmed_balance > 0.0 {
                let calculation = PayoutCalculation {
                    miner_id: miner_id.to_string(),
                    amount: balance.confirmed_balance,
                    shares_considered: 0,
                    calculation_method: "FORCED".to_string(),
                    breakdown: PayoutBreakdown {
                        base_reward: balance.confirmed_balance,
                        bonus_reward: 0.0,
                        pool_fee: 0.0,
                        transaction_fee: self.config.payout.transaction_fee,
                        final_amount: balance.confirmed_balance,
                    },
                };

                self.create_payout(&calculation).await?;
                tracing::info!("Forced payout created for miner: {}", miner_id);
            }
        }

        Ok(())
    }
}