# Account API Reference

## Overview
The Account API provides comprehensive wallet and account management capabilities for the Nockchain ecosystem. Handle user accounts, balances, transactions, and security with enterprise-grade reliability.

## Base URL
```
https://api.nockchain.com/v1/accounts
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

### Create Account
Create a new Nockchain account with optional metadata.

```http
POST /accounts
```

**Request Body:**
```json
{
  "type": "standard", // standard, multisig, smart_contract
  "metadata": {
    "name": "Trading Account",
    "description": "Main trading wallet",
    "tags": ["trading", "primary"]
  },
  "security": {
    "require_2fa": true,
    "whitelist_enabled": false,
    "daily_limit": 1000000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account_id": "acc_1234567890",
    "address": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
    "public_key": "0x1234567890abcdef...",
    "type": "standard",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "metadata": {
      "name": "Trading Account",
      "description": "Main trading wallet",
      "tags": ["trading", "primary"]
    }
  }
}
```

### Get Account Details
Retrieve detailed information about an account.

```http
GET /accounts/{account_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account_id": "acc_1234567890",
    "address": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
    "balance": {
      "nock": "1234.567890",
      "usdc": "5000.00",
      "total_usd": "6234.56"
    },
    "transaction_count": 42,
    "last_activity": "2024-01-15T14:22:00Z",
    "security": {
      "require_2fa": true,
      "whitelist_enabled": false,
      "daily_limit": 1000000,
      "daily_spent": 150.75
    },
    "metadata": {
      "name": "Trading Account",
      "description": "Main trading wallet",
      "tags": ["trading", "primary"]
    }
  }
}
```

### Get Account Balance
Get current balance for all supported tokens.

```http
GET /accounts/{account_id}/balance
```

**Query Parameters:**
- `tokens` (optional): Comma-separated list of token symbols
- `include_pending` (optional): Include pending transactions (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "nock": {
      "balance": "1234.567890",
      "pending": "0.100000",
      "locked": "50.000000",
      "usd_value": "1234.56"
    },
    "usdc": {
      "balance": "5000.00",
      "pending": "0.00",
      "locked": "0.00",
      "usd_value": "5000.00"
    },
    "total_usd": "6234.56",
    "last_updated": "2024-01-15T14:22:00Z"
  }
}
```

### Account History
Get transaction history for an account.

```http
GET /accounts/{account_id}/history
```

**Query Parameters:**
- `limit` (optional): Number of results (default: 50, max: 1000)
- `offset` (optional): Pagination offset
- `type` (optional): Filter by transaction type
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "tx_id": "tx_abcdef123456",
        "type": "transfer",
        "amount": "100.50",
        "token": "nock",
        "from": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
        "to": "nock1abc123def456ghi789jkl012mno345pqr678stu",
        "status": "confirmed",
        "timestamp": "2024-01-15T14:22:00Z",
        "fee": "0.001",
        "confirmations": 12
      }
    ],
    "pagination": {
      "total": 156,
      "limit": 50,
      "offset": 0,
      "has_more": true
    }
  }
}
```

### Update Account Settings
Update account metadata and security settings.

```http
PUT /accounts/{account_id}
```

**Request Body:**
```json
{
  "metadata": {
    "name": "Updated Trading Account",
    "description": "Updated description",
    "tags": ["trading", "primary", "active"]
  },
  "security": {
    "require_2fa": true,
    "whitelist_enabled": true,
    "daily_limit": 2000000
  }
}
```

### Account Permissions
Manage account permissions and access controls.

```http
GET /accounts/{account_id}/permissions
POST /accounts/{account_id}/permissions
DELETE /accounts/{account_id}/permissions/{permission_id}
```

### Multi-Signature Accounts
Create and manage multi-signature accounts.

```http
POST /accounts/multisig
```

**Request Body:**
```json
{
  "required_signatures": 2,
  "signers": [
    {
      "address": "nock1qxy2hjn5wgkqw9h96m7x8c2kp7s4x6v8n9m2l3k4",
      "name": "Alice",
      "role": "admin"
    },
    {
      "address": "nock1abc123def456ghi789jkl012mno345pqr678stu",
      "name": "Bob",
      "role": "signer"
    }
  ],
  "metadata": {
    "name": "Treasury Multisig",
    "description": "Company treasury account"
  }
}
```

## Webhooks
Subscribe to account events with webhooks.

### Available Events
- `account.created`
- `account.updated`
- `account.balance_changed`
- `account.transaction_received`
- `account.transaction_sent`
- `account.security_alert`

### Webhook Configuration
```http
POST /accounts/{account_id}/webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/nockchain",
  "events": ["account.balance_changed", "account.transaction_received"],
  "secret": "your_webhook_secret"
}
```

## Code Examples

### JavaScript/TypeScript
```javascript
import { NockchainSDK } from '@nockchain/sdk';

const nockchain = new NockchainSDK('YOUR_API_KEY');

// Create account
const account = await nockchain.accounts.create({
  type: 'standard',
  metadata: {
    name: 'My Trading Account',
    description: 'Primary trading wallet'
  }
});

// Get balance
const balance = await nockchain.accounts.getBalance(account.account_id);
console.log('Balance:', balance.nock.balance);

// Get transaction history
const history = await nockchain.accounts.getHistory(account.account_id, {
  limit: 20,
  type: 'transfer'
});
```

### Python
```python
from nockchain import NockchainClient

client = NockchainClient('YOUR_API_KEY')

# Create account
account = client.accounts.create(
    type='standard',
    metadata={
        'name': 'My Trading Account',
        'description': 'Primary trading wallet'
    }
)

# Get balance
balance = client.accounts.get_balance(account['account_id'])
print(f"Balance: {balance['nock']['balance']}")

# Get history
history = client.accounts.get_history(
    account['account_id'],
    limit=20,
    type='transfer'
)
```

### Rust
```rust
use nockchain_sdk::NockchainClient;

let client = NockchainClient::new("YOUR_API_KEY");

// Create account
let account = client.accounts().create(CreateAccountRequest {
    account_type: AccountType::Standard,
    metadata: Some(AccountMetadata {
        name: Some("My Trading Account".to_string()),
        description: Some("Primary trading wallet".to_string()),
        tags: vec!["trading".to_string()],
    }),
    ..Default::default()
}).await?;

// Get balance
let balance = client.accounts().get_balance(&account.account_id).await?;
println!("Balance: {}", balance.nock.balance);
```

## Error Handling

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (account doesn't exist)
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found",
    "details": {
      "account_id": "acc_1234567890"
    }
  }
}
```

## Rate Limits
- **Standard Plan**: 1,000 requests per minute
- **Pro Plan**: 10,000 requests per minute
- **Enterprise Plan**: Custom limits

## Best Practices

1. **Security**: Always use HTTPS and store API keys securely
2. **Rate Limiting**: Implement exponential backoff for rate-limited requests
3. **Webhooks**: Use webhooks for real-time updates instead of polling
4. **Caching**: Cache account data appropriately to reduce API calls
5. **Error Handling**: Implement robust error handling for all API calls

## Support
- **Documentation**: https://docs.nockchain.com/accounts
- **Discord**: https://discord.gg/nockchain-dev
- **Email**: developers@nockchain.com