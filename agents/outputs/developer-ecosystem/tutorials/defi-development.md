# DeFi Development on Nockchain

## Introduction

Welcome to the comprehensive guide for building decentralized finance (DeFi) applications on Nockchain. This tutorial will take you through creating sophisticated DeFi protocols including DEXes, lending platforms, yield farming, and more.

## Table of Contents

1. [DeFi Fundamentals](#defi-fundamentals)
2. [Building a DEX](#building-a-dex)
3. [Automated Market Makers](#automated-market-makers)
4. [Lending and Borrowing](#lending-and-borrowing)
5. [Yield Farming](#yield-farming)
6. [Governance Tokens](#governance-tokens)
7. [Advanced DeFi Patterns](#advanced-defi-patterns)
8. [Security Best Practices](#security-best-practices)

## DeFi Fundamentals

### What is DeFi?

Decentralized Finance (DeFi) represents a paradigm shift from traditional centralized financial systems to peer-to-peer finance enabled by decentralized technologies built on blockchain networks.

### Key DeFi Components

1. **Liquidity Pools** - Shared token reserves that facilitate trading
2. **Automated Market Makers (AMMs)** - Algorithms that price assets and enable trades
3. **Yield Farming** - Earning rewards by providing liquidity
4. **Lending/Borrowing** - Decentralized credit markets
5. **Governance** - Decentralized decision making

### DeFi Stack on Nockchain

```
┌─────────────────────────────────────────┐
│           Applications Layer             │
│  (Wallets, Interfaces, Aggregators)    │
├─────────────────────────────────────────┤
│           Protocol Layer                │
│  (DEXes, Lending, Derivatives)         │
├─────────────────────────────────────────┤
│           Primitive Layer               │
│  (Tokens, Oracles, Governance)         │
├─────────────────────────────────────────┤
│         Nockchain Blockchain            │
│  (Smart Contracts, Consensus)          │
└─────────────────────────────────────────┘
```

## Building a DEX

### 1. Token Contract

First, let's create a standard ERC20 token:

```solidity
// contracts/Token.sol
pragma solidity ^0.8.19;

contract Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply * 10**_decimals;
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

### 2. Liquidity Pool Contract

```solidity
// contracts/LiquidityPool.sol
pragma solidity ^0.8.19;

import "./Token.sol";

contract LiquidityPool {
    Token public tokenA;
    Token public tokenB;
    
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint256 reserve0, uint256 reserve1);
    
    constructor(address _tokenA, address _tokenB) {
        tokenA = Token(_tokenA);
        tokenB = Token(_tokenB);
    }
    
    function addLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);
        
        if (totalSupply == 0) {
            liquidity = sqrt(amountA * amountB);
        } else {
            liquidity = min(
                (amountA * totalSupply) / reserveA,
                (amountB * totalSupply) / reserveB
            );
        }
        
        require(liquidity > 0, "Insufficient liquidity minted");
        
        balanceOf[msg.sender] += liquidity;
        totalSupply += liquidity;
        
        reserveA += amountA;
        reserveB += amountB;
        
        emit Mint(msg.sender, liquidity);
        emit Sync(reserveA, reserveB);
    }
    
    function removeLiquidity(uint256 liquidity) external returns (uint256 amountA, uint256 amountB) {
        require(balanceOf[msg.sender] >= liquidity, "Insufficient liquidity");
        
        amountA = (liquidity * reserveA) / totalSupply;
        amountB = (liquidity * reserveB) / totalSupply;
        
        require(amountA > 0 && amountB > 0, "Insufficient liquidity burned");
        
        balanceOf[msg.sender] -= liquidity;
        totalSupply -= liquidity;
        
        reserveA -= amountA;
        reserveB -= amountB;
        
        tokenA.transfer(msg.sender, amountA);
        tokenB.transfer(msg.sender, amountB);
        
        emit Burn(msg.sender, liquidity);
        emit Sync(reserveA, reserveB);
    }
    
    function swap(uint256 amountAIn, uint256 amountBIn, address to) external {
        require(amountAIn > 0 || amountBIn > 0, "Insufficient input amount");
        require(to != address(tokenA) && to != address(tokenB), "Invalid to address");
        
        uint256 amountAOut = 0;
        uint256 amountBOut = 0;
        
        if (amountAIn > 0) {
            tokenA.transferFrom(msg.sender, address(this), amountAIn);
            amountBOut = getAmountOut(amountAIn, reserveA, reserveB);
            tokenB.transfer(to, amountBOut);
        }
        
        if (amountBIn > 0) {
            tokenB.transferFrom(msg.sender, address(this), amountBIn);
            amountAOut = getAmountOut(amountBIn, reserveB, reserveA);
            tokenA.transfer(to, amountAOut);
        }
        
        reserveA = tokenA.balanceOf(address(this));
        reserveB = tokenB.balanceOf(address(this));
        
        emit Swap(msg.sender, amountAIn, amountBIn, amountAOut, amountBOut, to);
        emit Sync(reserveA, reserveB);
    }
    
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public 
        pure 
        returns (uint256 amountOut) 
    {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * 997; // 0.3% fee
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
```

### 3. DEX Factory Contract

```solidity
// contracts/DEXFactory.sol
pragma solidity ^0.8.19;

import "./LiquidityPool.sol";

contract DEXFactory {
    mapping(address => mapping(address => address)) public pools;
    address[] public allPools;
    
    event PoolCreated(address indexed tokenA, address indexed tokenB, address pool, uint256 index);
    
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB, "Identical addresses");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(pools[tokenA][tokenB] == address(0), "Pool exists");
        
        // Sort tokens
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        pool = address(new LiquidityPool(token0, token1));
        
        pools[token0][token1] = pool;
        pools[token1][token0] = pool;
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length - 1);
    }
    
    function getPool(address tokenA, address tokenB) external view returns (address) {
        return pools[tokenA][tokenB];
    }
    
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
}
```

### 4. DEX Router Contract

```solidity
// contracts/DEXRouter.sol
pragma solidity ^0.8.19;

import "./DEXFactory.sol";
import "./LiquidityPool.sol";

contract DEXRouter {
    DEXFactory public factory;
    
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "Expired");
        _;
    }
    
    constructor(address _factory) {
        factory = DEXFactory(_factory);
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        address pool = factory.getPool(tokenA, tokenB);
        if (pool == address(0)) {
            pool = factory.createPool(tokenA, tokenB);
        }
        
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        
        Token(tokenA).transferFrom(msg.sender, pool, amountA);
        Token(tokenB).transferFrom(msg.sender, pool, amountB);
        
        liquidity = LiquidityPool(pool).addLiquidity(amountA, amountB);
    }
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pool = factory.getPool(tokenA, tokenB);
        require(pool != address(0), "Pool does not exist");
        
        LiquidityPool(pool).transferFrom(msg.sender, pool, liquidity);
        (amountA, amountB) = LiquidityPool(pool).removeLiquidity(liquidity);
        
        require(amountA >= amountAMin, "Insufficient A amount");
        require(amountB >= amountBMin, "Insufficient B amount");
        
        Token(tokenA).transfer(to, amountA);
        Token(tokenB).transfer(to, amountB);
    }
    
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output amount");
        
        Token(path[0]).transferFrom(msg.sender, factory.getPool(path[0], path[1]), amounts[0]);
        
        _swap(amounts, path, to);
    }
    
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        address pool = factory.getPool(tokenA, tokenB);
        
        if (pool == address(0)) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            (uint256 reserveA, uint256 reserveB) = getReserves(tokenA, tokenB);
            if (reserveA == 0 && reserveB == 0) {
                (amountA, amountB) = (amountADesired, amountBDesired);
            } else {
                uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
                if (amountBOptimal <= amountBDesired) {
                    require(amountBOptimal >= amountBMin, "Insufficient B amount");
                    (amountA, amountB) = (amountADesired, amountBOptimal);
                } else {
                    uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                    assert(amountAOptimal <= amountADesired);
                    require(amountAOptimal >= amountAMin, "Insufficient A amount");
                    (amountA, amountB) = (amountAOptimal, amountBDesired);
                }
            }
        }
    }
    
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            address pool = factory.getPool(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input < output ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? factory.getPool(output, path[i + 2]) : _to;
            LiquidityPool(pool).swap(amount0Out, amount1Out, to);
        }
    }
    
    function getReserves(address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        address pool = factory.getPool(tokenA, tokenB);
        if (pool != address(0)) {
            (reserveA, reserveB) = (LiquidityPool(pool).reserveA(), LiquidityPool(pool).reserveB());
        }
    }
    
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, "Insufficient amount");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");
        amountB = (amountA * reserveB) / reserveA;
    }
    
    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
```

## Automated Market Makers

### Constant Product Market Maker

The DEX we built above uses the constant product formula: `x * y = k`

```javascript
// JavaScript implementation for understanding
class ConstantProductAMM {
  constructor(reserveA, reserveB) {
    this.reserveA = reserveA;
    this.reserveB = reserveB;
    this.k = reserveA * reserveB;
  }
  
  // Calculate output amount for given input
  getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn * 0.997; // 0.3% fee
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    return numerator / denominator;
  }
  
  // Calculate price impact
  getPriceImpact(amountIn, reserveIn, reserveOut) {
    const amountOut = this.getAmountOut(amountIn, reserveIn, reserveOut);
    const priceAfter = (reserveIn + amountIn) / (reserveOut - amountOut);
    const priceBefore = reserveIn / reserveOut;
    return (priceAfter - priceBefore) / priceBefore;
  }
}
```

### Concentrated Liquidity (Uniswap V3 Style)

```solidity
// contracts/ConcentratedLiquidity.sol
pragma solidity ^0.8.19;

contract ConcentratedLiquidity {
    struct Position {
        uint256 liquidity;
        int24 tickLower;
        int24 tickUpper;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }
    
    mapping(bytes32 => Position) public positions;
    mapping(int24 => uint256) public tickLiquidity;
    
    int24 public currentTick;
    uint256 public totalLiquidity;
    
    event Mint(
        address indexed owner,
        int24 indexed tickLower,
        int24 indexed tickUpper,
        uint256 liquidity
    );
    
    event Burn(
        address indexed owner,
        int24 indexed tickLower,
        int24 indexed tickUpper,
        uint256 liquidity
    );
    
    function mint(
        address recipient,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        require(tickLower < tickUpper, "Invalid tick range");
        
        bytes32 positionKey = keccak256(abi.encodePacked(recipient, tickLower, tickUpper));
        Position storage position = positions[positionKey];
        
        position.liquidity += liquidity;
        
        // Update tick liquidity
        tickLiquidity[tickLower] += liquidity;
        tickLiquidity[tickUpper] += liquidity;
        
        // Calculate token amounts needed
        (amount0, amount1) = calculateTokenAmounts(tickLower, tickUpper, liquidity);
        
        emit Mint(recipient, tickLower, tickUpper, liquidity);
    }
    
    function burn(
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        bytes32 positionKey = keccak256(abi.encodePacked(msg.sender, tickLower, tickUpper));
        Position storage position = positions[positionKey];
        
        require(position.liquidity >= liquidity, "Insufficient liquidity");
        
        position.liquidity -= liquidity;
        
        // Update tick liquidity
        tickLiquidity[tickLower] -= liquidity;
        tickLiquidity[tickUpper] -= liquidity;
        
        // Calculate token amounts to return
        (amount0, amount1) = calculateTokenAmounts(tickLower, tickUpper, liquidity);
        
        emit Burn(msg.sender, tickLower, tickUpper, liquidity);
    }
    
    function calculateTokenAmounts(
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity
    ) internal view returns (uint256 amount0, uint256 amount1) {
        if (currentTick < tickLower) {
            // Current price is below the range, all liquidity is in token0
            amount0 = liquidity;
            amount1 = 0;
        } else if (currentTick >= tickUpper) {
            // Current price is above the range, all liquidity is in token1
            amount0 = 0;
            amount1 = liquidity;
        } else {
            // Current price is within the range
            uint256 priceAtCurrentTick = tickToPrice(currentTick);
            uint256 priceAtLowerTick = tickToPrice(tickLower);
            uint256 priceAtUpperTick = tickToPrice(tickUpper);
            
            amount0 = liquidity * (priceAtUpperTick - priceAtCurrentTick) / (priceAtUpperTick - priceAtLowerTick);
            amount1 = liquidity * (priceAtCurrentTick - priceAtLowerTick) / (priceAtUpperTick - priceAtLowerTick);
        }
    }
    
    function tickToPrice(int24 tick) internal pure returns (uint256) {
        // Simplified price calculation
        // In practice, this would use more sophisticated math
        return uint256(int256(tick));
    }
}
```

## Lending and Borrowing

### Lending Pool Contract

```solidity
// contracts/LendingPool.sol
pragma solidity ^0.8.19;

import "./Token.sol";

contract LendingPool {
    Token public asset;
    Token public collateral;
    
    uint256 public totalSupply;
    uint256 public totalBorrow;
    uint256 public supplyRate = 5; // 5% APY
    uint256 public borrowRate = 8; // 8% APY
    uint256 public collateralRatio = 150; // 150% collateralization required
    
    mapping(address => uint256) public supplied;
    mapping(address => uint256) public borrowed;
    mapping(address => uint256) public collateralDeposited;
    mapping(address => uint256) public lastUpdateTime;
    
    event Supply(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Borrow(address indexed user, uint256 amount);
    event Repay(address indexed user, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, uint256 amount);
    
    constructor(address _asset, address _collateral) {
        asset = Token(_asset);
        collateral = Token(_collateral);
    }
    
    function supply(uint256 amount) external {
        updateInterest(msg.sender);
        
        asset.transferFrom(msg.sender, address(this), amount);
        supplied[msg.sender] += amount;
        totalSupply += amount;
        
        emit Supply(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external {
        updateInterest(msg.sender);
        
        require(supplied[msg.sender] >= amount, "Insufficient supply");
        
        supplied[msg.sender] -= amount;
        totalSupply -= amount;
        
        asset.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }
    
    function depositCollateral(uint256 amount) external {
        collateral.transferFrom(msg.sender, address(this), amount);
        collateralDeposited[msg.sender] += amount;
    }
    
    function borrow(uint256 amount) external {
        updateInterest(msg.sender);
        
        uint256 maxBorrow = getMaxBorrow(msg.sender);
        require(amount <= maxBorrow, "Insufficient collateral");
        
        borrowed[msg.sender] += amount;
        totalBorrow += amount;
        
        asset.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, amount);
    }
    
    function repay(uint256 amount) external {
        updateInterest(msg.sender);
        
        require(borrowed[msg.sender] >= amount, "Repay amount exceeds debt");
        
        asset.transferFrom(msg.sender, address(this), amount);
        borrowed[msg.sender] -= amount;
        totalBorrow -= amount;
        
        emit Repay(msg.sender, amount);
    }
    
    function liquidate(address borrower, uint256 amount) external {
        updateInterest(borrower);
        
        require(isLiquidatable(borrower), "Position is healthy");
        require(borrowed[borrower] >= amount, "Amount exceeds debt");
        
        // Calculate liquidation bonus (5%)
        uint256 collateralAmount = (amount * 105) / 100;
        
        asset.transferFrom(msg.sender, address(this), amount);
        borrowed[borrower] -= amount;
        totalBorrow -= amount;
        
        collateralDeposited[borrower] -= collateralAmount;
        collateral.transfer(msg.sender, collateralAmount);
        
        emit Liquidate(msg.sender, borrower, amount);
    }
    
    function getMaxBorrow(address user) public view returns (uint256) {
        uint256 collateralValue = collateralDeposited[user] * getCollateralPrice();
        return (collateralValue * 100) / collateralRatio;
    }
    
    function isLiquidatable(address user) public view returns (bool) {
        if (borrowed[user] == 0) return false;
        
        uint256 collateralValue = collateralDeposited[user] * getCollateralPrice();
        uint256 borrowValue = borrowed[user] * getAssetPrice();
        
        return (collateralValue * 100) / borrowValue < collateralRatio;
    }
    
    function updateInterest(address user) internal {
        uint256 timeDiff = block.timestamp - lastUpdateTime[user];
        if (timeDiff == 0) return;
        
        if (supplied[user] > 0) {
            uint256 interest = (supplied[user] * supplyRate * timeDiff) / (365 days * 100);
            supplied[user] += interest;
        }
        
        if (borrowed[user] > 0) {
            uint256 interest = (borrowed[user] * borrowRate * timeDiff) / (365 days * 100);
            borrowed[user] += interest;
        }
        
        lastUpdateTime[user] = block.timestamp;
    }
    
    function getAssetPrice() internal pure returns (uint256) {
        // In practice, this would use a price oracle
        return 1e18; // 1:1 for simplicity
    }
    
    function getCollateralPrice() internal pure returns (uint256) {
        // In practice, this would use a price oracle
        return 1e18; // 1:1 for simplicity
    }
}
```

## Yield Farming

### Yield Farm Contract

```solidity
// contracts/YieldFarm.sol
pragma solidity ^0.8.19;

import "./Token.sol";

contract YieldFarm {
    Token public stakingToken;
    Token public rewardToken;
    
    uint256 public rewardRate = 100; // 100 tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;
    
    uint256 public totalSupply;
    
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    
    constructor(address _stakingToken, address _rewardToken) {
        stakingToken = Token(_stakingToken);
        rewardToken = Token(_rewardToken);
    }
    
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
    
    function stake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        
        totalSupply += amount;
        balances[msg.sender] += amount;
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        emit Staked(msg.sender, amount);
    }
    
    function withdraw(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        
        stakingToken.transfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function claimReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.transfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }
    
    function exit() external {
        withdraw(balances[msg.sender]);
        claimReward();
    }
    
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + 
               (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalSupply);
    }
    
    function earned(address account) public view returns (uint256) {
        return (balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }
}
```

## Governance Tokens

### Governance Token Contract

```solidity
// contracts/GovernanceToken.sol
pragma solidity ^0.8.19;

contract GovernanceToken {
    string public name = "Governance Token";
    string public symbol = "GOV";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Governance
    mapping(address => address) public delegates;
    mapping(address => uint256) public numCheckpoints;
    mapping(address => mapping(uint256 => Checkpoint)) public checkpoints;
    
    struct Checkpoint {
        uint32 fromBlock;
        uint256 votes;
    }
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    
    constructor(uint256 _totalSupply) {
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        _transfer(from, to, amount);
        return true;
    }
    
    function _transfer(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        
        _moveVotes(delegates[from], delegates[to], amount);
    }
    
    function delegate(address delegatee) public {
        return _delegate(msg.sender, delegatee);
    }
    
    function _delegate(address delegator, address delegatee) internal {
        address currentDelegate = delegates[delegator];
        uint256 delegatorBalance = balanceOf[delegator];
        delegates[delegator] = delegatee;
        
        emit DelegateChanged(delegator, currentDelegate, delegatee);
        
        _moveVotes(currentDelegate, delegatee, delegatorBalance);
    }
    
    function _moveVotes(address srcRep, address dstRep, uint256 amount) internal {
        if (srcRep != dstRep && amount > 0) {
            if (srcRep != address(0)) {
                uint256 srcRepNum = numCheckpoints[srcRep];
                uint256 srcRepOld = srcRepNum > 0 ? checkpoints[srcRep][srcRepNum - 1].votes : 0;
                uint256 srcRepNew = srcRepOld - amount;
                _writeCheckpoint(srcRep, srcRepNum, srcRepOld, srcRepNew);
            }
            
            if (dstRep != address(0)) {
                uint256 dstRepNum = numCheckpoints[dstRep];
                uint256 dstRepOld = dstRepNum > 0 ? checkpoints[dstRep][dstRepNum - 1].votes : 0;
                uint256 dstRepNew = dstRepOld + amount;
                _writeCheckpoint(dstRep, dstRepNum, dstRepOld, dstRepNew);
            }
        }
    }
    
    function _writeCheckpoint(address delegatee, uint256 nCheckpoints, uint256 oldVotes, uint256 newVotes) internal {
        uint32 blockNumber = uint32(block.number);
        
        if (nCheckpoints > 0 && checkpoints[delegatee][nCheckpoints - 1].fromBlock == blockNumber) {
            checkpoints[delegatee][nCheckpoints - 1].votes = newVotes;
        } else {
            checkpoints[delegatee][nCheckpoints] = Checkpoint(blockNumber, newVotes);
            numCheckpoints[delegatee] = nCheckpoints + 1;
        }
        
        emit DelegateVotesChanged(delegatee, oldVotes, newVotes);
    }
    
    function getVotes(address account) public view returns (uint256) {
        uint256 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }
    
    function getPriorVotes(address account, uint256 blockNumber) public view returns (uint256) {
        require(blockNumber < block.number, "Not yet determined");
        
        uint256 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }
        
        // Binary search
        uint256 lower = 0;
        uint256 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2;
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }
}
```

### DAO Governance Contract

```solidity
// contracts/DAO.sol
pragma solidity ^0.8.19;

import "./GovernanceToken.sol";

contract DAO {
    GovernanceToken public governanceToken;
    
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 17280; // ~3 days in blocks
    uint256 public constant VOTING_DELAY = 1; // 1 block delay
    uint256 public constant PROPOSAL_THRESHOLD = 1000e18; // 1000 tokens
    uint256 public constant QUORUM_VOTES = 4000e18; // 4000 tokens
    
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool canceled;
        bool executed;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => Proposal) public proposals;
    
    event ProposalCreated(
        uint256 id,
        address proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        uint256 startBlock,
        uint256 endBlock,
        string description
    );
    
    event VoteCast(address voter, uint256 proposalId, bool support, uint256 votes);
    event ProposalCanceled(uint256 id);
    event ProposalExecuted(uint256 id);
    
    constructor(address _governanceToken) {
        governanceToken = GovernanceToken(_governanceToken);
    }
    
    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256) {
        require(
            governanceToken.getPriorVotes(msg.sender, block.number - 1) >= PROPOSAL_THRESHOLD,
            "Insufficient voting power"
        );
        
        uint256 startBlock = block.number + VOTING_DELAY;
        uint256 endBlock = startBlock + VOTING_PERIOD;
        
        proposalCount++;
        
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.signatures = signatures;
        newProposal.calldatas = calldatas;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        
        emit ProposalCreated(
            proposalCount,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            startBlock,
            endBlock,
            description
        );
        
        return proposalCount;
    }
    
    function castVote(uint256 proposalId, bool support) public {
        require(state(proposalId) == ProposalState.Active, "Voting is closed");
        
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.hasVoted[msg.sender], "Voter already voted");
        
        uint256 votes = governanceToken.getPriorVotes(msg.sender, proposal.startBlock);
        
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        proposal.hasVoted[msg.sender] = true;
        
        emit VoteCast(msg.sender, proposalId, support, votes);
    }
    
    function execute(uint256 proposalId) public {
        require(state(proposalId) == ProposalState.Succeeded, "Proposal not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                abi.encodePacked(
                    bytes4(keccak256(bytes(proposal.signatures[i]))),
                    proposal.calldatas[i]
                )
            );
            require(success, "Transaction execution reverted");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    function cancel(uint256 proposalId) public {
        ProposalState currentState = state(proposalId);
        require(currentState != ProposalState.Executed, "Cannot cancel executed proposal");
        
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer ||
            governanceToken.getPriorVotes(proposal.proposer, block.number - 1) < PROPOSAL_THRESHOLD,
            "Unauthorized"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(proposalId <= proposalCount && proposalId > 0, "Invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < QUORUM_VOTES) {
            return ProposalState.Defeated;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else {
            return ProposalState.Succeeded;
        }
    }
}
```

## Advanced DeFi Patterns

### Flash Loans

```solidity
// contracts/FlashLoan.sol
pragma solidity ^0.8.19;

import "./Token.sol";

interface IFlashLoanReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external;
}

contract FlashLoanProvider {
    Token public asset;
    uint256 public fee = 5; // 0.05% fee
    
    event FlashLoan(address indexed receiver, uint256 amount, uint256 fee);
    
    constructor(address _asset) {
        asset = Token(_asset);
    }
    
    function flashLoan(
        address receiver,
        uint256 amount,
        bytes calldata params
    ) external {
        uint256 balanceBefore = asset.balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient liquidity");
        
        uint256 feeAmount = (amount * fee) / 10000;
        
        // Transfer tokens to receiver
        asset.transfer(receiver, amount);
        
        // Execute receiver's logic
        IFlashLoanReceiver(receiver).executeOperation(address(asset), amount, feeAmount, params);
        
        uint256 balanceAfter = asset.balanceOf(address(this));
        require(balanceAfter >= balanceBefore + feeAmount, "Flash loan not repaid");
        
        emit FlashLoan(receiver, amount, feeAmount);
    }
}
```

### Arbitrage Bot

```solidity
// contracts/ArbitrageBot.sol
pragma solidity ^0.8.19;

import "./FlashLoan.sol";
import "./DEXRouter.sol";

contract ArbitrageBot is IFlashLoanReceiver {
    FlashLoanProvider public flashLoanProvider;
    DEXRouter public dexA;
    DEXRouter public dexB;
    
    constructor(
        address _flashLoanProvider,
        address _dexA,
        address _dexB
    ) {
        flashLoanProvider = FlashLoanProvider(_flashLoanProvider);
        dexA = DEXRouter(_dexA);
        dexB = DEXRouter(_dexB);
    }
    
    function executeArbitrage(
        address tokenA,
        address tokenB,
        uint256 amount
    ) external {
        // Encode parameters for flash loan
        bytes memory params = abi.encode(tokenA, tokenB, amount);
        
        // Request flash loan
        flashLoanProvider.flashLoan(address(this), amount, params);
    }
    
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 fee,
        bytes calldata params
    ) external override {
        require(msg.sender == address(flashLoanProvider), "Unauthorized");
        
        (address tokenA, address tokenB, uint256 flashAmount) = abi.decode(params, (address, address, uint256));
        
        // 1. Swap on DEX A
        address[] memory pathA = new address[](2);
        pathA[0] = tokenA;
        pathA[1] = tokenB;
        
        Token(tokenA).approve(address(dexA), flashAmount);
        uint256[] memory amountsOutA = dexA.swapExactTokensForTokens(
            flashAmount,
            0,
            pathA,
            address(this),
            block.timestamp + 300
        );
        
        // 2. Swap on DEX B
        address[] memory pathB = new address[](2);
        pathB[0] = tokenB;
        pathB[1] = tokenA;
        
        Token(tokenB).approve(address(dexB), amountsOutA[1]);
        uint256[] memory amountsOutB = dexB.swapExactTokensForTokens(
            amountsOutA[1],
            0,
            pathB,
            address(this),
            block.timestamp + 300
        );
        
        // 3. Ensure profit after paying back flash loan
        uint256 repayAmount = amount + fee;
        require(amountsOutB[1] > repayAmount, "No profit");
        
        // 4. Repay flash loan
        Token(asset).transfer(address(flashLoanProvider), repayAmount);
        
        // 5. Keep profit
        uint256 profit = amountsOutB[1] - repayAmount;
        Token(asset).transfer(msg.sender, profit);
    }
}
```

## Security Best Practices

### 1. Reentrancy Protection

```solidity
// contracts/ReentrancyGuard.sol
pragma solidity ^0.8.19;

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    
    uint256 private _status;
    
    constructor() {
        _status = _NOT_ENTERED;
    }
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}
```

### 2. Price Oracle

```solidity
// contracts/PriceOracle.sol
pragma solidity ^0.8.19;

contract PriceOracle {
    mapping(address => uint256) public prices;
    mapping(address => uint256) public lastUpdated;
    
    address public admin;
    uint256 public constant PRICE_VALIDITY_PERIOD = 1 hours;
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function updatePrice(address asset, uint256 price) external onlyAdmin {
        prices[asset] = price;
        lastUpdated[asset] = block.timestamp;
    }
    
    function getPrice(address asset) external view returns (uint256) {
        require(
            block.timestamp - lastUpdated[asset] <= PRICE_VALIDITY_PERIOD,
            "Price data stale"
        );
        return prices[asset];
    }
}
```

### 3. Access Control

```solidity
// contracts/AccessControl.sol
pragma solidity ^0.8.19;

abstract contract AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(bytes32 => mapping(address => bool)) public hasRole;
    mapping(bytes32 => bytes32) public getRoleAdmin;
    
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    
    modifier onlyRole(bytes32 role) {
        require(hasRole[role][msg.sender], "AccessControl: access denied");
        _;
    }
    
    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    }
    
    function grantRole(bytes32 role, address account) external onlyRole(getRoleAdmin[role]) {
        _grantRole(role, account);
    }
    
    function revokeRole(bytes32 role, address account) external onlyRole(getRoleAdmin[role]) {
        _revokeRole(role, account);
    }
    
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole[role][account]) {
            hasRole[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole[role][account]) {
            hasRole[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
    
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        getRoleAdmin[role] = adminRole;
    }
}
```

## Frontend Integration

### React DeFi Dashboard

```jsx
// src/components/DeFiDashboard.js
import React, { useState, useEffect } from 'react';
import { NockchainClient } from '@nockchain/sdk';

const DeFiDashboard = () => {
  const [client, setClient] = useState(null);
  const [userBalance, setUserBalance] = useState('0');
  const [poolData, setPoolData] = useState([]);
  const [userPositions, setUserPositions] = useState([]);
  
  useEffect(() => {
    const initClient = async () => {
      const nockchainClient = new NockchainClient({
        apiKey: process.env.REACT_APP_NOCKCHAIN_API_KEY,
        network: 'mainnet'
      });
      setClient(nockchainClient);
      
      // Load user data
      await loadUserData(nockchainClient);
      await loadPoolData(nockchainClient);
    };
    
    initClient();
  }, []);
  
  const loadUserData = async (client) => {
    const balance = await client.accounts.getBalance(userAddress);
    setUserBalance(balance.balance);
    
    const positions = await client.dex.getUserPositions(userAddress);
    setUserPositions(positions);
  };
  
  const loadPoolData = async (client) => {
    const pools = await client.dex.getLiquidityPools({
      sort: 'tvl',
      limit: 10
    });
    setPoolData(pools.pools);
  };
  
  const handleAddLiquidity = async (poolId, amountA, amountB) => {
    try {
      const tx = await client.dex.addLiquidity({
        poolId,
        tokenAAmount: amountA,
        tokenBAmount: amountB,
        minTokenAAmount: amountA * 0.95, // 5% slippage
        minTokenBAmount: amountB * 0.95,
        userAddress: userAddress
      });
      
      console.log('Liquidity added:', tx.transactionHash);
      await loadUserData(client);
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };
  
  const handleSwap = async (inputToken, outputToken, amount) => {
    try {
      const quote = await client.dex.getQuote({
        inputToken,
        outputToken,
        amount,
        slippage: 0.01
      });
      
      const tx = await client.dex.swap({
        inputToken,
        outputToken,
        inputAmount: amount,
        minOutputAmount: quote.bestRoute.outputAmount,
        slippage: 0.01,
        userAddress: userAddress
      });
      
      console.log('Swap executed:', tx.transactionHash);
      await loadUserData(client);
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };
  
  return (
    <div className="defi-dashboard">
      <h1>DeFi Dashboard</h1>
      
      <div className="user-info">
        <h2>Your Balance: {userBalance} NOCK</h2>
        <h3>Active Positions: {userPositions.length}</h3>
      </div>
      
      <div className="pools-section">
        <h2>Top Liquidity Pools</h2>
        <div className="pools-grid">
          {poolData.map(pool => (
            <div key={pool.id} className="pool-card">
              <h3>{pool.tokenA.symbol}/{pool.tokenB.symbol}</h3>
              <p>TVL: ${pool.tvl}</p>
              <p>APR: {pool.apr * 100}%</p>
              <button onClick={() => handleAddLiquidity(pool.id, '1000', '1000')}>
                Add Liquidity
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="swap-section">
        <h2>Token Swap</h2>
        <SwapInterface onSwap={handleSwap} />
      </div>
    </div>
  );
};

const SwapInterface = ({ onSwap }) => {
  const [inputToken, setInputToken] = useState('');
  const [outputToken, setOutputToken] = useState('');
  const [amount, setAmount] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSwap(inputToken, outputToken, amount);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Input token address"
        value={inputToken}
        onChange={(e) => setInputToken(e.target.value)}
      />
      <input
        type="text"
        placeholder="Output token address"
        value={outputToken}
        onChange={(e) => setOutputToken(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit">Swap</button>
    </form>
  );
};

export default DeFiDashboard;
```

## Testing DeFi Protocols

### Comprehensive Test Suite

```javascript
// test/DeFiProtocol.test.js
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployContract, getTestAccounts } from '../utils/testUtils';

describe('DeFi Protocol Integration', () => {
  let tokenA, tokenB, dexFactory, dexRouter, pool;
  let owner, user1, user2;
  
  beforeEach(async () => {
    [owner, user1, user2] = await getTestAccounts(3);
    
    // Deploy tokens
    tokenA = await deployContract('Token', ['Token A', 'TKNA', 18, 1000000]);
    tokenB = await deployContract('Token', ['Token B', 'TKNB', 18, 1000000]);
    
    // Deploy DEX contracts
    dexFactory = await deployContract('DEXFactory');
    dexRouter = await deployContract('DEXRouter', [dexFactory.address]);
    
    // Create pool
    await dexFactory.createPool(tokenA.address, tokenB.address);
    const poolAddress = await dexFactory.getPool(tokenA.address, tokenB.address);
    pool = await ethers.getContractAt('LiquidityPool', poolAddress);
    
    // Transfer tokens to users
    await tokenA.transfer(user1.address, ethers.utils.parseEther('10000'));
    await tokenB.transfer(user1.address, ethers.utils.parseEther('10000'));
    await tokenA.transfer(user2.address, ethers.utils.parseEther('10000'));
    await tokenB.transfer(user2.address, ethers.utils.parseEther('10000'));
  });
  
  describe('Liquidity provision', () => {
    it('should add liquidity successfully', async () => {
      const amountA = ethers.utils.parseEther('1000');
      const amountB = ethers.utils.parseEther('2000');
      
      // Approve tokens
      await tokenA.connect(user1).approve(dexRouter.address, amountA);
      await tokenB.connect(user1).approve(dexRouter.address, amountB);
      
      // Add liquidity
      await dexRouter.connect(user1).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        amountA.mul(95).div(100), // 5% slippage
        amountB.mul(95).div(100),
        user1.address,
        Math.floor(Date.now() / 1000) + 300
      );
      
      const liquidityBalance = await pool.balanceOf(user1.address);
      expect(liquidityBalance).to.be.gt(0);
    });
  });
  
  describe('Token swaps', () => {
    beforeEach(async () => {
      // Add initial liquidity
      const amountA = ethers.utils.parseEther('1000');
      const amountB = ethers.utils.parseEther('2000');
      
      await tokenA.connect(owner).approve(pool.address, amountA);
      await tokenB.connect(owner).approve(pool.address, amountB);
      await pool.connect(owner).addLiquidity(amountA, amountB);
    });
    
    it('should swap tokens with correct amounts', async () => {
      const swapAmount = ethers.utils.parseEther('100');
      
      // Approve and swap
      await tokenA.connect(user1).approve(dexRouter.address, swapAmount);
      
      const balanceBefore = await tokenB.balanceOf(user1.address);
      
      await dexRouter.connect(user1).swapExactTokensForTokens(
        swapAmount,
        0,
        [tokenA.address, tokenB.address],
        user1.address,
        Math.floor(Date.now() / 1000) + 300
      );
      
      const balanceAfter = await tokenB.balanceOf(user1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });
});
```

## Deployment and Monitoring

### Deployment Script

```javascript
// scripts/deploy.js
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('Deploying DeFi Protocol with account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());
  
  // Deploy tokens
  const Token = await ethers.getContractFactory('Token');
  const tokenA = await Token.deploy('Nock Token', 'NOCK', 18, 1000000);
  const tokenB = await Token.deploy('USD Coin', 'USDC', 6, 1000000);
  
  console.log('Token A deployed to:', tokenA.address);
  console.log('Token B deployed to:', tokenB.address);
  
  // Deploy DEX factory
  const DEXFactory = await ethers.getContractFactory('DEXFactory');
  const dexFactory = await DEXFactory.deploy();
  
  console.log('DEX Factory deployed to:', dexFactory.address);
  
  // Deploy DEX router
  const DEXRouter = await ethers.getContractFactory('DEXRouter');
  const dexRouter = await DEXRouter.deploy(dexFactory.address);
  
  console.log('DEX Router deployed to:', dexRouter.address);
  
  // Deploy lending pool
  const LendingPool = await ethers.getContractFactory('LendingPool');
  const lendingPool = await LendingPool.deploy(tokenA.address, tokenB.address);
  
  console.log('Lending Pool deployed to:', lendingPool.address);
  
  // Deploy yield farm
  const YieldFarm = await ethers.getContractFactory('YieldFarm');
  const yieldFarm = await YieldFarm.deploy(tokenA.address, tokenB.address);
  
  console.log('Yield Farm deployed to:', yieldFarm.address);
  
  // Deploy governance token
  const GovernanceToken = await ethers.getContractFactory('GovernanceToken');
  const governanceToken = await GovernanceToken.deploy(ethers.utils.parseEther('1000000'));
  
  console.log('Governance Token deployed to:', governanceToken.address);
  
  // Deploy DAO
  const DAO = await ethers.getContractFactory('DAO');
  const dao = await DAO.deploy(governanceToken.address);
  
  console.log('DAO deployed to:', dao.address);
  
  // Create initial pool
  await dexFactory.createPool(tokenA.address, tokenB.address);
  const poolAddress = await dexFactory.getPool(tokenA.address, tokenB.address);
  
  console.log('Liquidity Pool created at:', poolAddress);
  
  // Save deployment info
  const deploymentInfo = {
    tokenA: tokenA.address,
    tokenB: tokenB.address,
    dexFactory: dexFactory.address,
    dexRouter: dexRouter.address,
    lendingPool: lendingPool.address,
    yieldFarm: yieldFarm.address,
    governanceToken: governanceToken.address,
    dao: dao.address,
    liquidityPool: poolAddress
  };
  
  const fs = require('fs');
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  
  console.log('Deployment complete! Contract addresses saved to deployment.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Next Steps

Congratulations! You've learned how to build comprehensive DeFi protocols on Nockchain. Here are some next steps:

1. **Explore Advanced Features**:
   - [Cross-Chain DeFi](./cross-chain-defi.md)
   - [Options and Derivatives](./derivatives.md)
   - [Insurance Protocols](./insurance.md)

2. **Optimize and Scale**:
   - [Gas Optimization](./gas-optimization.md)
   - [Performance Tuning](./performance-tuning.md)
   - [Security Auditing](./security-auditing.md)

3. **Connect with the Community**:
   - [Join our Discord](https://discord.gg/nockchain-dev)
   - [DeFi Developer Forums](https://forum.nockchain.com/defi)
   - [Open Source Contributions](https://github.com/nockchain/defi-protocols)

4. **Launch Your Protocol**:
   - [Mainnet Deployment Guide](./mainnet-deployment.md)
   - [Security Best Practices](./security-checklist.md)
   - [Community Building](./community-building.md)

Happy building! 🚀