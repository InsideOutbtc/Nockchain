# Nockchain Rust SDK

## Overview

The official Nockchain Rust SDK provides a high-performance, memory-safe interface to interact with the Nockchain blockchain. Built with modern Rust practices, comprehensive error handling, and async/await support using tokio.

## Installation

Add this to your `Cargo.toml`:

```toml
[dependencies]
nockchain-sdk = "1.0"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

## Quick Start

```rust
use nockchain_sdk::{NockchainClient, NockchainConfig};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let client = NockchainClient::new(NockchainConfig {
        api_key: "YOUR_API_KEY".to_string(),
        network: "mainnet".to_string(),
        endpoint: Some("https://api.nockchain.com".to_string()),
        ..Default::default()
    });
    
    // Get blockchain status
    let status = client.blockchain().get_status().await?;
    println!("Current block height: {}", status.latest_block.height);
    
    Ok(())
}
```

## Client Configuration

```rust
use nockchain_sdk::{NockchainClient, NockchainConfig};
use std::time::Duration;

let config = NockchainConfig {
    api_key: "YOUR_API_KEY".to_string(),
    network: "mainnet".to_string(),
    endpoint: Some("https://api.nockchain.com".to_string()),
    timeout: Duration::from_secs(30),
    retries: 3,
    retry_delay: Duration::from_secs(1),
    max_concurrent_requests: 10,
};

let client = NockchainClient::new(config);

// Using environment variables
let client = NockchainClient::from_env()?;
```

## Error Handling

```rust
use nockchain_sdk::{NockchainClient, NockchainError, ApiError, NetworkError};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    
    match client.blockchain().get_status().await {
        Ok(status) => println!("Block height: {}", status.latest_block.height),
        Err(NockchainError::Api(ApiError { status_code, code, message })) => {
            eprintln!("API Error {}: {} - {}", status_code, code, message);
        }
        Err(NockchainError::Network(NetworkError { message })) => {
            eprintln!("Network Error: {}", message);
        }
        Err(e) => eprintln!("Unknown error: {}", e),
    }
    
    Ok(())
}
```

## Core Modules

### Blockchain Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let blockchain = client.blockchain();
    
    // Get blockchain status
    let status = blockchain.get_status().await?;
    println!("Network: {}", status.network);
    println!("Latest block: {}", status.latest_block.height);
    
    // Get block by height
    let block = blockchain.get_block(1234567).await?;
    println!("Block hash: {}", block.hash);
    println!("Transactions: {}", block.transactions.len());
    
    // Get latest block
    let latest_block = blockchain.get_latest_block().await?;
    println!("Latest block hash: {}", latest_block.hash);
    
    // Get block range
    let blocks = blockchain.get_block_range(1234567, 1234577).await?;
    println!("Retrieved {} blocks", blocks.blocks.len());
    
    // Get validators
    let validators = blockchain.get_validators().await?;
    println!("Total validators: {}", validators.total_validators);
    
    // Get network peers
    let peers = blockchain.get_peers().await?;
    println!("Connected peers: {}", peers.peers.len());
    
    Ok(())
}
```

### Transaction Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let transactions = client.transactions();
    
    // Send transaction
    let tx_request = TransactionRequest {
        from: "nock1abc...".to_string(),
        to: "nock1def...".to_string(),
        value: "1000000000000000000".to_string(), // 1 NOCK
        gas_price: Some("standard".to_string()),
        ..Default::default()
    };
    
    let tx = transactions.send(tx_request).await?;
    println!("Transaction sent: {}", tx.transaction_hash);
    
    // Get transaction
    let transaction = transactions.get("0xabcd...").await?;
    println!("Status: {}", transaction.status);
    println!("Block height: {}", transaction.block_height);
    
    // Get transaction status
    let status = transactions.get_status("0xabcd...").await?;
    println!("Confirmations: {}", status.confirmations);
    
    // Estimate gas
    let gas_estimate = transactions.estimate_gas(GasEstimateRequest {
        from: "nock1abc...".to_string(),
        to: "nock1def...".to_string(),
        value: Some("1000000000000000000".to_string()),
        data: None,
    }).await?;
    println!("Recommended gas: {}", gas_estimate.gas_estimate.recommended);
    
    // Send batch transactions
    let batch_request = vec![
        TransactionRequest {
            from: "nock1abc...".to_string(),
            to: "nock1def...".to_string(),
            value: "1000000000000000000".to_string(),
            ..Default::default()
        },
        TransactionRequest {
            from: "nock1abc...".to_string(),
            to: "nock1ghi...".to_string(),
            value: "2000000000000000000".to_string(),
            ..Default::default()
        }
    ];
    
    let batch = transactions.send_batch(batch_request).await?;
    println!("Batch sent: {}", batch.batch_id);
    
    // Wait for confirmation
    let receipt = transactions.wait_for_confirmation(
        &tx.transaction_hash,
        WaitOptions {
            confirmations: 12,
            timeout: std::time::Duration::from_secs(300),
        }
    ).await?;
    println!("Transaction confirmed: {}", receipt.status);
    
    // Simulate transaction
    let simulation = transactions.simulate(SimulateRequest {
        from: "nock1abc...".to_string(),
        to: "nock1def...".to_string(),
        value: Some("1000000000000000000".to_string()),
        data: Some("0x...".to_string()),
    }).await?;
    println!("Simulation success: {}", simulation.success);
    
    Ok(())
}
```

### Account Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let accounts = client.accounts();
    
    // Get account information
    let account = accounts.get("nock1abc...").await?;
    println!("Balance: {}", account.balance);
    println!("Nonce: {}", account.nonce);
    
    // Get account balance
    let balance = accounts.get_balance("nock1abc...").await?;
    println!("Balance: {}", balance.balance);
    
    // Get account transactions
    let transactions = accounts.get_transactions(
        "nock1abc...",
        GetTransactionsRequest {
            page: Some(1),
            limit: Some(10),
            tx_type: Some(TransactionType::All),
        }
    ).await?;
    println!("Transaction count: {}", transactions.transactions.len());
    
    // Generate new account
    let new_account = accounts.generate().await?;
    println!("New address: {}", new_account.address);
    println!("Private key: {}", new_account.private_key);
    
    // Import account from private key
    let imported_account = accounts.import_from_private_key("0x1234...").await?;
    println!("Imported address: {}", imported_account.address);
    
    Ok(())
}
```

### DEX Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let dex = client.dex();
    
    // Get supported exchanges
    let exchanges = dex.get_exchanges().await?;
    println!("Supported exchanges: {}", exchanges.exchanges.len());
    
    // Get trading pairs
    let pairs = dex.get_pairs(GetPairsRequest {
        exchange: Some("nockswap".to_string()),
        base_token: Some("nock1token...".to_string()),
        ..Default::default()
    }).await?;
    println!("Trading pairs: {}", pairs.pairs.len());
    
    // Get price quote
    let quote = dex.get_quote(QuoteRequest {
        input_token: "nock1token...".to_string(),
        output_token: "nock1usdc...".to_string(),
        amount: "1000000000000000000".to_string(),
        slippage: Some(0.01),
        ..Default::default()
    }).await?;
    println!("Best route: {}", quote.best_route.exchange);
    println!("Output amount: {}", quote.best_route.output_amount);
    
    // Execute swap
    let swap_request = SwapRequest {
        input_token: "nock1token...".to_string(),
        output_token: "nock1usdc...".to_string(),
        input_amount: "1000000000000000000".to_string(),
        min_output_amount: "1200000000".to_string(),
        slippage: 0.01,
        user_address: "nock1user...".to_string(),
        ..Default::default()
    };
    
    let swap = dex.swap(swap_request).await?;
    println!("Swap executed: {}", swap.transaction_hash);
    
    // Get liquidity pools
    let pools = dex.get_liquidity_pools(GetPoolsRequest {
        exchange: Some("nockswap".to_string()),
        min_tvl: Some("1000000000000000000000".to_string()),
        ..Default::default()
    }).await?;
    println!("Liquidity pools: {}", pools.pools.len());
    
    // Add liquidity
    let add_liquidity_request = AddLiquidityRequest {
        pool_id: "nockswap_nock_usdc".to_string(),
        token_a_amount: "1000000000000000000".to_string(),
        token_b_amount: "1250000000".to_string(),
        min_token_a_amount: "950000000000000000".to_string(),
        min_token_b_amount: "1187500000".to_string(),
        user_address: "nock1user...".to_string(),
        ..Default::default()
    };
    
    let add_liquidity = dex.add_liquidity(add_liquidity_request).await?;
    println!("Liquidity added: {}", add_liquidity.transaction_hash);
    
    Ok(())
}
```

### Mining Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let mining = client.mining();
    
    // Get mining pools
    let pools = mining.get_pools().await?;
    println!("Mining pools: {}", pools.pools.len());
    
    // Get pool statistics
    let stats = mining.get_pool_stats("pool_id").await?;
    println!("Pool hash rate: {}", stats.hash_rate);
    println!("Active miners: {}", stats.active_miners);
    
    // Get miner information
    let miner = mining.get_miner("nock1miner...").await?;
    println!("Miner hash rate: {}", miner.hash_rate);
    println!("Shares submitted: {}", miner.shares_submitted);
    
    // Get mining rewards
    let rewards = mining.get_rewards(GetRewardsRequest {
        miner_address: "nock1miner...".to_string(),
        start_time: Some("2024-01-01T00:00:00Z".to_string()),
        end_time: Some("2024-01-31T23:59:59Z".to_string()),
    }).await?;
    println!("Total rewards: {}", rewards.total_rewards);
    
    // Submit mining share
    let share_request = SubmitShareRequest {
        pool_id: "pool_id".to_string(),
        miner_id: "nock1miner...".to_string(),
        nonce: "0x123456789abcdef0".to_string(),
        hash: "0xabcd...".to_string(),
        difficulty: "0x1234567890abcdef".to_string(),
    };
    
    let share = mining.submit_share(share_request).await?;
    println!("Share submitted: {}", share.accepted);
    
    Ok(())
}
```

### Bridge Module

```rust
use nockchain_sdk::{NockchainClient, types::*};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let bridge = client.bridge();
    
    // Get supported chains
    let chains = bridge.get_supported_chains().await?;
    println!("Supported chains: {}", chains.chains.len());
    
    // Get bridge status
    let status = bridge.get_status().await?;
    println!("Bridge status: {}", status.status);
    
    // Initiate bridge transfer
    let transfer_request = BridgeTransferRequest {
        source_chain: "nockchain".to_string(),
        destination_chain: "ethereum".to_string(),
        token: "nock1token...".to_string(),
        amount: "1000000000000000000".to_string(),
        destination_address: "0x1234...".to_string(),
        user_address: "nock1user...".to_string(),
    };
    
    let transfer = bridge.transfer(transfer_request).await?;
    println!("Transfer initiated: {}", transfer.transfer_id);
    
    // Get transfer status
    let transfer_status = bridge.get_transfer_status("transfer_id").await?;
    println!("Transfer status: {}", transfer_status.status);
    
    // Get transfer history
    let history = bridge.get_transfer_history("nock1user...").await?;
    println!("Transfer history: {}", history.transfers.len());
    
    Ok(())
}
```

## Type System

The SDK uses comprehensive type definitions with serde serialization:

```rust
use nockchain_sdk::types::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomRequest {
    pub address: String,
    pub amount: String,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    
    // All responses are strongly typed
    let status: BlockchainStatus = client.blockchain().get_status().await?;
    let block: Block = client.blockchain().get_block(1234567).await?;
    let transaction: Transaction = client.transactions().get("0xabcd...").await?;
    let account: Account = client.accounts().get("nock1abc...").await?;
    
    Ok(())
}
```

## Advanced Error Handling

```rust
use nockchain_sdk::{NockchainClient, NockchainError, ApiError};
use thiserror::Error;

#[derive(Error, Debug)]
enum AppError {
    #[error("Nockchain API error: {0}")]
    NockchainApi(#[from] NockchainError),
    #[error("Invalid address format")]
    InvalidAddress,
    #[error("Insufficient funds")]
    InsufficientFunds,
}

async fn send_transaction_with_retry(
    client: &NockchainClient,
    request: TransactionRequest,
    max_retries: u32,
) -> Result<Transaction, AppError> {
    let mut retries = 0;
    let mut delay = std::time::Duration::from_secs(1);
    
    loop {
        match client.transactions().send(request.clone()).await {
            Ok(tx) => return Ok(tx),
            Err(NockchainError::Api(ApiError { code, .. })) if code == "NONCE_TOO_LOW" => {
                // Update nonce and retry
                let account = client.accounts().get(&request.from).await?;
                let mut updated_request = request.clone();
                updated_request.nonce = Some(account.nonce + 1);
                return send_transaction_with_retry(client, updated_request, max_retries).await;
            }
            Err(e) if retries < max_retries => {
                retries += 1;
                tokio::time::sleep(delay).await;
                delay *= 2; // Exponential backoff
            }
            Err(e) => return Err(e.into()),
        }
    }
}
```

## WebSocket Support

```rust
use nockchain_sdk::{NockchainWebSocket, WebSocketEvent};
use futures_util::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut ws = NockchainWebSocket::new("YOUR_API_KEY", "wss://api.nockchain.com/v1/ws");
    
    // Subscribe to new blocks
    ws.subscribe("blocks", None).await?;
    
    // Subscribe to transactions for specific address
    let filter = serde_json::json!({ "address": "nock1abc..." });
    ws.subscribe("transactions", Some(filter)).await?;
    
    // Subscribe to price updates
    let price_filter = serde_json::json!({ "pair": "NOCK/USDC" });
    ws.subscribe("dex_prices", Some(price_filter)).await?;
    
    // Listen for events
    while let Some(event) = ws.next().await {
        match event? {
            WebSocketEvent::Block(block) => {
                println!("New block: {}", block.height);
            }
            WebSocketEvent::Transaction(tx) => {
                println!("New transaction: {}", tx.hash);
            }
            WebSocketEvent::Price(price) => {
                println!("Price update: {} - {}", price.pair, price.price);
            }
            WebSocketEvent::Error(error) => {
                eprintln!("WebSocket error: {}", error);
            }
        }
    }
    
    Ok(())
}
```

## Advanced Features

### Pagination with Streams

```rust
use nockchain_sdk::{NockchainClient, types::*};
use futures_util::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    
    // Stream all transactions for an address
    let mut transaction_stream = client.accounts().transaction_stream(
        "nock1abc...",
        GetTransactionsRequest {
            limit: Some(100),
            ..Default::default()
        }
    );
    
    while let Some(transaction) = transaction_stream.next().await {
        let transaction = transaction?;
        println!("Transaction: {}", transaction.hash);
    }
    
    Ok(())
}
```

### Connection Pool

```rust
use nockchain_sdk::{NockchainClient, ConnectionPool};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = Arc::new(ConnectionPool::new(
        "YOUR_API_KEY",
        10, // Max connections
    ));
    
    // Use pool in multiple tasks
    let tasks = (0..20).map(|i| {
        let pool = pool.clone();
        tokio::spawn(async move {
            let client = pool.get_client().await?;
            let status = client.blockchain().get_status().await?;
            println!("Task {}: Block height {}", i, status.latest_block.height);
            Ok::<_, nockchain_sdk::NockchainError>(())
        })
    });
    
    // Wait for all tasks to complete
    futures_util::future::try_join_all(tasks).await?;
    
    Ok(())
}
```

### Retry with Exponential Backoff

```rust
use nockchain_sdk::{NockchainClient, NockchainError};
use std::time::Duration;

async fn retry_with_backoff<F, T, E>(
    mut operation: F,
    max_retries: u32,
    initial_delay: Duration,
) -> Result<T, E>
where
    F: FnMut() -> Result<T, E>,
    E: std::fmt::Debug,
{
    let mut delay = initial_delay;
    
    for attempt in 0..=max_retries {
        match operation() {
            Ok(result) => return Ok(result),
            Err(e) if attempt == max_retries => return Err(e),
            Err(e) => {
                println!("Attempt {} failed: {:?}", attempt + 1, e);
                tokio::time::sleep(delay).await;
                delay = std::cmp::min(delay * 2, Duration::from_secs(60));
            }
        }
    }
    
    unreachable!()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    
    let status = retry_with_backoff(
        || client.blockchain().get_status(),
        3,
        Duration::from_secs(1),
    ).await?;
    
    println!("Block height: {}", status.latest_block.height);
    
    Ok(())
}
```

### Caching with TTL

```rust
use nockchain_sdk::{NockchainClient, types::*};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone)]
struct CachedValue<T> {
    value: T,
    expires_at: Instant,
}

#[derive(Clone)]
struct Cache<T> {
    data: Arc<Mutex<HashMap<String, CachedValue<T>>>>,
    ttl: Duration,
}

impl<T: Clone> Cache<T> {
    fn new(ttl: Duration) -> Self {
        Self {
            data: Arc::new(Mutex::new(HashMap::new())),
            ttl,
        }
    }
    
    fn get(&self, key: &str) -> Option<T> {
        let mut data = self.data.lock().unwrap();
        if let Some(cached) = data.get(key) {
            if cached.expires_at > Instant::now() {
                return Some(cached.value.clone());
            } else {
                data.remove(key);
            }
        }
        None
    }
    
    fn set(&self, key: String, value: T) {
        let mut data = self.data.lock().unwrap();
        data.insert(key, CachedValue {
            value,
            expires_at: Instant::now() + self.ttl,
        });
    }
}

struct CachedClient {
    client: NockchainClient,
    status_cache: Cache<BlockchainStatus>,
}

impl CachedClient {
    fn new(client: NockchainClient) -> Self {
        Self {
            client,
            status_cache: Cache::new(Duration::from_secs(60)),
        }
    }
    
    async fn get_status(&self) -> Result<BlockchainStatus, NockchainError> {
        let cache_key = "blockchain_status";
        
        if let Some(cached_status) = self.status_cache.get(cache_key) {
            return Ok(cached_status);
        }
        
        let status = self.client.blockchain().get_status().await?;
        self.status_cache.set(cache_key.to_string(), status.clone());
        
        Ok(status)
    }
}
```

## Testing

```rust
use nockchain_sdk::{NockchainClient, MockProvider};
use serde_json::json;

#[tokio::test]
async fn test_blockchain_status() {
    let mut mock_provider = MockProvider::new();
    mock_provider.mock_response(
        "blockchain.get_status",
        json!({
            "status": "healthy",
            "latest_block": {
                "height": 1234567,
                "hash": "0x1234...",
                "timestamp": "2024-01-15T12:00:00Z"
            }
        })
    );
    
    let client = NockchainClient::with_provider(mock_provider);
    let status = client.blockchain().get_status().await.unwrap();
    
    assert_eq!(status.status, "healthy");
    assert_eq!(status.latest_block.height, 1234567);
}

#[tokio::test]
async fn test_transaction_send() {
    let mut mock_provider = MockProvider::new();
    mock_provider.mock_response(
        "transactions.send",
        json!({
            "transaction_hash": "0xabcd...",
            "status": "pending"
        })
    );
    
    let client = NockchainClient::with_provider(mock_provider);
    let tx = client.transactions().send(TransactionRequest {
        from: "nock1abc...".to_string(),
        to: "nock1def...".to_string(),
        value: "1000000000000000000".to_string(),
        ..Default::default()
    }).await.unwrap();
    
    assert_eq!(tx.transaction_hash, "0xabcd...");
    assert_eq!(tx.status, "pending");
}
```

## Performance Optimizations

### Concurrent Operations

```rust
use nockchain_sdk::{NockchainClient, types::*};
use futures_util::future::try_join_all;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    
    // Concurrent API calls
    let futures = vec![
        client.blockchain().get_status(),
        client.blockchain().get_latest_block(),
        client.dex().get_exchanges(),
    ];
    
    let results = try_join_all(futures).await?;
    let (status, block, exchanges) = (results[0], results[1], results[2]);
    
    println!("Status: {}", status.status);
    println!("Block height: {}", block.height);
    println!("Exchanges: {}", exchanges.exchanges.len());
    
    Ok(())
}
```

### Batch Processing

```rust
use nockchain_sdk::{NockchainClient, types::*};
use futures_util::stream::{self, StreamExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NockchainClient::from_env()?;
    let addresses = vec!["nock1abc...", "nock1def...", "nock1ghi..."];
    
    // Process addresses in batches of 5
    let balances: Vec<_> = stream::iter(addresses)
        .map(|address| async move {
            client.accounts().get_balance(address).await
        })
        .buffered(5)
        .collect()
        .await;
    
    for balance in balances {
        let balance = balance?;
        println!("Balance: {}", balance.balance);
    }
    
    Ok(())
}
```

## Best Practices

### Resource Management

```rust
use nockchain_sdk::{NockchainClient, NockchainConfig};
use std::sync::Arc;

pub struct NockchainService {
    client: Arc<NockchainClient>,
}

impl NockchainService {
    pub fn new(api_key: String) -> Self {
        let config = NockchainConfig {
            api_key,
            network: "mainnet".to_string(),
            ..Default::default()
        };
        
        Self {
            client: Arc::new(NockchainClient::new(config)),
        }
    }
    
    pub async fn get_account_balance(&self, address: &str) -> Result<String, nockchain_sdk::NockchainError> {
        let balance = self.client.accounts().get_balance(address).await?;
        Ok(balance.balance)
    }
}
```

### Configuration Management

```rust
use nockchain_sdk::{NockchainClient, NockchainConfig};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
struct AppConfig {
    nockchain_api_key: String,
    nockchain_network: String,
    nockchain_endpoint: Option<String>,
}

impl AppConfig {
    fn from_env() -> Result<Self, env::VarError> {
        Ok(Self {
            nockchain_api_key: env::var("NOCKCHAIN_API_KEY")?,
            nockchain_network: env::var("NOCKCHAIN_NETWORK").unwrap_or_else(|_| "mainnet".to_string()),
            nockchain_endpoint: env::var("NOCKCHAIN_ENDPOINT").ok(),
        })
    }
    
    fn to_nockchain_config(self) -> NockchainConfig {
        NockchainConfig {
            api_key: self.nockchain_api_key,
            network: self.nockchain_network,
            endpoint: self.nockchain_endpoint,
            ..Default::default()
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = AppConfig::from_env()?;
    let client = NockchainClient::new(config.to_nockchain_config());
    
    let status = client.blockchain().get_status().await?;
    println!("Block height: {}", status.latest_block.height);
    
    Ok(())
}
```

## Examples

### DeFi Arbitrage Bot

```rust
use nockchain_sdk::{NockchainClient, types::*};
use std::collections::HashMap;
use tokio::time::{sleep, Duration};

pub struct ArbitrageBot {
    client: NockchainClient,
    min_profit_percentage: f64,
    max_trade_amount: String,
}

impl ArbitrageBot {
    pub fn new(api_key: String, min_profit_percentage: f64, max_trade_amount: String) -> Self {
        let client = NockchainClient::new(NockchainConfig {
            api_key,
            network: "mainnet".to_string(),
            ..Default::default()
        });
        
        Self {
            client,
            min_profit_percentage,
            max_trade_amount,
        }
    }
    
    pub async fn run(&self) -> Result<(), Box<dyn std::error::Error>> {
        loop {
            if let Err(e) = self.scan_opportunities().await {
                eprintln!("Error scanning opportunities: {}", e);
            }
            
            sleep(Duration::from_secs(5)).await;
        }
    }
    
    async fn scan_opportunities(&self) -> Result<(), Box<dyn std::error::Error>> {
        let opportunities = self.client.dex().get_arbitrage_opportunities().await?;
        
        for opportunity in opportunities.opportunities {
            if opportunity.profit_percentage > self.min_profit_percentage {
                println!("Found opportunity: {} profit on {}", 
                        opportunity.profit_percentage, opportunity.pair);
                
                if let Err(e) = self.execute_arbitrage(&opportunity).await {
                    eprintln!("Failed to execute arbitrage: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    async fn execute_arbitrage(&self, opportunity: &ArbitrageOpportunity) -> Result<(), Box<dyn std::error::Error>> {
        // Buy on cheaper exchange
        let buy_request = SwapRequest {
            input_token: opportunity.quote_token.clone(),
            output_token: opportunity.base_token.clone(),
            input_amount: opportunity.required_capital.clone(),
            exchange: Some(opportunity.buy_exchange.clone()),
            user_address: "nock1trader...".to_string(),
            ..Default::default()
        };
        
        let buy_tx = self.client.dex().swap(buy_request).await?;
        println!("Buy transaction: {}", buy_tx.transaction_hash);
        
        // Wait for confirmation
        self.client.transactions().wait_for_confirmation(
            &buy_tx.transaction_hash,
            WaitOptions {
                confirmations: 1,
                timeout: Duration::from_secs(30),
            }
        ).await?;
        
        // Sell on more expensive exchange
        let sell_request = SwapRequest {
            input_token: opportunity.base_token.clone(),
            output_token: opportunity.quote_token.clone(),
            input_amount: opportunity.required_capital.clone(),
            exchange: Some(opportunity.sell_exchange.clone()),
            user_address: "nock1trader...".to_string(),
            ..Default::default()
        };
        
        let sell_tx = self.client.dex().swap(sell_request).await?;
        println!("Sell transaction: {}", sell_tx.transaction_hash);
        
        println!("Arbitrage executed: {} profit", opportunity.profit_amount);
        
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let bot = ArbitrageBot::new(
        "YOUR_API_KEY".to_string(),
        0.02, // 2% minimum profit
        "1000000000000000000".to_string(), // 1 NOCK max trade
    );
    
    bot.run().await?;
    
    Ok(())
}
```

### Mining Pool Monitor

```rust
use nockchain_sdk::{NockchainClient, types::*};
use tokio::time::{sleep, Duration};
use std::collections::HashMap;

pub struct MiningPoolMonitor {
    client: NockchainClient,
    monitored_pools: Vec<String>,
    alert_thresholds: HashMap<String, f64>,
}

impl MiningPoolMonitor {
    pub fn new(api_key: String, monitored_pools: Vec<String>) -> Self {
        let client = NockchainClient::new(NockchainConfig {
            api_key,
            network: "mainnet".to_string(),
            ..Default::default()
        });
        
        let mut alert_thresholds = HashMap::new();
        alert_thresholds.insert("hash_rate_drop".to_string(), 0.1); // 10% drop
        alert_thresholds.insert("efficiency_drop".to_string(), 0.05); // 5% drop
        
        Self {
            client,
            monitored_pools,
            alert_thresholds,
        }
    }
    
    pub async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut previous_stats: HashMap<String, MiningPoolStats> = HashMap::new();
        
        loop {
            for pool_id in &self.monitored_pools {
                match self.client.mining().get_pool_stats(pool_id).await {
                    Ok(stats) => {
                        self.check_alerts(pool_id, &stats, previous_stats.get(pool_id)).await;
                        previous_stats.insert(pool_id.clone(), stats);
                    }
                    Err(e) => {
                        eprintln!("Error getting stats for pool {}: {}", pool_id, e);
                    }
                }
            }
            
            sleep(Duration::from_secs(60)).await; // Check every minute
        }
    }
    
    async fn check_alerts(&self, pool_id: &str, current: &MiningPoolStats, previous: Option<&MiningPoolStats>) {
        if let Some(prev) = previous {
            // Check hash rate drop
            let hash_rate_change = (current.hash_rate - prev.hash_rate) / prev.hash_rate;
            if hash_rate_change < -self.alert_thresholds["hash_rate_drop"] {
                println!("ALERT: Hash rate dropped by {:.2}% in pool {}", 
                        hash_rate_change * 100.0, pool_id);
            }
            
            // Check efficiency drop
            let efficiency_change = (current.efficiency - prev.efficiency) / prev.efficiency;
            if efficiency_change < -self.alert_thresholds["efficiency_drop"] {
                println!("ALERT: Efficiency dropped by {:.2}% in pool {}", 
                        efficiency_change * 100.0, pool_id);
            }
        }
        
        // Check absolute thresholds
        if current.active_miners < 10 {
            println!("ALERT: Low miner count in pool {}: {}", pool_id, current.active_miners);
        }
        
        if current.uptime < 0.99 {
            println!("ALERT: Low uptime in pool {}: {:.2}%", pool_id, current.uptime * 100.0);
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let monitor = MiningPoolMonitor::new(
        "YOUR_API_KEY".to_string(),
        vec!["pool1".to_string(), "pool2".to_string()],
    );
    
    monitor.start_monitoring().await?;
    
    Ok(())
}
```

## Next Steps

- Read the [API Documentation](../api-documentation/)
- Check out more [Rust Examples](./examples/rust/)
- Join the [Developer Community](https://discord.gg/nockchain-dev)
- Contribute to the [SDK on GitHub](https://github.com/nockchain/rust-sdk)