# DEX INTEGRATION CONTEXT TEMPLATE
## For Claude Code: DeFi & Trading Systems

### 🎯 **DEX CONTEXT LOADED**
**Use this prompt prefix for DEX-related tasks:**

```
CONTEXT: Nockchain DEX Integration & Trading Systems
WORKSPACE: /Users/Patrick/nock=
FOCUS: DeFi protocols, trading optimization, and liquidity management

CORE FILES:
- apps/dex-integration/src/index.ts
- apps/dex-integration/src/core/dex-aggregator.ts
- apps/dex-integration/src/strategies/
- apps/solana-bridge/src/

INTEGRATIONS: Orca, Jupiter, Raydium (Solana DEXs)
OBJECTIVE: Cross-chain trading and yield optimization

TASK: [Your DEX-specific task here]
```

### 🔗 DEX System Architecture
- **Core Integration**: `apps/dex-integration/src/`
  - `index.ts` - Main DEX interface
  - `core/dex-aggregator.ts` - DEX aggregation
  - `types/dex-types.ts` - Type definitions
  - `config/dex-config.ts` - DEX configuration

- **Trading Strategies**: `apps/dex-integration/src/strategies/`
  - `yield-optimizer.ts` - Yield optimization
  - `liquidity-manager.ts` - Liquidity management
  - `market-maker.ts` - Market making
  - `cross-dex-arbitrage-system.ts` - Arbitrage
  - `dynamic-fee-optimizer.ts` - Fee optimization

- **DEX Protocols**: `apps/dex-integration/src/dex/`
  - `orca-integration.ts` - Orca DEX
  - `jupiter-integration.ts` - Jupiter aggregator
  - `raydium-integration.ts` - Raydium DEX

### 🌉 Cross-Chain Integration
- **Solana Bridge**: `apps/solana-bridge/src/`
- **Bridge Validator**: `apps/bridge-validator/src/`
- **Cross-Chain Payouts**: `apps/dex-integration/src/integration/cross-chain-payout.ts`
- **Bridge Sync**: `apps/bridge-sync/src/`

### 📊 Trading & Analytics
- **Trading Interface**: `apps/dex-integration/src/trading/`
- **Performance Monitoring**: `apps/dex-integration/src/monitoring/`
- **Portfolio Analytics**: `apps/dex-integration/src/trading/portfolio-analytics.ts`
- **Premium Analytics**: `apps/premium-analytics/src/`

### 🔐 Security & Compliance
- **Security Manager**: `apps/dex-integration/src/security/`
- **Endpoint Hardening**: `apps/dex-integration/src/security/endpoint-hardening.ts`
- **Emergency Systems**: `apps/dex-integration/src/emergency/`

### 📋 Configuration & Deployment
- **Documentation**: `apps/dex-integration/docs/`
- **API Documentation**: `apps/dex-integration/docs/api/`
- **Security Procedures**: `apps/dex-integration/docs/security/`
- **Production Deployment**: `apps/dex-integration/docs/deployment/`

### 💡 Common DEX Tasks
- "Optimize cross-DEX arbitrage strategies"
- "Add new Solana DEX integration"
- "Improve liquidity management algorithms"
- "Debug cross-chain trading issues"
- "Implement new yield farming strategies"
- "Enhance trading fee optimization"
- "Add support for new token pairs"
- "Improve slippage protection mechanisms"