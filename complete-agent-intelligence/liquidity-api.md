# Liquidity Provider API Reference

## Overview
The Liquidity Provider API enables seamless liquidity management across multiple DEXes and protocols. Maximize returns, minimize impermanent loss, and automate liquidity strategies with enterprise-grade tools.

## Base URL
```
https://api.nockchain.com/v1/liquidity
```

## Authentication
All endpoints require API key authentication:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
}
```

## Core Endpoints

### Get Liquidity Positions
Retrieve all active liquidity positions across protocols.

```http
GET /positions
```

**Query Parameters:**
- `protocol` (optional): Filter by protocol (uniswap, sushiswap, pancakeswap)
- `token_pair` (optional): Filter by token pair (e.g., NOCK/USDC)
- `status` (optional): Filter by status (active, inactive, pending)
- `min_value` (optional): Minimum position value in USD

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "position_id": "pos_1234567890",
        "protocol": "uniswap_v3",
        "pool_address": "0x1234567890abcdef...",
        "token_pair": "NOCK/USDC",
        "token_a": {
          "symbol": "NOCK",
          "address": "0xabc123...",
          "amount": "1000.50",
          "value_usd": "1000.50"
        },
        "token_b": {
          "symbol": "USDC",
          "address": "0xdef456...",
          "amount": "1000.00",
          "value_usd": "1000.00"
        },
        "total_value_usd": "2000.50",
        "fee_tier": "0.3%",
        "price_range": {
          "lower": "0.95",
          "upper": "1.05",
          "current": "1.00"
        },
        "liquidity_tokens": "1414.213562",
        "fees_earned": {
          "token_a": "5.25",
          "token_b": "5.30",
          "total_usd": "10.55"
        },
        "apy": {
          "current": "12.5%",
          "7d_avg": "11.8%",
          "30d_avg": "13.2%"
        },
        "impermanent_loss": {
          "percentage": "-2.1%",
          "value_usd": "-42.10"
        },
        "status": "active",
        "created_at": "2024-01-15T10:30:00Z",
        "last_updated": "2024-01-15T14:22:00Z"
      }
    ],
    "total_positions": 15,
    "total_value_usd": "50000.00",
    "total_fees_earned_usd": "500.25"
  }
}
```

### Create Liquidity Position
Add liquidity to a specific pool.

```http
POST /positions
```

**Request Body:**
```json
{
  "protocol": "uniswap_v3",
  "pool_address": "0x1234567890abcdef...",
  "token_a": {
    "symbol": "NOCK",
    "amount": "1000.50"
  },
  "token_b": {
    "symbol": "USDC",
    "amount": "1000.00"
  },
  "price_range": {
    "lower": "0.95",
    "upper": "1.05"
  },
  "slippage_tolerance": "0.5%",
  "deadline": "2024-01-15T15:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "position_id": "pos_1234567890",
    "transaction_hash": "0xabc123def456...",
    "status": "pending",
    "estimated_gas": 250000,
    "gas_price": "30",
    "estimated_fees": "0.0075",
    "liquidity_tokens": "1414.213562",
    "price_impact": "0.05%"
  }
}
```

### Remove Liquidity Position
Remove liquidity from a position.

```http
DELETE /positions/{position_id}
```

**Request Body:**
```json
{
  "percentage": 100,
  "minimum_token_a": "950.00",
  "minimum_token_b": "950.00",
  "slippage_tolerance": "0.5%",
  "deadline": "2024-01-15T15:00:00Z"
}
```

### Get Position Analytics
Get detailed analytics for a specific position.

```http
GET /positions/{position_id}/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "position_id": "pos_1234567890",
    "performance": {
      "pnl": {
        "realized": "25.50",
        "unrealized": "15.75",
        "total": "41.25"
      },
      "fees_earned": {
        "daily": "2.50",
        "weekly": "17.50",
        "monthly": "75.00",
        "total": "105.50"
      },
      "impermanent_loss": {
        "current": "-2.1%",
        "historical_max": "-5.2%",
        "value_usd": "-42.10"
      },
      "apy": {
        "current": "12.5%",
        "7d_avg": "11.8%",
        "30d_avg": "13.2%",
        "all_time": "14.1%"
      }
    },
    "risk_metrics": {
      "volatility": "0.45",
      "beta": "1.2",
      "sharpe_ratio": "0.85",
      "max_drawdown": "-15.2%"
    },
    "price_history": [
      {
        "timestamp": "2024-01-15T14:00:00Z",
        "price": "1.00",
        "volume_24h": "1000000"
      }
    ]
  }
}
```

### Pool Information
Get comprehensive pool information.

```http
GET /pools/{pool_address}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pool_address": "0x1234567890abcdef...",
    "protocol": "uniswap_v3",
    "token_pair": "NOCK/USDC",
    "fee_tier": "0.3%",
    "liquidity": "5000000.00",
    "volume_24h": "1000000.00",
    "volume_7d": "7000000.00",
    "fees_24h": "3000.00",
    "tvl": "10000000.00",
    "apy": "15.2%",
    "price": "1.00",
    "price_change_24h": "+2.5%",
    "tick_spacing": 60,
    "current_tick": 0,
    "liquidity_distribution": {
      "concentrated": "60%",
      "wide_range": "40%"
    }
  }
}
```

### Available Pools
List all available pools for liquidity provision.

```http
GET /pools
```

**Query Parameters:**
- `protocol` (optional): Filter by protocol
- `token` (optional): Filter by token
- `min_tvl` (optional): Minimum TVL
- `min_apy` (optional): Minimum APY
- `sort_by` (optional): Sort by tvl, apy, volume
- `limit` (optional): Number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "pool_address": "0x1234567890abcdef...",
        "protocol": "uniswap_v3",
        "token_pair": "NOCK/USDC",
        "fee_tier": "0.3%",
        "tvl": "10000000.00",
        "apy": "15.2%",
        "volume_24h": "1000000.00",
        "fees_24h": "3000.00"
      }
    ],
    "total_pools": 150,
    "total_tvl": "500000000.00"
  }
}
```

## Advanced Features

### Liquidity Strategies
Automated liquidity management strategies.

```http
POST /strategies
```

**Request Body:**
```json
{
  "name": "Conservative NOCK/USDC",
  "strategy_type": "range_rebalancing",
  "parameters": {
    "token_pair": "NOCK/USDC",
    "target_range": "5%",
    "rebalance_threshold": "20%",
    "max_gas_price": "50",
    "auto_compound": true,
    "risk_level": "low"
  },
  "initial_capital": "10000.00",
  "allocation": {
    "NOCK": "50%",
    "USDC": "50%"
  }
}
```

### Yield Farming Opportunities
Discover high-yield farming opportunities.

```http
GET /farming/opportunities
```

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "protocol": "sushiswap",
        "pool": "NOCK/USDC",
        "base_apy": "12.5%",
        "reward_apy": "8.5%",
        "total_apy": "21.0%",
        "tvl": "5000000.00",
        "rewards": [
          {
            "token": "SUSHI",
            "amount_per_day": "100.00",
            "value_usd": "150.00"
          }
        ],
        "lock_period": "none",
        "risk_score": 7.5
      }
    ]
  }
}
```

### Impermanent Loss Calculator
Calculate potential impermanent loss.

```http
POST /calculator/impermanent-loss
```

**Request Body:**
```json
{
  "token_a": "NOCK",
  "token_b": "USDC",
  "initial_prices": {
    "token_a": "1.00",
    "token_b": "1.00"
  },
  "current_prices": {
    "token_a": "1.20",
    "token_b": "1.00"
  },
  "initial_amounts": {
    "token_a": "1000.00",
    "token_b": "1000.00"
  }
}
```

### Multi-Protocol Optimization
Optimize liquidity across multiple protocols.

```http
POST /optimize
```

**Request Body:**
```json
{
  "tokens": ["NOCK", "USDC", "ETH"],
  "total_capital": "50000.00",
  "risk_tolerance": "medium",
  "optimization_goal": "max_yield",
  "protocols": ["uniswap_v3", "sushiswap", "pancakeswap"],
  "constraints": {
    "max_positions": 5,
    "min_position_size": "1000.00",
    "max_gas_per_tx": "100.00"
  }
}
```

## Real-time Updates

### WebSocket Connection
Subscribe to real-time position updates.

```javascript
const ws = new WebSocket('wss://ws.nockchain.com/v1/liquidity');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'position_update') {
    console.log('Position updated:', data.position);
  }
};

// Subscribe to position updates
ws.send(JSON.stringify({
  action: 'subscribe',
  channel: 'positions',
  api_key: 'YOUR_API_KEY'
}));
```

## Code Examples

### JavaScript/TypeScript
```javascript
import { NockchainSDK } from '@nockchain/sdk';

const nockchain = new NockchainSDK('YOUR_API_KEY');

// Get all positions
const positions = await nockchain.liquidity.getPositions();

// Create new position
const newPosition = await nockchain.liquidity.createPosition({
  protocol: 'uniswap_v3',
  pool_address: '0x1234567890abcdef...',
  token_a: { symbol: 'NOCK', amount: '1000.50' },
  token_b: { symbol: 'USDC', amount: '1000.00' },
  price_range: { lower: '0.95', upper: '1.05' }
});

// Monitor position
const analytics = await nockchain.liquidity.getPositionAnalytics(
  newPosition.position_id
);
console.log('Current APY:', analytics.performance.apy.current);
```

### Python
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

# Get positions
positions = client.liquidity.get_positions()

# Create position
position = client.liquidity.create_position(
    protocol='uniswap_v3',
    pool_address='0x1234567890abcdef...',
    token_a={'symbol': 'NOCK', 'amount': '1000.50'},
    token_b={'symbol': 'USDC', 'amount': '1000.00'},
    price_range={'lower': '0.95', 'upper': '1.05'}
)

# Get analytics
analytics = client.liquidity.get_position_analytics(position['position_id'])
print(f"APY: {analytics['performance']['apy']['current']}")
```

### Rust
```rust
use nockchain_sdk::NockchainClient;

let client = NockchainClient::new("YOUR_API_KEY");

// Get positions
let positions = client.liquidity().get_positions().await?;

// Create position
let position = client.liquidity().create_position(CreatePositionRequest {
    protocol: "uniswap_v3".to_string(),
    pool_address: "0x1234567890abcdef...".to_string(),
    token_a: TokenAmount {
        symbol: "NOCK".to_string(),
        amount: "1000.50".to_string(),
    },
    token_b: TokenAmount {
        symbol: "USDC".to_string(),
        amount: "1000.00".to_string(),
    },
    price_range: Some(PriceRange {
        lower: "0.95".to_string(),
        upper: "1.05".to_string(),
    }),
    ..Default::default()
}).await?;
```

## Risk Management

### Risk Assessment
Assess risks for liquidity positions.

```http
POST /risk/assess
```

**Request Body:**
```json
{
  "position_id": "pos_1234567890",
  "risk_factors": [
    "impermanent_loss",
    "smart_contract",
    "market_volatility",
    "liquidity_risk"
  ]
}
```

### Risk Alerts
Set up risk-based alerts.

```http
POST /alerts
```

**Request Body:**
```json
{
  "position_id": "pos_1234567890",
  "alerts": [
    {
      "type": "impermanent_loss",
      "threshold": "5%",
      "action": "notify"
    },
    {
      "type": "apy_drop",
      "threshold": "50%",
      "action": "auto_exit"
    }
  ]
}
```

## Webhooks
Subscribe to liquidity events.

### Available Events
- `position.created`
- `position.updated`
- `position.removed`
- `position.fees_collected`
- `position.rebalanced`
- `position.risk_alert`

### Webhook Configuration
```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/liquidity",
  "events": ["position.updated", "position.risk_alert"],
  "secret": "your_webhook_secret"
}
```

## Best Practices

1. **Monitor Impermanent Loss**: Track IL regularly to make informed decisions
2. **Diversify Positions**: Spread risk across multiple protocols and pairs
3. **Use Price Alerts**: Set up alerts for significant price movements
4. **Rebalance Regularly**: Maintain optimal price ranges for concentrated liquidity
5. **Gas Optimization**: Consider gas costs when rebalancing frequently
6. **Risk Management**: Use stop-loss and take-profit strategies

## Rate Limits
- **Standard Plan**: 500 requests per minute
- **Pro Plan**: 5,000 requests per minute
- **Enterprise Plan**: Custom limits

## Support
- **Documentation**: https://docs.nockchain.com/liquidity
- **Discord**: https://discord.gg/nockchain-dev
- **Email**: developers@nockchain.com