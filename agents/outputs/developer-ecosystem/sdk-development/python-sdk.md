# Nockchain Python SDK

## Overview

The official Nockchain Python SDK provides a comprehensive, pythonic interface to interact with the Nockchain blockchain. Built with modern Python practices, type hints, and async/await support.

## Installation

```bash
pip install nockchain-sdk
# or
pipenv install nockchain-sdk
# or
poetry add nockchain-sdk
```

## Requirements

- Python 3.8+
- aiohttp
- pydantic
- websockets

## Quick Start

```python
from nockchain import NockchainClient
import asyncio

async def main():
    # Initialize client
    client = NockchainClient(
        api_key='YOUR_API_KEY',
        network='mainnet',  # or 'testnet', 'devnet'
        endpoint='https://api.nockchain.com'  # Optional: custom endpoint
    )
    
    # Get blockchain status
    status = await client.blockchain.get_status()
    print(f"Current block height: {status.latest_block.height}")
    
    # Clean up
    await client.close()

# Run the async function
asyncio.run(main())
```

## Client Configuration

```python
from nockchain import NockchainClient, NockchainConfig

# Using configuration object
config = NockchainConfig(
    api_key='YOUR_API_KEY',
    network='mainnet',
    timeout=30.0,  # 30 seconds
    retries=3,
    retry_delay=1.0,  # 1 second
    max_concurrent_requests=10
)

client = NockchainClient(config)

# Using environment variables
import os
client = NockchainClient(
    api_key=os.getenv('NOCKCHAIN_API_KEY'),
    network=os.getenv('NOCKCHAIN_NETWORK', 'mainnet')
)
```

## Context Manager Support

```python
from nockchain import NockchainClient

async def main():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        status = await client.blockchain.get_status()
        print(f"Block height: {status.latest_block.height}")
    # Client automatically closed
```

## Core Modules

### Blockchain Module

```python
from nockchain import NockchainClient

async def blockchain_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Get blockchain status
        status = await client.blockchain.get_status()
        print(f"Network: {status.network}")
        print(f"Latest block: {status.latest_block.height}")
        
        # Get block by height
        block = await client.blockchain.get_block(1234567)
        print(f"Block hash: {block.hash}")
        print(f"Transactions: {len(block.transactions)}")
        
        # Get latest block
        latest_block = await client.blockchain.get_latest_block()
        
        # Get block range
        blocks = await client.blockchain.get_block_range(1234567, 1234577)
        print(f"Retrieved {len(blocks.blocks)} blocks")
        
        # Get validators
        validators = await client.blockchain.get_validators()
        print(f"Total validators: {validators.total_validators}")
        
        # Get network peers
        peers = await client.blockchain.get_peers()
        print(f"Connected peers: {len(peers.peers)}")
```

### Transaction Module

```python
from nockchain import NockchainClient
from nockchain.types import TransactionRequest

async def transaction_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Send transaction
        tx_request = TransactionRequest(
            from_address='nock1abc...',
            to_address='nock1def...',
            value='1000000000000000000',  # 1 NOCK
            gas_price='standard'
        )
        
        tx = await client.transactions.send(tx_request)
        print(f"Transaction sent: {tx.transaction_hash}")
        
        # Get transaction
        transaction = await client.transactions.get('0xabcd...')
        print(f"Status: {transaction.status}")
        print(f"Block height: {transaction.block_height}")
        
        # Get transaction status
        status = await client.transactions.get_status('0xabcd...')
        print(f"Confirmations: {status.confirmations}")
        
        # Estimate gas
        gas_estimate = await client.transactions.estimate_gas(
            from_address='nock1abc...',
            to_address='nock1def...',
            value='1000000000000000000'
        )
        print(f"Recommended gas: {gas_estimate.gas_estimate.recommended}")
        
        # Send batch transactions
        batch_request = [
            TransactionRequest(
                from_address='nock1abc...',
                to_address='nock1def...',
                value='1000000000000000000'
            ),
            TransactionRequest(
                from_address='nock1abc...',
                to_address='nock1ghi...',
                value='2000000000000000000'
            )
        ]
        
        batch = await client.transactions.send_batch(batch_request)
        print(f"Batch sent: {batch.batch_id}")
        
        # Wait for confirmation
        receipt = await client.transactions.wait_for_confirmation(
            tx.transaction_hash,
            confirmations=12,
            timeout=300  # 5 minutes
        )
        print(f"Transaction confirmed: {receipt.status}")
        
        # Simulate transaction
        simulation = await client.transactions.simulate(
            from_address='nock1abc...',
            to_address='nock1def...',
            value='1000000000000000000',
            data='0x...'
        )
        print(f"Simulation success: {simulation.success}")
```

### Account Module

```python
from nockchain import NockchainClient

async def account_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Get account information
        account = await client.accounts.get('nock1abc...')
        print(f"Balance: {account.balance}")
        print(f"Nonce: {account.nonce}")
        
        # Get account balance
        balance = await client.accounts.get_balance('nock1abc...')
        print(f"Balance: {balance.balance}")
        
        # Get account transactions
        transactions = await client.accounts.get_transactions(
            'nock1abc...',
            page=1,
            limit=10,
            type='all'  # 'sent', 'received', 'all'
        )
        print(f"Transaction count: {len(transactions.transactions)}")
        
        # Generate new account
        new_account = await client.accounts.generate()
        print(f"New address: {new_account.address}")
        print(f"Private key: {new_account.private_key}")
        
        # Import account from private key
        imported_account = await client.accounts.import_from_private_key('0x1234...')
        print(f"Imported address: {imported_account.address}")
```

### DEX Module

```python
from nockchain import NockchainClient
from nockchain.types import SwapRequest, LiquidityRequest

async def dex_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Get supported exchanges
        exchanges = await client.dex.get_exchanges()
        print(f"Supported exchanges: {len(exchanges.exchanges)}")
        
        # Get trading pairs
        pairs = await client.dex.get_pairs(
            exchange='nockswap',
            base_token='nock1token...'
        )
        print(f"Trading pairs: {len(pairs.pairs)}")
        
        # Get price quote
        quote = await client.dex.get_quote(
            input_token='nock1token...',
            output_token='nock1usdc...',
            amount='1000000000000000000',
            slippage=0.01
        )
        print(f"Best route: {quote.best_route.exchange}")
        print(f"Output amount: {quote.best_route.output_amount}")
        
        # Execute swap
        swap_request = SwapRequest(
            input_token='nock1token...',
            output_token='nock1usdc...',
            input_amount='1000000000000000000',
            min_output_amount='1200000000',
            slippage=0.01,
            user_address='nock1user...'
        )
        
        swap = await client.dex.swap(swap_request)
        print(f"Swap executed: {swap.transaction_hash}")
        
        # Get liquidity pools
        pools = await client.dex.get_liquidity_pools(
            exchange='nockswap',
            min_tvl='1000000000000000000000'
        )
        print(f"Liquidity pools: {len(pools.pools)}")
        
        # Add liquidity
        add_liquidity_request = LiquidityRequest(
            pool_id='nockswap_nock_usdc',
            token_a_amount='1000000000000000000',
            token_b_amount='1250000000',
            min_token_a_amount='950000000000000000',
            min_token_b_amount='1187500000',
            user_address='nock1user...'
        )
        
        add_liquidity = await client.dex.add_liquidity(add_liquidity_request)
        print(f"Liquidity added: {add_liquidity.transaction_hash}")
```

### Mining Module

```python
from nockchain import NockchainClient
from nockchain.types import MiningShareRequest

async def mining_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Get mining pools
        pools = await client.mining.get_pools()
        print(f"Mining pools: {len(pools.pools)}")
        
        # Get pool statistics
        stats = await client.mining.get_pool_stats('pool_id')
        print(f"Pool hash rate: {stats.hash_rate}")
        print(f"Active miners: {stats.active_miners}")
        
        # Get miner information
        miner = await client.mining.get_miner('nock1miner...')
        print(f"Miner hash rate: {miner.hash_rate}")
        print(f"Shares submitted: {miner.shares_submitted}")
        
        # Get mining rewards
        rewards = await client.mining.get_rewards(
            'nock1miner...',
            start_time='2024-01-01T00:00:00Z',
            end_time='2024-01-31T23:59:59Z'
        )
        print(f"Total rewards: {rewards.total_rewards}")
        
        # Submit mining share
        share_request = MiningShareRequest(
            pool_id='pool_id',
            miner_id='nock1miner...',
            nonce='0x123456789abcdef0',
            hash='0xabcd...',
            difficulty='0x1234567890abcdef'
        )
        
        share = await client.mining.submit_share(share_request)
        print(f"Share submitted: {share.accepted}")
```

### Bridge Module

```python
from nockchain import NockchainClient
from nockchain.types import BridgeTransferRequest

async def bridge_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Get supported chains
        chains = await client.bridge.get_supported_chains()
        print(f"Supported chains: {len(chains.chains)}")
        
        # Get bridge status
        status = await client.bridge.get_status()
        print(f"Bridge status: {status.status}")
        
        # Initiate bridge transfer
        transfer_request = BridgeTransferRequest(
            source_chain='nockchain',
            destination_chain='ethereum',
            token='nock1token...',
            amount='1000000000000000000',
            destination_address='0x1234...',
            user_address='nock1user...'
        )
        
        transfer = await client.bridge.transfer(transfer_request)
        print(f"Transfer initiated: {transfer.transfer_id}")
        
        # Get transfer status
        transfer_status = await client.bridge.get_transfer_status('transfer_id')
        print(f"Transfer status: {transfer_status.status}")
        
        # Get transfer history
        history = await client.bridge.get_transfer_history('nock1user...')
        print(f"Transfer history: {len(history.transfers)}")
```

## Type Hints and Data Models

The SDK provides comprehensive type hints using Pydantic models:

```python
from nockchain.types import (
    BlockchainStatus,
    Block,
    Transaction,
    Account,
    SwapQuote,
    LiquidityPool,
    MiningPool,
    BridgeTransfer
)

async def typed_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # All responses are fully typed
        status: BlockchainStatus = await client.blockchain.get_status()
        block: Block = await client.blockchain.get_block(1234567)
        transaction: Transaction = await client.transactions.get('0xabcd...')
        account: Account = await client.accounts.get('nock1abc...')
        quote: SwapQuote = await client.dex.get_quote(
            input_token='nock1token...',
            output_token='nock1usdc...',
            amount='1000000000000000000'
        )
```

## Error Handling

```python
from nockchain import NockchainClient
from nockchain.exceptions import (
    NockchainError,
    APIError,
    NetworkError,
    InsufficientBalanceError,
    InvalidNonceError,
    GasLimitExceededError
)

async def error_handling_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        try:
            transaction = await client.transactions.send(
                from_address='nock1abc...',
                to_address='nock1def...',
                value='1000000000000000000'
            )
        except APIError as e:
            print(f"API Error: {e.message}")
            print(f"Status Code: {e.status_code}")
            print(f"Error Code: {e.code}")
        except NetworkError as e:
            print(f"Network Error: {e.message}")
        except InsufficientBalanceError as e:
            print(f"Insufficient Balance: {e.message}")
        except InvalidNonceError as e:
            print(f"Invalid Nonce: {e.message}")
        except GasLimitExceededError as e:
            print(f"Gas Limit Exceeded: {e.message}")
        except NockchainError as e:
            print(f"Nockchain Error: {e.message}")

# Specific error handling with retry
async def send_transaction_with_retry(client, tx_data, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await client.transactions.send(tx_data)
        except (NetworkError, APIError) as e:
            if attempt == max_retries - 1:
                raise
            print(f"Attempt {attempt + 1} failed: {e.message}")
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

## WebSocket Support

```python
from nockchain import NockchainWebSocket
import asyncio

async def websocket_examples():
    ws = NockchainWebSocket(
        api_key='YOUR_API_KEY',
        endpoint='wss://api.nockchain.com/v1/ws'
    )
    
    # Subscribe to new blocks
    async def on_block(block):
        print(f"New block: {block.height}")
    
    await ws.subscribe('blocks', on_block)
    
    # Subscribe to transactions for specific address
    async def on_transaction(transaction):
        print(f"New transaction: {transaction.hash}")
    
    await ws.subscribe('transactions', on_transaction, 
                      filter={'address': 'nock1abc...'})
    
    # Subscribe to price updates
    async def on_price(price):
        print(f"Price update: {price.pair} - {price.price}")
    
    await ws.subscribe('dex_prices', on_price, 
                      filter={'pair': 'NOCK/USDC'})
    
    # Connect and listen
    await ws.connect()
    
    # Keep listening
    try:
        await ws.listen()
    except KeyboardInterrupt:
        await ws.disconnect()
```

## Advanced Features

### Pagination

```python
from nockchain import NockchainClient

async def pagination_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Manual pagination
        page = 1
        all_transactions = []
        
        while True:
            response = await client.accounts.get_transactions(
                'nock1abc...',
                page=page,
                limit=100
            )
            
            all_transactions.extend(response.transactions)
            
            if page >= response.pagination.total_pages:
                break
                
            page += 1
        
        print(f"Total transactions: {len(all_transactions)}")
        
        # Async iterator for automatic pagination
        async for transaction in client.accounts.iter_transactions('nock1abc...'):
            print(f"Transaction: {transaction.hash}")
```

### Retry Logic with Decorators

```python
from nockchain import NockchainClient
from nockchain.decorators import retry
import asyncio

class TradingBot:
    def __init__(self, api_key: str):
        self.client = NockchainClient(api_key=api_key)
    
    @retry(max_attempts=3, delay=1.0, backoff=2.0)
    async def get_quote_with_retry(self, input_token: str, output_token: str, amount: str):
        return await self.client.dex.get_quote(
            input_token=input_token,
            output_token=output_token,
            amount=amount
        )
    
    async def close(self):
        await self.client.close()
```

### Caching

```python
from nockchain import NockchainClient
from nockchain.cache import InMemoryCache, RedisCache

# In-memory cache
cache = InMemoryCache(ttl=60, max_size=1000)  # 1 minute TTL
client = NockchainClient(api_key='YOUR_API_KEY', cache=cache)

# Redis cache
redis_cache = RedisCache(
    host='localhost',
    port=6379,
    db=0,
    ttl=60
)
client = NockchainClient(api_key='YOUR_API_KEY', cache=redis_cache)

# Cached responses
async def cached_examples():
    async with client:
        status1 = await client.blockchain.get_status()  # API call
        status2 = await client.blockchain.get_status()  # Cached response
```

### Batch Operations

```python
from nockchain import NockchainClient

async def batch_examples():
    async with NockchainClient(api_key='YOUR_API_KEY') as client:
        # Batch multiple API calls
        batch = client.batch()
        
        batch.add('blockchain.get_status')
        batch.add('blockchain.get_latest_block')
        batch.add('accounts.get', 'nock1abc...')
        batch.add('dex.get_exchanges')
        
        results = await batch.execute()
        status, latest_block, account, exchanges = results
        
        print(f"Status: {status.status}")
        print(f"Latest block: {latest_block.height}")
        print(f"Account balance: {account.balance}")
        print(f"Exchanges: {len(exchanges.exchanges)}")
```

## Testing

```python
from nockchain import NockchainClient
from nockchain.testing import MockProvider
import pytest

@pytest.fixture
async def mock_client():
    mock_provider = MockProvider()
    mock_provider.mock_response('blockchain.get_status', {
        'status': 'healthy',
        'latest_block': {'height': 1234567}
    })
    
    client = NockchainClient(
        api_key='test-key',
        provider=mock_provider
    )
    
    yield client
    await client.close()

async def test_blockchain_status(mock_client):
    status = await mock_client.blockchain.get_status()
    assert status.status == 'healthy'
    assert status.latest_block.height == 1234567
```

## Django Integration

```python
# settings.py
NOCKCHAIN_API_KEY = 'YOUR_API_KEY'
NOCKCHAIN_NETWORK = 'mainnet'

# apps.py
from django.apps import AppConfig
from nockchain import NockchainClient

class MyAppConfig(AppConfig):
    name = 'myapp'
    
    def ready(self):
        from django.conf import settings
        self.nockchain_client = NockchainClient(
            api_key=settings.NOCKCHAIN_API_KEY,
            network=settings.NOCKCHAIN_NETWORK
        )

# views.py
from django.apps import apps
from django.http import JsonResponse
import asyncio

def get_blockchain_status(request):
    client = apps.get_app_config('myapp').nockchain_client
    
    async def _get_status():
        return await client.blockchain.get_status()
    
    status = asyncio.run(_get_status())
    return JsonResponse({
        'status': status.status,
        'block_height': status.latest_block.height
    })
```

## Flask Integration

```python
from flask import Flask, jsonify
from nockchain import NockchainClient
import asyncio

app = Flask(__name__)
client = NockchainClient(api_key='YOUR_API_KEY')

@app.route('/status')
def get_status():
    async def _get_status():
        return await client.blockchain.get_status()
    
    status = asyncio.run(_get_status())
    return jsonify({
        'status': status.status,
        'block_height': status.latest_block.height
    })

@app.teardown_appcontext
def close_client(error):
    asyncio.run(client.close())
```

## FastAPI Integration

```python
from fastapi import FastAPI
from nockchain import NockchainClient
from nockchain.types import BlockchainStatus

app = FastAPI()
client = NockchainClient(api_key='YOUR_API_KEY')

@app.get("/status", response_model=BlockchainStatus)
async def get_status():
    return await client.blockchain.get_status()

@app.get("/balance/{address}")
async def get_balance(address: str):
    balance = await client.accounts.get_balance(address)
    return {"address": address, "balance": balance.balance}

@app.on_event("shutdown")
async def shutdown_event():
    await client.close()
```

## Best Practices

### Connection Management

```python
from nockchain import NockchainClient
import asyncio

class NockchainService:
    _instance = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def get_client(self):
        if self._client is None:
            self._client = NockchainClient(api_key='YOUR_API_KEY')
        return self._client
    
    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None

# Usage
service = NockchainService()
client = await service.get_client()
```

### Logging

```python
import logging
from nockchain import NockchainClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable SDK logging
client = NockchainClient(
    api_key='YOUR_API_KEY',
    debug=True,
    logger=logger
)
```

## Performance Tips

1. **Use async/await**: Take advantage of asynchronous operations
2. **Connection pooling**: Reuse client instances
3. **Batch operations**: Group multiple API calls
4. **Caching**: Cache frequently accessed data
5. **Pagination**: Use async iterators for large datasets

## Examples

### DeFi Trading Bot

```python
from nockchain import NockchainClient
from nockchain.types import SwapRequest
import asyncio

class DeFiTradingBot:
    def __init__(self, api_key: str):
        self.client = NockchainClient(api_key=api_key)
    
    async def find_arbitrage_opportunities(self):
        opportunities = await self.client.dex.get_arbitrage_opportunities()
        
        for opportunity in opportunities.opportunities:
            if opportunity.profit_percentage > 0.02:  # 2% profit threshold
                await self.execute_arbitrage(opportunity)
    
    async def execute_arbitrage(self, opportunity):
        # Buy on cheaper exchange
        buy_request = SwapRequest(
            input_token=opportunity.quote_token,
            output_token=opportunity.base_token,
            input_amount=opportunity.required_capital,
            exchange=opportunity.buy_exchange,
            user_address='nock1trader...'
        )
        
        buy_tx = await self.client.dex.swap(buy_request)
        
        # Wait for confirmation
        await self.client.transactions.wait_for_confirmation(buy_tx.transaction_hash)
        
        # Sell on more expensive exchange
        sell_request = SwapRequest(
            input_token=opportunity.base_token,
            output_token=opportunity.quote_token,
            input_amount=opportunity.required_capital,
            exchange=opportunity.sell_exchange,
            user_address='nock1trader...'
        )
        
        sell_tx = await self.client.dex.swap(sell_request)
        
        print(f"Arbitrage executed: {opportunity.profit_amount} profit")
    
    async def close(self):
        await self.client.close()

# Usage
async def main():
    bot = DeFiTradingBot('YOUR_API_KEY')
    try:
        await bot.find_arbitrage_opportunities()
    finally:
        await bot.close()

asyncio.run(main())
```

### Portfolio Tracker

```python
from nockchain import NockchainClient
from dataclasses import dataclass
from typing import List
import asyncio

@dataclass
class TokenHolding:
    symbol: str
    address: str
    balance: str
    value: str
    price: str

class PortfolioTracker:
    def __init__(self, api_key: str):
        self.client = NockchainClient(api_key=api_key)
    
    async def get_portfolio(self, wallet_address: str) -> List[TokenHolding]:
        portfolio = await self.client.dex.get_portfolio(wallet_address)
        
        holdings = []
        for token in portfolio.tokens:
            holdings.append(TokenHolding(
                symbol=token.symbol,
                address=token.address,
                balance=token.balance,
                value=token.value,
                price=token.price
            ))
        
        return holdings
    
    async def track_portfolio_changes(self, wallet_address: str):
        ws = self.client.websocket()
        
        async def on_balance_change(event):
            if event.address == wallet_address:
                portfolio = await self.get_portfolio(wallet_address)
                total_value = sum(float(holding.value) for holding in portfolio)
                print(f"Portfolio value: ${total_value:.2f}")
        
        await ws.subscribe('balance_changes', on_balance_change)
        await ws.connect()
        await ws.listen()
    
    async def close(self):
        await self.client.close()

# Usage
async def main():
    tracker = PortfolioTracker('YOUR_API_KEY')
    try:
        holdings = await tracker.get_portfolio('nock1wallet...')
        for holding in holdings:
            print(f"{holding.symbol}: {holding.balance} (${holding.value})")
    finally:
        await tracker.close()

asyncio.run(main())
```

## Next Steps

- Read the [API Documentation](../api-documentation/)
- Check out more [Python Examples](./examples/python/)
- Join the [Developer Community](https://discord.gg/nockchain-dev)
- Contribute to the [SDK on GitHub](https://github.com/nockchain/python-sdk)