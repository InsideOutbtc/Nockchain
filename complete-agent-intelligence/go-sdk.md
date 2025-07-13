# Nockchain Go SDK

## Overview

The official Nockchain Go SDK provides a comprehensive, idiomatic Go interface to interact with the Nockchain blockchain. Built with modern Go practices, full context support, and enterprise-grade error handling.

## Installation

```bash
go get github.com/nockchain/go-sdk
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
)

func main() {
    // Initialize client
    cfg := config.Config{
        APIKey:  "YOUR_API_KEY",
        Network: "mainnet", // or "testnet", "devnet"
        Timeout: 30,        // seconds
    }
    
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    
    // Get blockchain status
    ctx := context.Background()
    status, err := client.Blockchain.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Current block height: %d\n", status.LatestBlock.Height)
}
```

## Client Configuration

```go
package main

import (
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
)

func main() {
    cfg := config.Config{
        APIKey:      "YOUR_API_KEY",
        Network:     "mainnet",
        Endpoint:    "https://api.nockchain.com", // Optional: custom endpoint
        Timeout:     30,                          // Request timeout in seconds
        RetryCount:  3,                           // Number of retries
        RetryDelay:  time.Second,                 // Delay between retries
        UserAgent:   "MyApp/1.0",                 // Custom user agent
        Debug:       false,                       // Enable debug logging
    }
    
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Core Modules

### Blockchain Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func blockchainExamples(client *client.Client) {
    ctx := context.Background()
    
    // Get blockchain status
    status, err := client.Blockchain.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s\n", status.Status)
    
    // Get block by height
    block, err := client.Blockchain.GetBlock(ctx, 1234567)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Block hash: %s\n", block.Hash)
    
    // Get latest block
    latestBlock, err := client.Blockchain.GetLatestBlock(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Latest block: %d\n", latestBlock.Height)
    
    // Get block range
    blocks, err := client.Blockchain.GetBlockRange(ctx, 1234567, 1234577)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Retrieved %d blocks\n", len(blocks))
    
    // Get validators
    validators, err := client.Blockchain.GetValidators(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Active validators: %d\n", len(validators))
    
    // Get network peers
    peers, err := client.Blockchain.GetPeers(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Connected peers: %d\n", len(peers))
}
```

### Transaction Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/big"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func transactionExamples(client *client.Client) {
    ctx := context.Background()
    
    // Send transaction
    tx := &types.Transaction{
        From:     "nock1abc...",
        To:       "nock1def...",
        Value:    big.NewInt(1000000000000000000), // 1 NOCK
        GasPrice: "standard",
    }
    
    result, err := client.Transactions.Send(ctx, tx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transaction hash: %s\n", result.Hash)
    
    // Get transaction
    transaction, err := client.Transactions.Get(ctx, "0xabcd...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transaction status: %s\n", transaction.Status)
    
    // Get transaction status
    status, err := client.Transactions.GetStatus(ctx, "0xabcd...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s, Confirmations: %d\n", status.Status, status.Confirmations)
    
    // Estimate gas
    gasEstimate, err := client.Transactions.EstimateGas(ctx, &types.Transaction{
        From:  "nock1abc...",
        To:    "nock1def...",
        Value: big.NewInt(1000000000000000000),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Estimated gas: %d\n", gasEstimate.GasLimit)
    
    // Send batch transactions
    batch := []*types.Transaction{
        {From: "nock1abc...", To: "nock1def...", Value: big.NewInt(1000000000000000000)},
        {From: "nock1abc...", To: "nock1ghi...", Value: big.NewInt(2000000000000000000)},
    }
    
    batchResult, err := client.Transactions.SendBatch(ctx, batch)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Batch sent: %d transactions\n", len(batchResult.Transactions))
    
    // Wait for confirmation
    receipt, err := client.Transactions.WaitForConfirmation(ctx, "0xabcd...", &types.ConfirmationOptions{
        Confirmations: 12,
        Timeout:       300, // 5 minutes
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transaction confirmed: %s\n", receipt.Status)
    
    // Simulate transaction
    simulation, err := client.Transactions.Simulate(ctx, &types.Transaction{
        From:  "nock1abc...",
        To:    "nock1def...",
        Value: big.NewInt(1000000000000000000),
        Data:  []byte("0x..."),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Simulation result: %s\n", simulation.Result)
}
```

### Account Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func accountExamples(client *client.Client) {
    ctx := context.Background()
    
    // Get account information
    account, err := client.Accounts.Get(ctx, "nock1abc...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Account: %s\n", account.Address)
    
    // Get account balance
    balance, err := client.Accounts.GetBalance(ctx, "nock1abc...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Balance: %s NOCK\n", balance.NOCK)
    
    // Get account transactions
    transactions, err := client.Accounts.GetTransactions(ctx, "nock1abc...", &types.TransactionFilter{
        Page:  1,
        Limit: 10,
        Type:  types.TransactionTypeAll,
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transactions: %d\n", len(transactions.Transactions))
    
    // Generate new account
    newAccount, err := client.Accounts.Generate(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("New account: %s\n", newAccount.Address)
    
    // Import account from private key
    importedAccount, err := client.Accounts.Import(ctx, "0x1234...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Imported account: %s\n", importedAccount.Address)
}
```

### DEX Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/big"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func dexExamples(client *client.Client) {
    ctx := context.Background()
    
    // Get supported exchanges
    exchanges, err := client.DEX.GetExchanges(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Supported exchanges: %d\n", len(exchanges))
    
    // Get trading pairs
    pairs, err := client.DEX.GetPairs(ctx, &types.PairFilter{
        Exchange:  "nockswap",
        BaseToken: "nock1token...",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Trading pairs: %d\n", len(pairs))
    
    // Get price quote
    quote, err := client.DEX.GetQuote(ctx, &types.QuoteRequest{
        InputToken:  "nock1token...",
        OutputToken: "nock1usdc...",
        Amount:      big.NewInt(1000000000000000000),
        Slippage:    0.01,
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Quote: %s\n", quote.BestRoute.OutputAmount)
    
    // Execute swap
    swap, err := client.DEX.Swap(ctx, &types.SwapRequest{
        InputToken:      "nock1token...",
        OutputToken:     "nock1usdc...",
        InputAmount:     big.NewInt(1000000000000000000),
        MinOutputAmount: big.NewInt(1200000000),
        Slippage:        0.01,
        UserAddress:     "nock1user...",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Swap hash: %s\n", swap.TransactionHash)
    
    // Get liquidity pools
    pools, err := client.DEX.GetLiquidityPools(ctx, &types.PoolFilter{
        Exchange: "nockswap",
        MinTVL:   big.NewInt(1000000000000000000000),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Liquidity pools: %d\n", len(pools))
    
    // Add liquidity
    addLiquidity, err := client.DEX.AddLiquidity(ctx, &types.AddLiquidityRequest{
        PoolID:           "nockswap_nock_usdc",
        TokenAAmount:     big.NewInt(1000000000000000000),
        TokenBAmount:     big.NewInt(1250000000),
        MinTokenAAmount:  big.NewInt(950000000000000000),
        MinTokenBAmount:  big.NewInt(1187500000),
        UserAddress:      "nock1user...",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Add liquidity hash: %s\n", addLiquidity.TransactionHash)
    
    // Remove liquidity
    removeLiquidity, err := client.DEX.RemoveLiquidity(ctx, &types.RemoveLiquidityRequest{
        PoolID:           "nockswap_nock_usdc",
        LiquidityTokens:  big.NewInt(1118033988749895000),
        MinTokenAAmount:  big.NewInt(950000000000000000),
        MinTokenBAmount:  big.NewInt(1187500000),
        UserAddress:      "nock1user...",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Remove liquidity hash: %s\n", removeLiquidity.TransactionHash)
}
```

### Mining Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func miningExamples(client *client.Client) {
    ctx := context.Background()
    
    // Get mining pool information
    pools, err := client.Mining.GetPools(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Mining pools: %d\n", len(pools))
    
    // Get pool statistics
    stats, err := client.Mining.GetPoolStats(ctx, "pool_id")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Pool hashrate: %s\n", stats.Hashrate)
    
    // Get miner information
    miner, err := client.Mining.GetMiner(ctx, "nock1miner...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Miner shares: %d\n", miner.SharesSubmitted)
    
    // Get mining rewards
    rewards, err := client.Mining.GetRewards(ctx, "nock1miner...", &types.RewardsFilter{
        StartTime: time.Now().Add(-30 * 24 * time.Hour),
        EndTime:   time.Now(),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Total rewards: %s\n", rewards.TotalRewards)
    
    // Submit mining share
    share, err := client.Mining.SubmitShare(ctx, &types.Share{
        PoolID:     "pool_id",
        MinerID:    "nock1miner...",
        Nonce:      "0x123456789abcdef0",
        Hash:       "0xabcd...",
        Difficulty: "0x1234567890abcdef",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Share accepted: %t\n", share.Accepted)
}
```

### Bridge Module

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/big"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func bridgeExamples(client *client.Client) {
    ctx := context.Background()
    
    // Get supported chains
    chains, err := client.Bridge.GetSupportedChains(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Supported chains: %d\n", len(chains))
    
    // Get bridge status
    status, err := client.Bridge.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Bridge status: %s\n", status.Status)
    
    // Initiate bridge transfer
    transfer, err := client.Bridge.Transfer(ctx, &types.BridgeTransferRequest{
        SourceChain:        "nockchain",
        DestinationChain:   "ethereum",
        Token:              "nock1token...",
        Amount:             big.NewInt(1000000000000000000),
        DestinationAddress: "0x1234...",
        UserAddress:        "nock1user...",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transfer ID: %s\n", transfer.TransferID)
    
    // Get transfer status
    transferStatus, err := client.Bridge.GetTransferStatus(ctx, "transfer_id")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transfer status: %s\n", transferStatus.Status)
    
    // Get transfer history
    history, err := client.Bridge.GetTransferHistory(ctx, "nock1user...")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transfer history: %d transfers\n", len(history.Transfers))
}
```

## Error Handling

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func errorHandling(client *client.Client) {
    ctx := context.Background()
    
    // Basic error handling
    tx := &types.Transaction{
        From:  "nock1abc...",
        To:    "nock1def...",
        Value: big.NewInt(1000000000000000000),
    }
    
    result, err := client.Transactions.Send(ctx, tx)
    if err != nil {
        // Check for specific error types
        var apiErr *types.APIError
        var networkErr *types.NetworkError
        var nockchainErr *types.NockchainError
        
        switch {
        case errors.As(err, &apiErr):
            fmt.Printf("API Error: %s (Code: %s, Status: %d)\n", 
                apiErr.Message, apiErr.Code, apiErr.StatusCode)
        case errors.As(err, &networkErr):
            fmt.Printf("Network Error: %s\n", networkErr.Message)
        case errors.As(err, &nockchainErr):
            fmt.Printf("Nockchain Error: %s\n", nockchainErr.Message)
        default:
            fmt.Printf("Unknown error: %v\n", err)
        }
        return
    }
    
    // Specific error code handling
    if err != nil {
        if apiErr, ok := err.(*types.APIError); ok {
            switch apiErr.Code {
            case "INSUFFICIENT_BALANCE":
                fmt.Println("Not enough funds")
            case "INVALID_NONCE":
                fmt.Println("Invalid nonce")
            case "GAS_LIMIT_EXCEEDED":
                fmt.Println("Gas limit too high")
            default:
                fmt.Printf("API error: %s\n", apiErr.Message)
            }
        }
    }
    
    fmt.Printf("Transaction successful: %s\n", result.Hash)
}
```

## WebSocket Support

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/websocket"
)

func websocketExample(client *client.Client) {
    ctx := context.Background()
    
    // Create WebSocket connection
    ws, err := client.WebSocket(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer ws.Close()
    
    // Subscribe to new blocks
    blocksCh, err := ws.SubscribeToBlocks(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    // Subscribe to transactions for specific address
    txsCh, err := ws.SubscribeToTransactions(ctx, &websocket.TransactionFilter{
        Address: "nock1abc...",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    // Subscribe to price updates
    pricesCh, err := ws.SubscribeToPrices(ctx, &websocket.PriceFilter{
        Pair: "NOCK/USDC",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    // Handle incoming messages
    for {
        select {
        case block := <-blocksCh:
            fmt.Printf("New block: %d\n", block.Height)
        case tx := <-txsCh:
            fmt.Printf("New transaction: %s\n", tx.Hash)
        case price := <-pricesCh:
            fmt.Printf("Price update: %s\n", price.Price)
        case <-ctx.Done():
            return
        }
    }
}
```

## Advanced Features

### Pagination

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func paginationExample(client *client.Client) {
    ctx := context.Background()
    
    // Manual pagination
    page := 1
    limit := 100
    var allTransactions []*types.Transaction
    
    for {
        transactions, err := client.Accounts.GetTransactions(ctx, "nock1abc...", &types.TransactionFilter{
            Page:  page,
            Limit: limit,
        })
        if err != nil {
            log.Fatal(err)
        }
        
        allTransactions = append(allTransactions, transactions.Transactions...)
        
        if page >= transactions.Pagination.TotalPages {
            break
        }
        page++
    }
    
    fmt.Printf("Total transactions: %d\n", len(allTransactions))
    
    // Auto-pagination helper
    iterator := client.Accounts.GetTransactionsIterator(ctx, "nock1abc...", &types.TransactionFilter{
        Limit: 100,
    })
    
    for iterator.Next() {
        tx := iterator.Value()
        fmt.Printf("Transaction: %s\n", tx.Hash)
    }
    
    if err := iterator.Err(); err != nil {
        log.Fatal(err)
    }
}
```

### Retry Logic

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
    "github.com/nockchain/go-sdk/retry"
)

func retryExample() {
    // Configure retry logic
    cfg := config.Config{
        APIKey:     "YOUR_API_KEY",
        RetryCount: 3,
        RetryDelay: time.Second,
        RetryCondition: func(err error) bool {
            // Retry on network errors and 5xx status codes
            if netErr, ok := err.(*types.NetworkError); ok {
                return true
            }
            if apiErr, ok := err.(*types.APIError); ok {
                return apiErr.StatusCode >= 500
            }
            return false
        },
    }
    
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    
    // Custom retry wrapper
    ctx := context.Background()
    
    err = retry.Do(ctx, func() error {
        _, err := client.Blockchain.GetStatus(ctx)
        return err
    }, retry.WithRetries(3), retry.WithDelay(time.Second))
    
    if err != nil {
        log.Fatal(err)
    }
}
```

### Context and Cancellation

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "github.com/nockchain/go-sdk/client"
)

func contextExample(client *client.Client) {
    // Context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    status, err := client.Blockchain.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s\n", status.Status)
    
    // Context with cancellation
    ctx, cancel = context.WithCancel(context.Background())
    
    // Start operation in goroutine
    go func() {
        time.Sleep(5 * time.Second)
        cancel() // Cancel after 5 seconds
    }()
    
    // This will be cancelled after 5 seconds
    blocks, err := client.Blockchain.GetBlockRange(ctx, 1, 1000000)
    if err != nil {
        if ctx.Err() == context.Canceled {
            fmt.Println("Operation cancelled")
        } else {
            log.Fatal(err)
        }
    } else {
        fmt.Printf("Retrieved %d blocks\n", len(blocks))
    }
}
```

### Caching

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "github.com/nockchain/go-sdk/cache"
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
)

func cachingExample() {
    // Create cache
    cache := cache.NewMemoryCache(&cache.Config{
        TTL:     60 * time.Second,
        MaxSize: 1000,
    })
    
    cfg := config.Config{
        APIKey: "YOUR_API_KEY",
        Cache:  cache,
    }
    
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    
    ctx := context.Background()
    
    // First call - API request
    status1, err := client.Blockchain.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("First call: %s\n", status1.Status)
    
    // Second call - cached response
    status2, err := client.Blockchain.GetStatus(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Second call: %s\n", status2.Status)
}
```

### Batch Operations

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/nockchain/go-sdk/batch"
    "github.com/nockchain/go-sdk/client"
)

func batchExample(client *client.Client) {
    ctx := context.Background()
    
    // Create batch
    b := batch.New(client)
    
    // Add operations to batch
    statusOp := b.AddBlockchainGetStatus()
    latestBlockOp := b.AddBlockchainGetLatestBlock()
    accountOp := b.AddAccountsGet("nock1abc...")
    exchangesOp := b.AddDEXGetExchanges()
    
    // Execute batch
    err := b.Execute(ctx)
    if err != nil {
        log.Fatal(err)
    }
    
    // Get results
    status, err := statusOp.Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s\n", status.Status)
    
    latestBlock, err := latestBlockOp.Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Latest block: %d\n", latestBlock.Height)
    
    account, err := accountOp.Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Account: %s\n", account.Address)
    
    exchanges, err := exchangesOp.Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Exchanges: %d\n", len(exchanges))
}
```

## Testing

```go
package main

import (
    "context"
    "testing"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
    "github.com/nockchain/go-sdk/mock"
    "github.com/stretchr/testify/assert"
)

func TestBlockchainStatus(t *testing.T) {
    // Create mock client
    mockClient := mock.NewClient()
    
    // Set up mock response
    mockClient.MockBlockchainGetStatus(&types.BlockchainStatus{
        Status: "healthy",
        LatestBlock: &types.Block{
            Height: 1234567,
        },
    })
    
    // Use mock client in tests
    cfg := config.Config{
        APIKey: "test-key",
        Client: mockClient,
    }
    
    client, err := client.New(cfg)
    assert.NoError(t, err)
    
    ctx := context.Background()
    status, err := client.Blockchain.GetStatus(ctx)
    assert.NoError(t, err)
    assert.Equal(t, "healthy", status.Status)
    assert.Equal(t, int64(1234567), status.LatestBlock.Height)
}

func TestTransactionSend(t *testing.T) {
    mockClient := mock.NewClient()
    
    // Mock successful transaction
    mockClient.MockTransactionsSend(&types.TransactionResult{
        Hash:   "0xabcd...",
        Status: "pending",
    })
    
    cfg := config.Config{
        APIKey: "test-key",
        Client: mockClient,
    }
    
    client, err := client.New(cfg)
    assert.NoError(t, err)
    
    ctx := context.Background()
    tx := &types.Transaction{
        From:  "nock1abc...",
        To:    "nock1def...",
        Value: big.NewInt(1000000000000000000),
    }
    
    result, err := client.Transactions.Send(ctx, tx)
    assert.NoError(t, err)
    assert.Equal(t, "0xabcd...", result.Hash)
    assert.Equal(t, "pending", result.Status)
}
```

## Configuration Management

```go
package main

import (
    "log"
    "os"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
)

func configExample() {
    // From environment variables
    cfg := config.Config{
        APIKey:  os.Getenv("NOCKCHAIN_API_KEY"),
        Network: os.Getenv("NOCKCHAIN_NETWORK"),
    }
    
    // From config file
    cfg, err := config.LoadFromFile("nockchain.yaml")
    if err != nil {
        log.Fatal(err)
    }
    
    // Programmatic configuration
    cfg = config.Config{
        APIKey:     "YOUR_API_KEY",
        Network:    "mainnet",
        Timeout:    30,
        RetryCount: 3,
        Debug:      true,
    }
    
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Best Practices

### Connection Management

```go
package main

import (
    "sync"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/config"
)

// Singleton pattern for client
var (
    nockchainClient *client.Client
    clientOnce      sync.Once
)

func GetNockchainClient() *client.Client {
    clientOnce.Do(func() {
        cfg := config.Config{
            APIKey:  os.Getenv("NOCKCHAIN_API_KEY"),
            Network: "mainnet",
        }
        
        var err error
        nockchainClient, err = client.New(cfg)
        if err != nil {
            panic(err)
        }
    })
    return nockchainClient
}
```

### Error Handling with Exponential Backoff

```go
package main

import (
    "context"
    "fmt"
    "math"
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

func SendTransactionWithRetry(ctx context.Context, client *client.Client, tx *types.Transaction, maxRetries int) (*types.TransactionResult, error) {
    for i := 0; i < maxRetries; i++ {
        result, err := client.Transactions.Send(ctx, tx)
        if err == nil {
            return result, nil
        }
        
        // Don't retry on client errors
        if apiErr, ok := err.(*types.APIError); ok && apiErr.StatusCode < 500 {
            return nil, err
        }
        
        if i == maxRetries-1 {
            return nil, err
        }
        
        // Exponential backoff
        delay := time.Duration(math.Pow(2, float64(i))) * time.Second
        select {
        case <-time.After(delay):
            continue
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }
    
    return nil, fmt.Errorf("max retries exceeded")
}
```

## Examples

### DeFi Trading Bot

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/big"
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

type TradingBot struct {
    client *client.Client
}

func NewTradingBot(apiKey string) *TradingBot {
    cfg := config.Config{APIKey: apiKey}
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    
    return &TradingBot{client: client}
}

func (bot *TradingBot) FindArbitrageOpportunities(ctx context.Context) error {
    opportunities, err := bot.client.DEX.GetArbitrageOpportunities(ctx)
    if err != nil {
        return err
    }
    
    for _, opportunity := range opportunities.Opportunities {
        if opportunity.ProfitPercentage > 0.02 { // 2% profit threshold
            if err := bot.executeArbitrage(ctx, opportunity); err != nil {
                log.Printf("Arbitrage failed: %v", err)
            }
        }
    }
    
    return nil
}

func (bot *TradingBot) executeArbitrage(ctx context.Context, opportunity *types.ArbitrageOpportunity) error {
    // Buy on cheaper exchange
    buyTx, err := bot.client.DEX.Swap(ctx, &types.SwapRequest{
        InputToken:      opportunity.QuoteToken,
        OutputToken:     opportunity.BaseToken,
        InputAmount:     opportunity.RequiredCapital,
        Exchange:        opportunity.BuyExchange,
        UserAddress:     "nock1trader...",
    })
    if err != nil {
        return err
    }
    
    // Wait for confirmation
    _, err = bot.client.Transactions.WaitForConfirmation(ctx, buyTx.TransactionHash, &types.ConfirmationOptions{
        Confirmations: 3,
        Timeout:       300,
    })
    if err != nil {
        return err
    }
    
    // Sell on more expensive exchange
    sellTx, err := bot.client.DEX.Swap(ctx, &types.SwapRequest{
        InputToken:      opportunity.BaseToken,
        OutputToken:     opportunity.QuoteToken,
        InputAmount:     opportunity.RequiredCapital,
        Exchange:        opportunity.SellExchange,
        UserAddress:     "nock1trader...",
    })
    if err != nil {
        return err
    }
    
    fmt.Printf("Arbitrage executed: %s profit\n", opportunity.ProfitAmount)
    return nil
}

func (bot *TradingBot) Run(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            if err := bot.FindArbitrageOpportunities(ctx); err != nil {
                log.Printf("Error finding opportunities: %v", err)
            }
        case <-ctx.Done():
            return
        }
    }
}
```

### Liquidity Provision Monitor

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math/big"
    "time"
    
    "github.com/nockchain/go-sdk/client"
    "github.com/nockchain/go-sdk/types"
)

type LiquidityMonitor struct {
    client *client.Client
}

func NewLiquidityMonitor(apiKey string) *LiquidityMonitor {
    cfg := config.Config{APIKey: apiKey}
    client, err := client.New(cfg)
    if err != nil {
        log.Fatal(err)
    }
    
    return &LiquidityMonitor{client: client}
}

func (lm *LiquidityMonitor) MonitorPools(ctx context.Context) error {
    pools, err := lm.client.DEX.GetLiquidityPools(ctx, &types.PoolFilter{
        MinTVL: big.NewInt(1000000000000000000000), // 1000 tokens minimum
    })
    if err != nil {
        return err
    }
    
    for _, pool := range pools.Pools {
        if pool.APR > 0.5 { // 50% APR threshold
            fmt.Printf("High APR pool found: %s - %.2f%%\n", pool.ID, pool.APR*100)
            if err := lm.addLiquidity(ctx, pool); err != nil {
                log.Printf("Failed to add liquidity: %v", err)
            }
        }
    }
    
    return nil
}

func (lm *LiquidityMonitor) addLiquidity(ctx context.Context, pool *types.LiquidityPool) error {
    quote, err := lm.client.DEX.GetQuote(ctx, &types.QuoteRequest{
        InputToken:  pool.TokenA.Address,
        OutputToken: pool.TokenB.Address,
        Amount:      big.NewInt(1000000000000000000), // 1 token
    })
    if err != nil {
        return err
    }
    
    _, err = lm.client.DEX.AddLiquidity(ctx, &types.AddLiquidityRequest{
        PoolID:          pool.ID,
        TokenAAmount:    big.NewInt(1000000000000000000),
        TokenBAmount:    quote.BestRoute.OutputAmount,
        MinTokenAAmount: big.NewInt(950000000000000000), // 5% slippage
        MinTokenBAmount: new(big.Int).Mul(quote.BestRoute.OutputAmount, big.NewInt(95)).Div(big.NewInt(100)),
        UserAddress:     "nock1provider...",
    })
    
    return err
}

func (lm *LiquidityMonitor) Run(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            if err := lm.MonitorPools(ctx); err != nil {
                log.Printf("Error monitoring pools: %v", err)
            }
        case <-ctx.Done():
            return
        }
    }
}
```

## Next Steps

- Read the [API Documentation](../api-documentation/)
- Check out more [SDK Examples](./examples/)
- Join the [Developer Community](https://discord.gg/nockchain-dev)
- Contribute to the [SDK on GitHub](https://github.com/nockchain/go-sdk)

## Support

- **Documentation**: https://docs.nockchain.com/go-sdk
- **Discord**: https://discord.gg/nockchain-dev
- **GitHub**: https://github.com/nockchain/go-sdk
- **Email**: developers@nockchain.com