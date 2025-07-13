# NOCK Bridge API Documentation

**Complete API Reference for NOCK Chain Bridge & DEX Integration Platform**

## 📋 Overview

The NOCK Bridge API provides comprehensive access to cross-chain bridge operations, DEX trading, institutional services, and mining pool integration. This production-grade API supports enterprise-level security, performance, and compliance requirements.

### Base URL
```
Production: https://api.nockbridge.com/v1
Staging: https://staging-api.nockbridge.com/v1
```

### API Versioning
Current Version: `v1`
- Backward compatibility guaranteed within major versions
- New features added with feature flags
- Breaking changes require major version increment

### Rate Limits
| Tier | Requests/Minute | Burst Allowance |
|------|----------------|-----------------|
| Public | 60 | 10 |
| Authenticated | 1,000 | 100 |
| Premium | 5,000 | 500 |
| Institutional | 10,000 | 1,000 |

---

## 🔐 Authentication

### API Key Authentication
```bash
curl -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     https://api.nockbridge.com/v1/bridge/status
```

### JWT Authentication
```bash
# Login to get JWT token
curl -X POST https://api.nockbridge.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your-username", "password": "your-password"}'

# Use JWT token
curl -H "Authorization: Bearer your-jwt-token" \
     https://api.nockbridge.com/v1/bridge/transfer
```

### Institutional Certificate Authentication
```bash
curl --cert client.pem --key client-key.pem \
     https://api.nockbridge.com/v1/institutional/portfolio
```

---

## 🌉 Bridge Operations

### Get Bridge Status
Get current bridge health and operational status.

**Endpoint:** `GET /bridge/status`

**Response:**
```json
{
  "status": "operational",
  "version": "1.0.0",
  "uptime": 99.99,
  "validators": {
    "total": 9,
    "active": 9,
    "required": 5
  },
  "metrics": {
    "totalVolume": "1250000000000000000000",
    "dailyVolume": "50000000000000000000",
    "transactionCount": 12500,
    "averageTime": 180,
    "successRate": 99.95
  },
  "fees": {
    "bridgeFee": "0.5",
    "networkFee": "0.001"
  }
}
```

### Bridge Transfer
Execute cross-chain token transfer.

**Endpoint:** `POST /bridge/transfer`

**Request:**
```json
{
  "fromChain": "nockchain",
  "toChain": "solana",
  "amount": "1000000000000000000",
  "recipient": "solana-wallet-address",
  "memo": "Bridge transfer",
  "priority": "standard"
}
```

**Response:**
```json
{
  "transactionId": "bridge_tx_123456789",
  "status": "pending",
  "fromChain": "nockchain",
  "toChain": "solana",
  "amount": "1000000000000000000",
  "fees": {
    "bridgeFee": "5000000000000000",
    "networkFee": "1000000000000000"
  },
  "estimatedTime": 180,
  "validatorSignatures": 0,
  "requiredSignatures": 5,
  "created": "2024-07-07T12:00:00Z"
}
```

### Get Transfer Status
Check the status of a bridge transfer.

**Endpoint:** `GET /bridge/transfer/{transactionId}`

**Response:**
```json
{
  "transactionId": "bridge_tx_123456789",
  "status": "completed",
  "validatorSignatures": 5,
  "confirmations": 12,
  "fromTxHash": "0xabc123...",
  "toTxHash": "def456...",
  "completedAt": "2024-07-07T12:05:30Z",
  "totalTime": 330
}
```

---

## 💹 Trading Operations

### Get Market Data
Retrieve current market information and prices.

**Endpoint:** `GET /trading/markets`

**Response:**
```json
{
  "markets": [
    {
      "pair": "NOCK/SOL",
      "price": "0.025",
      "change24h": "5.2",
      "volume24h": "1250000",
      "high24h": "0.026",
      "low24h": "0.023",
      "liquidity": "5000000"
    }
  ],
  "timestamp": "2024-07-07T12:00:00Z"
}
```

### Execute Swap
Perform token swap through integrated DEXs.

**Endpoint:** `POST /trading/swap`

**Request:**
```json
{
  "inputToken": "NOCK",
  "outputToken": "SOL",
  "inputAmount": "1000000000",
  "slippage": "1.0",
  "dex": "jupiter",
  "route": "auto"
}
```

**Response:**
```json
{
  "swapId": "swap_123456789",
  "status": "pending",
  "inputToken": "NOCK",
  "outputToken": "SOL",
  "inputAmount": "1000000000",
  "estimatedOutput": "25000000",
  "route": ["NOCK", "USDC", "SOL"],
  "fees": {
    "platformFee": "2500000",
    "networkFee": "5000"
  },
  "created": "2024-07-07T12:00:00Z"
}
```

### Add Liquidity
Provide liquidity to trading pools.

**Endpoint:** `POST /trading/liquidity/add`

**Request:**
```json
{
  "tokenA": "NOCK",
  "tokenB": "SOL",
  "amountA": "1000000000",
  "amountB": "25000000",
  "pool": "orca",
  "slippage": "0.5"
}
```

---

## 🏦 Institutional Services

### Create Custody Vault
Create a new institutional custody vault.

**Endpoint:** `POST /institutional/custody/vaults`

**Request:**
```json
{
  "name": "Primary Trading Vault",
  "type": "multi_signature",
  "signers": [
    "signer1_public_key",
    "signer2_public_key",
    "signer3_public_key"
  ],
  "requiredSignatures": 2,
  "assets": ["NOCK", "SOL", "USDC"],
  "restrictions": {
    "dailyLimit": "10000000000",
    "geographicRestrictions": ["US", "EU"],
    "timeRestrictions": {
      "enabled": true,
      "allowedHours": "09:00-17:00",
      "timezone": "UTC"
    }
  }
}
```

**Response:**
```json
{
  "vaultId": "vault_inst_123456",
  "address": "vault-multisig-address",
  "status": "active",
  "name": "Primary Trading Vault",
  "requiredSignatures": 2,
  "totalSigners": 3,
  "created": "2024-07-07T12:00:00Z",
  "compliance": {
    "kycStatus": "verified",
    "amlStatus": "cleared",
    "jurisdiction": "US"
  }
}
```

### Submit Withdrawal Request
Request withdrawal from custody vault.

**Endpoint:** `POST /institutional/custody/withdrawals`

**Request:**
```json
{
  "vaultId": "vault_inst_123456",
  "asset": "NOCK",
  "amount": "5000000000",
  "recipient": "destination-address",
  "justification": "Monthly distribution",
  "approvers": ["approver1@institution.com", "approver2@institution.com"]
}
```

**Response:**
```json
{
  "withdrawalId": "withdrawal_123456",
  "status": "pending_approval",
  "vaultId": "vault_inst_123456",
  "amount": "5000000000",
  "approvals": {
    "required": 2,
    "received": 0,
    "pending": ["approver1@institution.com", "approver2@institution.com"]
  },
  "timelock": {
    "enabled": true,
    "releaseTime": "2024-07-08T12:00:00Z"
  },
  "created": "2024-07-07T12:00:00Z"
}
```

### Generate Compliance Report
Generate institutional compliance and audit reports.

**Endpoint:** `POST /institutional/reports/generate`

**Request:**
```json
{
  "type": "transaction_summary",
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-30T23:59:59Z"
  },
  "format": "pdf",
  "includeDetails": true,
  "vaults": ["vault_inst_123456"],
  "classification": "confidential"
}
```

---

## ⛏️ Mining Pool Integration

### Get Mining Pool Status
Retrieve mining pool operational status and statistics.

**Endpoint:** `GET /mining/pools/{poolId}/status`

**Response:**
```json
{
  "poolId": "nock_main_pool",
  "status": "active",
  "hashrate": "1250000000000",
  "miners": 15420,
  "blocks": {
    "found24h": 144,
    "pending": 2,
    "orphaned": 1
  },
  "payouts": {
    "totalPaid": "50000000000000000000",
    "pendingPayouts": "2500000000000000000",
    "lastPayout": "2024-07-07T10:00:00Z"
  },
  "crossChain": {
    "enabled": true,
    "supportedChains": ["nockchain", "solana"],
    "bridgeVolume24h": "10000000000000000000"
  }
}
```

### Configure Cross-Chain Payouts
Set up automatic cross-chain payout preferences.

**Endpoint:** `POST /mining/payouts/configure`

**Request:**
```json
{
  "userId": "miner_123456",
  "preferences": {
    "defaultChain": "solana",
    "threshold": "100000000000000000",
    "enableAutoBridge": true,
    "liquidityContribution": {
      "enabled": true,
      "percentage": 5
    },
    "schedule": {
      "frequency": "daily",
      "time": "02:00"
    }
  }
}
```

### Get Mining Statistics
Retrieve detailed mining statistics for a user.

**Endpoint:** `GET /mining/users/{userId}/statistics`

**Query Parameters:**
- `period`: `24h`, `7d`, `30d`, `all`
- `includeProjections`: `true`, `false`

**Response:**
```json
{
  "userId": "miner_123456",
  "period": "24h",
  "statistics": {
    "hashrate": {
      "current": "1000000000",
      "average": "950000000",
      "peak": "1100000000"
    },
    "earnings": {
      "total": "5000000000000000000",
      "pending": "250000000000000000",
      "paid": "4750000000000000000"
    },
    "efficiency": {
      "sharesAccepted": 98765,
      "sharesRejected": 123,
      "efficiency": 99.88
    },
    "crossChain": {
      "bridgedAmount": "1000000000000000000",
      "liquidityContributed": "50000000000000000",
      "rewards": "25000000000000000"
    }
  },
  "projections": {
    "daily": "5000000000000000000",
    "monthly": "150000000000000000000",
    "annual": "1825000000000000000000"
  }
}
```

---

## 📊 Analytics & Monitoring

### Get Platform Analytics
Retrieve comprehensive platform analytics and metrics.

**Endpoint:** `GET /analytics/platform`

**Query Parameters:**
- `timeframe`: `1h`, `24h`, `7d`, `30d`
- `metrics`: Comma-separated list of metrics

**Response:**
```json
{
  "timeframe": "24h",
  "bridge": {
    "volume": "100000000000000000000",
    "transactions": 1250,
    "averageTime": 180,
    "successRate": 99.95,
    "fees": "500000000000000000"
  },
  "trading": {
    "volume": "50000000000000000000",
    "swaps": 3500,
    "liquidityProviders": 245,
    "totalLiquidity": "500000000000000000000"
  },
  "mining": {
    "hashrate": "1250000000000",
    "miners": 15420,
    "payouts": "25000000000000000000",
    "crossChainRatio": 0.35
  },
  "institutional": {
    "custody": "1000000000000000000000",
    "vaults": 125,
    "transactions": 450,
    "compliance": 100
  }
}
```

### Get System Health
Check overall system health and performance metrics.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-07-07T12:00:00Z",
  "version": "1.0.0",
  "uptime": 2592000,
  "services": {
    "bridge": {
      "status": "healthy",
      "responseTime": 45,
      "errorRate": 0.01
    },
    "trading": {
      "status": "healthy",
      "responseTime": 32,
      "errorRate": 0.005
    },
    "database": {
      "status": "healthy",
      "connections": 45,
      "queryTime": 25
    },
    "cache": {
      "status": "healthy",
      "hitRate": 95.2,
      "memory": 68
    }
  },
  "performance": {
    "requestsPerSecond": 1250,
    "averageResponseTime": 38,
    "cpuUsage": 65,
    "memoryUsage": 72
  }
}
```

---

## 🔒 Security & Compliance

### Request Security Audit
Request a security audit for institutional compliance.

**Endpoint:** `POST /security/audit/request`

**Request:**
```json
{
  "type": "full_security_audit",
  "scope": ["custody", "trading", "bridge"],
  "period": {
    "start": "2024-06-01T00:00:00Z",
    "end": "2024-06-30T23:59:59Z"
  },
  "framework": "SOC2",
  "urgency": "standard"
}
```

### Get Compliance Status
Check current compliance status and certifications.

**Endpoint:** `GET /compliance/status`

**Response:**
```json
{
  "status": "compliant",
  "certifications": [
    {
      "framework": "SOC2",
      "status": "certified",
      "validUntil": "2025-06-30T23:59:59Z",
      "auditor": "BigAudit Corp"
    },
    {
      "framework": "PCI-DSS",
      "status": "certified",
      "validUntil": "2025-03-15T23:59:59Z",
      "auditor": "Security Audit LLC"
    }
  ],
  "requirements": {
    "kyc": "implemented",
    "aml": "implemented",
    "gdpr": "compliant",
    "ccpa": "compliant"
  },
  "lastAudit": "2024-06-15T00:00:00Z",
  "nextAudit": "2024-12-15T00:00:00Z"
}
```

---

## 📝 Response Formats

### Standard Response Structure
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-07-07T12:00:00Z",
  "requestId": "req_123456789",
  "rateLimit": {
    "remaining": 950,
    "reset": 1720353600
  }
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Transfer amount exceeds daily limit",
    "details": {
      "requestedAmount": "10000000000",
      "dailyLimit": "5000000000",
      "remainingLimit": "2000000000"
    }
  },
  "timestamp": "2024-07-07T12:00:00Z",
  "requestId": "req_123456789"
}
```

---

## 🚨 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_API_KEY` | API key is invalid or expired | 401 |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions for operation | 403 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `INVALID_AMOUNT` | Amount is invalid or exceeds limits | 400 |
| `INSUFFICIENT_BALANCE` | Insufficient balance for operation | 400 |
| `BRIDGE_MAINTENANCE` | Bridge is under maintenance | 503 |
| `VALIDATOR_THRESHOLD` | Insufficient validator signatures | 500 |
| `COMPLIANCE_VIOLATION` | Operation violates compliance rules | 403 |
| `VAULT_LOCKED` | Custody vault is locked | 423 |
| `APPROVAL_REQUIRED` | Additional approval required | 202 |

---

## 🔗 WebSocket Endpoints

### Real-time Bridge Status
```javascript
const ws = new WebSocket('wss://api.nockbridge.com/v1/ws/bridge');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Bridge update:', data);
};

// Subscribe to specific transaction
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'bridge_transaction',
  transactionId: 'bridge_tx_123456789'
}));
```

### Real-time Trading Data
```javascript
const ws = new WebSocket('wss://api.nockbridge.com/v1/ws/trading');

// Subscribe to price updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'price_updates',
  pairs: ['NOCK/SOL', 'NOCK/USDC']
}));
```

---

## 🛠️ SDK Libraries

### JavaScript/TypeScript
```bash
npm install @nockbridge/api-sdk
```

```javascript
import { NockBridgeAPI } from '@nockbridge/api-sdk';

const api = new NockBridgeAPI({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Bridge transfer
const transfer = await api.bridge.transfer({
  fromChain: 'nockchain',
  toChain: 'solana',
  amount: '1000000000000000000',
  recipient: 'solana-wallet-address'
});
```

### Python
```bash
pip install nockbridge-api
```

```python
from nockbridge import NockBridgeAPI

api = NockBridgeAPI(api_key='your-api-key', environment='production')

# Get bridge status
status = api.bridge.get_status()
print(f"Bridge status: {status['status']}")
```

---

## 📞 Support

### API Support
- Email: api-support@nockbridge.com
- Discord: #api-support
- Documentation: https://docs.nockbridge.com

### Rate Limit Increases
Contact enterprise@nockbridge.com for higher rate limits and custom integrations.

### SLA & Uptime
- **Production SLA**: 99.9% uptime
- **Response Time**: < 100ms average
- **Support Response**: < 4 hours for API issues

---

**Last Updated**: July 7, 2024
**API Version**: v1.0.0
**Documentation Version**: 1.0.0