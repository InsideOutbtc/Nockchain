# NOCK Bridge DEX Integration

Comprehensive DEX integration system for automated market making, liquidity management, and yield optimization across Solana's major decentralized exchanges (Orca, Jupiter, Raydium).

## Features

### 🔄 Multi-DEX Aggregation
- **Optimal Route Discovery**: Automatically finds the best execution path across Orca, Jupiter, and Raydium
- **Smart Order Routing**: Splits large orders across multiple DEXs to minimize price impact
- **Real-time Price Comparison**: Continuous monitoring and comparison of prices across all integrated DEXs

### 🤖 Automated Market Making
- **Intelligent Spread Management**: Dynamic spread adjustment based on market volatility
- **Inventory Management**: Automated rebalancing to maintain target inventory ratios
- **Risk Controls**: Built-in stop-loss and position size limits

### 💧 Liquidity Management
- **Yield Optimization**: Automatically allocates liquidity to highest-yielding opportunities
- **Auto-compounding**: Reinvests rewards and fees to maximize returns
- **Position Monitoring**: Continuous tracking of position performance and risk metrics

### ⚡ Arbitrage Detection
- **Cross-DEX Opportunities**: Identifies and executes profitable arbitrage trades
- **Real-time Monitoring**: Continuous scanning for price discrepancies
- **Gas Optimization**: Smart gas management to ensure profitable execution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DexAggregator                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │ OrcaIntegration │ │JupiterIntegration│ │RaydiumIntegration│ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
  ┌─────────────────┐                ┌─────────────────┐
  │   MarketMaker   │                │LiquidityManager │
  └─────────────────┘                └─────────────────┘
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration file
nano .env
```

## Configuration

### Required Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PRIVATE_KEY=[1,2,3,...] # Array of 64 numbers
WNOCK_MINT=YOUR_WNOCK_TOKEN_MINT_ADDRESS

# DEX Integration
ORCA_ENABLED=true
JUPITER_ENABLED=true
RAYDIUM_ENABLED=true

# Strategy Configuration
ARBITRAGE_ENABLED=true
MARKET_MAKING_ENABLED=false
YIELD_FARMING_ENABLED=true
```

### Wallet Setup

The service requires a Solana wallet private key in JSON array format:

```bash
# Generate a new keypair (for development)
solana-keygen new --outfile wallet.json

# Convert to environment variable format
node -e "console.log(JSON.stringify(Array.from(require('fs').readFileSync('wallet.json'))))"
```

## Usage

### Standalone Service

```bash
# Start the service
npm start

# Development mode with auto-reload
npm run dev
```

### Programmatic API

```typescript
import { DexIntegrationService } from '@nockchain/dex-integration';

const service = new DexIntegrationService();
await service.initialize();
await service.start();

// Get optimal swap quote
const quote = await service.getOptimalSwapQuote(
  'INPUT_TOKEN_MINT',
  'OUTPUT_TOKEN_MINT',
  '1000000', // 1 token with 6 decimals
  100 // 1% slippage tolerance
);

// Execute optimal swap
const trade = await service.executeOptimalSwap(
  'INPUT_TOKEN_MINT',
  'OUTPUT_TOKEN_MINT',
  '1000000'
);

// Find arbitrage opportunities
const opportunities = await service.findArbitrageOpportunities([
  'TOKEN_A_MINT',
  'TOKEN_B_MINT'
]);

// Get analytics
const analytics = await service.getCrossChainAnalytics();
```

### CLI Scripts

```bash
# Market making
npm run market-make

# Liquidity management
npm run liquidity

# Arbitrage bot
npm run arbitrage
```

## DEX Integrations

### Orca (Whirlpools)
- **Concentrated Liquidity**: Support for concentrated liquidity positions
- **Fee Collection**: Automated fee harvesting from LP positions
- **Price Discovery**: Real-time price feeds from Whirlpool pools

### Jupiter Aggregator
- **Route Optimization**: Leverages Jupiter's advanced routing algorithms
- **Multi-hop Swaps**: Support for complex multi-DEX routes
- **Price APIs**: Access to comprehensive price and market data

### Raydium
- **Yield Farming**: Integration with Raydium farms for additional yield
- **LP Positions**: Automated liquidity provision and management
- **Reward Harvesting**: Auto-compound farming rewards

## Strategies

### Market Making Strategy

Automated market making with:
- Dynamic spread adjustment
- Inventory risk management
- Real-time order management
- Performance tracking

### Liquidity Management Strategy

Intelligent liquidity allocation featuring:
- Multi-pool optimization
- Risk-adjusted returns
- Auto-compounding rewards
- Emergency exit conditions

### Arbitrage Strategy

Cross-DEX arbitrage execution with:
- Real-time opportunity detection
- Gas cost optimization
- Risk management controls
- Profit maximization

## Monitoring & Analytics

### Performance Metrics
- Total volume traded
- Success rates by DEX
- Average latency
- Price impact analysis

### Risk Metrics
- Position exposure
- Inventory levels
- P&L tracking
- Emergency exit triggers

### Market Analytics
- Cross-DEX price spreads
- Liquidity depth analysis
- Volume trends
- Arbitrage opportunity frequency

## Security Features

### Risk Management
- Position size limits
- Stop-loss mechanisms
- Slippage protection
- Emergency exit procedures

### Access Control
- Wallet-based authentication
- Environment-based configuration
- Secure key management
- Audit logging

## Development

### Building

```bash
# Compile TypeScript
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Formatting
npm run format
```

### Testing

```bash
# Run tests
npm test

# Test coverage
npm run test:coverage
```

## API Reference

### Core Methods

#### `getOptimalSwapQuote(inputMint, outputMint, amount, slippageTolerance?)`
Returns the best available quote across all integrated DEXs.

#### `executeOptimalSwap(inputMint, outputMint, amount, slippageTolerance?)`
Executes a swap using the optimal route.

#### `findArbitrageOpportunities(tokens, minProfitBps?)`
Scans for arbitrage opportunities between token pairs.

#### `getCrossChainAnalytics()`
Returns comprehensive analytics across all DEXs.

### Strategy Methods

#### `MarketMaker.start()`
Begins automated market making operations.

#### `LiquidityManager.optimizeLiquidityAllocations()`
Calculates optimal liquidity distribution.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the examples in the `/examples` directory

---

**⚠️ Risk Disclaimer**: This software is for educational and development purposes. Trading and providing liquidity involves significant financial risk. Always test thoroughly on devnet before using on mainnet with real funds.