# Mining Integration Guide

## Introduction

This comprehensive guide will teach you how to integrate mining functionality into your applications on the Nockchain network. Whether you're building a mining pool, a mining dashboard, or integrating mining rewards into your DeFi protocol, this tutorial covers everything you need to know.

## Table of Contents

1. [Mining Fundamentals](#mining-fundamentals)
2. [Mining Pool Development](#mining-pool-development)
3. [Miner Integration](#miner-integration)
4. [Mining Dashboard](#mining-dashboard)
5. [Reward Distribution](#reward-distribution)
6. [Performance Optimization](#performance-optimization)
7. [Security Best Practices](#security-best-practices)
8. [Advanced Features](#advanced-features)

## Mining Fundamentals

### How Nockchain Mining Works

Nockchain uses a unique consensus mechanism that combines Proof of Work (PoW) with advanced optimization techniques:

```
┌─────────────────────────────────────────┐
│           Mining Process                │
├─────────────────────────────────────────┤
│  1. Receive mining job from pool       │
│  2. Process nock optimization          │
│  3. Find valid nonce                   │
│  4. Submit share to pool               │
│  5. Receive rewards                    │
└─────────────────────────────────────────┘
```

### Key Mining Concepts

- **Nock**: The core computational unit in Nockchain
- **Share**: A valid proof of work submitted to the pool
- **Difficulty**: The target difficulty for mining
- **Hashrate**: The computational power of a miner
- **Reward**: NOCK tokens earned for mining

## Mining Pool Development

### 1. Mining Pool Smart Contract

```solidity
// contracts/MiningPool.sol
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MiningPool is Ownable, ReentrancyGuard {
    IERC20 public nockToken;
    
    struct Miner {
        address minerAddress;
        uint256 hashRate;
        uint256 sharesSubmitted;
        uint256 lastSubmissionTime;
        uint256 totalRewards;
        bool isActive;
    }
    
    struct Share {
        address miner;
        uint256 timestamp;
        uint256 difficulty;
        bytes32 nonce;
        bytes32 hash;
        bool isValid;
    }
    
    struct RewardPeriod {
        uint256 startTime;
        uint256 endTime;
        uint256 totalShares;
        uint256 totalRewards;
        bool distributed;
    }
    
    mapping(address => Miner) public miners;
    mapping(uint256 => Share) public shares;
    mapping(uint256 => RewardPeriod) public rewardPeriods;
    mapping(address => mapping(uint256 => uint256)) public minerShares; // miner => period => shares
    
    address[] public minerList;
    uint256 public shareCount;
    uint256 public currentPeriod;
    uint256 public periodDuration = 86400; // 24 hours
    
    uint256 public poolFee = 200; // 2% fee
    uint256 public minimumPayout = 1e18; // 1 NOCK
    uint256 public currentDifficulty = 1000000;
    
    event MinerRegistered(address indexed miner);
    event ShareSubmitted(address indexed miner, uint256 shareId, uint256 difficulty);
    event RewardDistributed(address indexed miner, uint256 amount, uint256 period);
    event DifficultyAdjusted(uint256 newDifficulty);
    
    constructor(address _nockToken) {
        nockToken = IERC20(_nockToken);
        rewardPeriods[currentPeriod].startTime = block.timestamp;
        rewardPeriods[currentPeriod].endTime = block.timestamp + periodDuration;
    }
    
    function registerMiner() external {
        require(!miners[msg.sender].isActive, "Miner already registered");
        
        miners[msg.sender] = Miner({
            minerAddress: msg.sender,
            hashRate: 0,
            sharesSubmitted: 0,
            lastSubmissionTime: block.timestamp,
            totalRewards: 0,
            isActive: true
        });
        
        minerList.push(msg.sender);
        emit MinerRegistered(msg.sender);
    }
    
    function submitShare(
        bytes32 nonce,
        bytes32 hash,
        uint256 difficulty
    ) external {
        require(miners[msg.sender].isActive, "Miner not registered");
        require(difficulty >= currentDifficulty, "Difficulty too low");
        require(isValidShare(nonce, hash, difficulty), "Invalid share");
        
        // Check if new period should start
        if (block.timestamp >= rewardPeriods[currentPeriod].endTime) {
            startNewPeriod();
        }
        
        shares[shareCount] = Share({
            miner: msg.sender,
            timestamp: block.timestamp,
            difficulty: difficulty,
            nonce: nonce,
            hash: hash,
            isValid: true
        });
        
        // Update miner stats
        miners[msg.sender].sharesSubmitted++;
        miners[msg.sender].lastSubmissionTime = block.timestamp;
        
        // Update period stats
        minerShares[msg.sender][currentPeriod]++;
        rewardPeriods[currentPeriod].totalShares++;
        
        // Calculate and update hashrate
        updateHashRate(msg.sender);
        
        emit ShareSubmitted(msg.sender, shareCount, difficulty);
        shareCount++;
    }
    
    function isValidShare(
        bytes32 nonce,
        bytes32 hash,
        uint256 difficulty
    ) internal pure returns (bool) {
        // Simplified validation - in production, this would be more complex
        return uint256(hash) < (2**256 - 1) / difficulty;
    }
    
    function updateHashRate(address minerAddress) internal {
        Miner storage miner = miners[minerAddress];
        
        // Calculate hashrate based on shares submitted in last hour
        uint256 hourAgo = block.timestamp - 3600;
        uint256 recentShares = 0;
        
        for (uint256 i = shareCount; i > 0 && i > shareCount - 100; i--) {
            if (shares[i-1].miner == minerAddress && shares[i-1].timestamp > hourAgo) {
                recentShares++;
            }
        }
        
        // Estimated hashrate = (shares * difficulty) / time
        miner.hashRate = (recentShares * currentDifficulty) / 3600;
    }
    
    function startNewPeriod() internal {
        currentPeriod++;
        rewardPeriods[currentPeriod].startTime = block.timestamp;
        rewardPeriods[currentPeriod].endTime = block.timestamp + periodDuration;
        
        // Adjust difficulty based on network hashrate
        adjustDifficulty();
    }
    
    function adjustDifficulty() internal {
        uint256 totalHashRate = getTotalHashRate();
        uint256 targetBlockTime = 120; // 2 minutes
        
        if (totalHashRate > 0) {
            uint256 actualBlockTime = periodDuration / rewardPeriods[currentPeriod - 1].totalShares;
            
            if (actualBlockTime < targetBlockTime) {
                currentDifficulty = (currentDifficulty * 110) / 100; // Increase by 10%
            } else if (actualBlockTime > targetBlockTime) {
                currentDifficulty = (currentDifficulty * 90) / 100; // Decrease by 10%
            }
        }
        
        emit DifficultyAdjusted(currentDifficulty);
    }
    
    function distributeRewards(uint256 period) external onlyOwner {
        require(!rewardPeriods[period].distributed, "Already distributed");
        require(block.timestamp >= rewardPeriods[period].endTime, "Period not ended");
        
        uint256 totalRewards = nockToken.balanceOf(address(this));
        require(totalRewards > 0, "No rewards to distribute");
        
        uint256 totalShares = rewardPeriods[period].totalShares;
        require(totalShares > 0, "No shares in period");
        
        // Calculate pool fee
        uint256 feeAmount = (totalRewards * poolFee) / 10000;
        uint256 minerRewards = totalRewards - feeAmount;
        
        // Distribute to miners
        for (uint256 i = 0; i < minerList.length; i++) {
            address minerAddress = minerList[i];
            uint256 minerShareCount = minerShares[minerAddress][period];
            
            if (minerShareCount > 0) {
                uint256 reward = (minerRewards * minerShareCount) / totalShares;
                
                if (reward >= minimumPayout) {
                    miners[minerAddress].totalRewards += reward;
                    nockToken.transfer(minerAddress, reward);
                    emit RewardDistributed(minerAddress, reward, period);
                }
            }
        }
        
        // Send fee to owner
        if (feeAmount > 0) {
            nockToken.transfer(owner(), feeAmount);
        }
        
        rewardPeriods[period].totalRewards = minerRewards;
        rewardPeriods[period].distributed = true;
    }
    
    function getTotalHashRate() public view returns (uint256) {
        uint256 totalHashRate = 0;
        for (uint256 i = 0; i < minerList.length; i++) {
            totalHashRate += miners[minerList[i]].hashRate;
        }
        return totalHashRate;
    }
    
    function getMinerStats(address minerAddress) external view returns (
        uint256 hashRate,
        uint256 sharesSubmitted,
        uint256 totalRewards,
        bool isActive
    ) {
        Miner memory miner = miners[minerAddress];
        return (
            miner.hashRate,
            miner.sharesSubmitted,
            miner.totalRewards,
            miner.isActive
        );
    }
    
    function getPoolStats() external view returns (
        uint256 totalMiners,
        uint256 totalHashRate,
        uint256 difficulty,
        uint256 totalShares,
        uint256 currentPeriodShares
    ) {
        return (
            minerList.length,
            getTotalHashRate(),
            currentDifficulty,
            shareCount,
            rewardPeriods[currentPeriod].totalShares
        );
    }
    
    function setPoolFee(uint256 _poolFee) external onlyOwner {
        require(_poolFee <= 1000, "Fee too high"); // Max 10%
        poolFee = _poolFee;
    }
    
    function setMinimumPayout(uint256 _minimumPayout) external onlyOwner {
        minimumPayout = _minimumPayout;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = nockToken.balanceOf(address(this));
        nockToken.transfer(owner(), balance);
    }
}
```

### 2. Mining Pool Backend

```javascript
// backend/miningPool.js
const express = require('express');
const WebSocket = require('ws');
const { NockchainClient } = require('@nockchain/sdk');

class MiningPoolServer {
  constructor(config) {
    this.config = config;
    this.client = new NockchainClient({
      apiKey: config.apiKey,
      network: config.network
    });
    
    this.app = express();
    this.wss = new WebSocket.Server({ port: config.wsPort });
    
    this.miners = new Map();
    this.currentJob = null;
    this.difficulty = 1000000;
    
    this.setupRoutes();
    this.setupWebSocket();
    this.startJobDistribution();
  }
  
  setupRoutes() {
    this.app.use(express.json());
    
    // Get mining job
    this.app.get('/job', (req, res) => {
      res.json(this.getCurrentJob());
    });
    
    // Submit share
    this.app.post('/submit', async (req, res) => {
      const { minerId, nonce, hash } = req.body;
      
      try {
        const result = await this.submitShare(minerId, nonce, hash);
        res.json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
    
    // Get miner stats
    this.app.get('/stats/:minerId', async (req, res) => {
      const { minerId } = req.params;
      
      try {
        const stats = await this.getMinerStats(minerId);
        res.json(stats);
      } catch (error) {
        res.status(404).json({ error: 'Miner not found' });
      }
    });
    
    // Get pool stats
    this.app.get('/pool/stats', async (req, res) => {
      try {
        const stats = await this.getPoolStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.listen(this.config.httpPort, () => {
      console.log(`Mining pool server running on port ${this.config.httpPort}`);
    });
  }
  
  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleWebSocketMessage(ws, data);
        } catch (error) {
          ws.send(JSON.stringify({ error: error.message }));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.removeMiner(ws);
      });
    });
  }
  
  async handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'register':
        await this.registerMiner(ws, data.minerId);
        break;
        
      case 'submit':
        const result = await this.submitShare(data.minerId, data.nonce, data.hash);
        ws.send(JSON.stringify({
          type: 'submit_result',
          result
        }));
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        throw new Error('Unknown message type');
    }
  }
  
  async registerMiner(ws, minerId) {
    this.miners.set(minerId, {
      ws,
      id: minerId,
      hashRate: 0,
      sharesSubmitted: 0,
      lastSubmission: Date.now(),
      connected: true
    });
    
    // Send current job to new miner
    ws.send(JSON.stringify({
      type: 'job',
      job: this.getCurrentJob()
    }));
    
    console.log(`Miner ${minerId} registered`);
  }
  
  removeMiner(ws) {
    for (const [minerId, miner] of this.miners) {
      if (miner.ws === ws) {
        this.miners.delete(minerId);
        console.log(`Miner ${minerId} disconnected`);
        break;
      }
    }
  }
  
  getCurrentJob() {
    return {
      jobId: this.currentJob?.id || Date.now(),
      difficulty: this.difficulty,
      target: this.calculateTarget(),
      timestamp: Date.now()
    };
  }
  
  calculateTarget() {
    return Math.floor((2**256 - 1) / this.difficulty);
  }
  
  async submitShare(minerId, nonce, hash) {
    const miner = this.miners.get(minerId);
    if (!miner) {
      throw new Error('Miner not registered');
    }
    
    // Validate share
    const isValid = this.validateShare(nonce, hash);
    if (!isValid) {
      throw new Error('Invalid share');
    }
    
    // Update miner stats
    miner.sharesSubmitted++;
    miner.lastSubmission = Date.now();
    this.updateMinerHashRate(miner);
    
    // Submit to blockchain
    try {
      const tx = await this.client.mining.submitShare({
        poolId: this.config.poolId,
        minerId: minerId,
        nonce: nonce,
        hash: hash,
        difficulty: this.difficulty
      });
      
      return {
        success: true,
        transactionHash: tx.transactionHash,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Blockchain submission failed:', error);
      throw new Error('Share submission failed');
    }
  }
  
  validateShare(nonce, hash) {
    // Simplified validation
    const target = this.calculateTarget();
    return parseInt(hash.substring(2), 16) < target;
  }
  
  updateMinerHashRate(miner) {
    const timeDiff = Date.now() - miner.lastSubmission;
    const hashRate = (miner.sharesSubmitted * this.difficulty) / (timeDiff / 1000);
    miner.hashRate = hashRate;
  }
  
  async getMinerStats(minerId) {
    const miner = this.miners.get(minerId);
    if (!miner) {
      throw new Error('Miner not found');
    }
    
    // Get blockchain stats
    const blockchainStats = await this.client.mining.getMinerStats(minerId);
    
    return {
      id: minerId,
      hashRate: miner.hashRate,
      sharesSubmitted: miner.sharesSubmitted,
      lastSubmission: miner.lastSubmission,
      connected: miner.connected,
      totalRewards: blockchainStats.totalRewards,
      efficiency: blockchainStats.efficiency
    };
  }
  
  async getPoolStats() {
    const poolStats = await this.client.mining.getPoolStats(this.config.poolId);
    
    const totalHashRate = Array.from(this.miners.values())
      .reduce((sum, miner) => sum + miner.hashRate, 0);
    
    return {
      totalMiners: this.miners.size,
      totalHashRate,
      difficulty: this.difficulty,
      totalShares: poolStats.totalShares,
      efficiency: poolStats.efficiency
    };
  }
  
  startJobDistribution() {
    setInterval(() => {
      this.distributeNewJob();
    }, 30000); // Every 30 seconds
  }
  
  distributeNewJob() {
    this.currentJob = {
      id: Date.now(),
      timestamp: Date.now()
    };
    
    const job = this.getCurrentJob();
    const message = JSON.stringify({
      type: 'job',
      job
    });
    
    // Send to all connected miners
    this.miners.forEach((miner) => {
      if (miner.connected && miner.ws.readyState === WebSocket.OPEN) {
        miner.ws.send(message);
      }
    });
  }
}

// Configuration
const config = {
  httpPort: 3000,
  wsPort: 3001,
  apiKey: process.env.NOCKCHAIN_API_KEY,
  network: 'mainnet',
  poolId: 'my-mining-pool'
};

// Start server
const poolServer = new MiningPoolServer(config);
```

## Miner Integration

### 1. Miner Client

```javascript
// client/miner.js
const WebSocket = require('ws');
const crypto = require('crypto');

class NockchainMiner {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.currentJob = null;
    this.mining = false;
    this.hashRate = 0;
    this.sharesSubmitted = 0;
    
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.config.poolUrl);
    
    this.ws.on('open', () => {
      console.log('Connected to mining pool');
      this.register();
    });
    
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Message parsing error:', error);
      }
    });
    
    this.ws.on('close', () => {
      console.log('Disconnected from pool. Reconnecting...');
      setTimeout(() => this.connect(), 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  register() {
    this.send({
      type: 'register',
      minerId: this.config.minerId
    });
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'job':
        this.currentJob = message.job;
        if (this.mining) {
          this.startMining();
        }
        break;
        
      case 'submit_result':
        console.log('Share submission result:', message.result);
        if (message.result.success) {
          this.sharesSubmitted++;
        }
        break;
        
      case 'pong':
        // Keep-alive response
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }
  
  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  startMining() {
    if (!this.currentJob) {
      console.log('No job available');
      return;
    }
    
    this.mining = true;
    console.log('Starting mining...');
    
    this.mineJob();
  }
  
  stopMining() {
    this.mining = false;
    console.log('Mining stopped');
  }
  
  async mineJob() {
    const startTime = Date.now();
    let nonce = 0;
    const target = this.currentJob.target;
    
    while (this.mining && this.currentJob) {
      const hash = this.calculateHash(nonce);
      
      if (this.isValidHash(hash, target)) {
        console.log(`Valid share found! Nonce: ${nonce}, Hash: ${hash}`);
        
        this.send({
          type: 'submit',
          minerId: this.config.minerId,
          nonce: nonce.toString(),
          hash: hash
        });
        
        // Continue mining with new nonce
        nonce = 0;
      } else {
        nonce++;
      }
      
      // Update hashrate every 1000 iterations
      if (nonce % 1000 === 0) {
        this.updateHashRate(nonce, startTime);
      }
      
      // Small delay to prevent CPU overload
      if (nonce % 10000 === 0) {
        await this.sleep(1);
      }
    }
  }
  
  calculateHash(nonce) {
    const data = `${this.currentJob.jobId}${nonce}${this.config.minerId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  isValidHash(hash, target) {
    return parseInt(hash.substring(0, 16), 16) < target;
  }
  
  updateHashRate(nonce, startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    this.hashRate = nonce / elapsed;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getStats() {
    return {
      hashRate: this.hashRate,
      sharesSubmitted: this.sharesSubmitted,
      mining: this.mining,
      connected: this.ws.readyState === WebSocket.OPEN
    };
  }
  
  startPing() {
    setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }
}

// Usage
const miner = new NockchainMiner({
  poolUrl: 'ws://localhost:3001',
  minerId: 'miner-' + crypto.randomUUID()
});

// Start mining
miner.startMining();
miner.startPing();

// Handle shutdown
process.on('SIGINT', () => {
  miner.stopMining();
  process.exit(0);
});
```

### 2. Hardware Optimization

```javascript
// client/optimizedMiner.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

class OptimizedMiner {
  constructor(config) {
    this.config = config;
    this.workers = [];
    this.numWorkers = config.threads || os.cpus().length;
    this.mining = false;
    this.totalHashRate = 0;
    
    this.setupWorkers();
  }
  
  setupWorkers() {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          config: this.config
        }
      });
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });
      
      this.workers.push(worker);
    }
  }
  
  handleWorkerMessage(message) {
    switch (message.type) {
      case 'share_found':
        this.submitShare(message.nonce, message.hash);
        break;
        
      case 'hashrate_update':
        this.updateHashRate(message.workerId, message.hashRate);
        break;
    }
  }
  
  startMining(job) {
    this.mining = true;
    
    this.workers.forEach((worker, index) => {
      worker.postMessage({
        type: 'start',
        job: job,
        startNonce: index * 1000000
      });
    });
  }
  
  stopMining() {
    this.mining = false;
    
    this.workers.forEach((worker) => {
      worker.postMessage({ type: 'stop' });
    });
  }
  
  updateHashRate(workerId, hashRate) {
    // Calculate total hashrate from all workers
    this.totalHashRate = this.workers.reduce((sum, worker, index) => {
      return sum + (index === workerId ? hashRate : 0);
    }, 0);
  }
  
  submitShare(nonce, hash) {
    console.log(`Share found by worker: nonce=${nonce}, hash=${hash}`);
    // Submit to pool
  }
}

// Worker thread code
if (!isMainThread) {
  const crypto = require('crypto');
  
  let mining = false;
  let currentJob = null;
  let nonce = 0;
  let hashRate = 0;
  
  parentPort.on('message', (message) => {
    switch (message.type) {
      case 'start':
        currentJob = message.job;
        nonce = message.startNonce;
        mining = true;
        startMining();
        break;
        
      case 'stop':
        mining = false;
        break;
    }
  });
  
  async function startMining() {
    const startTime = Date.now();
    let iterations = 0;
    
    while (mining && currentJob) {
      const hash = calculateHash(nonce);
      
      if (isValidHash(hash, currentJob.target)) {
        parentPort.postMessage({
          type: 'share_found',
          nonce: nonce,
          hash: hash
        });
      }
      
      nonce++;
      iterations++;
      
      // Update hashrate every 10000 iterations
      if (iterations % 10000 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        hashRate = iterations / elapsed;
        
        parentPort.postMessage({
          type: 'hashrate_update',
          workerId: workerData.workerId,
          hashRate: hashRate
        });
      }
      
      // Small delay to prevent CPU overload
      if (iterations % 100000 === 0) {
        await sleep(1);
      }
    }
  }
  
  function calculateHash(nonce) {
    const data = `${currentJob.jobId}${nonce}${workerData.config.minerId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  function isValidHash(hash, target) {
    return parseInt(hash.substring(0, 16), 16) < target;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = OptimizedMiner;
```

## Mining Dashboard

### 1. React Mining Dashboard

```jsx
// src/components/MiningDashboard.js
import React, { useState, useEffect } from 'react';
import { NockchainClient } from '@nockchain/sdk';
import { Line, Bar, Pie } from 'react-chartjs-2';

const MiningDashboard = () => {
  const [client, setClient] = useState(null);
  const [poolStats, setPoolStats] = useState(null);
  const [minerStats, setMinerStats] = useState(null);
  const [hashRateHistory, setHashRateHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const initClient = async () => {
      const nockchainClient = new NockchainClient({
        apiKey: process.env.REACT_APP_NOCKCHAIN_API_KEY,
        network: 'mainnet'
      });
      
      setClient(nockchainClient);
      await loadData(nockchainClient);
    };
    
    initClient();
  }, []);
  
  const loadData = async (client) => {
    try {
      setLoading(true);
      
      // Load pool statistics
      const poolData = await client.mining.getPoolStats();
      setPoolStats(poolData);
      
      // Load miner statistics
      const minerData = await client.mining.getMinerStats('YOUR_MINER_ID');
      setMinerStats(minerData);
      
      // Load hashrate history
      const hashRateData = await client.mining.getHashRateHistory('YOUR_MINER_ID', {
        period: '24h',
        interval: '1h'
      });
      setHashRateHistory(hashRateData);
      
      // Load rewards
      const rewardsData = await client.mining.getRewards('YOUR_MINER_ID', {
        startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString()
      });
      setRewards(rewardsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const hashRateChartData = {
    labels: hashRateHistory.map(point => new Date(point.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'Hash Rate (H/s)',
      data: hashRateHistory.map(point => point.hashRate),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  };
  
  const rewardsChartData = {
    labels: rewards.map(reward => new Date(reward.timestamp).toLocaleDateString()),
    datasets: [{
      label: 'Daily Rewards (NOCK)',
      data: rewards.map(reward => reward.amount),
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };
  
  const poolDistributionData = {
    labels: ['Your Hash Rate', 'Other Miners'],
    datasets: [{
      data: [
        minerStats?.hashRate || 0,
        (poolStats?.totalHashRate || 0) - (minerStats?.hashRate || 0)
      ],
      backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)'],
      borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
      borderWidth: 1
    }]
  };
  
  if (loading) {
    return <div className="loading">Loading mining data...</div>;
  }
  
  return (
    <div className="mining-dashboard">
      <h1>Mining Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Hash Rate</h3>
          <p className="stat-value">{minerStats?.hashRate?.toLocaleString()} H/s</p>
        </div>
        
        <div className="stat-card">
          <h3>Shares Submitted</h3>
          <p className="stat-value">{minerStats?.sharesSubmitted?.toLocaleString()}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Rewards</h3>
          <p className="stat-value">{minerStats?.totalRewards} NOCK</p>
        </div>
        
        <div className="stat-card">
          <h3>Pool Share</h3>
          <p className="stat-value">
            {poolStats?.totalHashRate ? 
              ((minerStats?.hashRate / poolStats.totalHashRate) * 100).toFixed(2) : 0
            }%
          </p>
        </div>
      </div>
      
      <div className="charts-grid">
        <div className="chart-container">
          <h3>Hash Rate History</h3>
          <Line data={hashRateChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Daily Rewards</h3>
          <Bar data={rewardsChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Pool Distribution</h3>
          <Pie data={poolDistributionData} />
        </div>
      </div>
      
      <div className="pool-info">
        <h3>Pool Statistics</h3>
        <div className="pool-stats">
          <div className="stat-item">
            <label>Total Miners:</label>
            <span>{poolStats?.totalMiners}</span>
          </div>
          <div className="stat-item">
            <label>Pool Hash Rate:</label>
            <span>{poolStats?.totalHashRate?.toLocaleString()} H/s</span>
          </div>
          <div className="stat-item">
            <label>Difficulty:</label>
            <span>{poolStats?.difficulty?.toLocaleString()}</span>
          </div>
          <div className="stat-item">
            <label>Efficiency:</label>
            <span>{poolStats?.efficiency?.toFixed(2)}%</span>
          </div>
        </div>
      </div>
      
      <div className="recent-shares">
        <h3>Recent Shares</h3>
        <RecentShares minerId="YOUR_MINER_ID" />
      </div>
    </div>
  );
};

const RecentShares = ({ minerId }) => {
  const [shares, setShares] = useState([]);
  
  useEffect(() => {
    const loadShares = async () => {
      try {
        const client = new NockchainClient({
          apiKey: process.env.REACT_APP_NOCKCHAIN_API_KEY,
          network: 'mainnet'
        });
        
        const sharesData = await client.mining.getRecentShares(minerId, {
          limit: 10
        });
        
        setShares(sharesData);
      } catch (error) {
        console.error('Error loading shares:', error);
      }
    };
    
    loadShares();
  }, [minerId]);
  
  return (
    <div className="shares-table">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Difficulty</th>
            <th>Hash</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {shares.map((share, index) => (
            <tr key={index}>
              <td>{new Date(share.timestamp).toLocaleString()}</td>
              <td>{share.difficulty.toLocaleString()}</td>
              <td>{share.hash.substring(0, 16)}...</td>
              <td className={share.valid ? 'valid' : 'invalid'}>
                {share.valid ? 'Valid' : 'Invalid'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MiningDashboard;
```

### 2. Real-time Monitoring

```javascript
// src/hooks/useMiningMonitor.js
import { useState, useEffect } from 'react';
import { NockchainClient } from '@nockchain/sdk';

export const useMiningMonitor = (minerId) => {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    const initClient = async () => {
      const nockchainClient = new NockchainClient({
        apiKey: process.env.REACT_APP_NOCKCHAIN_API_KEY,
        network: 'mainnet'
      });
      
      setClient(nockchainClient);
      
      // Setup WebSocket connection for real-time updates
      const ws = new WebSocket('wss://api.nockchain.com/v1/ws');
      
      ws.onopen = () => {
        setIsConnected(true);
        
        // Subscribe to miner updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'miner_stats',
          filter: { minerId },
          auth: process.env.REACT_APP_NOCKCHAIN_API_KEY
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'miner_stats') {
          setStats(data.stats);
          checkAlerts(data.stats);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      return () => {
        ws.close();
      };
    };
    
    initClient();
  }, [minerId]);
  
  const checkAlerts = (currentStats) => {
    const newAlerts = [];
    
    // Check for low hash rate
    if (currentStats.hashRate < 1000) {
      newAlerts.push({
        type: 'warning',
        message: 'Hash rate is below 1000 H/s',
        timestamp: Date.now()
      });
    }
    
    // Check for no shares submitted recently
    const timeSinceLastShare = Date.now() - currentStats.lastShareTime;
    if (timeSinceLastShare > 5 * 60 * 1000) { // 5 minutes
      newAlerts.push({
        type: 'error',
        message: 'No shares submitted in the last 5 minutes',
        timestamp: Date.now()
      });
    }
    
    // Check for low efficiency
    if (currentStats.efficiency < 90) {
      newAlerts.push({
        type: 'warning',
        message: `Mining efficiency is ${currentStats.efficiency.toFixed(1)}%`,
        timestamp: Date.now()
      });
    }
    
    setAlerts(newAlerts);
  };
  
  return {
    client,
    isConnected,
    stats,
    alerts
  };
};
```

## Reward Distribution

### 1. Advanced Reward System

```solidity
// contracts/AdvancedRewardSystem.sol
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdvancedRewardSystem is Ownable {
    IERC20 public nockToken;
    
    struct RewardTier {
        uint256 minHashRate;
        uint256 multiplier; // Multiplier in basis points (10000 = 100%)
        uint256 bonusPercentage;
    }
    
    struct MinerPerformance {
        uint256 totalShares;
        uint256 validShares;
        uint256 averageHashRate;
        uint256 uptime;
        uint256 lastUpdateTime;
    }
    
    mapping(address => MinerPerformance) public minerPerformance;
    mapping(uint256 => RewardTier) public rewardTiers;
    
    uint256 public tierCount = 3;
    uint256 public baseReward = 1e18; // 1 NOCK per share
    uint256 public uptimeBonus = 500; // 5% bonus for 100% uptime
    uint256 public loyaltyBonus = 1000; // 10% bonus for long-term miners
    
    event RewardCalculated(address indexed miner, uint256 baseAmount, uint256 bonusAmount, uint256 totalAmount);
    event TierUpdated(uint256 tierId, uint256 minHashRate, uint256 multiplier, uint256 bonusPercentage);
    
    constructor(address _nockToken) {
        nockToken = IERC20(_nockToken);
        
        // Initialize reward tiers
        rewardTiers[0] = RewardTier(0, 10000, 0); // Bronze: 100% multiplier
        rewardTiers[1] = RewardTier(10000, 11000, 500); // Silver: 110% multiplier + 5% bonus
        rewardTiers[2] = RewardTier(50000, 12000, 1000); // Gold: 120% multiplier + 10% bonus
    }
    
    function calculateReward(address miner, uint256 shares) public view returns (uint256) {
        MinerPerformance memory performance = minerPerformance[miner];
        
        // Base reward
        uint256 reward = shares * baseReward;
        
        // Apply tier multiplier
        RewardTier memory tier = getTierForMiner(miner);
        reward = (reward * tier.multiplier) / 10000;
        
        // Apply tier bonus
        uint256 tierBonus = (reward * tier.bonusPercentage) / 10000;
        reward += tierBonus;
        
        // Apply uptime bonus
        uint256 uptimeBonusAmount = (reward * uptimeBonus * performance.uptime) / (10000 * 100);
        reward += uptimeBonusAmount;
        
        // Apply loyalty bonus (based on how long miner has been active)
        uint256 loyaltyPeriod = block.timestamp - performance.lastUpdateTime;
        if (loyaltyPeriod > 30 days) {
            uint256 loyaltyBonusAmount = (reward * loyaltyBonus) / 10000;
            reward += loyaltyBonusAmount;
        }
        
        return reward;
    }
    
    function getTierForMiner(address miner) public view returns (RewardTier memory) {
        uint256 hashRate = minerPerformance[miner].averageHashRate;
        
        for (uint256 i = tierCount; i > 0; i--) {
            if (hashRate >= rewardTiers[i - 1].minHashRate) {
                return rewardTiers[i - 1];
            }
        }
        
        return rewardTiers[0]; // Default to bronze tier
    }
    
    function updateMinerPerformance(
        address miner,
        uint256 totalShares,
        uint256 validShares,
        uint256 averageHashRate,
        uint256 uptime
    ) external onlyOwner {
        minerPerformance[miner] = MinerPerformance({
            totalShares: totalShares,
            validShares: validShares,
            averageHashRate: averageHashRate,
            uptime: uptime,
            lastUpdateTime: block.timestamp
        });
    }
    
    function distributeReward(address miner, uint256 shares) external onlyOwner {
        uint256 reward = calculateReward(miner, shares);
        
        require(nockToken.balanceOf(address(this)) >= reward, "Insufficient reward balance");
        
        nockToken.transfer(miner, reward);
        
        emit RewardCalculated(miner, shares * baseReward, reward - (shares * baseReward), reward);
    }
    
    function updateRewardTier(
        uint256 tierId,
        uint256 minHashRate,
        uint256 multiplier,
        uint256 bonusPercentage
    ) external onlyOwner {
        require(tierId < tierCount, "Invalid tier ID");
        
        rewardTiers[tierId] = RewardTier({
            minHashRate: minHashRate,
            multiplier: multiplier,
            bonusPercentage: bonusPercentage
        });
        
        emit TierUpdated(tierId, minHashRate, multiplier, bonusPercentage);
    }
    
    function setBaseReward(uint256 _baseReward) external onlyOwner {
        baseReward = _baseReward;
    }
    
    function setUptimeBonus(uint256 _uptimeBonus) external onlyOwner {
        uptimeBonus = _uptimeBonus;
    }
    
    function setLoyaltyBonus(uint256 _loyaltyBonus) external onlyOwner {
        loyaltyBonus = _loyaltyBonus;
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = nockToken.balanceOf(address(this));
        nockToken.transfer(owner(), balance);
    }
}
```

### 2. Automated Reward Distribution

```javascript
// scripts/rewardDistribution.js
const { NockchainClient } = require('@nockchain/sdk');
const cron = require('node-cron');

class RewardDistributionSystem {
  constructor(config) {
    this.config = config;
    this.client = new NockchainClient({
      apiKey: config.apiKey,
      network: config.network
    });
    
    this.rewardContract = config.rewardContract;
    this.distributionSchedule = config.distributionSchedule || '0 0 * * *'; // Daily at midnight
    
    this.setupScheduledDistribution();
  }
  
  setupScheduledDistribution() {
    cron.schedule(this.distributionSchedule, async () => {
      console.log('Starting scheduled reward distribution...');
      
      try {
        await this.distributeRewards();
        console.log('Reward distribution completed successfully');
      } catch (error) {
        console.error('Reward distribution failed:', error);
        await this.sendAlert('Reward distribution failed', error.message);
      }
    });
  }
  
  async distributeRewards() {
    // Get all active miners
    const miners = await this.client.mining.getActiveMiners();
    
    for (const miner of miners) {
      try {
        await this.distributeMinerRewards(miner);
      } catch (error) {
        console.error(`Failed to distribute rewards for miner ${miner.id}:`, error);
      }
    }
  }
  
  async distributeMinerRewards(miner) {
    // Get miner's performance data
    const performance = await this.client.mining.getMinerPerformance(miner.id, {
      period: '24h'
    });
    
    // Calculate rewards based on performance
    const rewardAmount = await this.calculateRewards(miner, performance);
    
    if (rewardAmount > 0) {
      // Distribute rewards
      const tx = await this.client.contracts.call(this.rewardContract, 'distributeReward', [
        miner.address,
        performance.validShares
      ]);
      
      console.log(`Distributed ${rewardAmount} NOCK to miner ${miner.id}. TX: ${tx.hash}`);
      
      // Send notification to miner
      await this.sendMinerNotification(miner, rewardAmount, tx.hash);
    }
  }
  
  async calculateRewards(miner, performance) {
    const baseReward = performance.validShares * 1e18; // 1 NOCK per share
    
    // Apply performance multipliers
    let multiplier = 1;
    
    // Hash rate tier bonus
    if (performance.averageHashRate > 50000) {
      multiplier *= 1.2; // 20% bonus for gold tier
    } else if (performance.averageHashRate > 10000) {
      multiplier *= 1.1; // 10% bonus for silver tier
    }
    
    // Uptime bonus
    if (performance.uptime > 95) {
      multiplier *= 1.05; // 5% bonus for high uptime
    }
    
    // Efficiency bonus
    if (performance.efficiency > 95) {
      multiplier *= 1.03; // 3% bonus for high efficiency
    }
    
    return Math.floor(baseReward * multiplier);
  }
  
  async sendMinerNotification(miner, amount, txHash) {
    // Send email notification
    await this.sendEmail(miner.email, 'Mining Rewards Distributed', `
      Dear ${miner.name},
      
      Your mining rewards have been distributed!
      
      Amount: ${amount / 1e18} NOCK
      Transaction Hash: ${txHash}
      
      Thank you for supporting the Nockchain network.
      
      Best regards,
      Nockchain Mining Pool
    `);
  }
  
  async sendAlert(subject, message) {
    // Send alert to administrators
    await this.sendEmail(this.config.adminEmail, subject, message);
  }
  
  async sendEmail(to, subject, body) {
    // Implementation depends on your email service
    console.log(`Email sent to ${to}: ${subject}`);
  }
}

// Configuration
const config = {
  apiKey: process.env.NOCKCHAIN_API_KEY,
  network: 'mainnet',
  rewardContract: '0x...',
  distributionSchedule: '0 0 * * *',
  adminEmail: 'admin@example.com'
};

// Start reward distribution system
const rewardSystem = new RewardDistributionSystem(config);
console.log('Reward distribution system started');
```

## Performance Optimization

### 1. Mining Algorithm Optimization

```javascript
// optimizations/nockOptimizer.js
const crypto = require('crypto');

class NockOptimizer {
  constructor(options = {}) {
    this.options = {
      cacheSize: options.cacheSize || 1000,
      batchSize: options.batchSize || 100,
      ...options
    };
    
    this.cache = new Map();
    this.precomputedHashes = new Map();
    
    this.precomputeHashes();
  }
  
  precomputeHashes() {
    // Precompute common hash components
    for (let i = 0; i < 1000; i++) {
      const hash = crypto.createHash('sha256').update(i.toString()).digest();
      this.precomputedHashes.set(i, hash);
    }
  }
  
  optimizedHash(data) {
    // Check cache first
    if (this.cache.has(data)) {
      return this.cache.get(data);
    }
    
    // Use precomputed hash if available
    const numData = parseInt(data);
    if (this.precomputedHashes.has(numData)) {
      const hash = this.precomputedHashes.get(numData);
      this.cache.set(data, hash);
      return hash;
    }
    
    // Calculate hash
    const hash = crypto.createHash('sha256').update(data).digest();
    
    // Cache result
    if (this.cache.size < this.options.cacheSize) {
      this.cache.set(data, hash);
    }
    
    return hash;
  }
  
  batchProcess(nonces) {
    const results = [];
    
    for (let i = 0; i < nonces.length; i += this.options.batchSize) {
      const batch = nonces.slice(i, i + this.options.batchSize);
      
      const batchResults = batch.map(nonce => ({
        nonce,
        hash: this.optimizedHash(nonce.toString())
      }));
      
      results.push(...batchResults);
    }
    
    return results;
  }
  
  findValidNonce(jobId, target, startNonce = 0, maxIterations = 1000000) {
    for (let nonce = startNonce; nonce < startNonce + maxIterations; nonce++) {
      const data = `${jobId}${nonce}`;
      const hash = this.optimizedHash(data);
      
      if (this.isValidHash(hash, target)) {
        return {
          nonce,
          hash: hash.toString('hex')
        };
      }
    }
    
    return null;
  }
  
  isValidHash(hash, target) {
    // Convert first 8 bytes to number for comparison
    const hashValue = hash.readBigUInt64BE(0);
    return hashValue < target;
  }
  
  clearCache() {
    this.cache.clear();
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.options.cacheSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

module.exports = NockOptimizer;
```

### 2. GPU Mining Support

```javascript
// mining/gpuMiner.js
const { spawn } = require('child_process');
const fs = require('fs');

class GPUMiner {
  constructor(config) {
    this.config = config;
    this.process = null;
    this.isRunning = false;
    this.hashRate = 0;
    
    this.setupGPUMining();
  }
  
  setupGPUMining() {
    // Write GPU mining kernel
    this.writeKernel();
    
    // Compile kernel
    this.compileKernel();
  }
  
  writeKernel() {
    const kernelCode = `
      __global__ void nockMining(
        const char* jobId,
        unsigned long long target,
        unsigned long long* nonces,
        unsigned long long* results,
        int numThreads
      ) {
        int idx = blockIdx.x * blockDim.x + threadIdx.x;
        
        if (idx < numThreads) {
          unsigned long long nonce = nonces[idx];
          
          // Nock hashing algorithm
          unsigned long long hash = nockHash(jobId, nonce);
          
          if (hash < target) {
            results[idx] = nonce;
          } else {
            results[idx] = 0;
          }
        }
      }
      
      __device__ unsigned long long nockHash(const char* jobId, unsigned long long nonce) {
        // Simplified nock hash implementation
        // In practice, this would be the actual Nockchain hashing algorithm
        
        unsigned long long hash = 0;
        
        // Combine jobId and nonce
        for (int i = 0; jobId[i] != '\\0'; i++) {
          hash = hash * 31 + jobId[i];
        }
        
        hash = hash * 31 + nonce;
        
        // Apply nock-specific transformations
        hash = nockTransform(hash);
        
        return hash;
      }
      
      __device__ unsigned long long nockTransform(unsigned long long input) {
        // Nock-specific hash transformation
        input ^= input >> 33;
        input *= 0xff51afd7ed558ccd;
        input ^= input >> 33;
        input *= 0xc4ceb9fe1a85ec53;
        input ^= input >> 33;
        
        return input;
      }
    `;
    
    fs.writeFileSync('nockMining.cu', kernelCode);
  }
  
  compileKernel() {
    return new Promise((resolve, reject) => {
      const nvcc = spawn('nvcc', ['-o', 'nockMining', 'nockMining.cu']);
      
      nvcc.on('close', (code) => {
        if (code === 0) {
          console.log('GPU kernel compiled successfully');
          resolve();
        } else {
          console.error('GPU kernel compilation failed');
          reject(new Error('Compilation failed'));
        }
      });
    });
  }
  
  startMining(job) {
    if (this.isRunning) {
      this.stopMining();
    }
    
    this.isRunning = true;
    this.currentJob = job;
    
    // Start GPU mining process
    this.process = spawn('./nockMining', [
      job.jobId,
      job.target.toString(),
      this.config.threads.toString()
    ]);
    
    this.process.stdout.on('data', (data) => {
      this.handleMiningOutput(data.toString());
    });
    
    this.process.stderr.on('data', (data) => {
      console.error('GPU mining error:', data.toString());
    });
    
    this.process.on('close', (code) => {
      console.log(`GPU mining process exited with code ${code}`);
      this.isRunning = false;
    });
  }
  
  stopMining() {
    if (this.process && this.isRunning) {
      this.process.kill();
      this.isRunning = false;
    }
  }
  
  handleMiningOutput(output) {
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('SHARE:')) {
        const [, nonce, hash] = line.split(':');
        this.onShareFound(parseInt(nonce), hash);
      } else if (line.startsWith('HASHRATE:')) {
        const [, hashRate] = line.split(':');
        this.hashRate = parseInt(hashRate);
      }
    }
  }
  
  onShareFound(nonce, hash) {
    console.log(`GPU found share: nonce=${nonce}, hash=${hash}`);
    
    // Submit share to pool
    if (this.config.onShareFound) {
      this.config.onShareFound(nonce, hash);
    }
  }
  
  getHashRate() {
    return this.hashRate;
  }
  
  isGPUAvailable() {
    return new Promise((resolve) => {
      const nvidia = spawn('nvidia-smi', ['-L']);
      
      nvidia.on('close', (code) => {
        resolve(code === 0);
      });
      
      nvidia.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = GPUMiner;
```

## Security Best Practices

### 1. Share Validation

```javascript
// security/shareValidator.js
const crypto = require('crypto');

class ShareValidator {
  constructor(options = {}) {
    this.options = {
      maxShareAge: options.maxShareAge || 60000, // 1 minute
      duplicateWindow: options.duplicateWindow || 300000, // 5 minutes
      ...options
    };
    
    this.recentShares = new Map();
    this.shareHistory = new Map();
    
    this.setupCleanup();
  }
  
  validateShare(share) {
    const errors = [];
    
    // Basic validation
    if (!share.minerId || !share.nonce || !share.hash) {
      errors.push('Missing required fields');
    }
    
    // Timestamp validation
    const now = Date.now();
    if (share.timestamp && Math.abs(now - share.timestamp) > this.options.maxShareAge) {
      errors.push('Share timestamp out of range');
    }
    
    // Duplicate validation
    if (this.isDuplicate(share)) {
      errors.push('Duplicate share detected');
    }
    
    // Hash validation
    if (!this.validateHash(share)) {
      errors.push('Invalid hash');
    }
    
    // Difficulty validation
    if (!this.validateDifficulty(share)) {
      errors.push('Share does not meet difficulty requirement');
    }
    
    // Rate limiting
    if (this.isRateLimited(share.minerId)) {
      errors.push('Rate limit exceeded');
    }
    
    if (errors.length === 0) {
      this.recordShare(share);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  isDuplicate(share) {
    const key = `${share.minerId}:${share.nonce}:${share.hash}`;
    
    if (this.recentShares.has(key)) {
      return true;
    }
    
    this.recentShares.set(key, Date.now());
    return false;
  }
  
  validateHash(share) {
    // Recalculate hash to verify
    const expectedHash = this.calculateHash(share.jobId, share.nonce, share.minerId);
    return expectedHash === share.hash;
  }
  
  calculateHash(jobId, nonce, minerId) {
    const data = `${jobId}${nonce}${minerId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  validateDifficulty(share) {
    const hashValue = parseInt(share.hash.substring(0, 16), 16);
    const target = Math.floor((2**64 - 1) / share.difficulty);
    
    return hashValue < target;
  }
  
  isRateLimited(minerId) {
    const now = Date.now();
    const history = this.shareHistory.get(minerId) || [];
    
    // Remove old entries
    const recentHistory = history.filter(time => now - time < 60000); // 1 minute
    
    // Check rate limit (max 10 shares per minute)
    if (recentHistory.length >= 10) {
      return true;
    }
    
    this.shareHistory.set(minerId, recentHistory);
    return false;
  }
  
  recordShare(share) {
    const now = Date.now();
    
    // Record in history
    const history = this.shareHistory.get(share.minerId) || [];
    history.push(now);
    this.shareHistory.set(share.minerId, history);
  }
  
  setupCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up recent shares
      for (const [key, timestamp] of this.recentShares) {
        if (now - timestamp > this.options.duplicateWindow) {
          this.recentShares.delete(key);
        }
      }
      
      // Clean up share history
      for (const [minerId, history] of this.shareHistory) {
        const filteredHistory = history.filter(time => now - time < 300000); // 5 minutes
        
        if (filteredHistory.length === 0) {
          this.shareHistory.delete(minerId);
        } else {
          this.shareHistory.set(minerId, filteredHistory);
        }
      }
    }, 60000); // Clean up every minute
  }
}

module.exports = ShareValidator;
```

### 2. Pool Security

```javascript
// security/poolSecurity.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

class PoolSecurity {
  constructor(app) {
    this.app = app;
    this.setupSecurityMiddleware();
    this.setupRateLimiting();
    this.setupValidation();
  }
  
  setupSecurityMiddleware() {
    // Basic security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    // CORS configuration
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }
  
  setupRateLimiting() {
    // General rate limiting
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    // Share submission rate limiting
    const shareSubmissionLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // limit each IP to 60 share submissions per minute
      message: 'Too many share submissions, please slow down.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use('/api', generalLimiter);
    this.app.use('/api/submit', shareSubmissionLimiter);
  }
  
  setupValidation() {
    // Share submission validation
    this.app.use('/api/submit', [
      body('minerId').isString().isLength({ min: 1, max: 100 }),
      body('nonce').isString().matches(/^[0-9a-fA-F]+$/),
      body('hash').isString().isLength({ min: 64, max: 64 }).matches(/^[0-9a-fA-F]+$/),
      body('difficulty').isInt({ min: 1 }),
      body('timestamp').optional().isInt({ min: 0 }),
    ]);
    
    // Validation error handler
    this.app.use((req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      next();
    });
  }
  
  // DDoS protection
  setupDDoSProtection() {
    const ddosLimiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 1000, // limit each IP to 1000 requests per minute
      message: 'DDoS protection activated',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        console.log(`DDoS protection triggered for IP: ${req.ip}`);
        res.status(429).json({
          error: 'Too many requests',
          message: 'DDoS protection activated'
        });
      }
    });
    
    this.app.use(ddosLimiter);
  }
  
  // IP blacklist
  setupIPBlacklist() {
    const blacklistedIPs = new Set();
    
    this.app.use((req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (blacklistedIPs.has(clientIP)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP has been blacklisted'
        });
      }
      
      next();
    });
    
    return {
      addToBlacklist: (ip) => blacklistedIPs.add(ip),
      removeFromBlacklist: (ip) => blacklistedIPs.delete(ip),
      isBlacklisted: (ip) => blacklistedIPs.has(ip)
    };
  }
}

module.exports = PoolSecurity;
```

## Advanced Features

### 1. Automated Pool Switching

```javascript
// features/poolSwitching.js
class AutomaticPoolSwitching {
  constructor(config) {
    this.config = config;
    this.pools = config.pools;
    this.currentPool = null;
    this.switchingEnabled = true;
    this.evaluationInterval = config.evaluationInterval || 300000; // 5 minutes
    
    this.setupPoolSwitching();
  }
  
  setupPoolSwitching() {
    setInterval(() => {
      if (this.switchingEnabled) {
        this.evaluatePoolSwitching();
      }
    }, this.evaluationInterval);
  }
  
  async evaluatePoolSwitching() {
    try {
      const poolScores = await this.evaluateAllPools();
      const bestPool = this.findBestPool(poolScores);
      
      if (bestPool && bestPool.id !== this.currentPool?.id) {
        await this.switchToPool(bestPool);
      }
    } catch (error) {
      console.error('Pool switching evaluation failed:', error);
    }
  }
  
  async evaluateAllPools() {
    const scores = [];
    
    for (const pool of this.pools) {
      try {
        const score = await this.evaluatePool(pool);
        scores.push({ pool, score });
      } catch (error) {
        console.error(`Failed to evaluate pool ${pool.id}:`, error);
        scores.push({ pool, score: 0 });
      }
    }
    
    return scores;
  }
  
  async evaluatePool(pool) {
    const [stats, latency, reliability] = await Promise.all([
      this.getPoolStats(pool),
      this.measureLatency(pool),
      this.getReliabilityScore(pool)
    ]);
    
    // Calculate composite score
    const profitabilityScore = this.calculateProfitability(stats);
    const latencyScore = this.calculateLatencyScore(latency);
    const reliabilityScore = reliability;
    
    return {
      overall: (profitabilityScore * 0.5) + (latencyScore * 0.3) + (reliabilityScore * 0.2),
      profitability: profitabilityScore,
      latency: latencyScore,
      reliability: reliabilityScore,
      stats
    };
  }
  
  async getPoolStats(pool) {
    const response = await fetch(`${pool.url}/api/stats`);
    return await response.json();
  }
  
  async measureLatency(pool) {
    const start = Date.now();
    
    try {
      await fetch(`${pool.url}/api/ping`);
      return Date.now() - start;
    } catch (error) {
      return 9999; // High latency for failed requests
    }
  }
  
  async getReliabilityScore(pool) {
    // Get historical uptime data
    const uptime = await this.getPoolUptime(pool);
    
    // Convert uptime percentage to score (0-100)
    return Math.min(100, uptime);
  }
  
  calculateProfitability(stats) {
    const blockReward = 12.5; // NOCK per block
    const poolHashRate = stats.totalHashRate;
    const networkHashRate = stats.networkHashRate || poolHashRate * 10;
    const poolFee = stats.poolFee || 0.02;
    
    // Estimate blocks per day
    const blocksPerDay = (poolHashRate / networkHashRate) * 720; // 720 blocks per day
    
    // Calculate daily revenue
    const dailyRevenue = blocksPerDay * blockReward * (1 - poolFee);
    
    // Normalize to 0-100 score
    return Math.min(100, dailyRevenue * 10);
  }
  
  calculateLatencyScore(latency) {
    // Convert latency to score (lower is better)
    if (latency < 50) return 100;
    if (latency < 100) return 80;
    if (latency < 200) return 60;
    if (latency < 500) return 40;
    if (latency < 1000) return 20;
    return 0;
  }
  
  findBestPool(poolScores) {
    let bestPool = null;
    let bestScore = -1;
    
    for (const { pool, score } of poolScores) {
      if (score.overall > bestScore) {
        bestScore = score.overall;
        bestPool = pool;
      }
    }
    
    return bestPool;
  }
  
  async switchToPool(pool) {
    console.log(`Switching to pool: ${pool.name} (${pool.url})`);
    
    try {
      // Disconnect from current pool
      if (this.currentPool) {
        await this.disconnectFromPool(this.currentPool);
      }
      
      // Connect to new pool
      await this.connectToPool(pool);
      
      this.currentPool = pool;
      
      console.log(`Successfully switched to pool: ${pool.name}`);
    } catch (error) {
      console.error(`Failed to switch to pool ${pool.name}:`, error);
      
      // Revert to previous pool if switch fails
      if (this.currentPool) {
        await this.connectToPool(this.currentPool);
      }
    }
  }
  
  async connectToPool(pool) {
    // Implementation depends on your mining client
    // This is a placeholder
  }
  
  async disconnectFromPool(pool) {
    // Implementation depends on your mining client
    // This is a placeholder
  }
  
  enableAutoSwitching() {
    this.switchingEnabled = true;
    console.log('Automatic pool switching enabled');
  }
  
  disableAutoSwitching() {
    this.switchingEnabled = false;
    console.log('Automatic pool switching disabled');
  }
}

module.exports = AutomaticPoolSwitching;
```

### 2. Mining Analytics

```javascript
// analytics/miningAnalytics.js
class MiningAnalytics {
  constructor(config) {
    this.config = config;
    this.client = new NockchainClient(config.nockchain);
    this.database = config.database;
    
    this.setupAnalytics();
  }
  
  setupAnalytics() {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }
  
  async collectMetrics() {
    try {
      const metrics = await this.gatherAllMetrics();
      await this.storeMetrics(metrics);
      await this.analyzeMetrics(metrics);
    } catch (error) {
      console.error('Metrics collection failed:', error);
    }
  }
  
  async gatherAllMetrics() {
    const [
      minerStats,
      poolStats,
      networkStats,
      profitability,
      efficiency
    ] = await Promise.all([
      this.getMinerStats(),
      this.getPoolStats(),
      this.getNetworkStats(),
      this.calculateProfitability(),
      this.calculateEfficiency()
    ]);
    
    return {
      timestamp: Date.now(),
      miner: minerStats,
      pool: poolStats,
      network: networkStats,
      profitability,
      efficiency
    };
  }
  
  async getMinerStats() {
    const stats = await this.client.mining.getMinerStats(this.config.minerId);
    
    return {
      hashRate: stats.hashRate,
      sharesSubmitted: stats.sharesSubmitted,
      validShares: stats.validShares,
      invalidShares: stats.invalidShares,
      totalRewards: stats.totalRewards,
      uptime: stats.uptime
    };
  }
  
  async getPoolStats() {
    const stats = await this.client.mining.getPoolStats(this.config.poolId);
    
    return {
      totalHashRate: stats.totalHashRate,
      totalMiners: stats.totalMiners,
      difficulty: stats.difficulty,
      blocksFound: stats.blocksFound,
      poolFee: stats.poolFee
    };
  }
  
  async getNetworkStats() {
    const stats = await this.client.blockchain.getStatus();
    
    return {
      blockHeight: stats.latest_block.height,
      networkHashRate: stats.network_stats.total_hash_rate,
      difficulty: stats.network_stats.difficulty,
      blockTime: stats.network_stats.avg_block_time
    };
  }
  
  async calculateProfitability() {
    const minerStats = await this.getMinerStats();
    const networkStats = await this.getNetworkStats();
    
    const dailyBlocks = 86400 / networkStats.blockTime;
    const blockReward = 12.5;
    const minerShare = minerStats.hashRate / networkStats.networkHashRate;
    
    const dailyEarnings = dailyBlocks * blockReward * minerShare;
    const dailyCost = this.calculateDailyCost();
    
    return {
      dailyEarnings,
      dailyCost,
      dailyProfit: dailyEarnings - dailyCost,
      roi: ((dailyEarnings - dailyCost) / dailyCost) * 100
    };
  }
  
  calculateDailyCost() {
    const powerConsumption = this.config.powerConsumption || 3000; // Watts
    const electricityRate = this.config.electricityRate || 0.12; // $/kWh
    const dailyPowerCost = (powerConsumption / 1000) * 24 * electricityRate;
    
    return dailyPowerCost;
  }
  
  async calculateEfficiency() {
    const minerStats = await this.getMinerStats();
    
    const validShareRatio = minerStats.validShares / minerStats.sharesSubmitted;
    const hashRateEfficiency = minerStats.hashRate / this.config.theoreticalHashRate;
    
    return {
      shareEfficiency: validShareRatio * 100,
      hashRateEfficiency: hashRateEfficiency * 100,
      overall: (validShareRatio * hashRateEfficiency) * 100
    };
  }
  
  async storeMetrics(metrics) {
    // Store metrics in database
    await this.database.collection('mining_metrics').insertOne(metrics);
  }
  
  async analyzeMetrics(currentMetrics) {
    // Get historical data for comparison
    const historical = await this.getHistoricalMetrics(24); // Last 24 hours
    
    // Analyze trends
    const trends = this.analyzeTrends(historical, currentMetrics);
    
    // Generate alerts if needed
    await this.checkAlerts(currentMetrics, trends);
    
    // Generate insights
    const insights = this.generateInsights(currentMetrics, trends);
    
    return { trends, insights };
  }
  
  analyzeTrends(historical, current) {
    if (historical.length < 2) return null;
    
    const hashRateChange = this.calculateTrend(historical.map(m => m.miner.hashRate));
    const profitabilityChange = this.calculateTrend(historical.map(m => m.profitability.dailyProfit));
    const efficiencyChange = this.calculateTrend(historical.map(m => m.efficiency.overall));
    
    return {
      hashRate: hashRateChange,
      profitability: profitabilityChange,
      efficiency: efficiencyChange
    };
  }
  
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return ((last - first) / first) * 100;
  }
  
  async checkAlerts(metrics, trends) {
    const alerts = [];
    
    // Low hash rate alert
    if (metrics.miner.hashRate < this.config.minHashRate) {
      alerts.push({
        type: 'low_hashrate',
        severity: 'warning',
        message: `Hash rate is below minimum threshold: ${metrics.miner.hashRate}`,
        timestamp: Date.now()
      });
    }
    
    // Low profitability alert
    if (metrics.profitability.dailyProfit < 0) {
      alerts.push({
        type: 'unprofitable',
        severity: 'error',
        message: `Mining is currently unprofitable: ${metrics.profitability.dailyProfit}`,
        timestamp: Date.now()
      });
    }
    
    // Declining efficiency alert
    if (trends && trends.efficiency < -10) {
      alerts.push({
        type: 'declining_efficiency',
        severity: 'warning',
        message: `Efficiency has declined by ${trends.efficiency.toFixed(1)}%`,
        timestamp: Date.now()
      });
    }
    
    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }
  
  generateInsights(metrics, trends) {
    const insights = [];
    
    // Profitability insight
    if (metrics.profitability.roi > 20) {
      insights.push('Mining is highly profitable with ROI above 20%');
    } else if (metrics.profitability.roi > 10) {
      insights.push('Mining is moderately profitable');
    } else {
      insights.push('Mining profitability is low, consider optimizing');
    }
    
    // Efficiency insight
    if (metrics.efficiency.overall > 95) {
      insights.push('Mining efficiency is excellent');
    } else if (metrics.efficiency.overall > 85) {
      insights.push('Mining efficiency is good');
    } else {
      insights.push('Mining efficiency could be improved');
    }
    
    // Hash rate insight
    if (trends && trends.hashRate > 5) {
      insights.push('Hash rate is trending upward');
    } else if (trends && trends.hashRate < -5) {
      insights.push('Hash rate is declining, check hardware');
    }
    
    return insights;
  }
  
  async generateReport(period = '24h') {
    const historical = await this.getHistoricalMetrics(period);
    
    const report = {
      period,
      summary: {
        averageHashRate: this.calculateAverage(historical.map(m => m.miner.hashRate)),
        totalRewards: historical.reduce((sum, m) => sum + m.miner.totalRewards, 0),
        totalProfit: historical.reduce((sum, m) => sum + m.profitability.dailyProfit, 0),
        averageEfficiency: this.calculateAverage(historical.map(m => m.efficiency.overall))
      },
      trends: this.analyzeTrends(historical, historical[historical.length - 1]),
      insights: this.generateInsights(historical[historical.length - 1], this.analyzeTrends(historical, historical[historical.length - 1]))
    };
    
    return report;
  }
  
  calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  async getHistoricalMetrics(hours) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    return await this.database.collection('mining_metrics')
      .find({ timestamp: { $gte: cutoff } })
      .sort({ timestamp: 1 })
      .toArray();
  }
  
  async sendAlert(alert) {
    console.log(`ALERT [${alert.severity}]: ${alert.message}`);
    
    // Send to notification service
    // Implementation depends on your notification system
  }
}

module.exports = MiningAnalytics;
```

## Next Steps

Congratulations! You now have a comprehensive understanding of mining integration on Nockchain. Here are some next steps to expand your knowledge:

1. **Explore Advanced Topics**:
   - [Cross-Chain Mining](./cross-chain-mining.md)
   - [Mining Pool Governance](./mining-governance.md)
   - [Green Mining Initiatives](./green-mining.md)

2. **Optimize Your Implementation**:
   - [Performance Benchmarking](./performance-benchmarking.md)
   - [Hardware Recommendations](./hardware-guide.md)
   - [Cost Analysis](./cost-analysis.md)

3. **Connect with the Community**:
   - [Join Mining Discord](https://discord.gg/nockchain-mining)
   - [Mining Forums](https://forum.nockchain.com/mining)
   - [Open Source Mining Tools](https://github.com/nockchain/mining-tools)

4. **Build Your Mining Business**:
   - [Mining Farm Setup](./mining-farm-setup.md)
   - [Business Planning](./mining-business-plan.md)
   - [Legal Considerations](./mining-legal.md)

Happy mining! ⛏️