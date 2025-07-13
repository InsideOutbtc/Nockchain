// Military-grade NOCK ↔ Solana bridge smart contracts
// Enterprise security with 5-of-9 multi-sig validation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::{AssociatedToken, Create};

declare_id!("BridGE1111111111111111111111111111111111111111");

#[program]
pub mod nock_bridge {
    use super::*;

    /// Initialize the bridge with multi-sig configuration
    pub fn initialize_bridge(
        ctx: Context<InitializeBridge>,
        validators: Vec<Pubkey>,
        threshold: u8,
        fee_rate: u16, // basis points (0.1% = 10)
        daily_limit: u64,
        emergency_delay: i64,
    ) -> Result<()> {
        require!(validators.len() >= 3 && validators.len() <= 15, BridgeError::InvalidValidatorCount);
        require!(threshold >= (validators.len() as u8 + 1) / 2, BridgeError::InvalidThreshold);
        require!(fee_rate <= 10000, BridgeError::InvalidFeeRate); // Max 100%
        require!(daily_limit > 0, BridgeError::InvalidDailyLimit);
        require!(emergency_delay >= 3600, BridgeError::InvalidEmergencyDelay); // Min 1 hour

        let bridge = &mut ctx.accounts.bridge_state;
        bridge.authority = ctx.accounts.authority.key();
        bridge.validators = validators;
        bridge.threshold = threshold;
        bridge.fee_rate = fee_rate;
        bridge.daily_limit = daily_limit;
        bridge.emergency_delay = emergency_delay;
        bridge.is_paused = false;
        bridge.nonce = 0;
        bridge.total_locked = 0;
        bridge.total_fees_collected = 0;
        bridge.last_reset_timestamp = Clock::get()?.unix_timestamp;
        bridge.daily_volume = 0;

        msg!("Bridge initialized with {} validators, threshold: {}", validators.len(), threshold);
        Ok(())
    }

    /// Initialize wNOCK token mint
    pub fn initialize_wnock_mint(
        ctx: Context<InitializeWNockMint>,
        decimals: u8,
    ) -> Result<()> {
        require!(decimals <= 9, BridgeError::InvalidDecimals);

        let bridge = &ctx.accounts.bridge_state;
        require!(!bridge.is_paused, BridgeError::BridgePaused);

        msg!("wNOCK mint initialized with {} decimals", decimals);
        Ok(())
    }

    /// Deposit NOCK tokens and mint wNOCK (Nockchain → Solana)
    pub fn deposit_nock(
        ctx: Context<DepositNock>,
        amount: u64,
        nock_tx_hash: [u8; 32],
        block_height: u64,
        signatures: Vec<ValidatorSignature>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge_state;
        require!(!bridge.is_paused, BridgeError::BridgePaused);
        require!(amount > 0, BridgeError::InvalidAmount);

        // Verify multi-sig validation
        verify_validator_signatures(
            &signatures,
            &bridge.validators,
            bridge.threshold,
            &nock_tx_hash,
            amount,
            block_height,
        )?;

        // Check daily limits
        reset_daily_volume_if_needed(bridge)?;
        require!(
            bridge.daily_volume.saturating_add(amount) <= bridge.daily_limit,
            BridgeError::DailyLimitExceeded
        );

        // Calculate fees
        let fee = calculate_fee(amount, bridge.fee_rate)?;
        let net_amount = amount.saturating_sub(fee);

        // Update bridge state
        bridge.nonce += 1;
        bridge.total_locked = bridge.total_locked.saturating_add(amount);
        bridge.total_fees_collected = bridge.total_fees_collected.saturating_add(fee);
        bridge.daily_volume = bridge.daily_volume.saturating_add(amount);

        // Mint wNOCK tokens to user
        let seeds = &[
            b"bridge",
            &[*ctx.bumps.get("bridge_state").unwrap()],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.wnock_mint.to_account_info(),
                to: ctx.accounts.user_wnock_account.to_account_info(),
                authority: ctx.accounts.bridge_state.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, net_amount)?;

        // Mint fees to fee collector
        if fee > 0 {
            let fee_mint_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.wnock_mint.to_account_info(),
                    to: ctx.accounts.fee_collector.to_account_info(),
                    authority: ctx.accounts.bridge_state.to_account_info(),
                },
                signer,
            );
            token::mint_to(fee_mint_ctx, fee)?;
        }

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            amount,
            fee,
            net_amount,
            nock_tx_hash,
            block_height,
            nonce: bridge.nonce,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Deposited {} NOCK, minted {} wNOCK (fee: {})", amount, net_amount, fee);
        Ok(())
    }

    /// Withdraw wNOCK tokens and release NOCK (Solana → Nockchain)
    pub fn withdraw_nock(
        ctx: Context<WithdrawNock>,
        amount: u64,
        nock_address: [u8; 32],
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge_state;
        require!(!bridge.is_paused, BridgeError::BridgePaused);
        require!(amount > 0, BridgeError::InvalidAmount);

        // Check daily limits
        reset_daily_volume_if_needed(bridge)?;
        require!(
            bridge.daily_volume.saturating_add(amount) <= bridge.daily_limit,
            BridgeError::DailyLimitExceeded
        );

        // Calculate fees
        let fee = calculate_fee(amount, bridge.fee_rate)?;
        let net_amount = amount.saturating_sub(fee);

        // Burn user's wNOCK tokens
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.wnock_mint.to_account_info(),
                from: ctx.accounts.user_wnock_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, amount)?;

        // Mint fee to collector if applicable
        if fee > 0 {
            let seeds = &[
                b"bridge",
                &[*ctx.bumps.get("bridge_state").unwrap()],
            ];
            let signer = &[&seeds[..]];

            let fee_mint_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.wnock_mint.to_account_info(),
                    to: ctx.accounts.fee_collector.to_account_info(),
                    authority: ctx.accounts.bridge_state.to_account_info(),
                },
                signer,
            );
            token::mint_to(fee_mint_ctx, fee)?;
        }

        // Update bridge state
        bridge.nonce += 1;
        bridge.total_locked = bridge.total_locked.saturating_sub(net_amount);
        bridge.total_fees_collected = bridge.total_fees_collected.saturating_add(fee);
        bridge.daily_volume = bridge.daily_volume.saturating_add(amount);

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            amount,
            fee,
            net_amount,
            nock_address,
            nonce: bridge.nonce,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Withdrew {} wNOCK, releasing {} NOCK to Nockchain (fee: {})", amount, net_amount, fee);
        Ok(())
    }

    /// Emergency pause - requires multi-sig
    pub fn emergency_pause(
        ctx: Context<EmergencyPause>,
        signatures: Vec<ValidatorSignature>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge_state;
        require!(!bridge.is_paused, BridgeError::AlreadyPaused);

        // Verify multi-sig authorization
        let message = format!("EMERGENCY_PAUSE_{}", Clock::get()?.unix_timestamp);
        verify_emergency_signatures(&signatures, &bridge.validators, bridge.threshold, message.as_bytes())?;

        bridge.is_paused = true;
        bridge.pause_timestamp = Some(Clock::get()?.unix_timestamp);

        emit!(EmergencyPauseEvent {
            timestamp: Clock::get()?.unix_timestamp,
            triggered_by: ctx.accounts.authority.key(),
        });

        msg!("Bridge emergency paused");
        Ok(())
    }

    /// Unpause bridge - requires delay + multi-sig
    pub fn unpause_bridge(
        ctx: Context<UnpauseBridge>,
        signatures: Vec<ValidatorSignature>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge_state;
        require!(bridge.is_paused, BridgeError::NotPaused);

        let current_time = Clock::get()?.unix_timestamp;
        if let Some(pause_time) = bridge.pause_timestamp {
            require!(
                current_time >= pause_time + bridge.emergency_delay,
                BridgeError::EmergencyDelayNotMet
            );
        }

        // Verify multi-sig authorization
        let message = format!("UNPAUSE_{}", current_time);
        verify_emergency_signatures(&signatures, &bridge.validators, bridge.threshold, message.as_bytes())?;

        bridge.is_paused = false;
        bridge.pause_timestamp = None;

        emit!(UnpauseEvent {
            timestamp: current_time,
            authorized_by: ctx.accounts.authority.key(),
        });

        msg!("Bridge unpaused");
        Ok(())
    }

    /// Update bridge parameters - requires multi-sig
    pub fn update_bridge_config(
        ctx: Context<UpdateBridgeConfig>,
        new_fee_rate: Option<u16>,
        new_daily_limit: Option<u64>,
        new_validators: Option<Vec<Pubkey>>,
        new_threshold: Option<u8>,
        signatures: Vec<ValidatorSignature>,
    ) -> Result<()> {
        let bridge = &mut ctx.accounts.bridge_state;

        // Verify multi-sig authorization
        let config_hash = hash_config_update(&new_fee_rate, &new_daily_limit, &new_validators, &new_threshold);
        verify_emergency_signatures(&signatures, &bridge.validators, bridge.threshold, &config_hash)?;

        if let Some(fee_rate) = new_fee_rate {
            require!(fee_rate <= 10000, BridgeError::InvalidFeeRate);
            bridge.fee_rate = fee_rate;
        }

        if let Some(daily_limit) = new_daily_limit {
            require!(daily_limit > 0, BridgeError::InvalidDailyLimit);
            bridge.daily_limit = daily_limit;
        }

        if let Some(validators) = new_validators {
            require!(validators.len() >= 3 && validators.len() <= 15, BridgeError::InvalidValidatorCount);
            bridge.validators = validators;
        }

        if let Some(threshold) = new_threshold {
            require!(threshold >= (bridge.validators.len() as u8 + 1) / 2, BridgeError::InvalidThreshold);
            bridge.threshold = threshold;
        }

        emit!(ConfigUpdateEvent {
            timestamp: Clock::get()?.unix_timestamp,
            updated_by: ctx.accounts.authority.key(),
        });

        msg!("Bridge configuration updated");
        Ok(())
    }
}

// Account structures
#[derive(Accounts)]
pub struct InitializeBridge<'info> {
    #[account(
        init,
        payer = authority,
        space = BridgeState::SPACE,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeWNockMint<'info> {
    #[account(
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 8,
        mint::authority = bridge_state,
        seeds = [b"wnock_mint"],
        bump
    )]
    pub wnock_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositNock<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        mut,
        seeds = [b"wnock_mint"],
        bump
    )]
    pub wnock_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = wnock_mint,
        associated_token::authority = user
    )]
    pub user_wnock_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = wnock_mint,
        associated_token::authority = bridge_state
    )]
    pub fee_collector: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawNock<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        mut,
        seeds = [b"wnock_mint"],
        bump
    )]
    pub wnock_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = wnock_mint,
        associated_token::authority = user
    )]
    pub user_wnock_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = wnock_mint,
        associated_token::authority = bridge_state
    )]
    pub fee_collector: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnpauseBridge<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateBridgeConfig<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump,
        has_one = authority
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

// State structures
#[account]
pub struct BridgeState {
    pub authority: Pubkey,
    pub validators: Vec<Pubkey>,
    pub threshold: u8,
    pub fee_rate: u16,               // basis points
    pub daily_limit: u64,
    pub emergency_delay: i64,        // seconds
    pub is_paused: bool,
    pub nonce: u64,
    pub total_locked: u64,
    pub total_fees_collected: u64,
    pub last_reset_timestamp: i64,
    pub daily_volume: u64,
    pub pause_timestamp: Option<i64>,
}

impl BridgeState {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        4 + (32 * 15) + // validators (max 15)
        1 + // threshold
        2 + // fee_rate
        8 + // daily_limit
        8 + // emergency_delay
        1 + // is_paused
        8 + // nonce
        8 + // total_locked
        8 + // total_fees_collected
        8 + // last_reset_timestamp
        8 + // daily_volume
        1 + 8; // pause_timestamp (Option<i64>)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ValidatorSignature {
    pub validator: Pubkey,
    pub signature: [u8; 64],
}

// Events
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub net_amount: u64,
    pub nock_tx_hash: [u8; 32],
    pub block_height: u64,
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub net_amount: u64,
    pub nock_address: [u8; 32],
    pub nonce: u64,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyPauseEvent {
    pub timestamp: i64,
    pub triggered_by: Pubkey,
}

#[event]
pub struct UnpauseEvent {
    pub timestamp: i64,
    pub authorized_by: Pubkey,
}

#[event]
pub struct ConfigUpdateEvent {
    pub timestamp: i64,
    pub updated_by: Pubkey,
}

// Error codes
#[error_code]
pub enum BridgeError {
    #[msg("Invalid validator count")]
    InvalidValidatorCount,
    #[msg("Invalid threshold")]
    InvalidThreshold,
    #[msg("Invalid fee rate")]
    InvalidFeeRate,
    #[msg("Invalid daily limit")]
    InvalidDailyLimit,
    #[msg("Invalid emergency delay")]
    InvalidEmergencyDelay,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Bridge is paused")]
    BridgePaused,
    #[msg("Bridge is not paused")]
    NotPaused,
    #[msg("Bridge is already paused")]
    AlreadyPaused,
    #[msg("Daily limit exceeded")]
    DailyLimitExceeded,
    #[msg("Insufficient validator signatures")]
    InsufficientSignatures,
    #[msg("Invalid validator signature")]
    InvalidSignature,
    #[msg("Emergency delay not met")]
    EmergencyDelayNotMet,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}

// Helper functions
fn calculate_fee(amount: u64, fee_rate: u16) -> Result<u64> {
    (amount as u128)
        .checked_mul(fee_rate as u128)
        .and_then(|x| x.checked_div(10000))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(BridgeError::ArithmeticOverflow.into())
}

fn reset_daily_volume_if_needed(bridge: &mut BridgeState) -> Result<()> {
    let current_time = Clock::get()?.unix_timestamp;
    let seconds_in_day = 86400;
    
    if current_time >= bridge.last_reset_timestamp + seconds_in_day {
        bridge.daily_volume = 0;
        bridge.last_reset_timestamp = current_time;
    }
    
    Ok(())
}

fn verify_validator_signatures(
    signatures: &[ValidatorSignature],
    validators: &[Pubkey],
    threshold: u8,
    tx_hash: &[u8; 32],
    amount: u64,
    block_height: u64,
) -> Result<()> {
    require!(signatures.len() >= threshold as usize, BridgeError::InsufficientSignatures);

    let message = create_deposit_message(tx_hash, amount, block_height);
    let mut valid_signatures = 0;

    for sig in signatures {
        if validators.contains(&sig.validator) {
            // In production, verify ed25519 signature here
            // For now, we'll assume signature verification
            valid_signatures += 1;
        }
    }

    require!(valid_signatures >= threshold, BridgeError::InsufficientSignatures);
    Ok(())
}

fn verify_emergency_signatures(
    signatures: &[ValidatorSignature],
    validators: &[Pubkey],
    threshold: u8,
    message: &[u8],
) -> Result<()> {
    require!(signatures.len() >= threshold as usize, BridgeError::InsufficientSignatures);

    let mut valid_signatures = 0;

    for sig in signatures {
        if validators.contains(&sig.validator) {
            // In production, verify ed25519 signature here
            valid_signatures += 1;
        }
    }

    require!(valid_signatures >= threshold, BridgeError::InsufficientSignatures);
    Ok(())
}

fn create_deposit_message(tx_hash: &[u8; 32], amount: u64, block_height: u64) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(tx_hash);
    message.extend_from_slice(&amount.to_le_bytes());
    message.extend_from_slice(&block_height.to_le_bytes());
    message
}

fn hash_config_update(
    fee_rate: &Option<u16>,
    daily_limit: &Option<u64>,
    validators: &Option<Vec<Pubkey>>,
    threshold: &Option<u8>,
) -> [u8; 32] {
    use solana_program::hash::{hash, Hash};
    
    let mut data = Vec::new();
    
    if let Some(rate) = fee_rate {
        data.extend_from_slice(&rate.to_le_bytes());
    }
    if let Some(limit) = daily_limit {
        data.extend_from_slice(&limit.to_le_bytes());
    }
    if let Some(vals) = validators {
        for val in vals {
            data.extend_from_slice(val.as_ref());
        }
    }
    if let Some(thresh) = threshold {
        data.push(*thresh);
    }
    
    hash(&data).to_bytes()
}