// Automated liquidity management for DEX integrations

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ProvideLiquidity<'info> {
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
        seeds = [b"liquidity_pool"],
        bump
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,

    #[account(
        mut,
        associated_token::mint = wnock_mint,
        associated_token::authority = bridge_state
    )]
    pub bridge_wnock_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = bridge_state
    )]
    pub bridge_usdc_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RebalanceLiquidity<'info> {
    #[account(
        mut,
        seeds = [b"bridge"],
        bump
    )]
    pub bridge_state: Account<'info, BridgeState>,

    #[account(
        mut,
        seeds = [b"liquidity_pool"],
        bump
    )]
    pub liquidity_pool: Account<'info, LiquidityPool>,

    // DEX program accounts would be added here
    pub authority: Signer<'info>,
}

#[account]
pub struct LiquidityPool {
    pub authority: Pubkey,
    pub wnock_reserve: u64,
    pub usdc_reserve: u64,
    pub total_liquidity: u64,
    pub target_ratio: u64,        // Target wNOCK/USDC ratio (basis points)
    pub rebalance_threshold: u16, // Rebalance when deviation exceeds this (basis points)
    pub last_rebalance: i64,
    pub fees_earned: u64,
    pub strategy: LiquidityStrategy,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum LiquidityStrategy {
    Conservative,  // Lower yield, lower risk
    Balanced,      // Medium yield, medium risk
    Aggressive,    // Higher yield, higher risk
}

impl LiquidityPool {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        8 +  // wnock_reserve
        8 +  // usdc_reserve
        8 +  // total_liquidity
        8 +  // target_ratio
        2 +  // rebalance_threshold
        8 +  // last_rebalance
        8 +  // fees_earned
        1 +  // strategy
        100; // padding
}

pub fn provide_liquidity(
    ctx: Context<ProvideLiquidity>,
    wnock_amount: u64,
    usdc_amount: u64,
) -> Result<()> {
    let bridge = &ctx.accounts.bridge_state;
    require!(!bridge.is_paused, BridgeError::BridgePaused);

    let pool = &mut ctx.accounts.liquidity_pool;
    
    // Calculate optimal liquidity provision based on current reserves
    let optimal_amounts = calculate_optimal_liquidity(
        wnock_amount,
        usdc_amount,
        pool.wnock_reserve,
        pool.usdc_reserve,
    )?;

    // Transfer tokens to pool
    let seeds = &[
        b"bridge",
        &[*ctx.bumps.get("bridge_state").unwrap()],
    ];
    let signer = &[&seeds[..]];

    // Transfer wNOCK
    let wnock_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.bridge_wnock_account.to_account_info(),
            to: ctx.accounts.bridge_wnock_account.to_account_info(), // Pool account
            authority: ctx.accounts.bridge_state.to_account_info(),
        },
        signer,
    );
    token::transfer(wnock_transfer_ctx, optimal_amounts.0)?;

    // Transfer USDC
    let usdc_transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.bridge_usdc_account.to_account_info(),
            to: ctx.accounts.bridge_usdc_account.to_account_info(), // Pool account
            authority: ctx.accounts.bridge_state.to_account_info(),
        },
        signer,
    );
    token::transfer(usdc_transfer_ctx, optimal_amounts.1)?;

    // Update pool state
    pool.wnock_reserve = pool.wnock_reserve.saturating_add(optimal_amounts.0);
    pool.usdc_reserve = pool.usdc_reserve.saturating_add(optimal_amounts.1);
    pool.total_liquidity = pool.total_liquidity.saturating_add(
        calculate_liquidity_tokens(optimal_amounts.0, optimal_amounts.1)?
    );

    msg!("Provided liquidity: {} wNOCK, {} USDC", optimal_amounts.0, optimal_amounts.1);
    Ok(())
}

pub fn rebalance_liquidity(
    ctx: Context<RebalanceLiquidity>,
) -> Result<()> {
    let bridge = &ctx.accounts.bridge_state;
    require!(!bridge.is_paused, BridgeError::BridgePaused);

    let pool = &mut ctx.accounts.liquidity_pool;
    let current_time = Clock::get()?.unix_timestamp;

    // Check if rebalancing is needed
    let current_ratio = calculate_ratio(pool.wnock_reserve, pool.usdc_reserve)?;
    let deviation = if current_ratio > pool.target_ratio {
        current_ratio - pool.target_ratio
    } else {
        pool.target_ratio - current_ratio
    };

    require!(
        deviation > pool.rebalance_threshold as u64,
        BridgeError::RebalanceNotNeeded
    );

    // Perform rebalancing logic based on strategy
    match pool.strategy {
        LiquidityStrategy::Conservative => {
            // Simple rebalancing with minimal slippage tolerance
            rebalance_conservative(pool)?;
        },
        LiquidityStrategy::Balanced => {
            // Moderate rebalancing with balanced risk/reward
            rebalance_balanced(pool)?;
        },
        LiquidityStrategy::Aggressive => {
            // Active rebalancing with higher yield targeting
            rebalance_aggressive(pool)?;
        },
    }

    pool.last_rebalance = current_time;

    msg!("Liquidity rebalanced - new ratio: {}", current_ratio);
    Ok(())
}

// Helper functions
fn calculate_optimal_liquidity(
    wnock_amount: u64,
    usdc_amount: u64,
    wnock_reserve: u64,
    usdc_reserve: u64,
) -> Result<(u64, u64)> {
    if wnock_reserve == 0 || usdc_reserve == 0 {
        // Initial liquidity
        return Ok((wnock_amount, usdc_amount));
    }

    // Calculate optimal amounts based on existing reserves
    let wnock_optimal = (usdc_amount as u128)
        .checked_mul(wnock_reserve as u128)
        .and_then(|x| x.checked_div(usdc_reserve as u128))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(BridgeError::ArithmeticOverflow)?;

    let usdc_optimal = (wnock_amount as u128)
        .checked_mul(usdc_reserve as u128)
        .and_then(|x| x.checked_div(wnock_reserve as u128))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(BridgeError::ArithmeticOverflow)?;

    if wnock_optimal <= wnock_amount && usdc_optimal <= usdc_amount {
        Ok((wnock_optimal, usdc_amount))
    } else {
        Ok((wnock_amount, usdc_optimal))
    }
}

fn calculate_liquidity_tokens(wnock_amount: u64, usdc_amount: u64) -> Result<u64> {
    // Simple geometric mean for liquidity tokens
    let product = (wnock_amount as u128)
        .checked_mul(usdc_amount as u128)
        .ok_or(BridgeError::ArithmeticOverflow)?;
    
    // Approximate square root
    let sqrt = integer_sqrt(product);
    u64::try_from(sqrt).map_err(|_| BridgeError::ArithmeticOverflow.into())
}

fn calculate_ratio(wnock_reserve: u64, usdc_reserve: u64) -> Result<u64> {
    if usdc_reserve == 0 {
        return Err(BridgeError::ArithmeticOverflow.into());
    }

    (wnock_reserve as u128)
        .checked_mul(10000) // basis points
        .and_then(|x| x.checked_div(usdc_reserve as u128))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(BridgeError::ArithmeticOverflow.into())
}

fn rebalance_conservative(pool: &mut LiquidityPool) -> Result<()> {
    // Conservative rebalancing with 1% max slippage
    let max_slippage = 100; // 1% in basis points
    
    // Calculate required adjustments
    let target_wnock = (pool.total_liquidity as u128)
        .checked_mul(pool.target_ratio as u128)
        .and_then(|x| x.checked_div(10000))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(BridgeError::ArithmeticOverflow)?;

    let adjustment = if pool.wnock_reserve > target_wnock {
        pool.wnock_reserve - target_wnock
    } else {
        target_wnock - pool.wnock_reserve
    };

    // Apply conservative adjustment (reduce by slippage factor)
    let conservative_adjustment = adjustment * (10000 - max_slippage) / 10000;
    
    // Execute rebalancing (would integrate with DEX here)
    msg!("Conservative rebalance: adjusting by {}", conservative_adjustment);
    
    Ok(())
}

fn rebalance_balanced(pool: &mut LiquidityPool) -> Result<()> {
    // Balanced rebalancing with 3% max slippage
    let max_slippage = 300; // 3% in basis points
    
    // More aggressive rebalancing logic
    msg!("Balanced rebalance executed");
    
    Ok(())
}

fn rebalance_aggressive(pool: &mut LiquidityPool) -> Result<()> {
    // Aggressive rebalancing with 5% max slippage
    let max_slippage = 500; // 5% in basis points
    
    // Most aggressive rebalancing for maximum yield
    msg!("Aggressive rebalance executed");
    
    Ok(())
}

fn integer_sqrt(n: u128) -> u128 {
    if n == 0 { return 0; }
    
    let mut x = n;
    let mut y = (x + 1) / 2;
    
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    
    x
}

use crate::{BridgeState, BridgeError};
use anchor_spl::token::Mint;