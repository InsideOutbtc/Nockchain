# Nockchain Debugging Tools

## Overview

Comprehensive debugging tools for Nockchain developers, including transaction tracing, contract debugging, performance profiling, and real-time monitoring capabilities.

## Installation

```bash
# Install debugging tools
npm install -g @nockchain/debug-tools

# Install browser extension
# Chrome: https://chrome.google.com/webstore/detail/nockchain-debugger
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/nockchain-debugger/

# Install VS Code extension
code --install-extension nockchain.nockchain-debugger
```

## Core Debugging Tools

### 1. Transaction Debugger

#### Command Line Interface
```bash
# Debug transaction by hash
nockchain debug tx 0xabcd...

# Debug with detailed trace
nockchain debug tx 0xabcd... --trace

# Debug with gas analysis
nockchain debug tx 0xabcd... --gas-analysis

# Debug with state changes
nockchain debug tx 0xabcd... --state-changes

# Export debug results
nockchain debug tx 0xabcd... --output debug-report.json
```

#### Programmatic API
```javascript
import { TransactionDebugger } from '@nockchain/debug-tools';

const debugger = new TransactionDebugger({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function debugTransaction() {
  const result = await debugger.debug('0xabcd...', {
    includeTrace: true,
    includeGasAnalysis: true,
    includeStateChanges: true
  });
  
  console.log('Transaction Status:', result.status);
  console.log('Gas Used:', result.gasUsed);
  console.log('Execution Steps:', result.trace.length);
  
  // Analyze gas usage
  const gasHotspots = result.gasAnalysis.hotspots;
  console.log('Gas Hotspots:', gasHotspots);
  
  // Check state changes
  result.stateChanges.forEach(change => {
    console.log(`${change.address}: ${change.field} changed from ${change.oldValue} to ${change.newValue}`);
  });
}
```

#### Debug Output Example
```json
{
  "transactionHash": "0xabcd...",
  "status": "success",
  "gasUsed": 150000,
  "gasLimit": 200000,
  "gasPrice": "20000000000",
  "executionTime": "2.5s",
  "trace": [
    {
      "step": 1,
      "opcode": "PUSH1",
      "gas": 3,
      "gasCost": 3,
      "depth": 0,
      "stack": ["0x60"],
      "memory": []
    }
  ],
  "gasAnalysis": {
    "totalGasUsed": 150000,
    "hotspots": [
      {
        "operation": "SSTORE",
        "gasUsed": 20000,
        "percentage": 13.33,
        "location": "Contract.sol:45"
      }
    ]
  },
  "stateChanges": [
    {
      "address": "nock1abc...",
      "field": "balance",
      "oldValue": "1000000000000000000",
      "newValue": "999850000000000000"
    }
  ],
  "events": [
    {
      "event": "Transfer",
      "args": {
        "from": "nock1abc...",
        "to": "nock1def...",
        "value": "150000000000000000"
      }
    }
  ]
}
```

### 2. Contract Debugger

#### Smart Contract Debugging
```javascript
import { ContractDebugger } from '@nockchain/debug-tools';

const debugger = new ContractDebugger({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function debugContract() {
  // Debug contract deployment
  const deployResult = await debugger.debugDeployment('0xcontract...', {
    includeConstructorTrace: true,
    includeInitialState: true
  });
  
  // Debug contract method call
  const callResult = await debugger.debugCall('0xcontract...', {
    method: 'transfer',
    args: ['nock1def...', '1000000000000000000'],
    from: 'nock1abc...',
    simulateOnly: true
  });
  
  console.log('Call Result:', callResult);
  
  // Debug contract events
  const events = await debugger.debugEvents('0xcontract...', {
    fromBlock: 1234567,
    toBlock: 1234577,
    event: 'Transfer'
  });
  
  console.log('Events:', events);
}
```

#### Contract State Inspector
```javascript
import { StateInspector } from '@nockchain/debug-tools';

const inspector = new StateInspector({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function inspectState() {
  // Get contract state at specific block
  const state = await inspector.getContractState('0xcontract...', {
    blockNumber: 1234567
  });
  
  console.log('Contract State:', state);
  
  // Watch state changes
  const watcher = inspector.watchStateChanges('0xcontract...', {
    variables: ['totalSupply', 'balances'],
    onStateChange: (change) => {
      console.log('State Change:', change);
    }
  });
  
  // Stop watching
  watcher.stop();
}
```

### 3. Performance Profiler

#### Gas Profiler
```javascript
import { GasProfiler } from '@nockchain/debug-tools';

const profiler = new GasProfiler({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function profileGas() {
  // Profile transaction gas usage
  const profile = await profiler.profileTransaction('0xabcd...', {
    includeOpcodes: true,
    includeCallStack: true,
    includeMemoryUsage: true
  });
  
  console.log('Gas Profile:', profile);
  
  // Analyze gas efficiency
  const analysis = await profiler.analyzeEfficiency('0xcontract...', {
    methods: ['transfer', 'approve', 'mint'],
    fromBlock: 1234567,
    toBlock: 1234577
  });
  
  console.log('Efficiency Analysis:', analysis);
}
```

#### Performance Metrics
```javascript
import { PerformanceMonitor } from '@nockchain/debug-tools';

const monitor = new PerformanceMonitor({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function monitorPerformance() {
  // Monitor transaction performance
  const metrics = await monitor.getTransactionMetrics('0xabcd...', {
    includeNetworkLatency: true,
    includeExecutionTime: true,
    includeMemoryUsage: true
  });
  
  console.log('Performance Metrics:', metrics);
  
  // Monitor contract performance
  const contractMetrics = await monitor.getContractMetrics('0xcontract...', {
    period: '24h',
    includeGasUsage: true,
    includeCallFrequency: true
  });
  
  console.log('Contract Metrics:', contractMetrics);
}
```

### 4. Network Analyzer

#### Network Diagnostics
```javascript
import { NetworkAnalyzer } from '@nockchain/debug-tools';

const analyzer = new NetworkAnalyzer({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function analyzeNetwork() {
  // Analyze network connectivity
  const connectivity = await analyzer.testConnectivity({
    endpoints: [
      'https://api.nockchain.com',
      'https://rpc.nockchain.com',
      'wss://ws.nockchain.com'
    ],
    timeout: 5000
  });
  
  console.log('Connectivity:', connectivity);
  
  // Analyze network latency
  const latency = await analyzer.measureLatency({
    samples: 10,
    interval: 1000
  });
  
  console.log('Latency:', latency);
  
  // Check node synchronization
  const syncStatus = await analyzer.checkSyncStatus();
  console.log('Sync Status:', syncStatus);
}
```

## Browser Extension

### Installation and Setup
1. Install the Nockchain Debugger extension from the Chrome Web Store
2. Configure your API key in the extension settings
3. Open developer tools (F12)
4. Navigate to the "Nockchain" tab

### Features

#### Transaction Inspector
```javascript
// Automatically intercept and debug transactions
window.nockchainDebugger.interceptTransactions({
  autoDebug: true,
  showGasAnalysis: true,
  showStateChanges: true
});

// Manual transaction debugging
window.nockchainDebugger.debugTransaction('0xabcd...', {
  showTrace: true,
  showEvents: true
});
```

#### Contract Interaction Debugger
```javascript
// Debug contract calls in real-time
window.nockchainDebugger.debugContractCall({
  contract: '0xcontract...',
  method: 'transfer',
  args: ['nock1def...', '1000000000000000000']
});
```

#### Network Monitor
```javascript
// Monitor network requests
window.nockchainDebugger.monitorNetwork({
  showRequests: true,
  showResponses: true,
  showLatency: true
});
```

## VS Code Extension

### Installation
```bash
code --install-extension nockchain.nockchain-debugger
```

### Features

#### Integrated Debugging
- Syntax highlighting for Nockchain contracts
- Real-time error detection
- Gas usage analysis
- Transaction simulation
- State visualization

#### Debug Configuration
```json
{
  "type": "nockchain",
  "request": "launch",
  "name": "Debug Contract",
  "program": "${workspaceFolder}/contracts/MyContract.sol",
  "network": "testnet",
  "apiKey": "${env:NOCKCHAIN_API_KEY}",
  "gasLimit": 200000,
  "gasPrice": "20000000000"
}
```

#### Breakpoints and Stepping
- Set breakpoints in contract code
- Step through execution
- Inspect variables and state
- Call stack visualization

## Testing Framework Integration

### Jest Integration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: '@nockchain/debug-tools/jest-environment',
  setupFilesAfterEnv: ['@nockchain/debug-tools/jest-setup']
};

// test/contract.test.js
import { debugTransaction } from '@nockchain/debug-tools/jest';

describe('MyContract', () => {
  test('should transfer tokens', async () => {
    const tx = await contract.transfer('nock1def...', '1000000000000000000');
    
    // Debug the transaction
    const debugResult = await debugTransaction(tx.hash);
    
    expect(debugResult.status).toBe('success');
    expect(debugResult.gasUsed).toBeLessThan(50000);
    expect(debugResult.events).toContainEqual({
      event: 'Transfer',
      args: {
        from: 'nock1abc...',
        to: 'nock1def...',
        value: '1000000000000000000'
      }
    });
  });
});
```

### Mocha Integration
```javascript
// test/contract.test.js
const { debugTransaction } = require('@nockchain/debug-tools/mocha');

describe('MyContract', function() {
  it('should transfer tokens', async function() {
    const tx = await contract.transfer('nock1def...', '1000000000000000000');
    
    // Debug the transaction
    const debugResult = await debugTransaction(tx.hash);
    
    expect(debugResult.status).to.equal('success');
    expect(debugResult.gasUsed).to.be.lessThan(50000);
  });
});
```

## Real-time Monitoring

### WebSocket Debugger
```javascript
import { WebSocketDebugger } from '@nockchain/debug-tools';

const wsDebugger = new WebSocketDebugger({
  apiKey: 'YOUR_API_KEY',
  endpoint: 'wss://api.nockchain.com/v1/ws'
});

async function monitorRealtime() {
  // Monitor all transactions
  wsDebugger.on('transaction', (tx) => {
    console.log('New Transaction:', tx);
    
    // Auto-debug failed transactions
    if (tx.status === 'failed') {
      debugTransaction(tx.hash);
    }
  });
  
  // Monitor contract events
  wsDebugger.on('contractEvent', (event) => {
    console.log('Contract Event:', event);
  });
  
  // Monitor network metrics
  wsDebugger.on('networkMetrics', (metrics) => {
    console.log('Network Metrics:', metrics);
  });
  
  await wsDebugger.connect();
}
```

### Dashboard Integration
```javascript
import { DebugDashboard } from '@nockchain/debug-tools';

const dashboard = new DebugDashboard({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet',
  port: 8080
});

async function startDashboard() {
  await dashboard.start();
  
  // Add custom metrics
  dashboard.addMetric('customMetric', async () => {
    return await getCustomMetricValue();
  });
  
  // Add custom alerts
  dashboard.addAlert('highGasUsage', {
    condition: (tx) => tx.gasUsed > 200000,
    message: 'High gas usage detected',
    severity: 'warning'
  });
  
  console.log('Debug dashboard started at http://localhost:8080');
}
```

## Advanced Debugging Techniques

### State Diff Analysis
```javascript
import { StateDiffAnalyzer } from '@nockchain/debug-tools';

const analyzer = new StateDiffAnalyzer({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function analyzeStateDiff() {
  // Compare state between blocks
  const diff = await analyzer.compareBlocks(1234567, 1234568);
  
  console.log('State Differences:', diff);
  
  // Analyze transaction impact
  const impact = await analyzer.analyzeTransactionImpact('0xabcd...', {
    includeBalanceChanges: true,
    includeStorageChanges: true,
    includeContractCreation: true
  });
  
  console.log('Transaction Impact:', impact);
}
```

### Memory Leak Detection
```javascript
import { MemoryLeakDetector } from '@nockchain/debug-tools';

const detector = new MemoryLeakDetector({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function detectMemoryLeaks() {
  // Monitor memory usage
  const monitor = detector.startMonitoring('0xcontract...', {
    interval: 1000,
    threshold: 1000000 // 1MB
  });
  
  monitor.on('leak', (leak) => {
    console.log('Memory leak detected:', leak);
  });
  
  monitor.on('growth', (growth) => {
    console.log('Memory growth:', growth);
  });
  
  // Stop monitoring
  setTimeout(() => {
    monitor.stop();
  }, 60000);
}
```

### Race Condition Detector
```javascript
import { RaceConditionDetector } from '@nockchain/debug-tools';

const detector = new RaceConditionDetector({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function detectRaceConditions() {
  // Analyze contract for race conditions
  const analysis = await detector.analyzeContract('0xcontract...', {
    includeReentrancy: true,
    includeFrontRunning: true,
    includeTimingAttacks: true
  });
  
  console.log('Race Condition Analysis:', analysis);
  
  // Monitor for race conditions
  const monitor = detector.startMonitoring('0xcontract...', {
    onRaceCondition: (condition) => {
      console.log('Race condition detected:', condition);
    }
  });
}
```

## Error Analysis

### Error Classifier
```javascript
import { ErrorClassifier } from '@nockchain/debug-tools';

const classifier = new ErrorClassifier({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function classifyErrors() {
  // Classify transaction error
  const classification = await classifier.classifyTransaction('0xabcd...', {
    includeStackTrace: true,
    includeSuggestions: true
  });
  
  console.log('Error Classification:', classification);
  
  // Analyze error patterns
  const patterns = await classifier.analyzeErrorPatterns('0xcontract...', {
    period: '7d',
    includeFrequency: true,
    includeCorrelations: true
  });
  
  console.log('Error Patterns:', patterns);
}
```

### Error Recovery
```javascript
import { ErrorRecovery } from '@nockchain/debug-tools';

const recovery = new ErrorRecovery({
  apiKey: 'YOUR_API_KEY',
  network: 'mainnet'
});

async function recoverFromError() {
  // Suggest recovery options
  const suggestions = await recovery.suggestRecovery('0xfailed-tx...', {
    includeGasAdjustment: true,
    includeNonceAdjustment: true,
    includeAlternativeRoutes: true
  });
  
  console.log('Recovery Suggestions:', suggestions);
  
  // Auto-recovery
  const recoveryResult = await recovery.autoRecover('0xfailed-tx...', {
    maxRetries: 3,
    adjustGasPrice: true,
    adjustNonce: true
  });
  
  console.log('Recovery Result:', recoveryResult);
}
```

## Configuration and Customization

### Global Configuration
```javascript
// debug.config.js
module.exports = {
  apiKey: process.env.NOCKCHAIN_API_KEY,
  network: process.env.NOCKCHAIN_NETWORK || 'mainnet',
  endpoint: process.env.NOCKCHAIN_ENDPOINT || 'https://api.nockchain.com',
  
  debugging: {
    enableTracing: true,
    enableGasAnalysis: true,
    enableStateChanges: true,
    enableEventLogging: true
  },
  
  profiling: {
    enableGasProfiler: true,
    enablePerformanceMonitor: true,
    enableMemoryProfiler: true
  },
  
  monitoring: {
    enableRealTimeMonitoring: true,
    enableAlerts: true,
    enableDashboard: true
  },
  
  output: {
    format: 'json',
    pretty: true,
    colors: true,
    verbosity: 'info'
  }
};
```

### Custom Debugger
```javascript
import { BaseDebugger } from '@nockchain/debug-tools';

class CustomDebugger extends BaseDebugger {
  constructor(options) {
    super(options);
    this.customOptions = options.customOptions || {};
  }
  
  async debugCustom(data) {
    // Custom debugging logic
    const result = await this.processData(data);
    
    // Apply custom analysis
    const analysis = await this.analyzeCustom(result);
    
    return {
      ...result,
      customAnalysis: analysis
    };
  }
  
  async analyzeCustom(data) {
    // Custom analysis logic
    return {
      customMetric: this.calculateCustomMetric(data),
      customInsights: this.generateCustomInsights(data)
    };
  }
}
```

## Best Practices

1. **Always debug on testnet first** before mainnet deployment
2. **Use comprehensive logging** for better debugging visibility
3. **Enable gas analysis** to optimize contract efficiency
4. **Monitor state changes** to detect unexpected behavior
5. **Use breakpoints** for step-by-step debugging
6. **Profile performance** regularly to identify bottlenecks
7. **Set up alerts** for critical issues
8. **Keep debug logs** for post-mortem analysis

## Troubleshooting Common Issues

### High Gas Usage
```javascript
// Identify gas hotspots
const gasAnalysis = await debugger.analyzeGasUsage('0xabcd...', {
  includeOpcodes: true,
  includeCallStack: true
});

// Optimize gas usage
const optimizations = await debugger.suggestOptimizations('0xcontract...', {
  includeStorageOptimizations: true,
  includeLogicOptimizations: true
});
```

### Failed Transactions
```javascript
// Debug failed transaction
const failureAnalysis = await debugger.analyzeFailure('0xfailed-tx...', {
  includeRevertReason: true,
  includeStackTrace: true,
  includeSuggestions: true
});
```

### Performance Issues
```javascript
// Profile performance
const performance = await debugger.profilePerformance('0xcontract...', {
  includeExecutionTime: true,
  includeMemoryUsage: true,
  includeCallFrequency: true
});
```

## Integration with CI/CD

### GitHub Actions
```yaml
name: Debug and Test

on: [push, pull_request]

jobs:
  debug-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Debug Tools
        run: npm install -g @nockchain/debug-tools
      
      - name: Run Debug Tests
        run: |
          nockchain debug test --network testnet
          nockchain debug analyze --contract contracts/MyContract.sol
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
```

### Jenkins Pipeline
```groovy
pipeline {
  agent any
  
  stages {
    stage('Debug Analysis') {
      steps {
        script {
          sh 'nockchain debug analyze --contract contracts/MyContract.sol'
          sh 'nockchain debug test --network testnet'
        }
      }
    }
  }
}
```

## Next Steps

- Explore [Advanced Debugging Techniques](./advanced-debugging.md)
- Learn about [Performance Optimization](./performance-optimization.md)
- Check out [Debugging Examples](./debugging-examples.md)
- Join the [Developer Community](https://discord.gg/nockchain-dev)