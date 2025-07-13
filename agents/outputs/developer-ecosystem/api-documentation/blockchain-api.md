# Blockchain Core API

## Overview

The Blockchain Core API provides real-time access to the Nockchain blockchain, including blocks, transactions, accounts, and network statistics. This is the foundation for all blockchain interactions.

## Base URL
```
https://api.nockchain.com/v1/blockchain
```

## Authentication

All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Rate Limits

- **Free Tier**: 1,000 requests/hour
- **Developer Tier**: 10,000 requests/hour
- **Professional Tier**: 100,000 requests/hour
- **Enterprise Tier**: Unlimited

## Endpoints

### GET /status
Get current blockchain status and network information.

#### Response
```json
{
  "status": "healthy",
  "network": "mainnet",
  "latest_block": {
    "height": 1234567,
    "hash": "0x1234...",
    "timestamp": "2024-01-15T12:00:00Z",
    "transactions": 42,
    "size": 1024
  },
  "network_stats": {
    "total_transactions": 50000000,
    "total_accounts": 1000000,
    "validator_count": 1000,
    "tps": 3000,
    "avg_block_time": 2.5
  },
  "sync_status": {
    "is_syncing": false,
    "current_block": 1234567,
    "highest_block": 1234567,
    "sync_progress": 100.0
  }
}
```

#### Code Examples

**JavaScript/TypeScript**
```javascript
import { NockchainClient } from '@nockchain/sdk';

const client = new NockchainClient('YOUR_API_KEY');

async function getBlockchainStatus() {
  try {
    const status = await client.blockchain.getStatus();
    console.log('Current block height:', status.latest_block.height);
    console.log('Network TPS:', status.network_stats.tps);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

**Python**
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

def get_blockchain_status():
    try:
        status = client.blockchain.get_status()
        print(f"Current block height: {status['latest_block']['height']}")
        print(f"Network TPS: {status['network_stats']['tps']}")
    except Exception as error:
        print(f"Error: {error}")
```

**Rust**
```rust
use nockchain_sdk::NockchainClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::new("YOUR_API_KEY");
    
    let status = client.blockchain().get_status().await?;
    println!("Current block height: {}", status.latest_block.height);
    println!("Network TPS: {}", status.network_stats.tps);
    
    Ok(())
}
```

**Go**
```go
package main

import (
    "fmt"
    "log"
    "github.com/nockchain/go-sdk"
)

func main() {
    client := nockchain.NewClient("YOUR_API_KEY")
    
    status, err := client.Blockchain.GetStatus()
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Current block height: %d\n", status.LatestBlock.Height)
    fmt.Printf("Network TPS: %d\n", status.NetworkStats.TPS)
}
```

### GET /blocks/{height}
Get block information by height.

#### Parameters
- `height` (path): Block height number

#### Response
```json
{
  "height": 1234567,
  "hash": "0x1234...",
  "parent_hash": "0x5678...",
  "timestamp": "2024-01-15T12:00:00Z",
  "proposer": "nock1abc...",
  "transactions": [
    {
      "hash": "0xabcd...",
      "from": "nock1def...",
      "to": "nock1ghi...",
      "value": "1000000000000000000",
      "fee": "21000",
      "status": "success"
    }
  ],
  "size": 1024,
  "gas_limit": 30000000,
  "gas_used": 21000,
  "difficulty": "0x1234567890abcdef",
  "nonce": "0x123456789abcdef0"
}
```

### GET /blocks/latest
Get the latest block information.

#### Response
Same as `/blocks/{height}` but for the most recent block.

### GET /blocks/range
Get multiple blocks in a range.

#### Parameters
- `start` (query): Starting block height
- `end` (query): Ending block height (max 100 blocks)
- `limit` (query): Maximum number of blocks to return (default: 10, max: 100)

#### Response
```json
{
  "blocks": [
    {
      "height": 1234567,
      "hash": "0x1234...",
      "timestamp": "2024-01-15T12:00:00Z",
      "transactions": 42,
      "size": 1024
    }
  ],
  "pagination": {
    "start": 1234567,
    "end": 1234577,
    "limit": 10,
    "total": 11
  }
}
```

### GET /transactions/{hash}
Get transaction details by hash.

#### Parameters
- `hash` (path): Transaction hash

#### Response
```json
{
  "hash": "0xabcd...",
  "block_height": 1234567,
  "block_hash": "0x1234...",
  "from": "nock1def...",
  "to": "nock1ghi...",
  "value": "1000000000000000000",
  "fee": "21000",
  "gas_limit": 21000,
  "gas_used": 21000,
  "gas_price": "1000000000",
  "nonce": 42,
  "status": "success",
  "timestamp": "2024-01-15T12:00:00Z",
  "confirmations": 100,
  "receipt": {
    "logs": [],
    "events": []
  }
}
```

### GET /accounts/{address}
Get account information.

#### Parameters
- `address` (path): Account address

#### Response
```json
{
  "address": "nock1abc...",
  "balance": "1000000000000000000000",
  "nonce": 42,
  "code": null,
  "storage_root": "0x1234...",
  "transaction_count": 100,
  "created_at": "2024-01-01T00:00:00Z",
  "last_activity": "2024-01-15T12:00:00Z"
}
```

### GET /accounts/{address}/transactions
Get transaction history for an account.

#### Parameters
- `address` (path): Account address
- `page` (query): Page number (default: 1)
- `limit` (query): Number of transactions per page (default: 10, max: 100)
- `type` (query): Filter by transaction type (sent, received, all)

#### Response
```json
{
  "transactions": [
    {
      "hash": "0xabcd...",
      "block_height": 1234567,
      "from": "nock1def...",
      "to": "nock1ghi...",
      "value": "1000000000000000000",
      "fee": "21000",
      "status": "success",
      "timestamp": "2024-01-15T12:00:00Z",
      "type": "sent"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  }
}
```

### GET /validators
Get current validator information.

#### Response
```json
{
  "validators": [
    {
      "address": "nock1validator...",
      "voting_power": "10000000000000000000000",
      "commission": "0.05",
      "status": "active",
      "uptime": "99.99",
      "blocks_proposed": 1000,
      "last_block_height": 1234567
    }
  ],
  "total_voting_power": "100000000000000000000000",
  "total_validators": 1000,
  "active_validators": 995
}
```

### GET /network/peers
Get network peer information.

#### Response
```json
{
  "peers": [
    {
      "id": "peer1234...",
      "address": "192.168.1.1:26656",
      "version": "v1.0.0",
      "moniker": "nockchain-node-1",
      "network": "mainnet",
      "is_outbound": true,
      "connection_duration": "24h30m"
    }
  ],
  "total_peers": 50,
  "inbound_peers": 25,
  "outbound_peers": 25
}
```

## WebSocket API

For real-time updates, connect to the WebSocket endpoint:

```
wss://api.nockchain.com/v1/ws
```

### Subscribe to Events

```javascript
const ws = new WebSocket('wss://api.nockchain.com/v1/ws');

ws.onopen = () => {
  // Subscribe to new blocks
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'blocks',
    auth: 'YOUR_API_KEY'
  }));
  
  // Subscribe to transactions for specific address
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'transactions',
    filter: { address: 'nock1abc...' },
    auth: 'YOUR_API_KEY'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Available Channels
- `blocks` - New block notifications
- `transactions` - Transaction updates
- `validators` - Validator status changes
- `network` - Network statistics updates

## Error Handling

All API endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

Error response format:
```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "The provided address is not valid",
    "details": "Address must be a valid bech32 address starting with 'nock'"
  }
}
```

## Performance Tips

1. **Use Pagination**: Always use pagination for large datasets
2. **Cache Responses**: Cache blockchain data that doesn't change frequently
3. **WebSocket for Real-time**: Use WebSocket subscriptions for real-time updates
4. **Batch Requests**: Group multiple requests when possible
5. **Rate Limit Management**: Implement exponential backoff for rate limiting

## Next Steps

- Explore the [Transaction API](./transaction-api.md) for sending transactions
- Check out the [Account API](./account-api.md) for wallet management
- Try the [Interactive API Explorer](https://docs.nockchain.com/playground)
- Join our [Discord community](https://discord.gg/nockchain-dev) for support