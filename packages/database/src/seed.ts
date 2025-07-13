// Database seeding script for development environment
// Creates initial data for testing and development

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function seedUsers() {
  console.log('🌱 Seeding users...')
  
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nockchain.platform' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@nockchain.platform',
      username: 'admin',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      tier: 'ENTERPRISE',
      isVerified: true,
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          mining: true,
          trading: true,
          security: true,
        },
      },
    },
  })

  // Create test miner user
  const minerPassword = await bcrypt.hash('miner123', 12)
  const miner = await prisma.user.upsert({
    where: { email: 'miner@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'miner@example.com',
      username: 'testminer',
      passwordHash: minerPassword,
      firstName: 'Test',
      lastName: 'Miner',
      role: 'MINER',
      tier: 'PREMIUM',
      isVerified: true,
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          mining: true,
        },
      },
    },
  })

  // Create test trader user
  const traderPassword = await bcrypt.hash('trader123', 12)
  const trader = await prisma.user.upsert({
    where: { email: 'trader@example.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'trader@example.com',
      username: 'testtrader',
      passwordHash: traderPassword,
      firstName: 'Test',
      lastName: 'Trader',
      role: 'TRADER',
      tier: 'BASIC',
      isVerified: true,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          trading: true,
        },
      },
    },
  })

  return { admin, miner, trader }
}

async function seedWallets(users: any) {
  console.log('💰 Seeding wallets...')
  
  // Create wallets for miner
  await prisma.userWallet.createMany({
    data: [
      {
        id: uuidv4(),
        userId: users.miner.id,
        chain: 'NOCKCHAIN',
        address: 'nock1234567890abcdef1234567890abcdef12345678',
        label: 'Mining Wallet',
        isDefault: true,
        balance: '150.25',
      },
      {
        id: uuidv4(),
        userId: users.miner.id,
        chain: 'SOLANA',
        address: 'Sol1234567890abcdef1234567890abcdef123456789',
        label: 'Solana Wallet',
        isDefault: false,
        balance: '75.50',
      },
    ],
  })

  // Create wallets for trader
  await prisma.userWallet.createMany({
    data: [
      {
        id: uuidv4(),
        userId: users.trader.id,
        chain: 'SOLANA',
        address: 'Sol9876543210fedcba9876543210fedcba987654321',
        label: 'Trading Wallet',
        isDefault: true,
        balance: '500.00',
      },
    ],
  })
}

async function seedMiners(users: any) {
  console.log('⛏️ Seeding miners...')
  
  const miners = []
  
  // Create main miner
  const mainMiner = await prisma.miner.create({
    data: {
      id: uuidv4(),
      userId: users.miner.id,
      address: 'nock1234567890abcdef1234567890abcdef12345678',
      name: 'Test Mining Rig',
      workerName: 'worker01',
      ipAddress: '192.168.1.100',
      userAgent: 'NockMiner/1.0.0',
      isActive: true,
    },
  })
  miners.push(mainMiner)

  // Create additional test miners
  for (let i = 1; i <= 5; i++) {
    const miner = await prisma.miner.create({
      data: {
        id: uuidv4(),
        address: `nock${i.toString().padStart(40, '0')}abcdef12345678`,
        name: `Test Rig ${i}`,
        workerName: `worker${i.toString().padStart(2, '0')}`,
        ipAddress: `192.168.1.${100 + i}`,
        userAgent: 'NockMiner/1.0.0',
        isActive: Math.random() > 0.3, // 70% active
      },
    })
    miners.push(miner)
  }

  return miners
}

async function seedShares(miners: any[]) {
  console.log('🔗 Seeding shares...')
  
  const shares = []
  const now = new Date()
  
  for (const miner of miners) {
    // Create shares for the last 24 hours
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000)
      const isValid = Math.random() > 0.05 // 95% valid shares
      
      const share = await prisma.share.create({
        data: {
          id: uuidv4(),
          minerId: miner.id,
          difficulty: (Math.random() * 1000000).toString(),
          target: `0x${'0'.repeat(56)}${Math.floor(Math.random() * 256).toString(16).padStart(8, '0')}`,
          nonce: Math.floor(Math.random() * 4294967296).toString(),
          timestamp,
          isValid,
          blockHeight: isValid && Math.random() > 0.95 ? Math.floor(Math.random() * 1000000) : undefined,
          rewardAmount: isValid && Math.random() > 0.95 ? '65536' : undefined,
        },
      })
      shares.push(share)
    }
  }

  return shares
}

async function seedMiningStats(miners: any[]) {
  console.log('📊 Seeding mining stats...')
  
  const now = new Date()
  
  for (const miner of miners) {
    // Create hourly stats for the last 48 hours
    for (let i = 0; i < 48; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hashrate = Math.random() * 1000000000 // Random hashrate up to 1 GH/s
      const validShares = Math.floor(Math.random() * 100)
      const staleShares = Math.floor(Math.random() * 5)
      const invalidShares = Math.floor(Math.random() * 2)
      
      await prisma.miningStats.create({
        data: {
          id: uuidv4(),
          minerId: miner.id,
          hashrate: hashrate.toString(),
          validShares,
          staleShares,
          invalidShares,
          efficiency: ((validShares / (validShares + staleShares + invalidShares)) || 0).toString(),
          estimatedEarnings: (hashrate * 0.001).toString(), // Rough estimate
          actualEarnings: (hashrate * 0.0008).toString(), // Slightly less than estimated
          uptime: Math.random().toString(),
          period: 'HOUR',
          timestamp,
        },
      })
    }
  }
}

async function seedBlocks() {
  console.log('🧱 Seeding blocks...')
  
  const blocks = []
  const now = new Date()
  
  // Create blocks for the last week
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const height = 1000000 + i
    
    const block = await prisma.block.create({
      data: {
        id: uuidv4(),
        height,
        hash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        previousHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp,
        difficulty: (Math.random() * 1000000000000).toString(),
        reward: '65536',
        confirmations: Math.floor(Math.random() * 100),
        status: ['PENDING', 'CONFIRMED', 'ORPHANED'][Math.floor(Math.random() * 3)] as any,
        effort: Math.random() * 2,
        luck: Math.random() * 3,
      },
    })
    blocks.push(block)
  }

  return blocks
}

async function seedPayouts(miners: any[], users: any) {
  console.log('💸 Seeding payouts...')
  
  for (const miner of miners.slice(0, 3)) { // Only for first 3 miners
    // Create some historical payouts
    for (let i = 0; i < 5; i++) {
      const amount = Math.random() * 100 + 10 // 10-110 NOCK
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      
      await prisma.payout.create({
        data: {
          id: uuidv4(),
          userId: miner.userId,
          minerId: miner.id,
          amount: amount.toString(),
          transactionHash: Math.random() > 0.2 ? `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : undefined,
          status: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'][Math.floor(Math.random() * 4)] as any,
          createdAt,
          completedAt: Math.random() > 0.3 ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : undefined,
        },
      })
    }
  }
}

async function seedBridgeTransactions(users: any) {
  console.log('🌉 Seeding bridge transactions...')
  
  // Create some bridge transactions
  for (let i = 0; i < 20; i++) {
    const amount = Math.random() * 1000 + 50 // 50-1050 NOCK
    const sourceChain = Math.random() > 0.5 ? 'NOCKCHAIN' : 'SOLANA'
    const destinationChain = sourceChain === 'NOCKCHAIN' ? 'SOLANA' : 'NOCKCHAIN'
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    
    await prisma.bridgeTransaction.create({
      data: {
        id: uuidv4(),
        userId: [users.trader.id, users.miner.id][Math.floor(Math.random() * 2)],
        sourceChain,
        destinationChain,
        sourceAddress: sourceChain === 'NOCKCHAIN' ? 'nock1234567890abcdef' : 'Sol1234567890abcdef',
        destinationAddress: destinationChain === 'NOCKCHAIN' ? 'nock9876543210fedcba' : 'Sol9876543210fedcba',
        amount: amount.toString(),
        fee: (amount * 0.005).toString(), // 0.5% fee
        status: ['PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED'][Math.floor(Math.random() * 4)] as any,
        confirmations: Math.floor(Math.random() * 10),
        requiredConfirmations: 6,
        estimatedTime: 300, // 5 minutes
        requiredSignatures: 5,
        createdAt,
      },
    })
  }
}

async function seedSystemConfig() {
  console.log('⚙️ Seeding system configuration...')
  
  const configs = [
    {
      key: 'pool.fee',
      value: 0.025,
      category: 'mining',
      isPublic: true,
    },
    {
      key: 'pool.minimum_payout',
      value: 10.0,
      category: 'mining',
      isPublic: true,
    },
    {
      key: 'bridge.fee',
      value: 0.005,
      category: 'bridge',
      isPublic: true,
    },
    {
      key: 'bridge.minimum_amount',
      value: 1.0,
      category: 'bridge',
      isPublic: true,
    },
    {
      key: 'security.max_login_attempts',
      value: 5,
      category: 'security',
      isPublic: false,
    },
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: {
        id: uuidv4(),
        key: config.key,
        value: config.value,
        category: config.category,
        isPublic: config.isPublic,
      },
    })
  }
}

async function main() {
  console.log('🚀 Starting database seeding...')
  
  try {
    // Seed in order of dependencies
    const users = await seedUsers()
    await seedWallets(users)
    const miners = await seedMiners(users)
    await seedShares(miners)
    await seedMiningStats(miners)
    await seedBlocks()
    await seedPayouts(miners, users)
    await seedBridgeTransactions(users)
    await seedSystemConfig()
    
    console.log('✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })