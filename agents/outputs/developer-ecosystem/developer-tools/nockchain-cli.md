# Nockchain CLI - Developer Command Line Interface

## Overview

The Nockchain CLI is a powerful command-line interface that provides developers with comprehensive tools to interact with the Nockchain blockchain, manage projects, deploy contracts, and streamline development workflows.

## Installation

### Quick Install
```bash
# Install globally with npm
npm install -g @nockchain/cli

# Install with yarn
yarn global add @nockchain/cli

# Install with pip
pip install nockchain-cli

# Install with cargo
cargo install nockchain-cli

# Install with Homebrew (macOS)
brew install nockchain/tap/nockchain-cli
```

### From Source
```bash
git clone https://github.com/nockchain/cli.git
cd cli
npm install
npm run build
npm link
```

## Quick Start

```bash
# Initialize configuration
nockchain init

# Login with API key
nockchain login YOUR_API_KEY

# Get help
nockchain --help

# Check version
nockchain --version
```

## Configuration

### Initialize Configuration
```bash
nockchain init
```

This creates `~/.nockchain/config.json`:
```json
{
  "api_key": "YOUR_API_KEY",
  "network": "mainnet",
  "endpoint": "https://api.nockchain.com",
  "default_account": "nock1abc...",
  "gas_price": "standard",
  "timeout": 30000
}
```

### Environment Variables
```bash
export NOCKCHAIN_API_KEY="YOUR_API_KEY"
export NOCKCHAIN_NETWORK="mainnet"
export NOCKCHAIN_ENDPOINT="https://api.nockchain.com"
```

## Core Commands

### Authentication
```bash
# Login with API key
nockchain login YOUR_API_KEY

# Login with interactive prompt
nockchain login

# Logout
nockchain logout

# Show current user
nockchain whoami
```

### Blockchain Operations
```bash
# Get blockchain status
nockchain status

# Get latest block
nockchain block latest

# Get block by height
nockchain block get 1234567

# Get block range
nockchain block range 1234567 1234577

# Get validators
nockchain validators

# Get network peers
nockchain peers
```

### Account Management
```bash
# List accounts
nockchain accounts list

# Create new account
nockchain accounts create

# Create multiple accounts
nockchain accounts create --count 5

# Import account from private key
nockchain accounts import 0x1234...

# Get account info
nockchain accounts get nock1abc...

# Get account balance
nockchain accounts balance nock1abc...

# Get account transactions
nockchain accounts transactions nock1abc...
```

### Transaction Operations
```bash
# Send transaction
nockchain tx send --from nock1abc... --to nock1def... --amount 1.0

# Send transaction with custom gas
nockchain tx send --from nock1abc... --to nock1def... --amount 1.0 --gas-price 20

# Get transaction
nockchain tx get 0xabcd...

# Get transaction status
nockchain tx status 0xabcd...

# Estimate gas
nockchain tx estimate --from nock1abc... --to nock1def... --amount 1.0

# Send batch transactions
nockchain tx batch transactions.json
```

### DEX Operations
```bash
# List exchanges
nockchain dex exchanges

# Get trading pairs
nockchain dex pairs --exchange nockswap

# Get price quote
nockchain dex quote --input nock1token... --output nock1usdc... --amount 1.0

# Execute swap
nockchain dex swap --input nock1token... --output nock1usdc... --amount 1.0 --slippage 0.01

# Get liquidity pools
nockchain dex pools --exchange nockswap

# Add liquidity
nockchain dex add-liquidity --pool nockswap_nock_usdc --amount-a 1.0 --amount-b 1.25

# Remove liquidity
nockchain dex remove-liquidity --pool nockswap_nock_usdc --tokens 1118033988749895000
```

### Mining Operations
```bash
# List mining pools
nockchain mining pools

# Get pool stats
nockchain mining stats pool_id

# Get miner info
nockchain mining miner nock1miner...

# Get mining rewards
nockchain mining rewards nock1miner... --start 2024-01-01 --end 2024-01-31

# Submit mining share
nockchain mining submit --pool pool_id --miner nock1miner... --nonce 0x123... --hash 0xabc...
```

### Bridge Operations
```bash
# List supported chains
nockchain bridge chains

# Get bridge status
nockchain bridge status

# Initiate transfer
nockchain bridge transfer --from nockchain --to ethereum --token nock1token... --amount 1.0 --dest 0x1234...

# Get transfer status
nockchain bridge transfer-status transfer_id

# Get transfer history
nockchain bridge history nock1user...
```

## Advanced Features

### Project Management
```bash
# Create new project
nockchain project create my-dapp

# Initialize existing project
nockchain project init

# Project structure
my-dapp/
├── nockchain.config.js
├── contracts/
├── scripts/
├── test/
└── migrations/
```

### Contract Development
```bash
# Compile contracts
nockchain compile

# Deploy contract
nockchain deploy contracts/MyContract.sol

# Verify contract
nockchain verify 0xcontract... --source contracts/MyContract.sol

# Interact with contract
nockchain contract call 0xcontract... --method getName

# Watch contract events
nockchain contract events 0xcontract...
```

### Testing Framework
```bash
# Run tests
nockchain test

# Run specific test
nockchain test test/MyContract.test.js

# Run tests with coverage
nockchain test --coverage

# Run tests on testnet
nockchain test --network testnet
```

### Debugging Tools
```bash
# Debug transaction
nockchain debug tx 0xabcd...

# Trace transaction
nockchain debug trace 0xabcd...

# Debug contract call
nockchain debug call 0xcontract... --method getName

# Profile gas usage
nockchain debug gas 0xabcd...
```

### Development Server
```bash
# Start local development server
nockchain dev

# Start with specific network
nockchain dev --network testnet

# Start with custom port
nockchain dev --port 8080

# Start with hot reload
nockchain dev --watch
```

## Configuration Files

### nockchain.config.js
```javascript
module.exports = {
  networks: {
    mainnet: {
      endpoint: 'https://api.nockchain.com',
      apiKey: process.env.NOCKCHAIN_API_KEY,
      gasPrice: 'standard',
      timeout: 30000
    },
    testnet: {
      endpoint: 'https://testnet-api.nockchain.com',
      apiKey: process.env.NOCKCHAIN_TESTNET_API_KEY,
      gasPrice: 'fast',
      timeout: 30000
    },
    devnet: {
      endpoint: 'http://localhost:8545',
      apiKey: 'dev-key',
      gasPrice: 'fast',
      timeout: 10000
    }
  },
  compiler: {
    version: '0.8.19',
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  paths: {
    contracts: './contracts',
    artifacts: './artifacts',
    cache: './cache',
    tests: './test'
  }
};
```

### Package.json Scripts
```json
{
  "scripts": {
    "compile": "nockchain compile",
    "deploy": "nockchain deploy",
    "test": "nockchain test",
    "dev": "nockchain dev",
    "build": "nockchain build",
    "verify": "nockchain verify"
  }
}
```

## Interactive Mode

```bash
# Start interactive mode
nockchain interactive

# Or use the shorthand
nockchain i
```

Interactive mode provides:
- Auto-completion
- Command history
- Real-time help
- Syntax highlighting
- Multi-line input support

```bash
nockchain> status
nockchain> accounts list
nockchain> tx send --from nock1abc... --to nock1def... --amount 1.0
nockchain> dex quote --input nock1token... --output nock1usdc... --amount 1.0
nockchain> exit
```

## Watch Mode

```bash
# Watch for new blocks
nockchain watch blocks

# Watch for transactions on specific address
nockchain watch transactions --address nock1abc...

# Watch for events on specific contract
nockchain watch events --contract 0xcontract...

# Watch for price changes
nockchain watch prices --pair NOCK/USDC
```

## Batch Operations

### Transaction Batch File (transactions.json)
```json
[
  {
    "from": "nock1abc...",
    "to": "nock1def...",
    "amount": "1.0",
    "gasPrice": "standard"
  },
  {
    "from": "nock1abc...",
    "to": "nock1ghi...",
    "amount": "2.0",
    "gasPrice": "fast"
  }
]
```

```bash
# Execute batch transactions
nockchain tx batch transactions.json
```

### Account Import Batch
```bash
# Import multiple accounts from file
nockchain accounts import-batch private-keys.txt
```

## Scripting and Automation

### JavaScript Scripting
```javascript
// scripts/deploy.js
const { NockchainCLI } = require('@nockchain/cli');

async function deploy() {
  const cli = new NockchainCLI();
  
  // Compile contracts
  await cli.compile();
  
  // Deploy contract
  const result = await cli.deploy('contracts/MyContract.sol');
  console.log('Contract deployed:', result.address);
  
  // Verify contract
  await cli.verify(result.address, 'contracts/MyContract.sol');
}

deploy().catch(console.error);
```

```bash
# Run script
nockchain script scripts/deploy.js
```

### Shell Scripting
```bash
#!/bin/bash
# deploy.sh

# Compile contracts
nockchain compile

# Deploy to testnet
nockchain deploy contracts/MyContract.sol --network testnet

# Get deployment address
CONTRACT_ADDRESS=$(nockchain deploy contracts/MyContract.sol --network testnet --output json | jq -r '.address')

# Verify contract
nockchain verify $CONTRACT_ADDRESS --source contracts/MyContract.sol --network testnet

echo "Contract deployed and verified: $CONTRACT_ADDRESS"
```

## Plugins and Extensions

### Available Plugins
```bash
# Install plugin
nockchain plugin install @nockchain/plugin-hardhat

# List installed plugins
nockchain plugin list

# Remove plugin
nockchain plugin remove @nockchain/plugin-hardhat
```

### Popular Plugins
- `@nockchain/plugin-hardhat` - Hardhat integration
- `@nockchain/plugin-truffle` - Truffle integration
- `@nockchain/plugin-remix` - Remix IDE integration
- `@nockchain/plugin-foundry` - Foundry integration
- `@nockchain/plugin-graph` - The Graph integration

### Custom Plugin Development
```javascript
// plugin-example.js
module.exports = {
  name: 'example-plugin',
  version: '1.0.0',
  commands: {
    hello: {
      description: 'Say hello',
      handler: async (args, context) => {
        console.log(`Hello, ${args.name || 'World'}!`);
      }
    }
  }
};
```

## Output Formats

### JSON Output
```bash
# Output as JSON
nockchain status --output json

# Pretty printed JSON
nockchain status --output json --pretty

# Compact JSON
nockchain status --output json --compact
```

### Table Output
```bash
# Output as table (default)
nockchain accounts list

# Custom table format
nockchain accounts list --columns address,balance,nonce
```

### CSV Output
```bash
# Output as CSV
nockchain accounts list --output csv

# CSV with headers
nockchain accounts list --output csv --headers
```

## Environment Management

### Network Switching
```bash
# Switch to testnet
nockchain network use testnet

# Switch to mainnet
nockchain network use mainnet

# List available networks
nockchain network list

# Add custom network
nockchain network add mynet --endpoint https://my-node.com --api-key mykey
```

### Environment Variables
```bash
# Set environment variables
nockchain env set NOCKCHAIN_API_KEY your-api-key
nockchain env set NOCKCHAIN_NETWORK mainnet

# Get environment variable
nockchain env get NOCKCHAIN_API_KEY

# List all environment variables
nockchain env list

# Load from .env file
nockchain env load .env
```

## Performance and Optimization

### Caching
```bash
# Enable caching
nockchain config set cache.enabled true

# Set cache TTL
nockchain config set cache.ttl 300

# Clear cache
nockchain cache clear

# Show cache stats
nockchain cache stats
```

### Parallel Processing
```bash
# Process transactions in parallel
nockchain tx batch transactions.json --parallel 5

# Parallel account creation
nockchain accounts create --count 10 --parallel 3
```

### Connection Pooling
```bash
# Set connection pool size
nockchain config set pool.size 10

# Set connection timeout
nockchain config set pool.timeout 30000
```

## Monitoring and Alerts

### Real-time Monitoring
```bash
# Monitor blockchain metrics
nockchain monitor blockchain

# Monitor account activity
nockchain monitor account nock1abc...

# Monitor contract events
nockchain monitor contract 0xcontract...

# Monitor price changes
nockchain monitor prices --pair NOCK/USDC --threshold 0.05
```

### Alert Configuration
```yaml
# alerts.yaml
alerts:
  - name: "Low Balance"
    type: "balance"
    condition: "< 1.0"
    accounts: ["nock1abc..."]
    actions: ["email", "slack"]
  
  - name: "High Gas Price"
    type: "gas_price"
    condition: "> 100"
    actions: ["console"]
  
  - name: "Failed Transaction"
    type: "transaction"
    condition: "status == 'failed'"
    accounts: ["nock1abc..."]
    actions: ["email"]
```

```bash
# Load alerts configuration
nockchain alerts load alerts.yaml

# List active alerts
nockchain alerts list

# Test alert
nockchain alerts test "Low Balance"
```

## Integration Examples

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Contract

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Nockchain CLI
        run: npm install -g @nockchain/cli
      
      - name: Deploy Contract
        run: |
          nockchain login ${{ secrets.NOCKCHAIN_API_KEY }}
          nockchain compile
          nockchain deploy contracts/MyContract.sol --network mainnet
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
```

### Docker Integration
```dockerfile
# Dockerfile
FROM node:16-alpine

RUN npm install -g @nockchain/cli

COPY . .

CMD ["nockchain", "dev"]
```

### CI/CD Pipeline
```bash
#!/bin/bash
# ci-deploy.sh

set -e

# Install dependencies
npm install

# Run tests
nockchain test

# Compile contracts
nockchain compile

# Deploy to testnet
nockchain deploy contracts/MyContract.sol --network testnet

# Run integration tests
nockchain test --network testnet

# Deploy to mainnet
nockchain deploy contracts/MyContract.sol --network mainnet

# Verify contracts
nockchain verify --network mainnet
```

## Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Check network connectivity
nockchain ping

# Check API key
nockchain auth status

# Test connection
nockchain status --verbose
```

#### Gas Issues
```bash
# Check current gas prices
nockchain gas prices

# Estimate gas for transaction
nockchain tx estimate --from nock1abc... --to nock1def... --amount 1.0

# Set custom gas price
nockchain config set gas.price 25
```

#### Account Issues
```bash
# Check account balance
nockchain accounts balance nock1abc...

# Check account nonce
nockchain accounts get nock1abc...

# Reset account nonce
nockchain accounts reset-nonce nock1abc...
```

### Debug Mode
```bash
# Enable debug mode
nockchain --debug status

# Enable verbose logging
nockchain --verbose tx send --from nock1abc... --to nock1def... --amount 1.0

# Save debug logs
nockchain --debug --log-file debug.log status
```

### Support
```bash
# Get help
nockchain help

# Get command-specific help
nockchain help tx send

# Submit bug report
nockchain bug-report

# Check for updates
nockchain update check

# Update CLI
nockchain update install
```

## Best Practices

1. **Use Configuration Files**: Store network settings in `nockchain.config.js`
2. **Environment Variables**: Use environment variables for sensitive data
3. **Batch Operations**: Use batch operations for multiple transactions
4. **Caching**: Enable caching for better performance
5. **Monitoring**: Set up monitoring for production deployments
6. **Testing**: Use testnet for development and testing
7. **Version Control**: Version control your configuration files
8. **Backup**: Backup private keys and important data

## Next Steps

- Read the [CLI Reference](./cli-reference.md)
- Check out [CLI Examples](./cli-examples.md)
- Learn about [CLI Plugins](./cli-plugins.md)
- Join the [Developer Community](https://discord.gg/nockchain-dev)