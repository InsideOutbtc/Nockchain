// Real-time WebSocket server for mining pool dashboard
// Enterprise-grade WebSocket implementation with sub-second updates

use anyhow::Result;
use axum::extract::ws::{Message, WebSocket};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;
use std::time::{Duration, Instant};
use dashmap::DashMap;
use futures::{sink::SinkExt, stream::StreamExt};

use crate::{AppState, mining::{PoolStats, PerformanceMetrics}};

// WebSocket message types for real-time updates
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WebSocketMessage {
    // Connection management
    Subscribe { channels: Vec<String> },
    Unsubscribe { channels: Vec<String> },
    Ping,
    Pong,
    
    // Pool data updates
    PoolStats(PoolStats),
    HashrateUpdate(HashrateData),
    MinerUpdate(MinerData),
    ShareSubmitted(ShareData),
    BlockFound(BlockData),
    PayoutSent(PayoutData),
    
    // System updates
    SystemMetrics(SystemMetricsData),
    Alert(AlertData),
    
    // Error handling
    Error { message: String },
    Success { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashrateData {
    pub total_hashrate: f64,
    pub miners_count: usize,
    pub timestamp: u64,
    pub by_miner: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinerData {
    pub miner_id: String,
    pub hashrate: f64,
    pub shares_valid: u64,
    pub shares_invalid: u64,
    pub last_share_time: Option<u64>,
    pub status: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShareData {
    pub miner_id: String,
    pub difficulty: u64,
    pub is_valid: bool,
    pub is_block: bool,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockData {
    pub height: u64,
    pub hash: String,
    pub reward: f64,
    pub found_by: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PayoutData {
    pub miner_id: String,
    pub amount: f64,
    pub transaction_hash: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetricsData {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
    pub network_io: NetworkIO,
    pub pool_uptime: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkIO {
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub packets_in: u64,
    pub packets_out: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertData {
    pub level: String, // "info", "warning", "error", "critical"
    pub title: String,
    pub message: String,
    pub timestamp: u64,
}

// WebSocket connection manager
pub struct WebSocketManager {
    connections: Arc<DashMap<String, WebSocketConnection>>,
    broadcasters: Arc<DashMap<String, broadcast::Sender<WebSocketMessage>>>,
    state: Arc<AppState>,
}

#[derive(Debug)]
pub struct WebSocketConnection {
    id: String,
    subscriptions: Arc<RwLock<Vec<String>>>,
    last_ping: Arc<RwLock<Instant>>,
    message_count: Arc<std::sync::atomic::AtomicU64>,
}

impl WebSocketManager {
    pub fn new(state: Arc<AppState>) -> Self {
        let manager = Self {
            connections: Arc::new(DashMap::new()),
            broadcasters: Arc::new(DashMap::new()),
            state,
        };

        // Initialize default channels
        manager.create_channel("pool_stats");
        manager.create_channel("hashrate");
        manager.create_channel("miners");
        manager.create_channel("shares");
        manager.create_channel("blocks");
        manager.create_channel("payouts");
        manager.create_channel("system");
        manager.create_channel("alerts");

        manager
    }

    fn create_channel(&self, channel: &str) {
        let (sender, _) = broadcast::channel(1000);
        self.broadcasters.insert(channel.to_string(), sender);
    }

    pub async fn add_connection(&self, connection: WebSocketConnection) {
        let id = connection.id.clone();
        self.connections.insert(id.clone(), connection);
        tracing::info!("WebSocket connection added: {}", id);
    }

    pub async fn remove_connection(&self, connection_id: &str) {
        self.connections.remove(connection_id);
        tracing::info!("WebSocket connection removed: {}", connection_id);
    }

    pub async fn broadcast_to_channel(&self, channel: &str, message: WebSocketMessage) -> Result<()> {
        if let Some(broadcaster) = self.broadcasters.get(channel) {
            if let Err(e) = broadcaster.send(message) {
                tracing::warn!("Failed to broadcast to channel {}: {}", channel, e);
            }
        }
        Ok(())
    }

    pub async fn get_connection_count(&self) -> usize {
        self.connections.len()
    }

    pub async fn get_channel_subscriber_count(&self, channel: &str) -> usize {
        if let Some(broadcaster) = self.broadcasters.get(channel) {
            broadcaster.receiver_count()
        } else {
            0
        }
    }

    // Periodic cleanup of stale connections
    pub async fn cleanup_stale_connections(&self) {
        let now = Instant::now();
        let stale_threshold = Duration::from_secs(300); // 5 minutes

        let mut stale_connections = Vec::new();
        
        for entry in self.connections.iter() {
            let connection = entry.value();
            let last_ping = *connection.last_ping.read().await;
            
            if now.duration_since(last_ping) > stale_threshold {
                stale_connections.push(entry.key().clone());
            }
        }

        for connection_id in stale_connections {
            self.remove_connection(&connection_id).await;
        }
    }
}

// Global WebSocket manager instance
lazy_static::lazy_static! {
    static ref WS_MANAGER: Arc<RwLock<Option<Arc<WebSocketManager>>>> = Arc::new(RwLock::new(None));
}

pub async fn initialize_websocket_manager(state: Arc<AppState>) {
    let manager = Arc::new(WebSocketManager::new(state.clone()));
    *WS_MANAGER.write().await = Some(manager.clone());
    
    // Start background tasks
    start_real_time_updates(manager.clone(), state).await;
}

pub async fn get_websocket_manager() -> Option<Arc<WebSocketManager>> {
    WS_MANAGER.read().await.clone()
}

// Main WebSocket handler
pub async fn handle_websocket(socket: WebSocket, state: AppState) {
    let connection_id = Uuid::new_v4().to_string();
    let state = Arc::new(state);
    
    tracing::info!("New WebSocket connection: {}", connection_id);

    let connection = WebSocketConnection {
        id: connection_id.clone(),
        subscriptions: Arc::new(RwLock::new(Vec::new())),
        last_ping: Arc::new(RwLock::new(Instant::now())),
        message_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
    };

    if let Some(manager) = get_websocket_manager().await {
        manager.add_connection(connection.clone()).await;

        let (mut sender, mut receiver) = socket.split();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<WebSocketMessage>();

        // Spawn task to handle outgoing messages
        let connection_id_clone = connection_id.clone();
        let manager_clone = manager.clone();
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                let json = match serde_json::to_string(&message) {
                    Ok(json) => json,
                    Err(e) => {
                        tracing::error!("Failed to serialize WebSocket message: {}", e);
                        continue;
                    }
                };

                if sender.send(Message::Text(json)).await.is_err() {
                    break;
                }
            }
            
            manager_clone.remove_connection(&connection_id_clone).await;
        });

        // Handle incoming messages
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Err(e) = handle_websocket_message(
                        &text,
                        &connection,
                        &manager,
                        &state,
                        &tx,
                    ).await {
                        tracing::error!("Error handling WebSocket message: {}", e);
                        let _ = tx.send(WebSocketMessage::Error {
                            message: "Failed to process message".to_string(),
                        });
                    }
                },
                Ok(Message::Binary(_)) => {
                    tracing::warn!("Received binary message, ignoring");
                },
                Ok(Message::Ping(data)) => {
                    if sender.send(Message::Pong(data)).await.is_err() {
                        break;
                    }
                    *connection.last_ping.write().await = Instant::now();
                },
                Ok(Message::Pong(_)) => {
                    *connection.last_ping.write().await = Instant::now();
                },
                Ok(Message::Close(_)) => {
                    tracing::info!("WebSocket connection closed: {}", connection_id);
                    break;
                },
                Err(e) => {
                    tracing::error!("WebSocket error: {}", e);
                    break;
                },
            }
        }

        manager.remove_connection(&connection_id).await;
    }
}

async fn handle_websocket_message(
    text: &str,
    connection: &WebSocketConnection,
    manager: &WebSocketManager,
    state: &AppState,
    sender: &tokio::sync::mpsc::UnboundedSender<WebSocketMessage>,
) -> Result<()> {
    let message: WebSocketMessage = serde_json::from_str(text)?;
    
    connection.message_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    match message {
        WebSocketMessage::Subscribe { channels } => {
            let mut subscriptions = connection.subscriptions.write().await;
            for channel in channels {
                if !subscriptions.contains(&channel) {
                    subscriptions.push(channel.clone());
                    
                    // Start sending updates for this channel
                    start_channel_subscription(
                        connection.id.clone(),
                        channel,
                        manager.clone(),
                        sender.clone(),
                    ).await;
                }
            }
            
            let _ = sender.send(WebSocketMessage::Success {
                message: "Subscribed to channels".to_string(),
            });
        },
        
        WebSocketMessage::Unsubscribe { channels } => {
            let mut subscriptions = connection.subscriptions.write().await;
            for channel in channels {
                subscriptions.retain(|c| c != &channel);
            }
            
            let _ = sender.send(WebSocketMessage::Success {
                message: "Unsubscribed from channels".to_string(),
            });
        },
        
        WebSocketMessage::Ping => {
            let _ = sender.send(WebSocketMessage::Pong);
            *connection.last_ping.write().await = Instant::now();
        },
        
        _ => {
            tracing::warn!("Received unexpected message type from client");
        }
    }

    Ok(())
}

async fn start_channel_subscription(
    connection_id: String,
    channel: String,
    manager: Arc<WebSocketManager>,
    sender: tokio::sync::mpsc::UnboundedSender<WebSocketMessage>,
) {
    if let Some(broadcaster) = manager.broadcasters.get(&channel) {
        let mut receiver = broadcaster.subscribe();
        
        tokio::spawn(async move {
            while let Ok(message) = receiver.recv().await {
                if sender.send(message).is_err() {
                    break;
                }
            }
        });
    }
}

// Background task for real-time updates
async fn start_real_time_updates(manager: Arc<WebSocketManager>, state: Arc<AppState>) {
    // Pool stats updates (every 5 seconds)
    let manager_clone = manager.clone();
    let state_clone = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        
        loop {
            interval.tick().await;
            
            let pool_stats = state_clone.pool.get_pool_stats().await;
            let message = WebSocketMessage::PoolStats(pool_stats);
            
            if let Err(e) = manager_clone.broadcast_to_channel("pool_stats", message).await {
                tracing::error!("Failed to broadcast pool stats: {}", e);
            }
        }
    });

    // Hashrate updates (every 10 seconds)
    let manager_clone = manager.clone();
    let state_clone = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(10));
        
        loop {
            interval.tick().await;
            
            let miners = state_clone.pool.get_active_miners().await;
            let mut by_miner = HashMap::new();
            let mut total_hashrate = 0.0;
            
            for miner in miners {
                let hashrate = miner.current_hashrate.load(std::sync::atomic::Ordering::Relaxed);
                by_miner.insert(miner.id.clone(), hashrate);
                total_hashrate += hashrate;
            }
            
            let hashrate_data = HashrateData {
                total_hashrate,
                miners_count: by_miner.len(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                by_miner,
            };
            
            let message = WebSocketMessage::HashrateUpdate(hashrate_data);
            
            if let Err(e) = manager_clone.broadcast_to_channel("hashrate", message).await {
                tracing::error!("Failed to broadcast hashrate: {}", e);
            }
        }
    });

    // System metrics updates (every 30 seconds)
    let manager_clone = manager.clone();
    let state_clone = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));
        
        loop {
            interval.tick().await;
            
            let performance_metrics = state_clone.pool.get_performance_metrics().await;
            
            let system_metrics = SystemMetricsData {
                cpu_usage: performance_metrics.cpu_usage,
                memory_usage: performance_metrics.memory_usage as f64,
                disk_usage: 0.0, // Would be implemented with system monitoring
                network_io: NetworkIO {
                    bytes_in: 0,
                    bytes_out: 0,
                    packets_in: 0,
                    packets_out: 0,
                },
                pool_uptime: state_clone.pool.start_time.elapsed().as_secs(),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            };
            
            let message = WebSocketMessage::SystemMetrics(system_metrics);
            
            if let Err(e) = manager_clone.broadcast_to_channel("system", message).await {
                tracing::error!("Failed to broadcast system metrics: {}", e);
            }
        }
    });

    // Cleanup stale connections (every 5 minutes)
    let manager_clone = manager.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(300));
        
        loop {
            interval.tick().await;
            manager_clone.cleanup_stale_connections().await;
        }
    });
}

// Helper functions for broadcasting specific events
pub async fn broadcast_share_submitted(share_data: ShareData) {
    if let Some(manager) = get_websocket_manager().await {
        let message = WebSocketMessage::ShareSubmitted(share_data);
        let _ = manager.broadcast_to_channel("shares", message).await;
    }
}

pub async fn broadcast_block_found(block_data: BlockData) {
    if let Some(manager) = get_websocket_manager().await {
        let message = WebSocketMessage::BlockFound(block_data);
        let _ = manager.broadcast_to_channel("blocks", message).await;
    }
}

pub async fn broadcast_payout_sent(payout_data: PayoutData) {
    if let Some(manager) = get_websocket_manager().await {
        let message = WebSocketMessage::PayoutSent(payout_data);
        let _ = manager.broadcast_to_channel("payouts", message).await;
    }
}

pub async fn broadcast_alert(alert_data: AlertData) {
    if let Some(manager) = get_websocket_manager().await {
        let message = WebSocketMessage::Alert(alert_data);
        let _ = manager.broadcast_to_channel("alerts", message).await;
    }
}