# Nockchain Testing Framework

## Overview

The Nockchain Testing Framework provides comprehensive testing capabilities for blockchain applications, smart contracts, and DeFi protocols. Built with modern testing practices, it offers unit testing, integration testing, load testing, and automated testing pipelines.

## Installation

```bash
# Install testing framework
npm install --save-dev @nockchain/testing-framework

# Install CLI tools
npm install -g @nockchain/test-cli

# Install with specific test runner
npm install --save-dev @nockchain/jest-environment
npm install --save-dev @nockchain/mocha-plugin
```

## Quick Start

```bash
# Initialize test environment
nockchain test init

# Run tests
nockchain test run

# Run with coverage
nockchain test run --coverage

# Run specific test file
nockchain test run test/MyContract.test.js

# Run tests on specific network
nockchain test run --network testnet
```

## Test Configuration

### nockchain.test.config.js
```javascript
module.exports = {
  networks: {
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
  
  testing: {
    framework: 'jest', // or 'mocha'
    timeout: 30000,
    retries: 3,
    parallel: true,
    coverage: true,
    
    // Test data management
    fixtures: './test/fixtures',
    snapshots: './test/snapshots',
    
    // Blockchain testing
    defaultNetwork: 'testnet',
    autoMine: true,
    resetBetweenTests: true,
    
    // Performance testing
    loadTesting: {
      enabled: true,
      concurrent: 10,
      duration: '1m'
    }
  },
  
  reporters: [
    'default',
    'coverage',
    'junit',
    'blockchain-summary'
  ]
};
```

## Unit Testing

### Smart Contract Testing

```javascript
// test/MyContract.test.js
import { describe, it, beforeEach, expect } from '@nockchain/testing-framework';
import { deployContract, getTestAccount } from '@nockchain/test-utils';

describe('MyContract', () => {
  let contract;
  let owner;
  let user1;
  let user2;
  
  beforeEach(async () => {
    // Get test accounts
    [owner, user1, user2] = await getTestAccount(3);
    
    // Deploy contract
    contract = await deployContract('MyContract', {
      from: owner,
      args: ['Initial Supply', 'SYMBOL', 18]
    });
  });
  
  describe('deployment', () => {
    it('should deploy with correct initial values', async () => {
      expect(await contract.name()).toBe('Initial Supply');
      expect(await contract.symbol()).toBe('SYMBOL');
      expect(await contract.decimals()).toBe(18);
      expect(await contract.owner()).toBe(owner);
    });
    
    it('should set total supply correctly', async () => {
      const totalSupply = await contract.totalSupply();
      expect(totalSupply).toBe('1000000000000000000000000'); // 1M tokens
    });
  });
  
  describe('transfers', () => {
    it('should transfer tokens between accounts', async () => {
      const amount = '1000000000000000000'; // 1 token
      
      // Transfer tokens
      await contract.transfer(user1, amount, { from: owner });
      
      // Check balances
      expect(await contract.balanceOf(user1)).toBe(amount);
      expect(await contract.balanceOf(owner)).toBe('999999000000000000000000');
    });
    
    it('should emit Transfer event', async () => {
      const amount = '1000000000000000000';
      
      const tx = await contract.transfer(user1, amount, { from: owner });
      
      expect(tx).toEmitEvent('Transfer', {
        from: owner,
        to: user1,
        value: amount
      });
    });
    
    it('should fail when transferring more than balance', async () => {
      const amount = '2000000000000000000000000'; // 2M tokens
      
      await expect(
        contract.transfer(user1, amount, { from: owner })
      ).toRevert('Insufficient balance');
    });
  });
  
  describe('approvals', () => {
    it('should approve spending allowance', async () => {
      const amount = '1000000000000000000';
      
      await contract.approve(user1, amount, { from: owner });
      
      expect(await contract.allowance(owner, user1)).toBe(amount);
    });
    
    it('should allow approved spending', async () => {
      const amount = '1000000000000000000';
      
      // Approve spending
      await contract.approve(user1, amount, { from: owner });
      
      // Transfer from approved account
      await contract.transferFrom(owner, user2, amount, { from: user1 });
      
      expect(await contract.balanceOf(user2)).toBe(amount);
      expect(await contract.allowance(owner, user1)).toBe('0');
    });
  });
});
```

### DEX Testing

```javascript
// test/DEX.test.js
import { describe, it, beforeEach, expect } from '@nockchain/testing-framework';
import { 
  deployContract, 
  getTestAccount, 
  createLiquidityPool,
  addLiquidity,
  getTokenBalance
} from '@nockchain/test-utils';

describe('DEX', () => {
  let dex;
  let tokenA;
  let tokenB;
  let owner;
  let user1;
  let user2;
  
  beforeEach(async () => {
    [owner, user1, user2] = await getTestAccount(3);
    
    // Deploy tokens
    tokenA = await deployContract('ERC20Token', {
      from: owner,
      args: ['Token A', 'TKNA', 18]
    });
    
    tokenB = await deployContract('ERC20Token', {
      from: owner,
      args: ['Token B', 'TKNB', 18]
    });
    
    // Deploy DEX
    dex = await deployContract('DEX', {
      from: owner
    });
    
    // Create liquidity pool
    await createLiquidityPool(dex, tokenA, tokenB, {
      from: owner
    });
  });
  
  describe('liquidity provision', () => {
    it('should add liquidity to pool', async () => {
      const amountA = '1000000000000000000000'; // 1000 tokens
      const amountB = '2000000000000000000000'; // 2000 tokens
      
      // Approve tokens
      await tokenA.approve(dex.address, amountA, { from: owner });
      await tokenB.approve(dex.address, amountB, { from: owner });
      
      // Add liquidity
      const tx = await dex.addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        { from: owner }
      );
      
      expect(tx).toEmitEvent('LiquidityAdded', {
        tokenA: tokenA.address,
        tokenB: tokenB.address,
        amountA: amountA,
        amountB: amountB,
        liquidity: expect.any(String)
      });
    });
    
    it('should remove liquidity from pool', async () => {
      // Add liquidity first
      await addLiquidity(dex, tokenA, tokenB, {
        amountA: '1000000000000000000000',
        amountB: '2000000000000000000000',
        from: owner
      });
      
      const liquidityBalance = await dex.getLiquidityBalance(owner);
      
      // Remove liquidity
      const tx = await dex.removeLiquidity(
        tokenA.address,
        tokenB.address,
        liquidityBalance,
        { from: owner }
      );
      
      expect(tx).toEmitEvent('LiquidityRemoved');
    });
  });
  
  describe('token swaps', () => {
    beforeEach(async () => {
      // Add initial liquidity
      await addLiquidity(dex, tokenA, tokenB, {
        amountA: '1000000000000000000000',
        amountB: '2000000000000000000000',
        from: owner
      });
    });
    
    it('should swap token A for token B', async () => {
      const swapAmount = '100000000000000000000'; // 100 tokens
      
      // Transfer tokens to user1
      await tokenA.transfer(user1, swapAmount, { from: owner });
      
      // Approve swap
      await tokenA.approve(dex.address, swapAmount, { from: user1 });
      
      const balanceBefore = await getTokenBalance(tokenB, user1);
      
      // Execute swap
      const tx = await dex.swapTokens(
        tokenA.address,
        tokenB.address,
        swapAmount,
        0, // min amount out
        { from: user1 }
      );
      
      const balanceAfter = await getTokenBalance(tokenB, user1);
      
      expect(balanceAfter).toBeGreaterThan(balanceBefore);
      expect(tx).toEmitEvent('TokenSwap');
    });
    
    it('should calculate correct swap amounts', async () => {
      const swapAmount = '100000000000000000000';
      
      const expectedOut = await dex.getAmountOut(
        tokenA.address,
        tokenB.address,
        swapAmount
      );
      
      expect(expectedOut).toBeGreaterThan('0');
      expect(expectedOut).toBeLessThan(swapAmount); // Due to slippage
    });
  });
});
```

### Mining Pool Testing

```javascript
// test/MiningPool.test.js
import { describe, it, beforeEach, expect } from '@nockchain/testing-framework';
import { 
  deployContract, 
  getTestAccount, 
  mineBlocks,
  submitMiningShare
} from '@nockchain/test-utils';

describe('MiningPool', () => {
  let pool;
  let owner;
  let miner1;
  let miner2;
  
  beforeEach(async () => {
    [owner, miner1, miner2] = await getTestAccount(3);
    
    pool = await deployContract('MiningPool', {
      from: owner,
      args: ['Test Pool', 'testpool', 1000] // 1000 blocks reward period
    });
  });
  
  describe('miner registration', () => {
    it('should register miners', async () => {
      await pool.registerMiner(miner1, { from: owner });
      
      const isRegistered = await pool.isRegisteredMiner(miner1);
      expect(isRegistered).toBe(true);
    });
    
    it('should track miner statistics', async () => {
      await pool.registerMiner(miner1, { from: owner });
      
      const stats = await pool.getMinerStats(miner1);
      expect(stats.hashRate).toBe('0');
      expect(stats.sharesSubmitted).toBe(0);
      expect(stats.rewardsEarned).toBe('0');
    });
  });
  
  describe('share submission', () => {
    beforeEach(async () => {
      await pool.registerMiner(miner1, { from: owner });
      await pool.registerMiner(miner2, { from: owner });
    });
    
    it('should accept valid shares', async () => {
      const share = {
        nonce: '0x123456789abcdef0',
        hash: '0x000000abc123def456789...',
        difficulty: '0x1000000000000000'
      };
      
      const tx = await pool.submitShare(
        share.nonce,
        share.hash,
        share.difficulty,
        { from: miner1 }
      );
      
      expect(tx).toEmitEvent('ShareSubmitted', {
        miner: miner1,
        nonce: share.nonce,
        hash: share.hash,
        difficulty: share.difficulty
      });
    });
    
    it('should reject invalid shares', async () => {
      const invalidShare = {
        nonce: '0x123456789abcdef0',
        hash: '0x123456789abcdef0...', // Invalid hash (too high)
        difficulty: '0x1000000000000000'
      };
      
      await expect(
        pool.submitShare(
          invalidShare.nonce,
          invalidShare.hash,
          invalidShare.difficulty,
          { from: miner1 }
        )
      ).toRevert('Invalid share');
    });
  });
  
  describe('reward distribution', () => {
    beforeEach(async () => {
      await pool.registerMiner(miner1, { from: owner });
      await pool.registerMiner(miner2, { from: owner });
      
      // Submit shares
      await submitMiningShare(pool, miner1, 10); // 10 shares
      await submitMiningShare(pool, miner2, 5);  // 5 shares
    });
    
    it('should distribute rewards proportionally', async () => {
      // Mine blocks to trigger reward distribution
      await mineBlocks(1000);
      
      await pool.distributeRewards({ from: owner });
      
      const miner1Rewards = await pool.getRewardBalance(miner1);
      const miner2Rewards = await pool.getRewardBalance(miner2);
      
      // Miner1 should get 2/3 of rewards (10 out of 15 shares)
      // Miner2 should get 1/3 of rewards (5 out of 15 shares)
      expect(miner1Rewards).toBeGreaterThan(miner2Rewards);
      
      const ratio = Number(miner1Rewards) / Number(miner2Rewards);
      expect(ratio).toBeCloseTo(2, 0.1); // Approximately 2:1 ratio
    });
  });
});
```

## Integration Testing

### Multi-Contract Integration

```javascript
// test/integration/DeFiProtocol.test.js
import { describe, it, beforeEach, expect } from '@nockchain/testing-framework';
import { 
  deployProtocol, 
  getTestAccount, 
  setupDeFiEnvironment 
} from '@nockchain/test-utils';

describe('DeFi Protocol Integration', () => {
  let protocol;
  let dex;
  let stakingPool;
  let governanceToken;
  let users;
  
  beforeEach(async () => {
    users = await getTestAccount(10);
    
    // Deploy complete DeFi protocol
    protocol = await deployProtocol('DeFiProtocol', {
      deployer: users[0],
      initialLiquidity: '1000000000000000000000000',
      stakingRewards: '100000000000000000000000'
    });
    
    ({ dex, stakingPool, governanceToken } = protocol);
    
    // Setup testing environment
    await setupDeFiEnvironment(protocol, users);
  });
  
  describe('end-to-end user journey', () => {
    it('should complete full DeFi workflow', async () => {
      const user = users[1];
      
      // Step 1: User swaps tokens
      await dex.swapTokens(
        protocol.tokenA.address,
        protocol.tokenB.address,
        '1000000000000000000',
        0,
        { from: user }
      );
      
      // Step 2: User provides liquidity
      await dex.addLiquidity(
        protocol.tokenA.address,
        protocol.tokenB.address,
        '500000000000000000',
        '500000000000000000',
        { from: user }
      );
      
      // Step 3: User stakes LP tokens
      const lpBalance = await dex.getLiquidityBalance(user);
      await stakingPool.stake(lpBalance, { from: user });
      
      // Step 4: User participates in governance
      await governanceToken.delegate(user, { from: user });
      
      // Verify final state
      const stakingBalance = await stakingPool.balanceOf(user);
      const votingPower = await governanceToken.getVotes(user);
      
      expect(stakingBalance).toBe(lpBalance);
      expect(votingPower).toBeGreaterThan('0');
    });
  });
  
  describe('protocol interactions', () => {
    it('should handle complex multi-step transactions', async () => {
      // Test atomic operations across multiple contracts
      const user = users[1];
      
      const tx = await protocol.executeComplexOperation(
        user,
        '1000000000000000000',
        {
          swapTokens: true,
          addLiquidity: true,
          stakeTokens: true,
          vote: true
        },
        { from: user }
      );
      
      expect(tx).toEmitEvent('ComplexOperationCompleted');
    });
  });
});
```

### Cross-Chain Testing

```javascript
// test/integration/CrossChain.test.js
import { describe, it, beforeEach, expect } from '@nockchain/testing-framework';
import { 
  deployBridge, 
  getTestAccount, 
  setupCrossChainEnvironment 
} from '@nockchain/test-utils';

describe('Cross-Chain Bridge Integration', () => {
  let nockchainBridge;
  let ethereumBridge;
  let users;
  
  beforeEach(async () => {
    users = await getTestAccount(5);
    
    // Setup cross-chain environment
    const crossChainEnv = await setupCrossChainEnvironment({
      chains: ['nockchain', 'ethereum'],
      deployer: users[0]
    });
    
    nockchainBridge = crossChainEnv.nockchain.bridge;
    ethereumBridge = crossChainEnv.ethereum.bridge;
  });
  
  describe('token bridging', () => {
    it('should bridge tokens from Nockchain to Ethereum', async () => {
      const user = users[1];
      const amount = '1000000000000000000';
      
      // Initiate bridge transfer
      const tx = await nockchainBridge.initiateTransfer(
        'ethereum',
        ethereumBridge.address,
        amount,
        { from: user }
      );
      
      expect(tx).toEmitEvent('TransferInitiated');
      
      // Wait for bridge confirmation
      await waitForCrossChainConfirmation(tx.transferId);
      
      // Verify tokens arrived on Ethereum
      const ethereumBalance = await ethereumBridge.getBalance(user);
      expect(ethereumBalance).toBe(amount);
    });
    
    it('should handle failed bridge transfers', async () => {
      const user = users[1];
      const amount = '1000000000000000000';
      
      // Mock bridge failure
      await ethereumBridge.setFailureMode(true);
      
      const tx = await nockchainBridge.initiateTransfer(
        'ethereum',
        ethereumBridge.address,
        amount,
        { from: user }
      );
      
      // Wait for failure and refund
      await waitForCrossChainFailure(tx.transferId);
      
      // Verify refund
      const refundedBalance = await nockchainBridge.getBalance(user);
      expect(refundedBalance).toBe(amount);
    });
  });
});
```

## Load Testing

### Performance Testing

```javascript
// test/performance/LoadTest.test.js
import { describe, it, expect } from '@nockchain/testing-framework';
import { 
  loadTest, 
  performanceTest, 
  concurrentTest 
} from '@nockchain/test-utils';

describe('Performance Tests', () => {
  describe('contract performance', () => {
    it('should handle high-volume transactions', async () => {
      const result = await loadTest({
        contract: 'MyContract',
        method: 'transfer',
        args: ['nock1def...', '1000000000000000000'],
        concurrent: 100,
        duration: '1m',
        rampUp: '10s'
      });
      
      expect(result.totalTransactions).toBeGreaterThan(1000);
      expect(result.averageLatency).toBeLessThan(500); // 500ms
      expect(result.errorRate).toBeLessThan(0.01); // <1% errors
    });
    
    it('should maintain performance under stress', async () => {
      const result = await performanceTest({
        contract: 'DEX',
        scenarios: [
          { method: 'swapTokens', weight: 60 },
          { method: 'addLiquidity', weight: 30 },
          { method: 'removeLiquidity', weight: 10 }
        ],
        concurrent: 50,
        duration: '5m'
      });
      
      expect(result.throughput).toBeGreaterThan(10); // 10 TPS
      expect(result.p95Latency).toBeLessThan(2000); // 2 seconds
    });
  });
  
  describe('network performance', () => {
    it('should handle concurrent API calls', async () => {
      const result = await concurrentTest({
        endpoint: 'https://api.nockchain.com/v1/blockchain/status',
        concurrent: 100,
        requests: 1000
      });
      
      expect(result.successRate).toBeGreaterThan(0.99); // >99% success
      expect(result.averageResponseTime).toBeLessThan(1000); // <1 second
    });
  });
});
```

### Memory and Gas Testing

```javascript
// test/performance/GasOptimization.test.js
import { describe, it, expect } from '@nockchain/testing-framework';
import { 
  gasTest, 
  memoryTest, 
  optimizationTest 
} from '@nockchain/test-utils';

describe('Gas and Memory Optimization', () => {
  describe('gas efficiency', () => {
    it('should optimize gas usage', async () => {
      const result = await gasTest({
        contract: 'MyContract',
        methods: ['transfer', 'approve', 'mint'],
        samples: 100
      });
      
      expect(result.transfer.averageGas).toBeLessThan(50000);
      expect(result.approve.averageGas).toBeLessThan(45000);
      expect(result.mint.averageGas).toBeLessThan(60000);
    });
    
    it('should detect gas inefficiencies', async () => {
      const result = await optimizationTest({
        contract: 'MyContract',
        analyzeLoops: true,
        analyzeStorage: true,
        analyzeMemory: true
      });
      
      expect(result.inefficiencies).toHaveLength(0);
      expect(result.optimizationScore).toBeGreaterThan(0.8);
    });
  });
  
  describe('memory usage', () => {
    it('should monitor memory consumption', async () => {
      const result = await memoryTest({
        contract: 'MyContract',
        operations: 1000,
        monitorInterval: 100
      });
      
      expect(result.maxMemoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB
      expect(result.memoryLeaks).toHaveLength(0);
    });
  });
});
```

## Security Testing

### Vulnerability Testing

```javascript
// test/security/Vulnerabilities.test.js
import { describe, it, expect } from '@nockchain/testing-framework';
import { 
  vulnerabilityTest, 
  reentrancyTest, 
  overflowTest 
} from '@nockchain/test-utils';

describe('Security Vulnerabilities', () => {
  describe('reentrancy attacks', () => {
    it('should prevent reentrancy attacks', async () => {
      const result = await reentrancyTest({
        contract: 'MyContract',
        vulnerableMethods: ['withdraw', 'transfer'],
        attackContract: 'ReentrancyAttacker'
      });
      
      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.preventedAttacks).toBeGreaterThan(0);
    });
  });
  
  describe('integer overflow', () => {
    it('should prevent integer overflow', async () => {
      const result = await overflowTest({
        contract: 'MyContract',
        testValues: [
          '115792089237316195423570985008687907853269984665640564039457584007913129639935', // max uint256
          '0',
          '1'
        ]
      });
      
      expect(result.overflows).toHaveLength(0);
      expect(result.underflows).toHaveLength(0);
    });
  });
  
  describe('access control', () => {
    it('should enforce access control', async () => {
      const result = await vulnerabilityTest({
        contract: 'MyContract',
        tests: ['access_control', 'authorization', 'privilege_escalation']
      });
      
      expect(result.accessControlVulnerabilities).toHaveLength(0);
      expect(result.authorizationBypass).toHaveLength(0);
    });
  });
});
```

## Test Utilities

### Custom Test Utilities

```javascript
// test/utils/testUtils.js
export class TestUtils {
  static async deployContract(name, options = {}) {
    const { from, args = [], value = 0 } = options;
    
    const contract = await ethers.getContractFactory(name);
    const instance = await contract.deploy(...args, { value });
    await instance.deployed();
    
    return instance;
  }
  
  static async getTestAccount(count = 1) {
    const accounts = await ethers.getSigners();
    return count === 1 ? accounts[0] : accounts.slice(0, count);
  }
  
  static async mineBlocks(count) {
    for (let i = 0; i < count; i++) {
      await network.provider.send('evm_mine');
    }
  }
  
  static async increaseTime(seconds) {
    await network.provider.send('evm_increaseTime', [seconds]);
    await network.provider.send('evm_mine');
  }
  
  static async snapshot() {
    return await network.provider.send('evm_snapshot');
  }
  
  static async revert(snapshotId) {
    await network.provider.send('evm_revert', [snapshotId]);
  }
  
  static async waitForEvent(contract, eventName, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${eventName} not received within ${timeout}ms`));
      }, timeout);
      
      contract.once(eventName, (...args) => {
        clearTimeout(timer);
        resolve(args);
      });
    });
  }
}
```

### Mock Utilities

```javascript
// test/utils/mockUtils.js
export class MockUtils {
  static createMockContract(abi, address) {
    return {
      address,
      methods: abi.reduce((acc, method) => {
        acc[method.name] = jest.fn();
        return acc;
      }, {}),
      events: {}
    };
  }
  
  static mockTokenTransfer(token, from, to, amount) {
    token.methods.transfer.mockResolvedValue({
      hash: '0x123...',
      events: {
        Transfer: {
          args: { from, to, value: amount }
        }
      }
    });
  }
  
  static mockPriceOracle(oracle, price) {
    oracle.methods.getPrice.mockResolvedValue(price);
  }
  
  static mockBlockNumber(provider, blockNumber) {
    provider.getBlockNumber.mockResolvedValue(blockNumber);
  }
}
```

## Test Data Management

### Fixtures

```javascript
// test/fixtures/contracts.js
export const contractFixtures = {
  token: {
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18,
    totalSupply: '1000000000000000000000000'
  },
  
  dex: {
    feeRate: 30, // 0.3%
    protocolFee: 500, // 5%
    initialLiquidity: '1000000000000000000000'
  },
  
  stakingPool: {
    rewardRate: '100000000000000000', // 0.1 tokens per second
    stakingToken: 'LP_TOKEN',
    rewardToken: 'REWARD_TOKEN'
  }
};
```

### Test Data Generation

```javascript
// test/utils/dataGenerator.js
export class DataGenerator {
  static generateAddress() {
    return ethers.Wallet.createRandom().address;
  }
  
  static generatePrivateKey() {
    return ethers.Wallet.createRandom().privateKey;
  }
  
  static generateTransactionHash() {
    return ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(Math.random().toString())
    );
  }
  
  static generateTokenAmount(min = 1, max = 1000) {
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return ethers.utils.parseEther(amount.toString());
  }
  
  static generateTestUsers(count) {
    return Array.from({ length: count }, () => ({
      address: this.generateAddress(),
      privateKey: this.generatePrivateKey(),
      balance: this.generateTokenAmount()
    }));
  }
}
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
        network: [testnet, devnet]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
          NOCKCHAIN_NETWORK: ${{ matrix.network }}
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
          NOCKCHAIN_NETWORK: ${{ matrix.network }}
      
      - name: Run performance tests
        run: npm run test:performance
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
          NOCKCHAIN_NETWORK: ${{ matrix.network }}
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
  
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security tests
        run: npm run test:security
        env:
          NOCKCHAIN_API_KEY: ${{ secrets.NOCKCHAIN_API_KEY }}
      
      - name: Run vulnerability scan
        run: npm run test:vulnerabilities
```

### Jenkins Pipeline

```groovy
pipeline {
  agent any
  
  stages {
    stage('Setup') {
      steps {
        script {
          sh 'npm install'
          sh 'nockchain test setup'
        }
      }
    }
    
    stage('Unit Tests') {
      parallel {
        stage('Core Tests') {
          steps {
            sh 'npm run test:unit:core'
          }
        }
        stage('Contract Tests') {
          steps {
            sh 'npm run test:unit:contracts'
          }
        }
        stage('API Tests') {
          steps {
            sh 'npm run test:unit:api'
          }
        }
      }
    }
    
    stage('Integration Tests') {
      steps {
        sh 'npm run test:integration'
      }
    }
    
    stage('Performance Tests') {
      steps {
        sh 'npm run test:performance'
      }
    }
    
    stage('Security Tests') {
      steps {
        sh 'npm run test:security'
      }
    }
    
    stage('Report') {
      steps {
        publishTestResults testResultsPattern: 'test-results.xml'
        publishCoverageReport sourcePattern: 'coverage/lcov.info'
      }
    }
  }
  
  post {
    always {
      archiveArtifacts artifacts: 'test-results/**/*'
    }
  }
}
```

## Best Practices

1. **Write comprehensive tests** for all contract functions
2. **Use fixtures** for consistent test data
3. **Test edge cases** and error conditions
4. **Mock external dependencies** for isolated testing
5. **Use snapshots** for blockchain state management
6. **Implement load testing** for performance validation
7. **Include security testing** in your test suite
8. **Maintain test coverage** above 90%
9. **Use descriptive test names** for clarity
10. **Organize tests** by functionality and complexity

## Next Steps

- Learn about [Advanced Testing Patterns](./advanced-testing.md)
- Explore [Test Automation](./test-automation.md)
- Check out [Testing Examples](./testing-examples.md)
- Join the [Developer Community](https://discord.gg/nockchain-dev)