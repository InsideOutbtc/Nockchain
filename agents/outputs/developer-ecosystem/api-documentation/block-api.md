# Block API Reference

## Overview
The Block API provides comprehensive access to blockchain blocks, headers, and historical data. Query blocks, analyze blockchain metrics, and build powerful blockchain explorers with ease.

## Base URL
```
https://api.nockchain.com/v1/blocks
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

### Get Latest Block
Retrieve the most recent block on the blockchain.

```http
GET /blocks/latest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "block_number": 1234567,
    "block_hash": "0x1234567890abcdef...",
    "parent_hash": "0x0987654321fedcba...",
    "timestamp": "2024-01-15T14:22:00Z",
    "size": 2048,
    "transaction_count": 42,
    "gas_used": 8000000,
    "gas_limit": 30000000,
    "difficulty": "0x1bc16d674ec80000",
    "nonce": "0x9876543210abcdef",
    "miner": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
    "reward": "6.25",
    "total_difficulty": "0x1bc16d674ec80000000",
    "state_root": "0xabcdef1234567890...",
    "transactions_root": "0x1234567890abcdef...",
    "receipts_root": "0x0987654321fedcba...",
    "confirmations": 1
  }
}
```

### Get Block by Number
Retrieve a specific block by its number.

```http
GET /blocks/{block_number}
```

**Query Parameters:**
- `include_transactions` (optional): Include full transaction details (default: false)
- `include_receipts` (optional): Include transaction receipts (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "block_number": 1234567,
    "block_hash": "0x1234567890abcdef...",
    "parent_hash": "0x0987654321fedcba...",
    "timestamp": "2024-01-15T14:22:00Z",
    "size": 2048,
    "transaction_count": 42,
    "transactions": [
      {
        "tx_hash": "0xabc123def456...",
        "from": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
        "to": "nock1abc123def456ghi789jkl012mno345pqr678stu",
        "value": "100.50",
        "gas_used": 21000,
        "gas_price": "20",
        "status": "success"
      }
    ],
    "gas_used": 8000000,
    "gas_limit": 30000000,
    "difficulty": "0x1bc16d674ec80000",
    "nonce": "0x9876543210abcdef",
    "miner": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
    "reward": "6.25",
    "confirmations": 12
  }
}
```

### Get Block by Hash
Retrieve a specific block by its hash.

```http
GET /blocks/hash/{block_hash}
```

### Get Block Range
Retrieve multiple blocks in a range.

```http
GET /blocks/range
```

**Query Parameters:**
- `start_block` (required): Starting block number
- `end_block` (required): Ending block number (max range: 1000 blocks)
- `include_transactions` (optional): Include transaction details

**Response:**
```json
{
  "success": true,
  "data": {
    "blocks": [
      {
        "block_number": 1234567,
        "block_hash": "0x1234567890abcdef...",
        "timestamp": "2024-01-15T14:22:00Z",
        "transaction_count": 42,
        "gas_used": 8000000,
        "miner": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4"
      }
    ],
    "total_blocks": 1000,
    "start_block": 1234567,
    "end_block": 1235566
  }
}
```

### Block Statistics
Get comprehensive statistics for a block or range of blocks.

```http
GET /blocks/stats
```

**Query Parameters:**
- `block_number` (optional): Specific block number
- `start_block` (optional): Start of range
- `end_block` (optional): End of range
- `timeframe` (optional): Time-based stats (1h, 1d, 1w, 1m)

**Response:**
```json
{
  "success": true,
  "data": {
    "block_count": 1000,
    "avg_block_time": 12.5,
    "total_transactions": 42000,
    "avg_transactions_per_block": 42,
    "total_gas_used": 8000000000,
    "avg_gas_used": 8000000,
    "avg_gas_price": "25.5",
    "total_fees": "200.75",
    "network_hashrate": "1.2TH/s",
    "difficulty": "0x1bc16d674ec80000",
    "top_miners": [
      {
        "miner": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
        "blocks_mined": 42,
        "percentage": 4.2
      }
    ]
  }
}
```

### Uncle Blocks
Get information about uncle blocks (if applicable).

```http
GET /blocks/{block_number}/uncles
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uncles": [
      {
        "uncle_hash": "0x1234567890abcdef...",
        "uncle_number": 1234566,
        "parent_hash": "0x0987654321fedcba...",
        "miner": "nock1abc123def456ghi789jkl012mno345pqr678stu",
        "reward": "1.875",
        "timestamp": "2024-01-15T14:21:45Z"
      }
    ]
  }
}
```

### Block Rewards
Get detailed reward information for blocks.

```http
GET /blocks/{block_number}/rewards
```

**Response:**
```json
{
  "success": true,
  "data": {
    "block_reward": "6.25",
    "transaction_fees": "0.75",
    "total_reward": "7.00",
    "uncle_rewards": [
      {
        "uncle_hash": "0x1234567890abcdef...",
        "reward": "1.875"
      }
    ],
    "miner": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
    "reward_breakdown": {
      "base_reward": "6.25",
      "uncle_inclusion": "0.00",
      "transaction_fees": "0.75"
    }
  }
}
```

## Real-time Block Updates

### WebSocket Connection
Subscribe to real-time block updates.

```javascript
const ws = new WebSocket('wss://ws.nockchain.com/v1/blocks');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_block') {
    console.log('New block:', data.block);
  }
};

// Subscribe to new blocks
ws.send(JSON.stringify({
  action: 'subscribe',
  channel: 'blocks',
  api_key: 'YOUR_API_KEY'
}));
```

### Server-Sent Events
Alternative real-time updates using SSE.

```javascript
const eventSource = new EventSource(
  'https://api.nockchain.com/v1/blocks/stream?api_key=YOUR_API_KEY'
);

eventSource.onmessage = (event) => {
  const block = JSON.parse(event.data);
  console.log('New block:', block);
};
```

## Code Examples

### JavaScript/TypeScript
```javascript
import { NockchainSDK } from '@nockchain/sdk';

const nockchain = new NockchainSDK('YOUR_API_KEY');

// Get latest block
const latestBlock = await nockchain.blocks.getLatest();
console.log('Latest block:', latestBlock.block_number);

// Get specific block with transactions
const block = await nockchain.blocks.getByNumber(1234567, {
  include_transactions: true
});

// Get block statistics
const stats = await nockchain.blocks.getStats({
  timeframe: '1d'
});
console.log('Average block time:', stats.avg_block_time);

// Subscribe to new blocks
nockchain.blocks.subscribe((block) => {
  console.log('New block mined:', block.block_number);
});
```

### Python
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

# Get latest block
latest_block = client.blocks.get_latest()
print(f"Latest block: {latest_block['block_number']}")

# Get block range
blocks = client.blocks.get_range(
    start_block=1234567,
    end_block=1234577,
    include_transactions=True
)

# Get block statistics
stats = client.blocks.get_stats(timeframe='1d')
print(f"Average block time: {stats['avg_block_time']}")

# Real-time subscription
def on_new_block(block):
    print(f"New block: {block['block_number']}")

client.blocks.subscribe(on_new_block)
```

### Rust
```rust
use nockchain_sdk::NockchainClient;

let client = NockchainClient::new("YOUR_API_KEY");

// Get latest block
let latest_block = client.blocks().get_latest().await?;
println!("Latest block: {}", latest_block.block_number);

// Get specific block
let block = client.blocks().get_by_number(1234567, GetBlockOptions {
    include_transactions: true,
    include_receipts: false,
}).await?;

// Get block statistics
let stats = client.blocks().get_stats(StatsOptions {
    timeframe: Some("1d".to_string()),
    ..Default::default()
}).await?;

// Subscribe to new blocks
let mut stream = client.blocks().subscribe().await?;
while let Some(block) = stream.next().await {
    println!("New block: {}", block.block_number);
}
```

## Advanced Features

### Block Filtering
Filter blocks by various criteria.

```http
GET /blocks/filter
```

**Query Parameters:**
- `miner` (optional): Filter by miner address
- `min_transactions` (optional): Minimum transaction count
- `max_transactions` (optional): Maximum transaction count
- `min_gas_used` (optional): Minimum gas used
- `max_gas_used` (optional): Maximum gas used
- `start_time` (optional): Start timestamp
- `end_time` (optional): End timestamp

### Block Validation
Validate block integrity and structure.

```http
POST /blocks/validate
```

**Request Body:**
```json
{
  "block_hash": "0x1234567890abcdef...",
  "validate_transactions": true,
  "validate_receipts": true
}
```

### Blockchain Analysis
Advanced blockchain analysis tools.

```http
GET /blocks/analysis
```

**Query Parameters:**
- `analysis_type`: `orphan_rate`, `reorg_depth`, `mining_distribution`
- `timeframe`: Analysis time period
- `depth`: Analysis depth (for reorg analysis)

## Webhooks
Subscribe to block events with webhooks.

### Available Events
- `block.mined`
- `block.confirmed`
- `block.reorg`
- `block.uncle_found`

### Webhook Configuration
```http
POST /blocks/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/nockchain",
  "events": ["block.mined", "block.confirmed"],
  "secret": "your_webhook_secret",
  "filters": {
    "min_transactions": 10
  }
}
```

## Error Handling

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found (block doesn't exist)
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "BLOCK_NOT_FOUND",
    "message": "Block not found",
    "details": {
      "block_number": 1234567
    }
  }
}
```

## Performance Optimization

### Caching
- Block data is cached for 60 seconds
- Historical blocks are cached indefinitely
- Use ETags for efficient caching

### Batch Requests
Request multiple blocks efficiently:

```http
POST /blocks/batch
```

**Request Body:**
```json
{
  "blocks": [1234567, 1234568, 1234569],
  "include_transactions": false
}
```

## Rate Limits
- **Standard Plan**: 1,000 requests per minute
- **Pro Plan**: 10,000 requests per minute
- **Enterprise Plan**: Custom limits

## Best Practices

1. **Use WebSockets**: For real-time block updates
2. **Batch Requests**: When fetching multiple blocks
3. **Cache Appropriately**: Historical blocks don't change
4. **Handle Reorgs**: Be prepared for blockchain reorganizations
5. **Monitor Rate Limits**: Implement backoff strategies

## Support
- **Documentation**: https://docs.nockchain.com/blocks
- **Discord**: https://discord.gg/nockchain-dev
- **Email**: developers@nockchain.com