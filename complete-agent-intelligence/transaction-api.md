# Transaction API

## Overview

The Transaction API enables you to send, track, and analyze transactions on the Nockchain network. It provides comprehensive transaction management with advanced features like gas estimation, batch processing, and real-time monitoring.

## Base URL
```
https://api.nockchain.com/v1/transactions
```

## Authentication

All requests require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### POST /send
Send a transaction to the network.

#### Request Body
```json
{
  "from": "nock1abc...",
  "to": "nock1def...",
  "value": "1000000000000000000",
  "data": "0x",
  "gas_limit": 21000,
  "gas_price": "1000000000",
  "nonce": 42,
  "private_key": "0x1234..." // Optional if using signed transaction
}
```

#### Response
```json
{
  "transaction_hash": "0xabcd...",
  "status": "pending",
  "estimated_confirmation_time": "5s",
  "gas_estimate": {
    "recommended": 21000,
    "minimum": 21000,
    "maximum": 50000
  },
  "fee_estimate": {
    "slow": "10000000000",
    "standard": "20000000000",
    "fast": "30000000000"
  }
}
```

#### Code Examples

**JavaScript/TypeScript**
```javascript
import { NockchainClient } from '@nockchain/sdk';

const client = new NockchainClient('YOUR_API_KEY');

async function sendTransaction() {
  try {
    const tx = await client.transactions.send({
      from: 'nock1abc...',
      to: 'nock1def...',
      value: '1000000000000000000', // 1 NOCK
      gasPrice: 'standard' // Use recommended gas price
    });
    
    console.log('Transaction sent:', tx.transaction_hash);
    
    // Wait for confirmation
    const receipt = await client.transactions.waitForConfirmation(tx.transaction_hash);
    console.log('Transaction confirmed:', receipt.status);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

**Python**
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

def send_transaction():
    try:
        tx = client.transactions.send({
            'from': 'nock1abc...',
            'to': 'nock1def...',
            'value': '1000000000000000000',  # 1 NOCK
            'gas_price': 'standard'
        })
        
        print(f"Transaction sent: {tx['transaction_hash']}")
        
        # Wait for confirmation
        receipt = client.transactions.wait_for_confirmation(tx['transaction_hash'])
        print(f"Transaction confirmed: {receipt['status']}")
    except Exception as error:
        print(f"Error: {error}")
```

**Rust**
```rust
use nockchain_sdk::{NockchainClient, TransactionRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::new("YOUR_API_KEY");
    
    let tx_request = TransactionRequest {
        from: "nock1abc...".to_string(),
        to: "nock1def...".to_string(),
        value: "1000000000000000000".to_string(),
        gas_price: Some("standard".to_string()),
        ..Default::default()
    };
    
    let tx = client.transactions().send(tx_request).await?;
    println!("Transaction sent: {}", tx.transaction_hash);
    
    let receipt = client.transactions().wait_for_confirmation(&tx.transaction_hash).await?;
    println!("Transaction confirmed: {}", receipt.status);
    
    Ok(())
}
```

### POST /batch
Send multiple transactions in a single batch.

#### Request Body
```json
{
  "transactions": [
    {
      "from": "nock1abc...",
      "to": "nock1def...",
      "value": "1000000000000000000",
      "nonce": 42
    },
    {
      "from": "nock1abc...",
      "to": "nock1ghi...",
      "value": "2000000000000000000",
      "nonce": 43
    }
  ],
  "gas_price": "standard",
  "private_key": "0x1234..."
}
```

#### Response
```json
{
  "batch_id": "batch_123",
  "transactions": [
    {
      "index": 0,
      "transaction_hash": "0xabcd...",
      "status": "pending"
    },
    {
      "index": 1,
      "transaction_hash": "0xefgh...",
      "status": "pending"
    }
  ],
  "total_transactions": 2,
  "estimated_total_fee": "42000000000000000",
  "estimated_confirmation_time": "10s"
}
```

### GET /estimate-gas
Estimate gas required for a transaction.

#### Query Parameters
- `from` (required): Sender address
- `to` (required): Recipient address
- `value` (optional): Transaction value
- `data` (optional): Transaction data

#### Response
```json
{
  "gas_estimate": {
    "recommended": 21000,
    "minimum": 21000,
    "maximum": 50000,
    "confidence": 0.95
  },
  "fee_estimate": {
    "slow": {
      "gas_price": "10000000000",
      "total_fee": "210000000000000",
      "confirmation_time": "30s"
    },
    "standard": {
      "gas_price": "20000000000",
      "total_fee": "420000000000000",
      "confirmation_time": "10s"
    },
    "fast": {
      "gas_price": "30000000000",
      "total_fee": "630000000000000",
      "confirmation_time": "5s"
    }
  }
}
```

### GET /{hash}
Get transaction details by hash.

#### Parameters
- `hash` (path): Transaction hash

#### Response
```json
{
  "hash": "0xabcd...",
  "block_height": 1234567,
  "block_hash": "0x1234...",
  "transaction_index": 0,
  "from": "nock1def...",
  "to": "nock1ghi...",
  "value": "1000000000000000000",
  "fee": "21000000000000000",
  "gas_limit": 21000,
  "gas_used": 21000,
  "gas_price": "1000000000",
  "nonce": 42,
  "status": "success",
  "timestamp": "2024-01-15T12:00:00Z",
  "confirmations": 100,
  "receipt": {
    "logs": [],
    "events": [],
    "gas_used": 21000,
    "cumulative_gas_used": 21000,
    "effective_gas_price": "1000000000",
    "status": "success"
  }
}
```

### GET /{hash}/status
Get transaction status and confirmation details.

#### Response
```json
{
  "hash": "0xabcd...",
  "status": "confirmed",
  "confirmations": 100,
  "required_confirmations": 12,
  "is_final": true,
  "block_height": 1234567,
  "timestamp": "2024-01-15T12:00:00Z",
  "gas_used": 21000,
  "fee_paid": "21000000000000000"
}
```

### GET /mempool
Get current mempool information.

#### Response
```json
{
  "pending_transactions": 1000,
  "total_value": "1000000000000000000000",
  "average_gas_price": "20000000000",
  "median_gas_price": "18000000000",
  "gas_price_percentiles": {
    "25th": "15000000000",
    "50th": "18000000000",
    "75th": "22000000000",
    "95th": "30000000000"
  },
  "estimated_wait_times": {
    "5_gwei": "60s",
    "10_gwei": "30s",
    "20_gwei": "10s",
    "50_gwei": "5s"
  }
}
```

### GET /search
Search transactions by various criteria.

#### Query Parameters
- `address` (optional): Filter by sender or recipient address
- `from` (optional): Filter by sender address
- `to` (optional): Filter by recipient address
- `block_height` (optional): Filter by block height
- `status` (optional): Filter by status (pending, confirmed, failed)
- `min_value` (optional): Minimum transaction value
- `max_value` (optional): Maximum transaction value
- `start_time` (optional): Start time filter (ISO 8601)
- `end_time` (optional): End time filter (ISO 8601)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

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
      "fee": "21000000000000000",
      "status": "success",
      "timestamp": "2024-01-15T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "total_pages": 10
  },
  "filters": {
    "address": "nock1abc...",
    "status": "confirmed"
  }
}
```

## Advanced Features

### Transaction Simulation

#### POST /simulate
Simulate a transaction without sending it.

```javascript
const simulation = await client.transactions.simulate({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000',
  data: '0x...'
});

console.log('Simulation result:', simulation);
```

#### Response
```json
{
  "success": true,
  "gas_used": 21000,
  "gas_limit": 21000,
  "return_value": "0x",
  "logs": [],
  "events": [],
  "state_changes": [
    {
      "address": "nock1abc...",
      "field": "balance",
      "old_value": "1000000000000000000000",
      "new_value": "999000000000000000000"
    }
  ],
  "trace": {
    "steps": [],
    "gas_used": 21000
  }
}
```

### Transaction Replacement

#### POST /{hash}/replace
Replace a pending transaction with higher gas price.

```javascript
const replacement = await client.transactions.replace('0xabcd...', {
  gas_price: '30000000000', // Higher gas price
  gas_limit: 25000
});
```

### Transaction Cancellation

#### POST /{hash}/cancel
Cancel a pending transaction.

```javascript
const cancellation = await client.transactions.cancel('0xabcd...', {
  gas_price: '30000000000' // Must be higher than original
});
```

## WebSocket Subscriptions

Subscribe to transaction events in real-time:

```javascript
const ws = new WebSocket('wss://api.nockchain.com/v1/ws');

ws.onopen = () => {
  // Subscribe to all pending transactions
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'transactions',
    filter: { status: 'pending' },
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
```

## Error Handling

Common error codes:
- `INSUFFICIENT_BALANCE` - Not enough funds
- `INVALID_NONCE` - Incorrect nonce value
- `GAS_LIMIT_EXCEEDED` - Gas limit too high
- `TRANSACTION_UNDERPRICED` - Gas price too low
- `NONCE_TOO_LOW` - Nonce already used
- `INVALID_SIGNATURE` - Invalid transaction signature

## Performance Optimization

### Batch Processing
```javascript
// Process multiple transactions efficiently
const batch = await client.transactions.batch([
  { from: 'nock1abc...', to: 'nock1def...', value: '1000000000000000000' },
  { from: 'nock1abc...', to: 'nock1ghi...', value: '2000000000000000000' }
]);
```

### Gas Price Optimization
```javascript
// Use dynamic gas pricing
const gasEstimate = await client.transactions.estimateGas({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000'
});

// Use recommended gas price for optimal confirmation time
const tx = await client.transactions.send({
  from: 'nock1abc...',
  to: 'nock1def...',
  value: '1000000000000000000',
  gas_price: gasEstimate.fee_estimate.standard.gas_price
});
```

## Next Steps

- Explore the [Account API](./account-api.md) for wallet management
- Check out the [DeFi APIs](./dex-api.md) for trading operations
- Try the [Interactive API Explorer](https://docs.nockchain.com/playground)
- Join our [Discord community](https://discord.gg/nockchain-dev) for support