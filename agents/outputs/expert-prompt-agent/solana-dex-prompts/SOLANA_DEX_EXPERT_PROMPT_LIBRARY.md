# SOLANA DEX EXPERT PROMPT LIBRARY
## Solana DEX Integration and AMM Protocol Implementation

### CORE SOLANA DEX IMPLEMENTATION PROMPTS

#### PROMPT 1: JUPITER AGGREGATOR INTEGRATION
```
CLAUDE CODE: JUPITER AGGREGATOR EXPERT MODE

You are implementing Jupiter aggregator integration for NOCK token swaps on Solana. Jupiter is the premier DEX aggregator providing optimal swap routes across multiple AMMs.

TECHNICAL SPECIFICATIONS:
- Jupiter API v6 integration for swap route optimization
- NOCK/SOL, NOCK/USDC, NOCK/wNOCK primary trading pairs
- Slippage tolerance: 0.1% for large trades, 0.5% for small trades
- Maximum route hops: 3 to optimize for gas efficiency
- Priority fee optimization for transaction inclusion

IMPLEMENTATION REQUIREMENTS:
1. Create Jupiter integration system that:
   - Queries Jupiter API for optimal swap routes
   - Executes swaps with minimal slippage and MEV protection
   - Handles transaction failures and retry logic
   - Optimizes priority fees for fast execution

2. Swap route optimization:
   - Compare routes across Orca, Raydium, Serum, and other AMMs
   - Calculate total swap cost including fees and slippage
   - Implement price impact protection for large trades
   - Handle partial fills and route splitting

3. Transaction execution:
   - Build and sign swap transactions using Jupiter SDK
   - Handle transaction confirmation and status monitoring
   - Implement MEV protection through private mempool
   - Support for both versioned and legacy transactions

SOLANA-SPECIFIC DETAILS:
- Use Jupiter SDK v6 with TypeScript/JavaScript
- Implement compute unit optimization for complex swaps
- Handle Solana's transaction size limits (1232 bytes)
- Support for lookup tables to reduce transaction size
- Implement priority fee calculation based on network congestion

NOCK-SPECIFIC DETAILS:
- NOCK token mint address: [NOCK_MINT_ADDRESS]
- wNOCK token mint address: [wNOCK_MINT_ADDRESS]
- Minimum swap amounts: 0.01 NOCK, maximum: 1,000,000 NOCK
- Bridge integration for NOCK ↔ wNOCK conversions
- Special handling for eon transition price volatility

Generate complete Jupiter aggregator integration with error handling and optimization.
```

#### PROMPT 2: ORCA AMM PROTOCOL INTEGRATION
```
CLAUDE CODE: ORCA AMM EXPERT MODE

You are implementing Orca AMM protocol integration for NOCK token liquidity provision and swapping. Orca is a leading Solana AMM with concentrated liquidity and whirlpools.

TECHNICAL SPECIFICATIONS:
- Orca Whirlpools SDK integration for concentrated liquidity
- NOCK/SOL and NOCK/USDC whirlpool creation and management
- Concentrated liquidity position management
- Fee tier optimization (0.01%, 0.05%, 0.3%, 1%)
- Automated liquidity rebalancing

IMPLEMENTATION REQUIREMENTS:
1. Create Orca integration system that:
   - Creates and manages NOCK trading pairs on Orca
   - Provides liquidity to whirlpools with optimal positioning
   - Executes swaps through Orca's concentrated liquidity
   - Manages liquidity positions and fee collection

2. Whirlpool management:
   - Create NOCK/SOL and NOCK/USDC whirlpools
   - Calculate optimal tick ranges for liquidity provision
   - Implement automated position rebalancing
   - Handle fee collection and compound strategies

3. Liquidity position optimization:
   - Calculate optimal liquidity ranges based on price volatility
   - Implement just-in-time liquidity for large trades
   - Handle impermanent loss protection strategies
   - Support for multiple fee tiers simultaneously

SOLANA-SPECIFIC DETAILS:
- Use Orca Whirlpools SDK v0.13+
- Implement program derived addresses (PDAs) for pool accounts
- Handle Solana's account rent requirements
- Optimize for minimal compute unit usage
- Support for both standard and concentrated liquidity

NOCK-SPECIFIC DETAILS:
- NOCK token decimals: 9
- Optimal tick spacing: 64 for 0.05% fee tier
- Liquidity concentration: ±2% around current price
- Rebalancing triggers: 10% price movement from position center
- Fee collection frequency: Every 100 blocks

Generate complete Orca AMM integration with whirlpool management and liquidity optimization.
```

#### PROMPT 3: RAYDIUM LIQUIDITY POOL INTEGRATION
```
CLAUDE CODE: RAYDIUM LIQUIDITY EXPERT MODE

You are implementing Raydium liquidity pool integration for NOCK token trading and yield farming. Raydium combines AMM with order book functionality.

TECHNICAL SPECIFICATIONS:
- Raydium SDK integration for liquidity pools and farms
- NOCK/SOL, NOCK/USDC, NOCK/RAY liquidity pools
- Yield farming integration with RAY token rewards
- Automated market making with order book integration
- Cross-platform arbitrage opportunities

IMPLEMENTATION REQUIREMENTS:
1. Create Raydium integration system that:
   - Creates and manages NOCK liquidity pools on Raydium
   - Provides liquidity with optimal capital efficiency
   - Implements yield farming strategies for maximum returns
   - Handles order book integration for improved pricing

2. Liquidity pool management:
   - Create NOCK trading pairs with optimal initial liquidity
   - Implement dynamic fee adjustment based on volatility
   - Handle liquidity provision and withdrawal
   - Optimize for minimal slippage and maximum volume

3. Yield farming optimization:
   - Stake LP tokens in Raydium farms for RAY rewards
   - Implement auto-compounding strategies
   - Calculate optimal farming periods and rewards
   - Handle farm migrations and reward distribution

SOLANA-SPECIFIC DETAILS:
- Use Raydium SDK v1.3+ with TypeScript
- Implement Serum DEX integration for order book functionality
- Handle program-derived addresses for pool accounts
- Optimize transaction batching for multiple operations
- Support for both standard AMM and CLMM pools

NOCK-SPECIFIC DETAILS:
- Minimum liquidity: 10,000 NOCK + equivalent SOL/USDC
- Farm allocation: 50% NOCK/SOL, 30% NOCK/USDC, 20% NOCK/RAY
- Auto-compound frequency: Every 24 hours
- Yield farming duration: Minimum 7 days for optimal rewards
- Price oracle integration for accurate valuation

Generate complete Raydium integration with liquidity pools and yield farming optimization.
```

#### PROMPT 4: SPL TOKEN MANAGEMENT SYSTEM
```
CLAUDE CODE: SPL TOKEN EXPERT MODE

You are implementing SPL token management system for NOCK token operations on Solana. This includes token creation, transfers, and account management.

TECHNICAL SPECIFICATIONS:
- SPL Token Program integration for NOCK token operations
- Token account creation and management
- Multi-signature wallet support for security
- Metadata program integration for token information
- Associated token account (ATA) management

IMPLEMENTATION REQUIREMENTS:
1. Create SPL token system that:
   - Manages NOCK token accounts and balances
   - Handles token transfers and approvals
   - Implements multi-signature security for large operations
   - Manages token metadata and program upgrades

2. Token account management:
   - Create and manage associated token accounts
   - Handle account rent and minimum balance requirements
   - Implement account closure and reclamation
   - Support for both individual and program-owned accounts

3. Security and governance:
   - Multi-signature wallet integration for admin operations
   - Token freeze/thaw functionality for compliance
   - Mint authority management and transfer
   - Upgrade authority handling for token program

SOLANA-SPECIFIC DETAILS:
- Use SPL Token Library v0.4+ with @solana/spl-token
- Implement proper account rent handling (2,039,280 lamports)
- Handle token program ID: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
- Support for both Token and Token-2022 programs
- Implement proper error handling for account creation

NOCK-SPECIFIC DETAILS:
- NOCK token mint authority: Multi-signature wallet
- Token decimals: 9 (matching Solana native tokens)
- Maximum supply: 21,000,000 NOCK
- Freeze authority: Enabled for regulatory compliance
- Metadata: Name="NOCK", Symbol="NOCK", URI="https://nock.org/metadata"

Generate complete SPL token management system with security and governance features.
```

### ADVANCED SOLANA DEX PROMPTS

#### PROMPT 5: SOLANA DEX ARBITRAGE SYSTEM
```
CLAUDE CODE: SOLANA DEX ARBITRAGE EXPERT MODE

You are implementing automated arbitrage system across multiple Solana DEXs to capture price differences and provide liquidity efficiency.

TECHNICAL SPECIFICATIONS:
- Multi-DEX arbitrage across Jupiter, Orca, Raydium, Serum
- Real-time price monitoring and execution
- MEV protection and sandwich attack prevention
- Atomic transaction execution for risk-free arbitrage
- Profit optimization considering gas fees and slippage

IMPLEMENTATION REQUIREMENTS:
1. Create arbitrage system that:
   - Monitors prices across multiple DEXs simultaneously
   - Identifies profitable arbitrage opportunities
   - Executes atomic transactions for risk-free profit
   - Handles transaction failures and rollbacks

2. Price monitoring and analysis:
   - Real-time price feeds from multiple DEXs
   - Calculate price differences and arbitrage opportunities
   - Consider transaction costs and slippage in profit calculations
   - Implement minimum profit thresholds for execution

3. Atomic transaction execution:
   - Build multi-instruction transactions for simultaneous execution
   - Handle transaction size limits and compute unit optimization
   - Implement fallback strategies for failed transactions
   - Support for flash loans when available

SOLANA-SPECIFIC DETAILS:
- Use WebSocket connections for real-time price updates
- Implement proper transaction versioning and lookup tables
- Handle Solana's 1232-byte transaction size limit
- Optimize compute units for complex arbitrage transactions
- Support for both standard and priority fee markets

NOCK-SPECIFIC DETAILS:
- Monitor NOCK/SOL, NOCK/USDC, NOCK/wNOCK pairs
- Minimum arbitrage profit: 0.1% after fees
- Maximum position size: 100,000 NOCK per transaction
- Bridge arbitrage opportunities between chains
- Special handling during eon transition volatility

Generate complete arbitrage system with real-time monitoring and atomic execution.
```

#### PROMPT 6: SOLANA ORDERBOOK INTEGRATION
```
CLAUDE CODE: SOLANA ORDERBOOK EXPERT MODE

You are implementing orderbook integration for NOCK token trading on Solana DEXs, providing advanced trading features and market making capabilities.

TECHNICAL SPECIFICATIONS:
- Serum DEX orderbook integration for NOCK trading
- Market making algorithms with optimal spread management
- Order management system with advanced order types
- Risk management and position sizing
- Integration with AMM pools for hybrid liquidity

IMPLEMENTATION REQUIREMENTS:
1. Create orderbook system that:
   - Places and manages orders on Serum DEX
   - Implements market making strategies with optimal spreads
   - Handles order execution and settlement
   - Provides advanced order types (limit, stop, iceberg)

2. Market making algorithms:
   - Calculate optimal bid/ask spreads based on volatility
   - Implement inventory management for balanced positions
   - Handle adverse selection and order flow toxicity
   - Support for both symmetric and asymmetric market making

3. Order management:
   - Real-time order book monitoring and updates
   - Order lifecycle management (open, filled, cancelled)
   - Risk management with position limits and stops
   - Integration with portfolio management systems

SOLANA-SPECIFIC DETAILS:
- Use Serum DEX program ID: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin
- Implement proper market account management
- Handle Solana's transaction confirmation model
- Optimize for minimal rent and account creation costs
- Support for both standard and permissioned markets

NOCK-SPECIFIC DETAILS:
- NOCK/SOL market creation with 0.1% taker fees
- Minimum order size: 0.01 NOCK
- Maximum spread: 0.5% in normal conditions
- Market making capital allocation: 50,000 NOCK
- Risk limits: 10% daily drawdown, 25% position size

Generate complete orderbook integration with market making and risk management.
```

#### PROMPT 7: SOLANA YIELD OPTIMIZATION SYSTEM
```
CLAUDE CODE: SOLANA YIELD OPTIMIZATION EXPERT MODE

You are implementing yield optimization system for NOCK token holders on Solana, maximizing returns through automated DeFi strategies.

TECHNICAL SPECIFICATIONS:
- Multi-protocol yield farming across Raydium, Orca, Saber, Marinade
- Automated strategy selection based on APY optimization
- Risk-adjusted return calculations with impermanent loss protection
- Auto-compounding and rebalancing mechanisms
- Integration with lending protocols for additional yield

IMPLEMENTATION REQUIREMENTS:
1. Create yield optimization system that:
   - Analyzes yield opportunities across multiple protocols
   - Automatically allocates capital to highest-risk-adjusted returns
   - Implements auto-compounding strategies
   - Handles strategy migration and rebalancing

2. Strategy optimization:
   - Calculate risk-adjusted returns for different strategies
   - Implement dynamic allocation based on market conditions
   - Handle impermanent loss protection and mitigation
   - Support for both conservative and aggressive strategies

3. Automated execution:
   - Auto-compound rewards at optimal intervals
   - Rebalance positions based on performance metrics
   - Handle strategy exits and emergency withdrawals
   - Implement fee minimization through batch operations

SOLANA-SPECIFIC DETAILS:
- Use Anchor framework for protocol interactions
- Implement proper account management for multiple protocols
- Handle Solana's compute unit limitations for complex strategies
- Support for both standard and concentrated liquidity positions
- Optimize transaction batching for cost efficiency

NOCK-SPECIFIC DETAILS:
- NOCK-SOL LP farming on Raydium and Orca
- wNOCK staking rewards optimization
- Bridge yield opportunities across chains
- Risk allocation: 60% stable farming, 40% high-yield strategies
- Minimum yield threshold: 5% APY after fees

Generate complete yield optimization system with automated strategy selection and execution.
```

#### PROMPT 8: SOLANA TRADING INTERFACE SYSTEM
```
CLAUDE CODE: SOLANA TRADING INTERFACE EXPERT MODE

You are implementing advanced trading interface for NOCK token on Solana, providing professional trading features and user experience.

TECHNICAL SPECIFICATIONS:
- Real-time trading interface with advanced charting
- Order book visualization and depth analysis
- Portfolio management with P&L tracking
- Risk management tools and position sizing
- Integration with multiple DEXs and aggregators

IMPLEMENTATION REQUIREMENTS:
1. Create trading interface that:
   - Provides real-time price charts and technical indicators
   - Displays order book depth and market microstructure
   - Handles order placement and execution across multiple DEXs
   - Tracks portfolio performance and risk metrics

2. Advanced trading features:
   - Support for multiple order types and execution algorithms
   - Implement stop-loss and take-profit orders
   - Provide advanced charting with custom indicators
   - Handle multi-timeframe analysis and alerts

3. Portfolio management:
   - Real-time P&L tracking and performance attribution
   - Risk management with position limits and alerts
   - Transaction history and trade analysis
   - Integration with tax reporting tools

SOLANA-SPECIFIC DETAILS:
- Use WebSocket connections for real-time data
- Implement proper wallet integration with multiple providers
- Handle Solana's transaction model and confirmation times
- Support for both desktop and mobile interfaces
- Optimize for low latency and high-frequency trading

NOCK-SPECIFIC DETAILS:
- NOCK/SOL, NOCK/USDC, NOCK/wNOCK trading pairs
- Bridge trading interface for cross-chain operations
- Eon transition alerts and volatility warnings
- Mining profitability integration with trading decisions
- Portfolio rebalancing based on mining rewards

Generate complete trading interface with advanced features and professional-grade user experience.
```

### SOLANA DEX INTEGRATION PROMPTS

#### PROMPT 9: CROSS-CHAIN SOLANA BRIDGE INTEGRATION
```
CLAUDE CODE: SOLANA BRIDGE EXPERT MODE

You are implementing cross-chain bridge integration between Nockchain and Solana for seamless NOCK ↔ wNOCK conversions.

TECHNICAL SPECIFICATIONS:
- Wormhole bridge integration for cross-chain transfers
- NOCK token wrapping and unwrapping mechanisms
- Multi-signature validation for bridge security
- Atomic swap execution with rollback protection
- Bridge fee optimization and gas management

IMPLEMENTATION REQUIREMENTS:
1. Create bridge system that:
   - Handles NOCK to wNOCK wrapping on Solana
   - Manages cross-chain message passing and verification
   - Implements atomic swap execution with failure recovery
   - Provides bridge status monitoring and alerts

2. Cross-chain verification:
   - Validate Nockchain zkPoW proofs on Solana
   - Implement multi-signature validation for security
   - Handle bridge consensus and dispute resolution
   - Support for batch transfers to reduce costs

3. Asset management:
   - Mint and burn wNOCK tokens based on bridge operations
   - Handle bridge liquidity and reserves management
   - Implement fee collection and distribution
   - Support for emergency bridge halt mechanisms

SOLANA-SPECIFIC DETAILS:
- Use Wormhole SDK for cross-chain messaging
- Implement proper program-derived addresses for bridge accounts
- Handle Solana's account rent and storage requirements
- Support for both standard and priority fee markets
- Optimize for minimal compute unit usage

NOCK-SPECIFIC DETAILS:
- wNOCK token mint on Solana with 9 decimals
- Bridge fee: 0.1% of transfer amount
- Minimum transfer: 1 NOCK, maximum: 100,000 NOCK
- Multi-signature threshold: 3 of 5 validators
- Emergency halt conditions: Invalid zkPoW proofs or consensus failure

Generate complete cross-chain bridge integration with security and monitoring features.
```

#### PROMPT 10: SOLANA STAKING INTEGRATION
```
CLAUDE CODE: SOLANA STAKING EXPERT MODE

You are implementing staking integration for wNOCK tokens on Solana, providing yield generation and network security participation.

TECHNICAL SPECIFICATIONS:
- wNOCK staking program with reward distribution
- Delegation to Solana validators for additional yield
- Liquid staking with tradeable receipt tokens
- Automated reward compounding and distribution
- Integration with Solana's native staking mechanics

IMPLEMENTATION REQUIREMENTS:
1. Create staking system that:
   - Allows wNOCK holders to stake tokens for rewards
   - Implements validator delegation for Solana yield
   - Provides liquid staking with tradeable receipts
   - Handles reward calculation and distribution

2. Staking mechanics:
   - Implement staking pools with different lock periods
   - Calculate rewards based on staking duration and amount
   - Handle unstaking periods and penalty mechanisms
   - Support for both individual and institutional staking

3. Yield optimization:
   - Automatically compound staking rewards
   - Delegate to high-performing Solana validators
   - Implement yield farming with staked tokens
   - Handle validator performance monitoring and rebalancing

SOLANA-SPECIFIC DETAILS:
- Use Solana's native staking program for validator delegation
- Implement proper stake account management
- Handle Solana's epoch-based reward distribution
- Support for both warm-up and cool-down periods
- Optimize for minimal transaction costs

NOCK-SPECIFIC DETAILS:
- wNOCK staking rewards: 8% APY base rate
- Minimum staking period: 7 days
- Maximum staking capacity: 10,000,000 wNOCK
- Validator delegation: Top 50 validators by performance
- Liquid staking token: lwNOCK (liquid wrapped NOCK)

Generate complete staking integration with yield optimization and liquid staking features.
```

### DEPLOYMENT STATUS
**Status**: ACTIVE
**Coverage**: Complete Solana DEX integration guidance
**Integration**: Coordinated with zkPoW and bridge systems
**Authority**: Autonomous execution for technical accuracy
**Usage**: Available for immediate Claude Code implementation

**SOLANA DEX EXPERT PROMPT LIBRARY OPERATIONAL**