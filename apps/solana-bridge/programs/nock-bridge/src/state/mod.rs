// Bridge state management and data structures

use anchor_lang::prelude::*;

pub mod bridge;
pub mod validator;
pub mod liquidity;
pub mod oracle;

pub use bridge::*;
pub use validator::*;
pub use liquidity::*;
pub use oracle::*;

// Cross-chain message structure for NOCK bridge
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CrossChainMessage {
    pub version: u8,
    pub message_type: MessageType,
    pub source_chain: ChainId,
    pub dest_chain: ChainId,
    pub nonce: u64,
    pub sender: [u8; 32],
    pub recipient: [u8; 32],
    pub amount: u64,
    pub fee: u64,
    pub deadline: i64,
    pub payload: Vec<u8>,
    pub hash: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum MessageType {
    Deposit,
    Withdraw,
    Emergency,
    ConfigUpdate,
    LiquidityOperation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum ChainId {
    Nockchain = 1,
    Solana = 2,
    Ethereum = 3, // Future expansion
    BSC = 4,      // Future expansion
}

impl CrossChainMessage {
    pub const MAX_PAYLOAD_SIZE: usize = 1024;
    
    pub fn new(
        message_type: MessageType,
        source_chain: ChainId,
        dest_chain: ChainId,
        nonce: u64,
        sender: [u8; 32],
        recipient: [u8; 32],
        amount: u64,
        fee: u64,
        deadline: i64,
        payload: Vec<u8>,
    ) -> Result<Self> {
        require!(payload.len() <= Self::MAX_PAYLOAD_SIZE, crate::BridgeError::PayloadTooLarge);
        
        let mut message = Self {
            version: 1,
            message_type,
            source_chain,
            dest_chain,
            nonce,
            sender,
            recipient,
            amount,
            fee,
            deadline,
            payload,
            hash: [0; 32],
        };
        
        message.hash = message.calculate_hash();
        Ok(message)
    }
    
    pub fn calculate_hash(&self) -> [u8; 32] {
        use solana_program::hash::{hash, Hash};
        
        let mut data = Vec::new();
        data.push(self.version);
        data.extend_from_slice(&(self.message_type.clone() as u8).to_le_bytes());
        data.extend_from_slice(&(self.source_chain.clone() as u8).to_le_bytes());
        data.extend_from_slice(&(self.dest_chain.clone() as u8).to_le_bytes());
        data.extend_from_slice(&self.nonce.to_le_bytes());
        data.extend_from_slice(&self.sender);
        data.extend_from_slice(&self.recipient);
        data.extend_from_slice(&self.amount.to_le_bytes());
        data.extend_from_slice(&self.fee.to_le_bytes());
        data.extend_from_slice(&self.deadline.to_le_bytes());
        data.extend_from_slice(&self.payload);
        
        hash(&data).to_bytes()
    }
    
    pub fn verify_hash(&self) -> bool {
        self.hash == self.calculate_hash()
    }
}

// Bridge statistics for monitoring and analytics
#[account]
pub struct BridgeStats {
    pub total_volume_nock_to_sol: u64,
    pub total_volume_sol_to_nock: u64,
    pub total_transactions: u64,
    pub total_fees_collected: u64,
    pub daily_volume: u64,
    pub daily_transactions: u32,
    pub last_reset_timestamp: i64,
    pub peak_daily_volume: u64,
    pub peak_daily_transactions: u32,
    pub average_transaction_size: u64,
    pub largest_transaction: u64,
    pub uptime_percentage: u16, // basis points
    pub last_downtime: Option<i64>,
    pub validator_performance: Vec<ValidatorPerformance>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidatorPerformance {
    pub validator: Pubkey,
    pub signatures_provided: u64,
    pub signatures_missed: u64,
    pub last_activity: i64,
    pub uptime_percentage: u16,
    pub performance_score: u16, // 0-10000 basis points
}

impl BridgeStats {
    pub const SPACE: usize = 8 + // discriminator
        8 + // total_volume_nock_to_sol
        8 + // total_volume_sol_to_nock
        8 + // total_transactions
        8 + // total_fees_collected
        8 + // daily_volume
        4 + // daily_transactions
        8 + // last_reset_timestamp
        8 + // peak_daily_volume
        4 + // peak_daily_transactions
        8 + // average_transaction_size
        8 + // largest_transaction
        2 + // uptime_percentage
        1 + 8 + // last_downtime (Option<i64>)
        4 + (15 * ValidatorPerformance::SPACE); // validator_performance (max 15)
}

impl ValidatorPerformance {
    pub const SPACE: usize = 32 + // validator
        8 + // signatures_provided
        8 + // signatures_missed
        8 + // last_activity
        2 + // uptime_percentage
        2;  // performance_score
}

// Emergency response system
#[account]
pub struct EmergencyState {
    pub is_emergency: bool,
    pub emergency_type: EmergencyType,
    pub triggered_at: i64,
    pub triggered_by: Pubkey,
    pub reason: String,
    pub recovery_plan: Vec<RecoveryStep>,
    pub estimated_recovery_time: i64,
    pub affected_systems: Vec<SystemComponent>,
    pub current_step: u8,
    pub recovery_progress: u8, // percentage
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum EmergencyType {
    SecurityBreach,
    SystemFailure,
    ExploitDetected,
    ValidatorCompromise,
    LiquidityDrain,
    OracleFailure,
    NetworkCongestion,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RecoveryStep {
    pub step_id: u8,
    pub description: String,
    pub required_signatures: u8,
    pub completed: bool,
    pub completed_at: Option<i64>,
    pub required_delay: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum SystemComponent {
    Bridge,
    Validator,
    Liquidity,
    Oracle,
    Emergency,
    Monitoring,
}

impl EmergencyState {
    pub const SPACE: usize = 8 + // discriminator
        1 + // is_emergency
        1 + // emergency_type
        8 + // triggered_at
        32 + // triggered_by
        4 + 256 + // reason (String with max 256 chars)
        4 + (10 * RecoveryStep::SPACE) + // recovery_plan (max 10 steps)
        8 + // estimated_recovery_time
        4 + (6 * 1) + // affected_systems (max 6 components)
        1 + // current_step
        1;  // recovery_progress
}

impl RecoveryStep {
    pub const SPACE: usize = 1 + // step_id
        4 + 512 + // description (String with max 512 chars)
        1 + // required_signatures
        1 + // completed
        1 + 8 + // completed_at (Option<i64>)
        8;  // required_delay
}

// Rate limiting and security controls
#[account]
pub struct SecurityControls {
    pub rate_limits: RateLimits,
    pub blacklisted_addresses: Vec<Pubkey>,
    pub whitelisted_addresses: Vec<Pubkey>,
    pub suspicious_activity_threshold: u64,
    pub auto_pause_enabled: bool,
    pub max_transaction_size: u64,
    pub min_transaction_size: u64,
    pub daily_withdrawal_limit: u64,
    pub hourly_transaction_limit: u32,
    pub geo_restrictions: Vec<String>, // Country codes
    pub compliance_level: ComplianceLevel,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RateLimits {
    pub per_user_daily_limit: u64,
    pub per_user_hourly_limit: u64,
    pub global_hourly_limit: u64,
    pub burst_limit: u32,
    pub cooldown_period: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum ComplianceLevel {
    Basic,
    Standard,
    Enhanced,
    Institutional,
}

impl SecurityControls {
    pub const SPACE: usize = 8 + // discriminator
        RateLimits::SPACE +
        4 + (100 * 32) + // blacklisted_addresses (max 100)
        4 + (50 * 32) + // whitelisted_addresses (max 50)
        8 + // suspicious_activity_threshold
        1 + // auto_pause_enabled
        8 + // max_transaction_size
        8 + // min_transaction_size
        8 + // daily_withdrawal_limit
        4 + // hourly_transaction_limit
        4 + (20 * 8) + // geo_restrictions (max 20 countries, 8 chars each)
        1;  // compliance_level
}

impl RateLimits {
    pub const SPACE: usize = 8 + // per_user_daily_limit
        8 + // per_user_hourly_limit
        8 + // global_hourly_limit
        4 + // burst_limit
        8;  // cooldown_period
}