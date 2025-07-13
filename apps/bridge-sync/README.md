# NOCK Bridge State Synchronization Service

A high-performance, real-time cross-chain state synchronization and monitoring system for the NOCK ↔ Solana bridge. This service ensures data consistency, provides real-time monitoring, and maintains comprehensive audit trails across both blockchain networks.

## Features

### 🔄 State Synchronization
- **Real-time block monitoring** for both Nockchain and Solana
- **Atomic state updates** with consistency verification
- **Automatic retry mechanisms** with exponential backoff
- **Byzantine fault tolerance** for validator coordination
- **Emergency mode detection** and response protocols

### 📊 Real-Time Monitoring
- **WebSocket and Socket.IO** real-time data streams
- **Comprehensive metrics collection** (latency, throughput, errors)
- **Intelligent alerting system** with configurable thresholds
- **Performance anomaly detection** using statistical baselines
- **Cross-chain consistency verification**

### 💾 Data Persistence
- **High-performance LevelDB** storage with compression
- **Automatic state snapshots** and backup creation
- **Intelligent caching layer** with LRU eviction
- **Data retention policies** with automated cleanup
- **Tamper-proof audit trails** with cryptographic hashing

### 🚨 Alert Management
- **Multi-level alert severity** (low, medium, high, critical)
- **Automatic escalation** based on resolution time
- **Multiple notification channels** (email, Slack, webhooks)
- **Alert acknowledgment** and resolution tracking
- **Historical alert analysis** and reporting

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Redis server
- Access to Solana and Nockchain RPC endpoints

### Installation

```bash
# Install dependencies
npm install

# Copy configuration template
cp .env.example .env

# Edit configuration
vim .env

# Build the service
npm run build
```

### Configuration

Edit `.env` file with your settings:

```env
# Chain RPC Endpoints
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NOCKCHAIN_RPC_URL=http://localhost:8545

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Synchronization Settings
SYNC_INTERVAL=10000
BATCH_SIZE=100

# Monitoring Ports
WS_PORT=8081
IO_PORT=8080
```

### Running the Service

```bash
# Start the synchronization service
npm start start

# Or with custom parameters
npm start start --solana-rpc https://api.mainnet-beta.solana.com --sync-interval 5000

# Development mode with auto-reload
npm run dev
```

## CLI Commands

### Start Service
```bash
npm start start [options]

Options:
  --solana-rpc <url>     Solana RPC endpoint
  --nockchain-rpc <url>  Nockchain RPC endpoint
  --redis-url <url>      Redis connection URL
  --data-path <path>     Database storage path
  --sync-interval <ms>   Synchronization interval
  --batch-size <num>     Block processing batch size
  --ws-port <port>       WebSocket server port
  --io-port <port>       Socket.IO server port
  --log-level <level>    Logging level (debug|info|warn|error)
```

### Check Status
```bash
npm start status [options]

Options:
  --redis-url <url>      Redis connection URL
  --format <format>      Output format (json|table)
```

### Verify State Consistency
```bash
npm start verify [options]

Options:
  --data-path <path>     Database storage path
```

## Real-Time Data Access

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8081');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'welcome':
      console.log('Connected to bridge sync service');
      break;
    case 'alert':
      console.log('New alert:', message.data);
      break;
    case 'stateUpdate':
      console.log('Chain state updated:', message.data);
      break;
    case 'metricsUpdate':
      console.log('Metrics updated:', message.data);
      break;
  }
});
```

### Socket.IO Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080');

socket.on('welcome', (data) => {
  console.log('Connected:', data);
});

socket.on('alert', (alert) => {
  console.log('New alert:', alert);
});

socket.on('stateUpdate', (state) => {
  console.log('State updated:', state);
});

// Acknowledge an alert
socket.emit('acknowledgeAlert', {
  alertId: 'alert_123',
  user: 'operator@nockchain.com'
});

// Request historical data
socket.emit('getHistoricalData', {
  type: 'chainMetrics',
  timeRange: 'last24h'
});

socket.on('historicalData', (data) => {
  console.log('Historical data:', data);
});
```

## Architecture

### Core Components

1. **StateSynchronizer** - Manages cross-chain state synchronization
2. **RealTimeMonitor** - Provides real-time monitoring and alerting
3. **StateDatabase** - High-performance data persistence layer
4. **RedisClient** - Distributed coordination and caching

### Data Flow

```
Nockchain RPC ─┐
               ├─► StateSynchronizer ─► StateDatabase
Solana RPC ────┘                    │
                                    ▼
WebSocket/Socket.IO ◄── RealTimeMonitor ◄── RedisClient
```

### State Synchronization Process

1. **Block Monitoring** - Continuously monitor both chains for new blocks
2. **Batch Processing** - Process blocks in configurable batches for efficiency
3. **State Calculation** - Calculate bridge state including balances and transactions
4. **Consistency Verification** - Verify cross-chain state consistency
5. **Alert Generation** - Generate alerts for anomalies or issues
6. **Data Persistence** - Store state snapshots and transaction history

## Monitoring and Alerts

### Alert Types

- **BLOCK_TIME_ANOMALY** - Unusual block production times
- **TRANSACTION_FAILURE** - High transaction failure rates
- **BRIDGE_CONGESTION** - Network congestion affecting bridge
- **LIQUIDITY_LOW** - Low liquidity levels
- **VALIDATOR_OFFLINE** - Validator network issues
- **SYNC_DELAY** - Synchronization delays
- **PRICE_DEVIATION** - Unusual price movements
- **EMERGENCY_MODE** - Emergency mode activation
- **SECURITY_INCIDENT** - Security-related alerts
- **PERFORMANCE_DEGRADATION** - System performance issues

### Metrics Collected

#### Chain Metrics
- Block height and hash
- Block time and transaction count
- Pending transactions
- Validator count and status
- Network synchronization status

#### Bridge Metrics
- Total and daily volume
- Transaction counts and failure rates
- Average processing time
- Bridge health score (0-100)
- Liquidity utilization
- Fee revenue

### Alert Configuration

```env
# Alert Thresholds
BLOCK_TIME_THRESHOLD=30          # seconds
TX_FAILURE_THRESHOLD=5           # percent
SYNC_DELAY_THRESHOLD=60          # seconds
LIQUIDITY_THRESHOLD=80           # percent
BRIDGE_HEALTH_THRESHOLD=70       # 0-100
```

## Database Schema

### Chain States
```typescript
interface ChainState {
  chain: 'nockchain' | 'solana';
  blockHeight: bigint;
  blockHash: string;
  timestamp: number;
  stateRoot: string;
  transactionCount: bigint;
  bridgeBalance: bigint;
  lastSyncedBlock: bigint;
  pendingTransactions: string[];
  validators: string[];
  emergencyMode: boolean;
}
```

### Transaction States
```typescript
interface TransactionState {
  id: string;
  sourceChain: 'nockchain' | 'solana';
  destChain: 'nockchain' | 'solana';
  sourceBlockHeight: bigint;
  sourceTransactionHash: string;
  destBlockHeight?: bigint;
  destTransactionHash?: string;
  amount: bigint;
  sender: string;
  recipient: string;
  status: TransactionStatus;
  createdAt: number;
  completedAt?: number;
  retryCount: number;
  validatorSignatures: string[];
}
```

## API Reference

### WebSocket Events

#### Incoming Events
- `welcome` - Initial connection data
- `alert` - New alert created
- `alertUpdate` - Alert status updated
- `stateUpdate` - Chain state updated
- `transactionUpdate` - Transaction status updated
- `metricsUpdate` - Metrics updated

#### Outgoing Events
- `ping` - Heartbeat ping
- `subscribe` - Subscribe to data streams

### Socket.IO Events

#### Client → Server
- `acknowledgeAlert` - Acknowledge an alert
- `resolveAlert` - Resolve an alert
- `getHistoricalData` - Request historical data

#### Server → Client
- `welcome` - Connection established
- `alert` - New alert
- `alertUpdate` - Alert updated
- `stateUpdate` - State updated
- `transactionUpdate` - Transaction updated
- `metricsUpdate` - Metrics updated
- `historicalData` - Historical data response

## Development

### Project Structure

```
src/
├── core/
│   └── state-sync.ts      # State synchronization engine
├── monitoring/
│   └── real-time.ts       # Real-time monitoring system
├── storage/
│   └── database.ts        # Database abstraction layer
├── utils/
│   ├── logger.ts          # Logging utilities
│   └── redis.ts           # Redis client
└── index.ts               # Main entry point
```

### Building

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Performance Tuning

### Synchronization Performance

- **Batch Size**: Increase `BATCH_SIZE` for higher throughput
- **Sync Interval**: Decrease `SYNC_INTERVAL` for lower latency
- **Confirmations**: Adjust confirmation blocks for security vs speed

### Database Performance

- **Cache Size**: Increase `DB_CACHE_SIZE` for better hit rates
- **Compression**: Enable `DB_COMPRESSION` to save disk space
- **Retention**: Adjust `DB_RETENTION_PERIOD` based on storage capacity

### Memory Usage

- Monitor cache hit rates and adjust cache size accordingly
- Use database snapshots to prevent unbounded memory growth
- Configure appropriate log levels to reduce I/O overhead

## Security Considerations

- **Encryption**: All Redis data is encrypted with HMAC verification
- **Input Validation**: All RPC responses are validated before processing
- **Rate Limiting**: Built-in protection against RPC abuse
- **Audit Trails**: Comprehensive logging with tamper-proof hashing
- **Emergency Protocols**: Automatic emergency mode detection and response

## Troubleshooting

### Common Issues

#### Connection Errors
```bash
# Check Redis connectivity
redis-cli ping

# Verify RPC endpoints
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"getHealth","id":1}' \
  https://api.mainnet-beta.solana.com
```

#### Synchronization Issues
```bash
# Check service status
npm start status

# Verify state consistency
npm start verify

# Check logs for errors
tail -f logs/bridge-sync.log
```

#### Performance Issues
```bash
# Monitor database performance
npm start status --format table

# Check Redis memory usage
redis-cli info memory

# Monitor system resources
top -p $(pgrep -f bridge-sync)
```

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- GitHub Issues: https://github.com/nockchain/bridge/issues
- Documentation: https://docs.nockchain.com/bridge
- Discord: https://discord.gg/nockchain