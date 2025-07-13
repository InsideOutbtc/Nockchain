// Price oracle integration for accurate cross-chain valuations

use anchor_lang::prelude::*;
use pyth_sdk_solana::load_price_feed_from_account_info;
use switchboard_v2::AggregatorAccountData;

#[account]
pub struct PriceOracle {
    pub authority: Pubkey,
    pub nock_price_feed: Pubkey,      // Pyth or Switchboard price feed
    pub sol_price_feed: Pubkey,       // SOL/USD price feed
    pub usdc_price_feed: Pubkey,      // USDC/USD price feed
    pub last_update_timestamp: i64,
    pub price_staleness_threshold: i64, // seconds
    pub max_price_deviation: u16,    // basis points
    pub confidence_threshold: u64,   // minimum confidence level
    pub circuit_breaker_enabled: bool,
    pub emergency_price: Option<u64>, // fallback price in emergency
    pub price_history: Vec<PricePoint>,
    pub oracle_type: OracleType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PricePoint {
    pub timestamp: i64,
    pub price: u64,
    pub confidence: u64,
    pub expo: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum OracleType {
    Pyth,
    Switchboard,
    Hybrid,
    Manual, // For emergency use
}

impl PriceOracle {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        32 + // nock_price_feed
        32 + // sol_price_feed
        32 + // usdc_price_feed
        8 + // last_update_timestamp
        8 + // price_staleness_threshold
        2 + // max_price_deviation
        8 + // confidence_threshold
        1 + // circuit_breaker_enabled
        1 + 8 + // emergency_price (Option<u64>)
        4 + (100 * PricePoint::SPACE) + // price_history (max 100 points)
        1; // oracle_type
}

impl PricePoint {
    pub const SPACE: usize = 8 + // timestamp
        8 + // price
        8 + // confidence
        4;  // expo
}

pub fn get_nock_price(oracle: &Account<PriceOracle>, pyth_account: &AccountInfo) -> Result<u64> {
    match oracle.oracle_type {
        OracleType::Pyth => get_pyth_price(pyth_account, oracle.confidence_threshold),
        OracleType::Switchboard => get_switchboard_price(pyth_account, oracle.confidence_threshold),
        OracleType::Hybrid => {
            // Try Pyth first, fallback to Switchboard
            get_pyth_price(pyth_account, oracle.confidence_threshold)
                .or_else(|_| get_switchboard_price(pyth_account, oracle.confidence_threshold))
        },
        OracleType::Manual => {
            oracle.emergency_price.ok_or(crate::BridgeError::NoPriceAvailable.into())
        },
    }
}

fn get_pyth_price(price_account: &AccountInfo, min_confidence: u64) -> Result<u64> {
    let price_feed = load_price_feed_from_account_info(price_account)
        .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
    
    let current_timestamp = Clock::get()?.unix_timestamp;
    let price = price_feed.get_price_unchecked();
    
    // Check price staleness (within last 60 seconds)
    require!(
        current_timestamp - price.publish_time <= 60,
        crate::BridgeError::StalePriceData
    );
    
    // Check confidence level
    require!(
        price.conf <= min_confidence,
        crate::BridgeError::LowPriceConfidence
    );
    
    // Convert price to u64 (handle negative exponents)
    let adjusted_price = if price.expo < 0 {
        (price.price as u64) / 10u64.pow((-price.expo) as u32)
    } else {
        (price.price as u64) * 10u64.pow(price.expo as u32)
    };
    
    Ok(adjusted_price)
}

fn get_switchboard_price(aggregator_account: &AccountInfo, min_confidence: u64) -> Result<u64> {
    let aggregator = AggregatorAccountData::new(aggregator_account)
        .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
    
    let round_result = aggregator.get_result()
        .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
    
    let current_timestamp = Clock::get()?.unix_timestamp;
    
    // Check staleness
    require!(
        current_timestamp - round_result.round_open_timestamp <= 60,
        crate::BridgeError::StalePriceData
    );
    
    // Switchboard uses different confidence calculation
    let confidence_interval = round_result.max_response - round_result.min_response;
    require!(
        confidence_interval <= min_confidence,
        crate::BridgeError::LowPriceConfidence
    );
    
    // Convert to u64
    let price = round_result.result.try_into()
        .map_err(|_| crate::BridgeError::InvalidPriceData)?;
    
    Ok(price)
}

pub fn update_price_history(
    oracle: &mut Account<PriceOracle>,
    price: u64,
    confidence: u64,
    expo: i32,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    
    let price_point = PricePoint {
        timestamp: current_timestamp,
        price,
        confidence,
        expo,
    };
    
    // Add to history, maintaining max size
    oracle.price_history.push(price_point);
    if oracle.price_history.len() > 100 {
        oracle.price_history.remove(0);
    }
    
    oracle.last_update_timestamp = current_timestamp;
    
    Ok(())
}

pub fn detect_price_manipulation(
    oracle: &Account<PriceOracle>,
    new_price: u64,
) -> Result<bool> {
    if oracle.price_history.is_empty() {
        return Ok(false);
    }
    
    // Get recent average (last 10 points)
    let recent_points: Vec<_> = oracle.price_history
        .iter()
        .rev()
        .take(10)
        .collect();
    
    if recent_points.is_empty() {
        return Ok(false);
    }
    
    let average_price: u64 = recent_points
        .iter()
        .map(|p| p.price)
        .sum::<u64>() / recent_points.len() as u64;
    
    // Calculate deviation
    let deviation = if new_price > average_price {
        ((new_price - average_price) * 10000) / average_price
    } else {
        ((average_price - new_price) * 10000) / average_price
    };
    
    // Flag if deviation exceeds threshold
    Ok(deviation > oracle.max_price_deviation as u64)
}

pub fn calculate_cross_chain_value(
    nock_amount: u64,
    nock_price: u64,
    target_token_price: u64,
) -> Result<u64> {
    // Calculate USD value of NOCK
    let usd_value = (nock_amount as u128)
        .checked_mul(nock_price as u128)
        .ok_or(crate::BridgeError::ArithmeticOverflow)?;
    
    // Convert to target token amount
    let target_amount = usd_value
        .checked_div(target_token_price as u128)
        .ok_or(crate::BridgeError::ArithmeticOverflow)?;
    
    u64::try_from(target_amount)
        .map_err(|_| crate::BridgeError::ArithmeticOverflow.into())
}

pub fn validate_price_feeds(
    oracle: &Account<PriceOracle>,
    pyth_accounts: &[AccountInfo],
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    
    // Validate each price feed
    for account in pyth_accounts {
        match oracle.oracle_type {
            OracleType::Pyth | OracleType::Hybrid => {
                let price_feed = load_price_feed_from_account_info(account)
                    .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
                
                let price = price_feed.get_price_unchecked();
                
                require!(
                    current_timestamp - price.publish_time <= oracle.price_staleness_threshold,
                    crate::BridgeError::StalePriceData
                );
            },
            OracleType::Switchboard => {
                let aggregator = AggregatorAccountData::new(account)
                    .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
                
                let round_result = aggregator.get_result()
                    .map_err(|_| crate::BridgeError::InvalidPriceFeed)?;
                
                require!(
                    current_timestamp - round_result.round_open_timestamp <= oracle.price_staleness_threshold,
                    crate::BridgeError::StalePriceData
                );
            },
            OracleType::Manual => {
                // Manual mode doesn't require external validation
            },
        }
    }
    
    Ok(())
}

// Circuit breaker for price anomalies
pub fn check_circuit_breaker(
    oracle: &Account<PriceOracle>,
    current_price: u64,
) -> Result<bool> {
    if !oracle.circuit_breaker_enabled {
        return Ok(false);
    }
    
    // Check against emergency price if set
    if let Some(emergency_price) = oracle.emergency_price {
        let deviation = if current_price > emergency_price {
            ((current_price - emergency_price) * 10000) / emergency_price
        } else {
            ((emergency_price - current_price) * 10000) / emergency_price
        };
        
        // Trip breaker if deviation > 20%
        if deviation > 2000 {
            return Ok(true);
        }
    }
    
    // Check against recent history for sudden spikes
    if let Some(recent_point) = oracle.price_history.last() {
        let time_diff = Clock::get()?.unix_timestamp - recent_point.timestamp;
        
        // If price moved > 10% in < 5 minutes, trip breaker
        if time_diff < 300 {
            let deviation = if current_price > recent_point.price {
                ((current_price - recent_point.price) * 10000) / recent_point.price
            } else {
                ((recent_point.price - current_price) * 10000) / recent_point.price
            };
            
            if deviation > 1000 {
                return Ok(true);
            }
        }
    }
    
    Ok(false)
}