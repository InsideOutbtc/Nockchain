// TypeScript client SDK for NOCK bridge integration

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  ConfirmOptions,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { Program, Provider, BN, web3 } from '@coral-xyz/anchor';
import { NockBridge } from '../../target/types/nock_bridge';
import { IDL } from '../../target/types/nock_bridge';

export interface BridgeConfig {
  programId: PublicKey;
  connection: Connection;
  authority?: Keypair;
  confirmOptions?: ConfirmOptions;
}

export interface DepositParams {
  amount: BN;
  nockTxHash: number[];
  blockHeight: BN;
  signatures: ValidatorSignature[];
  user: Keypair;
}

export interface WithdrawParams {
  amount: BN;
  nockAddress: number[];
  user: Keypair;
}

export interface ValidatorSignature {
  validator: PublicKey;
  signature: number[];
}

export interface BridgeState {
  authority: PublicKey;
  validators: PublicKey[];
  threshold: number;
  feeRate: number;
  dailyLimit: BN;
  emergencyDelay: BN;
  isPaused: boolean;
  nonce: BN;
  totalLocked: BN;
  totalFeesCollected: BN;
  lastResetTimestamp: BN;
  dailyVolume: BN;
  pauseTimestamp?: BN;
}

export interface PriceInfo {
  price: BN;
  confidence: BN;
  expo: number;
  timestamp: BN;
}

export class NockBridgeClient {
  private program: Program<NockBridge>;
  private connection: Connection;
  private authority?: Keypair;
  private confirmOptions: ConfirmOptions;

  // Derived addresses
  public bridgeState: PublicKey;
  public wnockMint: PublicKey;
  public priceOracle: PublicKey;
  public liquidityPool: PublicKey;

  constructor(config: BridgeConfig) {
    this.connection = config.connection;
    this.authority = config.authority;
    this.confirmOptions = config.confirmOptions || { commitment: 'confirmed' };

    // Create provider
    const provider = new Provider(
      this.connection,
      config.authority ? { publicKey: config.authority.publicKey } as any : {} as any,
      this.confirmOptions
    );

    // Initialize program
    this.program = new Program<NockBridge>(IDL, config.programId, provider);

    // Derive PDAs
    [this.bridgeState] = PublicKey.findProgramAddressSync(
      [Buffer.from('bridge')],
      config.programId
    );

    [this.wnockMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('wnock_mint')],
      config.programId
    );

    [this.priceOracle] = PublicKey.findProgramAddressSync(
      [Buffer.from('price_oracle')],
      config.programId
    );

    [this.liquidityPool] = PublicKey.findProgramAddressSync(
      [Buffer.from('liquidity_pool')],
      config.programId
    );
  }

  /**
   * Initialize the bridge with validators and configuration
   */
  async initializeBridge(
    validators: PublicKey[],
    threshold: number,
    feeRate: number,
    dailyLimit: BN,
    emergencyDelay: number
  ): Promise<string> {
    if (!this.authority) {
      throw new Error('Authority keypair required for initialization');
    }

    const tx = await this.program.methods
      .initializeBridge(
        validators,
        threshold,
        feeRate,
        dailyLimit,
        emergencyDelay
      )
      .accounts({
        bridgeState: this.bridgeState,
        authority: this.authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.authority])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Initialize wNOCK token mint
   */
  async initializeWNockMint(decimals: number = 8): Promise<string> {
    if (!this.authority) {
      throw new Error('Authority keypair required for initialization');
    }

    const tx = await this.program.methods
      .initializeWnockMint(decimals)
      .accounts({
        bridgeState: this.bridgeState,
        wnockMint: this.wnockMint,
        authority: this.authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([this.authority])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Deposit NOCK tokens and mint wNOCK
   */
  async depositNock(params: DepositParams): Promise<string> {
    const userWnockAccount = await getAssociatedTokenAddress(
      this.wnockMint,
      params.user.publicKey
    );

    const feeCollector = await getAssociatedTokenAddress(
      this.wnockMint,
      this.bridgeState,
      true
    );

    // Check if user's token account exists
    const userTokenAccountInfo = await this.connection.getAccountInfo(userWnockAccount);
    const instructions: TransactionInstruction[] = [];

    if (!userTokenAccountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          params.user.publicKey,
          userWnockAccount,
          params.user.publicKey,
          this.wnockMint
        )
      );
    }

    const depositInstruction = await this.program.methods
      .depositNock(
        params.amount,
        params.nockTxHash,
        params.blockHeight,
        params.signatures
      )
      .accounts({
        bridgeState: this.bridgeState,
        wnockMint: this.wnockMint,
        userWnockAccount,
        feeCollector,
        user: params.user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    instructions.push(depositInstruction);

    const transaction = new Transaction().add(...instructions);
    return await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [params.user],
      this.confirmOptions
    );
  }

  /**
   * Withdraw wNOCK tokens and release NOCK
   */
  async withdrawNock(params: WithdrawParams): Promise<string> {
    const userWnockAccount = await getAssociatedTokenAddress(
      this.wnockMint,
      params.user.publicKey
    );

    const feeCollector = await getAssociatedTokenAddress(
      this.wnockMint,
      this.bridgeState,
      true
    );

    const tx = await this.program.methods
      .withdrawNock(params.amount, params.nockAddress)
      .accounts({
        bridgeState: this.bridgeState,
        wnockMint: this.wnockMint,
        userWnockAccount,
        feeCollector,
        user: params.user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([params.user])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Get bridge state information
   */
  async getBridgeState(): Promise<BridgeState> {
    return await this.program.account.bridgeState.fetch(this.bridgeState);
  }

  /**
   * Get user's wNOCK balance
   */
  async getUserBalance(userPublicKey: PublicKey): Promise<BN> {
    const userWnockAccount = await getAssociatedTokenAddress(
      this.wnockMint,
      userPublicKey
    );

    try {
      const balance = await this.connection.getTokenAccountBalance(userWnockAccount);
      return new BN(balance.value.amount);
    } catch {
      return new BN(0);
    }
  }

  /**
   * Get current wNOCK price from oracle
   */
  async getCurrentPrice(): Promise<PriceInfo | null> {
    try {
      const oracle = await this.program.account.priceOracle.fetch(this.priceOracle);
      
      if (oracle.priceHistory.length === 0) {
        return null;
      }

      const latestPrice = oracle.priceHistory[oracle.priceHistory.length - 1];
      return {
        price: new BN(latestPrice.price),
        confidence: new BN(latestPrice.confidence),
        expo: latestPrice.expo,
        timestamp: new BN(latestPrice.timestamp),
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate bridge fees for a given amount
   */
  async calculateFees(amount: BN): Promise<{ fee: BN; netAmount: BN }> {
    const bridgeState = await this.getBridgeState();
    const fee = amount.mul(new BN(bridgeState.feeRate)).div(new BN(10000));
    const netAmount = amount.sub(fee);

    return { fee, netAmount };
  }

  /**
   * Check if an amount is within daily limits
   */
  async checkDailyLimit(amount: BN): Promise<boolean> {
    const bridgeState = await this.getBridgeState();
    return bridgeState.dailyVolume.add(amount).lte(bridgeState.dailyLimit);
  }

  /**
   * Emergency pause the bridge (requires authority)
   */
  async emergencyPause(signatures: ValidatorSignature[]): Promise<string> {
    if (!this.authority) {
      throw new Error('Authority keypair required for emergency pause');
    }

    const tx = await this.program.methods
      .emergencyPause(signatures)
      .accounts({
        bridgeState: this.bridgeState,
        authority: this.authority.publicKey,
      })
      .signers([this.authority])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Unpause the bridge (requires authority)
   */
  async unpauseBridge(signatures: ValidatorSignature[]): Promise<string> {
    if (!this.authority) {
      throw new Error('Authority keypair required to unpause');
    }

    const tx = await this.program.methods
      .unpauseBridge(signatures)
      .accounts({
        bridgeState: this.bridgeState,
        authority: this.authority.publicKey,
      })
      .signers([this.authority])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Update bridge configuration (requires authority)
   */
  async updateBridgeConfig(
    newFeeRate?: number,
    newDailyLimit?: BN,
    newValidators?: PublicKey[],
    newThreshold?: number,
    signatures: ValidatorSignature[] = []
  ): Promise<string> {
    if (!this.authority) {
      throw new Error('Authority keypair required for configuration update');
    }

    const tx = await this.program.methods
      .updateBridgeConfig(
        newFeeRate ?? null,
        newDailyLimit ?? null,
        newValidators ?? null,
        newThreshold ?? null,
        signatures
      )
      .accounts({
        bridgeState: this.bridgeState,
        authority: this.authority.publicKey,
      })
      .signers([this.authority])
      .rpc(this.confirmOptions);

    return tx;
  }

  /**
   * Monitor bridge events
   */
  async monitorEvents(callback: (event: any) => void): Promise<number> {
    return this.program.addEventListener('all', (event, slot, signature) => {
      callback({
        event,
        slot,
        signature,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Stop monitoring events
   */
  async stopMonitoring(eventId: number): Promise<void> {
    await this.program.removeEventListener(eventId);
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userPublicKey: PublicKey,
    limit: number = 50
  ): Promise<any[]> {
    const signatures = await this.connection.getSignaturesForAddress(
      userPublicKey,
      { limit }
    );

    const transactions = [];
    for (const sig of signatures) {
      try {
        const tx = await this.connection.getTransaction(sig.signature, {
          commitment: 'confirmed',
        });
        
        if (tx?.meta && !tx.meta.err) {
          // Parse transaction for bridge-related events
          transactions.push({
            signature: sig.signature,
            slot: sig.slot,
            blockTime: sig.blockTime,
            transaction: tx,
          });
        }
      } catch (error) {
        console.warn('Failed to fetch transaction:', sig.signature, error);
      }
    }

    return transactions;
  }

  /**
   * Validate bridge state integrity
   */
  async validateBridgeIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      const bridgeState = await this.getBridgeState();
      
      // Check if bridge is operational
      if (bridgeState.isPaused) {
        issues.push('Bridge is currently paused');
      }

      // Check validator count
      if (bridgeState.validators.length < 3) {
        issues.push('Insufficient number of validators');
      }

      // Check threshold
      if (bridgeState.threshold < Math.ceil(bridgeState.validators.length / 2)) {
        issues.push('Threshold too low for security');
      }

      // Check fee rate
      if (bridgeState.feeRate > 1000) { // 10%
        issues.push('Fee rate unusually high');
      }

      // Check daily limit
      if (bridgeState.dailyVolume.gt(bridgeState.dailyLimit)) {
        issues.push('Daily volume exceeds limit');
      }

    } catch (error) {
      issues.push(`Failed to fetch bridge state: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Estimate gas costs for operations
   */
  async estimateTransactionCosts(): Promise<{
    deposit: number;
    withdraw: number;
    initialize: number;
  }> {
    // Get recent blockhash for fee calculation
    const { blockhash } = await this.connection.getLatestBlockhash();
    
    // These are estimates based on instruction complexity
    return {
      deposit: 0.002 * web3.LAMPORTS_PER_SOL, // ~0.002 SOL
      withdraw: 0.001 * web3.LAMPORTS_PER_SOL, // ~0.001 SOL
      initialize: 0.005 * web3.LAMPORTS_PER_SOL, // ~0.005 SOL
    };
  }

  /**
   * Get bridge statistics
   */
  async getBridgeStatistics(): Promise<{
    totalVolume: BN;
    totalTransactions: BN;
    totalFees: BN;
    dailyVolume: BN;
    activeValidators: number;
    uptime: number;
  }> {
    const bridgeState = await this.getBridgeState();
    
    return {
      totalVolume: bridgeState.totalLocked,
      totalTransactions: bridgeState.nonce,
      totalFees: bridgeState.totalFeesCollected,
      dailyVolume: bridgeState.dailyVolume,
      activeValidators: bridgeState.validators.length,
      uptime: 99.9, // Would be calculated based on historical data
    };
  }
}

// Utility functions
export function createValidatorSignature(
  validator: PublicKey,
  signature: Uint8Array
): ValidatorSignature {
  return {
    validator,
    signature: Array.from(signature),
  };
}

export function formatNockAmount(amount: BN, decimals: number = 8): string {
  const divisor = new BN(10).pow(new BN(decimals));
  const whole = amount.div(divisor);
  const remainder = amount.mod(divisor);
  
  if (remainder.isZero()) {
    return whole.toString();
  }
  
  const fractional = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractional}`;
}

export function parseNockAmount(amount: string, decimals: number = 8): BN {
  const [whole, fractional = ''] = amount.split('.');
  const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
  const wholeBN = new BN(whole || '0');
  const fractionalBN = new BN(paddedFractional || '0');
  const multiplier = new BN(10).pow(new BN(decimals));
  
  return wholeBN.mul(multiplier).add(fractionalBN);
}

// Export types for external use
export type { BridgeConfig, DepositParams, WithdrawParams, BridgeState, PriceInfo };