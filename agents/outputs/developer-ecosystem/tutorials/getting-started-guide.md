# Getting Started with Nockchain Development

## Welcome to Nockchain! 🚀

This comprehensive guide will take you from zero to building your first decentralized application on Nockchain in just 30 minutes. Whether you're new to blockchain development or an experienced developer, this tutorial will help you get started quickly.

## What You'll Learn

By the end of this guide, you'll have:
- ✅ Set up your development environment
- ✅ Created your first wallet and received test tokens
- ✅ Built and deployed your first smart contract
- ✅ Interacted with the contract through a web interface
- ✅ Understood the basics of DeFi on Nockchain

## Prerequisites

- Basic knowledge of JavaScript/TypeScript
- Node.js 16+ installed
- A text editor (VS Code recommended)
- 30 minutes of your time

## Step 1: Environment Setup (5 minutes)

### Install Node.js and npm
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from https://nodejs.org/
```

### Install Nockchain CLI
```bash
# Install globally
npm install -g @nockchain/cli

# Verify installation
nockchain --version
```

### Create Your First Project
```bash
# Create a new project
nockchain create my-first-dapp
cd my-first-dapp

# Project structure
my-first-dapp/
├── contracts/          # Smart contracts
├── src/               # Frontend code
├── test/              # Tests
├── scripts/           # Deployment scripts
└── nockchain.config.js # Configuration
```

## Step 2: Get Your API Key and Test Tokens (5 minutes)

### Sign Up for Developer Account
1. Visit [https://developers.nockchain.com/signup](https://developers.nockchain.com/signup)
2. Create your account
3. Generate your API key
4. Copy your API key - you'll need it next

### Configure Your Environment
```bash
# Set up your API key
nockchain login YOUR_API_KEY

# Switch to testnet
nockchain network use testnet

# Create a new wallet
nockchain accounts create --name my-wallet
```

### Get Test Tokens
```bash
# Request test tokens from faucet
nockchain faucet request 10.0

# Check your balance
nockchain accounts balance
```

## Step 3: Write Your First Smart Contract (5 minutes)

Create a simple token contract:

```solidity
// contracts/MyToken.sol
pragma solidity ^0.8.19;

contract MyToken {
    string public name = "My First Token";
    string public symbol = "MFT";
    uint256 public totalSupply = 1000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}
```

## Step 4: Deploy Your Contract (5 minutes)

### Compile Your Contract
```bash
# Compile contracts
nockchain compile

# Should see:
# ✅ MyToken.sol compiled successfully
# 📦 Artifacts saved to ./artifacts/
```

### Deploy to Testnet
```bash
# Deploy contract
nockchain deploy contracts/MyToken.sol --network testnet

# Output:
# 🚀 Deploying MyToken to testnet...
# ✅ Contract deployed at: 0x742d35Cc6634C0532925a3b8D433F78dC4CF5d6E
# ⛽ Gas used: 423,192
# 💰 Cost: 0.008 NOCK
```

Save the contract address - you'll need it for the next step!

## Step 5: Interact with Your Contract (5 minutes)

### Test Contract Functions
```bash
# Get token name
nockchain contract call 0x742d35Cc... --method name

# Check total supply
nockchain contract call 0x742d35Cc... --method totalSupply

# Check your balance
nockchain contract call 0x742d35Cc... --method balanceOf --args YOUR_ADDRESS

# Transfer tokens
nockchain contract call 0x742d35Cc... --method transfer --args RECIPIENT_ADDRESS 1000000000000000000
```

## Step 6: Build a Web Interface (5 minutes)

Create a simple React app to interact with your contract:

```javascript
// src/App.js
import React, { useState, useEffect } from 'react';
import { NockchainClient } from '@nockchain/sdk';

function App() {
  const [client, setClient] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const initClient = async () => {
      const nockchainClient = new NockchainClient({
        apiKey: 'YOUR_API_KEY',
        network: 'testnet'
      });
      
      setClient(nockchainClient);
      
      // Initialize contract
      const myContract = await nockchainClient.contracts.get('0x742d35Cc...');
      setContract(myContract);
      
      // Get balance
      const userBalance = await myContract.balanceOf('YOUR_ADDRESS');
      setBalance(userBalance);
    };
    
    initClient();
  }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!contract || !recipient || !amount) return;
    
    try {
      const tx = await contract.transfer(recipient, amount);
      console.log('Transaction sent:', tx.hash);
      
      // Wait for confirmation
      await tx.wait();
      
      // Update balance
      const newBalance = await contract.balanceOf('YOUR_ADDRESS');
      setBalance(newBalance);
      
      alert('Transfer successful!');
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed: ' + error.message);
    }
  };

  return (
    <div className="App">
      <h1>My First Token DApp</h1>
      
      <div className="balance">
        <h2>Your Balance: {balance} MFT</h2>
      </div>
      
      <form onSubmit={handleTransfer}>
        <div>
          <label>
            Recipient Address:
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="nock1..."
            />
          </label>
        </div>
        
        <div>
          <label>
            Amount:
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.0"
            />
          </label>
        </div>
        
        <button type="submit">Transfer Tokens</button>
      </form>
    </div>
  );
}

export default App;
```

### Start Your DApp
```bash
# Install dependencies
npm install

# Start development server
npm start

# Your DApp will open at http://localhost:3000
```

## Step 7: Test Your DApp (5 minutes)

1. **Open your browser** to http://localhost:3000
2. **Check your balance** - should show your token balance
3. **Send tokens** to another address
4. **Verify the transaction** on the blockchain explorer
5. **Check the updated balance**

## 🎉 Congratulations!

You've just built your first decentralized application on Nockchain! Here's what you accomplished:

- ✅ Set up a complete development environment
- ✅ Created and deployed a smart contract
- ✅ Built a web interface to interact with your contract
- ✅ Successfully transferred tokens on testnet

## Next Steps

Now that you've built your first DApp, here are some suggested next steps:

### 1. Learn More About Nockchain
- [Nockchain Architecture](./architecture-guide.md)
- [Advanced Smart Contract Development](./advanced-contracts.md)
- [DeFi Development Guide](./defi-development.md)

### 2. Explore More Features
- [DEX Integration](./dex-integration.md)
- [Cross-Chain Bridge](./bridge-tutorial.md)
- [Mining Pool Development](./mining-pool-guide.md)

### 3. Join the Community
- [Discord Community](https://discord.gg/nockchain-dev)
- [Developer Forums](https://forum.nockchain.com/developers)
- [GitHub Repository](https://github.com/nockchain)

### 4. Build Something Amazing
- [Project Ideas](./project-ideas.md)
- [Hackathon Guide](./hackathon-guide.md)
- [Grant Application](./grant-application.md)

## Common Issues and Solutions

### Issue: "Command not found: nockchain"
**Solution:** Make sure you installed the CLI globally:
```bash
npm install -g @nockchain/cli
```

### Issue: "Invalid API key"
**Solution:** Make sure you're using the correct API key:
```bash
nockchain login YOUR_CORRECT_API_KEY
```

### Issue: "Insufficient balance"
**Solution:** Request more test tokens:
```bash
nockchain faucet request 10.0
```

### Issue: "Contract deployment failed"
**Solution:** Check your contract for syntax errors:
```bash
nockchain compile --verbose
```

### Issue: "Transaction failed"
**Solution:** Check gas limits and ensure sufficient balance:
```bash
nockchain tx estimate --from YOUR_ADDRESS --to CONTRACT_ADDRESS --data TX_DATA
```

## Resources

### Documentation
- [API Reference](../api-documentation/)
- [SDK Documentation](../sdk-development/)
- [CLI Reference](../developer-tools/nockchain-cli.md)

### Tools
- [Nockchain Explorer](https://explorer.nockchain.com)
- [Testnet Faucet](https://faucet.nockchain.com)
- [Contract Verifier](https://verify.nockchain.com)

### Sample Code
- [GitHub Examples](https://github.com/nockchain/examples)
- [DApp Templates](https://github.com/nockchain/dapp-templates)
- [Smart Contract Library](https://github.com/nockchain/contracts)

## Getting Help

If you run into any issues:

1. **Check the documentation** - Most common questions are answered here
2. **Search the forums** - Someone may have already solved your problem
3. **Join our Discord** - Get real-time help from the community
4. **Create a GitHub issue** - Report bugs or request features

## Feedback

We'd love to hear about your experience! Please share:
- What you built
- What challenges you faced
- How we can improve this guide
- Ideas for new features

Share your feedback in our [Discord #feedback channel](https://discord.gg/nockchain-dev) or [open an issue](https://github.com/nockchain/feedback/issues).

---

**Ready to build the future of decentralized applications?** Start with our [Advanced Development Guide](./advanced-development.md) or explore our [Project Templates](./project-templates.md)!

*Happy coding! 🚀*