# Nockchain JavaScript/TypeScript SDK

## Overview

The official Nockchain JavaScript/TypeScript SDK provides a comprehensive, type-safe interface to interact with the Nockchain blockchain. Built with modern JavaScript practices and full TypeScript support.

## Installation

```bash
npm install @nockchain/sdk
# or
yarn add @nockchain/sdk
# or
pnpm add @nockchain/sdk
```

## Quick Start

```typescript
import { NockchainClient } from '@nockchain/sdk';

// Initialize client
const client = new NockchainClient({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet', // or 'testnet', 'devnet'
  endpoint: 'https://api.nockchain.com' // Optional: custom endpoint
});

// Get blockchain status
const status = await client.blockchain.getStatus();
console.log('Current block height:', status.latest_block.height);
```

## Client Configuration

```typescript
interface NockchainConfig {
  apiKey: string;
  network?: 'mainnet' | 'testnet' | 'devnet';
  endpoint?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const client = new NockchainClient({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000 // 1 second
});
```

## Core Modules

### Blockchain Module

```typescript
// Get blockchain status
const status = await client.blockchain.getStatus();

// Get block by height
const block = await client.blockchain.getBlock(1234567);

// Get latest block
const latestBlock = await client.blockchain.getLatestBlock();

// Get block range
const blocks = await client.blockchain.getBlockRange(1234567, 1234577);

// Get validators
const validators = await client.blockchain.getValidators();

// Get network peers
const peers = await client.blockchain.getPeers();
```

### Transaction Module

```typescript
// Send transaction
const tx = await client.transactions.send({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000', // 1 NOCK
  gasPrice: 'standard'
});

// Get transaction
const transaction = await client.transactions.get('0xabcd...');

// Get transaction status
const status = await client.transactions.getStatus('0xabcd...');

// Estimate gas
const gasEstimate = await client.transactions.estimateGas({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000'
});

// Send batch transactions
const batch = await client.transactions.sendBatch([
  { from: 'nock1abc...', to: 'nock1def...', value: '1000000000000000000' },
  { from: 'nock1abc...', to: 'nock1ghi...', value: '2000000000000000000' }
]);

// Wait for confirmation
const receipt = await client.transactions.waitForConfirmation('0xabcd...', {
  confirmations: 12,
  timeout: 300000 // 5 minutes
});

// Simulate transaction
const simulation = await client.transactions.simulate({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000',
  data: '0x...'
});
```

### Account Module

```typescript
// Get account information
const account = await client.accounts.get('nock1abc...');

// Get account balance
const balance = await client.accounts.getBalance('nock1abc...');

// Get account transactions
const transactions = await client.accounts.getTransactions('nock1abc...', {
  page: 1,
  limit: 10,
  type: 'all' // 'sent', 'received', 'all'
});

// Generate new account
const newAccount = await client.accounts.generate();

// Import account from private key
const importedAccount = await client.accounts.import('0x1234...');
```

### DEX Module

```typescript
// Get supported exchanges
const exchanges = await client.dex.getExchanges();

// Get trading pairs
const pairs = await client.dex.getPairs({
  exchange: 'nockswap',
  baseToken: 'nock1token...'
});

// Get price quote
const quote = await client.dex.getQuote({
  inputToken: 'nock1token...',
  outputToken: 'nock1usdc...',
  amount: '1000000000000000000',
  slippage: 0.01
});

// Execute swap
const swap = await client.dex.swap({
  inputToken: 'nock1token...',
  outputToken: 'nock1usdc...',
  inputAmount: '1000000000000000000',
  minOutputAmount: '1200000000',
  slippage: 0.01,
  userAddress: 'nock1user...'
});

// Get liquidity pools
const pools = await client.dex.getLiquidityPools({
  exchange: 'nockswap',
  minTvl: '1000000000000000000000'
});

// Add liquidity
const addLiquidity = await client.dex.addLiquidity({
  poolId: 'nockswap_nock_usdc',
  tokenAAmount: '1000000000000000000',
  tokenBAmount: '1250000000',
  minTokenAAmount: '950000000000000000',
  minTokenBAmount: '1187500000',
  userAddress: 'nock1user...'
});

// Remove liquidity
const removeLiquidity = await client.dex.removeLiquidity({
  poolId: 'nockswap_nock_usdc',
  liquidityTokens: '1118033988749895000',
  minTokenAAmount: '950000000000000000',
  minTokenBAmount: '1187500000',
  userAddress: 'nock1user...'
});
```

### Mining Module

```typescript
// Get mining pool information
const pools = await client.mining.getPools();

// Get pool statistics
const stats = await client.mining.getPoolStats('pool_id');

// Get miner information
const miner = await client.mining.getMiner('nock1miner...');

// Get mining rewards
const rewards = await client.mining.getRewards('nock1miner...', {
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z'
});

// Submit mining share
const share = await client.mining.submitShare({
  poolId: 'pool_id',
  minerId: 'nock1miner...',
  nonce: '0x123456789abcdef0',
  hash: '0xabcd...',
  difficulty: '0x1234567890abcdef'
});
```

### Bridge Module

```typescript
// Get supported chains
const chains = await client.bridge.getSupportedChains();

// Get bridge status
const status = await client.bridge.getStatus();

// Initiate bridge transfer
const transfer = await client.bridge.transfer({
  sourceChain: 'nockchain',
  destinationChain: 'ethereum',
  token: 'nock1token...',
  amount: '1000000000000000000',
  destinationAddress: '0x1234...',
  userAddress: 'nock1user...'
});

// Get transfer status
const transferStatus = await client.bridge.getTransferStatus('transfer_id');

// Get transfer history
const history = await client.bridge.getTransferHistory('nock1user...');
```

## TypeScript Support

The SDK is built with TypeScript and provides comprehensive type definitions:

```typescript
import { 
  NockchainClient, 
  BlockchainStatus, 
  Transaction, 
  Account, 
  SwapQuote,
  LiquidityPool 
} from '@nockchain/sdk';

// All responses are fully typed
const status: BlockchainStatus = await client.blockchain.getStatus();
const transaction: Transaction = await client.transactions.get('0xabcd...');
const account: Account = await client.accounts.get('nock1abc...');
const quote: SwapQuote = await client.dex.getQuote({
  inputToken: 'nock1token...',
  outputToken: 'nock1usdc...',
  amount: '1000000000000000000'
});
```

## Error Handling

```typescript
import { NockchainError, APIError, NetworkError } from '@nockchain/sdk';

try {
  const transaction = await client.transactions.send({
    from: 'nock1abc...',
    to: 'nock1def...',
    value: '1000000000000000000'
  });
} catch (error) {
  if (error instanceof APIError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Error Code:', error.code);
  } else if (error instanceof NetworkError) {
    console.error('Network Error:', error.message);
  } else if (error instanceof NockchainError) {
    console.error('Nockchain Error:', error.message);
  }
}

// Specific error handling
try {
  const tx = await client.transactions.send(/* ... */);
} catch (error) {
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      console.error('Not enough funds');
      break;
    case 'INVALID_NONCE':
      console.error('Invalid nonce');
      break;
    case 'GAS_LIMIT_EXCEEDED':
      console.error('Gas limit too high');
      break;
    default:
      console.error('Unknown error:', error.message);
  }
}
```

## WebSocket Support

```typescript
import { NockchainWebSocket } from '@nockchain/sdk';

const ws = new NockchainWebSocket({
  apiKey: 'YOUR_API_KEY',
  endpoint: 'wss://api.nockchain.com/v1/ws'
});

// Subscribe to new blocks
ws.subscribe('blocks', (block) => {
  console.log('New block:', block);
});

// Subscribe to transactions for specific address
ws.subscribe('transactions', (transaction) => {
  console.log('New transaction:', transaction);
}, { address: 'nock1abc...' });

// Subscribe to price updates
ws.subscribe('dex_prices', (price) => {
  console.log('Price update:', price);
}, { pair: 'NOCK/USDC' });

// Connect
await ws.connect();

// Disconnect
await ws.disconnect();
```

## Advanced Features

### Pagination

```typescript
// Automatic pagination
const allTransactions = await client.accounts.getTransactions('nock1abc...', {
  limit: 100,
  autoPaginate: true // Automatically fetch all pages
});

// Manual pagination
let page = 1;
let hasMore = true;
const allTransactions = [];

while (hasMore) {
  const response = await client.accounts.getTransactions('nock1abc...', {
    page,
    limit: 100
  });
  
  allTransactions.push(...response.transactions);
  hasMore = response.pagination.page < response.pagination.total_pages;
  page++;
}
```

### Retry Logic

```typescript
const client = new NockchainClient({
  apiKey: 'YOUR_API_KEY',
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx status codes
    return error.statusCode >= 500 || error.code === 'NETWORK_ERROR';
  }
});
```

### Caching

```typescript
import { NockchainClient, InMemoryCache } from '@nockchain/sdk';

const client = new NockchainClient({
  apiKey: 'YOUR_API_KEY',
  cache: new InMemoryCache({
    ttl: 60000, // 1 minute
    maxSize: 1000
  })
});

// Cached responses
const status1 = await client.blockchain.getStatus(); // API call
const status2 = await client.blockchain.getStatus(); // Cached response
```

### Batch Operations

```typescript
// Batch multiple API calls
const batch = client.batch();

batch.add('blockchain.getStatus');
batch.add('blockchain.getLatestBlock');
batch.add('accounts.get', 'nock1abc...');
batch.add('dex.getExchanges');

const results = await batch.execute();
const [status, latestBlock, account, exchanges] = results;
```

## Testing

```typescript
import { NockchainClient, MockProvider } from '@nockchain/sdk';

// Use mock provider for testing
const client = new NockchainClient({
  apiKey: 'test-key',
  provider: new MockProvider()
});

// Mock responses
const mockProvider = new MockProvider();
mockProvider.mockResponse('blockchain.getStatus', {
  status: 'healthy',
  latest_block: { height: 1234567 }
});

const client = new NockchainClient({
  apiKey: 'test-key',
  provider: mockProvider
});
```

## React Hooks

```typescript
import { useNockchain, useBalance, useTransaction } from '@nockchain/react-hooks';

function MyComponent() {
  const { client } = useNockchain();
  const { balance, loading, error } = useBalance('nock1abc...');
  const { transaction, loading: txLoading } = useTransaction('0xabcd...');

  return (
    <div>
      <p>Balance: {balance} NOCK</p>
      <p>Transaction Status: {transaction?.status}</p>
    </div>
  );
}
```

## Node.js Specific Features

```typescript
import { NockchainClient } from '@nockchain/sdk/node';

// File-based configuration
const client = new NockchainClient({
  configFile: './nockchain.config.json'
});

// Environment variables
const client = new NockchainClient({
  apiKey: process.env.NOCKCHAIN_API_KEY,
  network: process.env.NOCKCHAIN_NETWORK as 'mainnet' | 'testnet'
});
```

## Best Practices

### Connection Management

```typescript
// Singleton pattern for client
class NockchainService {
  private static instance: NockchainClient;

  static getInstance(): NockchainClient {
    if (!NockchainService.instance) {
      NockchainService.instance = new NockchainClient({
        apiKey: process.env.NOCKCHAIN_API_KEY!,
        network: 'mainnet'
      });
    }
    return NockchainService.instance;
  }
}

const client = NockchainService.getInstance();
```

### Error Retry with Exponential Backoff

```typescript
async function sendTransactionWithRetry(txData: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.transactions.send(txData);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Migration Guide

### From v1 to v2

```typescript
// v1
const client = new NockchainClient('YOUR_API_KEY');
const status = await client.getBlockchainStatus();

// v2
const client = new NockchainClient({ apiKey: 'YOUR_API_KEY' });
const status = await client.blockchain.getStatus();
```

## Performance Tips

1. **Use TypeScript**: Full type safety and better IDE support
2. **Enable Caching**: Reduce API calls for frequently accessed data
3. **Batch Operations**: Group multiple API calls together
4. **WebSocket Subscriptions**: Use for real-time updates
5. **Connection Pooling**: Reuse client instances

## Examples

### DeFi Trading Bot

```typescript
import { NockchainClient } from '@nockchain/sdk';

class TradingBot {
  private client: NockchainClient;

  constructor(apiKey: string) {
    this.client = new NockchainClient({ apiKey });
  }

  async findArbitrageOpportunity() {
    const opportunities = await this.client.dex.getArbitrageOpportunities();
    
    for (const opportunity of opportunities.opportunities) {
      if (opportunity.profit_percentage > 0.02) { // 2% profit threshold
        await this.executeArbitrage(opportunity);
      }
    }
  }

  private async executeArbitrage(opportunity: any) {
    // Buy on cheaper exchange
    const buyTx = await this.client.dex.swap({
      inputToken: opportunity.quote_token,
      outputToken: opportunity.base_token,
      inputAmount: opportunity.required_capital,
      exchange: opportunity.buy_exchange,
      userAddress: 'nock1trader...'
    });

    // Wait for confirmation
    await this.client.transactions.waitForConfirmation(buyTx.transaction_hash);

    // Sell on more expensive exchange
    const sellTx = await this.client.dex.swap({
      inputToken: opportunity.base_token,
      outputToken: opportunity.quote_token,
      inputAmount: opportunity.required_capital,
      exchange: opportunity.sell_exchange,
      userAddress: 'nock1trader...'
    });

    console.log(`Arbitrage executed: ${opportunity.profit_amount} profit`);
  }
}
```

### Liquidity Provision Monitor

```typescript
import { NockchainClient } from '@nockchain/sdk';

class LiquidityMonitor {
  private client: NockchainClient;

  constructor(apiKey: string) {
    this.client = new NockchainClient({ apiKey });
  }

  async monitorPools() {
    const pools = await this.client.dex.getLiquidityPools({
      minTvl: '1000000000000000000000'
    });

    for (const pool of pools.pools) {
      if (pool.apr > 0.5) { // 50% APR threshold
        console.log(`High APR pool found: ${pool.id} - ${pool.apr * 100}%`);
        await this.addLiquidity(pool);
      }
    }
  }

  private async addLiquidity(pool: any) {
    const quote = await this.client.dex.getQuote({
      inputToken: pool.token_a.address,
      outputToken: pool.token_b.address,
      amount: '1000000000000000000'
    });

    await this.client.dex.addLiquidity({
      poolId: pool.id,
      tokenAAmount: '1000000000000000000',
      tokenBAmount: quote.best_route.output_amount,
      minTokenAAmount: '950000000000000000',
      minTokenBAmount: quote.best_route.output_amount,
      userAddress: 'nock1provider...'
    });
  }
}
```

## Next Steps

- Read the [API Documentation](../api-documentation/)
- Check out more [SDK Examples](./examples/)
- Join the [Developer Community](https://discord.gg/nockchain-dev)
- Contribute to the [SDK on GitHub](https://github.com/nockchain/javascript-sdk)