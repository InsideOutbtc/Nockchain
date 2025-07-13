# DEX Integration API

## Overview

The DEX Integration API provides seamless access to multiple decentralized exchanges, enabling developers to build powerful trading applications, arbitrage systems, and liquidity management tools. This unified API aggregates liquidity from all major DEXes on Nockchain.

## Base URL
```
https://api.nockchain.com/v1/dex
```

## Supported DEXes

- **NockSwap** - Native Nockchain DEX
- **Jupiter** - Cross-chain aggregator
- **Orca** - Concentrated liquidity
- **Raydium** - Automated market maker
- **Serum** - Central limit order book
- **Aldrin** - Advanced trading features
- **Marinade** - Liquid staking integration

## Authentication

All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Core Endpoints

### GET /exchanges
Get list of supported exchanges and their status.

#### Response
```json
{
  "exchanges": [
    {
      "id": "nockswap",
      "name": "NockSwap",
      "status": "active",
      "fee": "0.003",
      "volume_24h": "10000000000000000000000",
      "pairs": 150,
      "supported_features": ["spot", "liquidity", "farming"]
    },
    {
      "id": "jupiter",
      "name": "Jupiter",
      "status": "active",
      "fee": "0.0025",
      "volume_24h": "5000000000000000000000",
      "pairs": 300,
      "supported_features": ["spot", "aggregation", "cross_chain"]
    }
  ]
}
```

### GET /pairs
Get all available trading pairs across exchanges.

#### Query Parameters
- `exchange` (optional): Filter by exchange ID
- `base_token` (optional): Filter by base token address
- `quote_token` (optional): Filter by quote token address
- `min_liquidity` (optional): Minimum liquidity threshold
- `page` (optional): Page number
- `limit` (optional): Results per page (max 100)

#### Response
```json
{
  "pairs": [
    {
      "id": "nockswap_nock_usdc",
      "exchange": "nockswap",
      "base_token": {
        "symbol": "NOCK",
        "address": "nock1token...",
        "decimals": 18
      },
      "quote_token": {
        "symbol": "USDC",
        "address": "nock1usdc...",
        "decimals": 6
      },
      "liquidity": "1000000000000000000000",
      "volume_24h": "500000000000000000000",
      "price": "1.25",
      "price_change_24h": "0.05",
      "fee": "0.003"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500
  }
}
```

### GET /quote
Get price quotes for token swaps across all exchanges.

#### Query Parameters
- `input_token` (required): Input token address
- `output_token` (required): Output token address
- `amount` (required): Input amount
- `slippage` (optional): Slippage tolerance (default: 0.01)
- `exchanges` (optional): Comma-separated exchange IDs to include

#### Response
```json
{
  "input_token": "nock1token...",
  "output_token": "nock1usdc...",
  "input_amount": "1000000000000000000",
  "routes": [
    {
      "exchange": "nockswap",
      "output_amount": "1245000000",
      "price_impact": "0.002",
      "fee": "3750000000000000",
      "gas_estimate": 150000,
      "route": [
        {
          "pool": "nockswap_nock_usdc",
          "input_token": "nock1token...",
          "output_token": "nock1usdc...",
          "input_amount": "1000000000000000000",
          "output_amount": "1245000000"
        }
      ]
    },
    {
      "exchange": "jupiter",
      "output_amount": "1250000000",
      "price_impact": "0.001",
      "fee": "2500000000000000",
      "gas_estimate": 200000,
      "route": [
        {
          "pool": "jupiter_nock_usdc",
          "input_token": "nock1token...",
          "output_token": "nock1usdc...",
          "input_amount": "1000000000000000000",
          "output_amount": "1250000000"
        }
      ]
    }
  ],
  "best_route": {
    "exchange": "jupiter",
    "output_amount": "1250000000",
    "savings": "5000000",
    "savings_percentage": "0.004"
  }
}
```

#### Code Examples

**JavaScript/TypeScript**
```javascript
import { NockchainClient } from '@nockchain/sdk';

const client = new NockchainClient('YOUR_API_KEY');

async function getBestQuote() {
  try {
    const quote = await client.dex.getQuote({
      input_token: 'nock1token...',
      output_token: 'nock1usdc...',
      amount: '1000000000000000000',
      slippage: 0.01
    });
    
    console.log('Best route:', quote.best_route);
    console.log('Output amount:', quote.best_route.output_amount);
    console.log('Exchange:', quote.best_route.exchange);
    
    return quote;
  } catch (error) {
    console.error('Error getting quote:', error);
  }
}
```

**Python**
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

def get_best_quote():
    try:
        quote = client.dex.get_quote(
            input_token='nock1token...',
            output_token='nock1usdc...',
            amount='1000000000000000000',
            slippage=0.01
        )
        
        print(f"Best route: {quote['best_route']}")
        print(f"Output amount: {quote['best_route']['output_amount']}")
        print(f"Exchange: {quote['best_route']['exchange']}")
        
        return quote
    except Exception as error:
        print(f"Error getting quote: {error}")
```

### POST /swap
Execute a token swap using the best available route.

#### Request Body
```json
{
  "input_token": "nock1token...",
  "output_token": "nock1usdc...",
  "input_amount": "1000000000000000000",
  "min_output_amount": "1225000000",
  "slippage": 0.01,
  "user_address": "nock1user...",
  "exchange": "jupiter", // Optional: specify exchange
  "deadline": "2024-01-15T12:05:00Z" // Optional: transaction deadline
}
```

#### Response
```json
{
  "transaction_hash": "0xabcd...",
  "route": {
    "exchange": "jupiter",
    "input_amount": "1000000000000000000",
    "output_amount": "1250000000",
    "price_impact": "0.001",
    "fee": "2500000000000000"
  },
  "gas_estimate": 200000,
  "estimated_confirmation_time": "5s",
  "status": "pending"
}
```

#### Code Examples

**JavaScript/TypeScript**
```javascript
async function executeSwap() {
  try {
    // First get a quote
    const quote = await client.dex.getQuote({
      input_token: 'nock1token...',
      output_token: 'nock1usdc...',
      amount: '1000000000000000000'
    });
    
    // Execute the swap using the best route
    const swap = await client.dex.swap({
      input_token: 'nock1token...',
      output_token: 'nock1usdc...',
      input_amount: '1000000000000000000',
      min_output_amount: quote.best_route.output_amount,
      slippage: 0.01,
      user_address: 'nock1user...',
      exchange: quote.best_route.exchange
    });
    
    console.log('Swap executed:', swap.transaction_hash);
    
    // Wait for confirmation
    const receipt = await client.transactions.waitForConfirmation(swap.transaction_hash);
    console.log('Swap confirmed:', receipt.status);
    
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}
```

### GET /liquidity/pools
Get liquidity pool information.

#### Query Parameters
- `exchange` (optional): Filter by exchange
- `token` (optional): Filter pools containing this token
- `min_tvl` (optional): Minimum total value locked
- `sort` (optional): Sort by tvl, volume, apr (default: tvl)
- `page` (optional): Page number
- `limit` (optional): Results per page

#### Response
```json
{
  "pools": [
    {
      "id": "nockswap_nock_usdc",
      "exchange": "nockswap",
      "token_a": {
        "symbol": "NOCK",
        "address": "nock1token...",
        "reserve": "1000000000000000000000"
      },
      "token_b": {
        "symbol": "USDC",
        "address": "nock1usdc...",
        "reserve": "1250000000"
      },
      "tvl": "2500000000000000000000",
      "volume_24h": "500000000000000000000",
      "fees_24h": "1500000000000000000",
      "apr": "0.15",
      "fee_tier": "0.003"
    }
  ]
}
```

### POST /liquidity/add
Add liquidity to a pool.

#### Request Body
```json
{
  "pool_id": "nockswap_nock_usdc",
  "token_a_amount": "1000000000000000000",
  "token_b_amount": "1250000000",
  "min_token_a_amount": "950000000000000000",
  "min_token_b_amount": "1187500000",
  "user_address": "nock1user...",
  "deadline": "2024-01-15T12:05:00Z"
}
```

#### Response
```json
{
  "transaction_hash": "0xabcd...",
  "pool_id": "nockswap_nock_usdc",
  "liquidity_tokens": "1118033988749895000",
  "token_a_amount": "1000000000000000000",
  "token_b_amount": "1250000000",
  "share_of_pool": "0.001",
  "status": "pending"
}
```

### POST /liquidity/remove
Remove liquidity from a pool.

#### Request Body
```json
{
  "pool_id": "nockswap_nock_usdc",
  "liquidity_tokens": "1118033988749895000",
  "min_token_a_amount": "950000000000000000",
  "min_token_b_amount": "1187500000",
  "user_address": "nock1user...",
  "deadline": "2024-01-15T12:05:00Z"
}
```

## Advanced Features

### Arbitrage Detection

#### GET /arbitrage/opportunities
Find arbitrage opportunities across exchanges.

#### Response
```json
{
  "opportunities": [
    {
      "pair": "NOCK/USDC",
      "buy_exchange": "nockswap",
      "sell_exchange": "jupiter",
      "buy_price": "1.20",
      "sell_price": "1.25",
      "profit_percentage": "0.0417",
      "profit_amount": "50000000",
      "required_capital": "1000000000000000000",
      "gas_cost": "300000000000000000",
      "net_profit": "47000000000000000"
    }
  ]
}
```

### Limit Orders

#### POST /orders/limit
Place a limit order.

#### Request Body
```json
{
  "type": "limit",
  "side": "buy",
  "input_token": "nock1usdc...",
  "output_token": "nock1token...",
  "input_amount": "1250000000",
  "limit_price": "1.20",
  "user_address": "nock1user...",
  "expiry": "2024-01-20T12:00:00Z"
}
```

### Advanced Order Types

#### POST /orders/stop-loss
Place a stop-loss order.

#### POST /orders/take-profit
Place a take-profit order.

#### POST /orders/trailing-stop
Place a trailing stop order.

## Portfolio Management

### GET /portfolio/{address}
Get portfolio information for an address.

#### Response
```json
{
  "address": "nock1user...",
  "total_value": "10000000000000000000",
  "tokens": [
    {
      "symbol": "NOCK",
      "address": "nock1token...",
      "balance": "8000000000000000000",
      "value": "8000000000000000000",
      "price": "1.00",
      "allocation": "0.8"
    }
  ],
  "liquidity_positions": [
    {
      "pool_id": "nockswap_nock_usdc",
      "tokens": "1118033988749895000",
      "value": "2000000000000000000",
      "allocation": "0.2"
    }
  ],
  "performance": {
    "total_return": "0.15",
    "daily_return": "0.02",
    "unrealized_pnl": "1500000000000000000"
  }
}
```

## WebSocket API

Subscribe to real-time DEX data:

```javascript
const ws = new WebSocket('wss://api.nockchain.com/v1/ws');

ws.onopen = () => {
  // Subscribe to price updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'dex_prices',
    filter: { pair: 'NOCK/USDC' },
    auth: 'YOUR_API_KEY'
  }));
  
  // Subscribe to order book updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'order_book',
    filter: { exchange: 'nockswap', pair: 'NOCK/USDC' },
    auth: 'YOUR_API_KEY'
  }));
};
```

## Error Handling

Common DEX API errors:
- `INSUFFICIENT_LIQUIDITY` - Not enough liquidity for swap
- `SLIPPAGE_EXCEEDED` - Price moved beyond slippage tolerance
- `DEADLINE_EXCEEDED` - Transaction deadline passed
- `INVALID_PAIR` - Trading pair not supported
- `POOL_NOT_FOUND` - Liquidity pool doesn't exist

## Performance Tips

1. **Use Batch Quotes**: Get multiple quotes in one request
2. **Monitor Gas Prices**: Account for gas costs in profitability calculations
3. **Cache Pool Data**: Cache frequently accessed pool information
4. **WebSocket Updates**: Use WebSocket for real-time price updates
5. **Slippage Management**: Implement dynamic slippage based on market conditions

## Best Practices

### Smart Order Routing
```javascript
// Always compare routes across multiple exchanges
const quote = await client.dex.getQuote({
  input_token: 'nock1token...',
  output_token: 'nock1usdc...',
  amount: '1000000000000000000',
  exchanges: ['nockswap', 'jupiter', 'orca'] // Compare multiple exchanges
});

// Use the best route
const bestRoute = quote.best_route;
```

### MEV Protection
```javascript
// Use private mempool for large trades
const swap = await client.dex.swap({
  input_token: 'nock1token...',
  output_token: 'nock1usdc...',
  input_amount: '1000000000000000000',
  min_output_amount: '1200000000',
  slippage: 0.01,
  user_address: 'nock1user...',
  private_mempool: true // Protect against MEV
});
```

## Next Steps

- Explore the [Liquidity Provider API](./liquidity-api.md)
- Check out the [Yield Optimization API](./yield-api.md)
- Try the [Portfolio Management Tools](./portfolio-api.md)
- Join our [Trading Community](https://discord.gg/nockchain-trading)