// Nockchain Mining Pool Engine
// Enterprise-grade, high-performance mining pool server
// Designed for sub-millisecond share processing and maximum uptime

use anyhow::Result;
use axum::{
    extract::{ws::WebSocketUpgrade, State},
    http::StatusCode,
    response::Response,
    routing::{get, post},
    Router,
};
use std::{net::SocketAddr, sync::Arc};
use tokio::signal;
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    compression::CompressionLayer,
};
use tracing::{info, warn, error};

// Internal modules
mod config;
mod mining;
mod api;
mod websocket;
mod database;
mod metrics;
mod share_processor;
mod payout_engine;
mod block_finder;
mod difficulty_adjuster;

use config::Config;
use mining::MiningPool;
use database::Database;
use metrics::Metrics;

// Global allocator for performance
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<MiningPool>,
    pub database: Arc<Database>,
    pub metrics: Arc<Metrics>,
    pub config: Arc<Config>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter("nockchain_mining_pool=debug,tower_http=debug")
        .with_target(false)
        .compact()
        .init();

    info!("🚀 Starting Nockchain Mining Pool Engine v1.0.0");

    // Load configuration
    let config = Arc::new(Config::from_env()?);
    info!("✅ Configuration loaded");

    // Initialize metrics
    let metrics = Arc::new(Metrics::new()?);
    info!("📊 Metrics system initialized");

    // Initialize database connection
    let database = Arc::new(Database::new(&config.database_url).await?);
    info!("🗄️ Database connection established");

    // Run database migrations
    database.migrate().await?;
    info!("📋 Database migrations completed");

    // Initialize mining pool
    let pool = Arc::new(
        MiningPool::new(
            config.clone(),
            database.clone(),
            metrics.clone(),
        ).await?
    );
    info!("⛏️ Mining pool engine initialized");

    // Create application state
    let state = AppState {
        pool: pool.clone(),
        database: database.clone(),
        metrics: metrics.clone(),
        config: config.clone(),
    };

    // Build application router
    let app = create_router(state).await?;

    // Start background tasks
    start_background_tasks(pool.clone(), database.clone(), metrics.clone()).await?;

    // Create server
    let addr: SocketAddr = format!("{}:{}", config.server.host, config.server.port)
        .parse()
        .expect("Invalid server address");

    info!("🌐 Server starting on http://{}", addr);

    // Start server with graceful shutdown
    let listener = tokio::net::TcpListener::bind(addr).await?;
    
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("🛑 Server shutdown complete");
    Ok(())
}

async fn create_router(state: AppState) -> Result<Router> {
    let api_routes = Router::new()
        // Mining endpoints
        .route("/miners", get(api::miners::list_miners))
        .route("/miners/:id", get(api::miners::get_miner))
        .route("/miners/:id/stats", get(api::miners::get_miner_stats))
        
        // Pool endpoints
        .route("/pool/stats", get(api::pool::get_pool_stats))
        .route("/pool/blocks", get(api::pool::get_blocks))
        .route("/pool/hashrate", get(api::pool::get_hashrate_history))
        
        // Share submission (Stratum-like protocol)
        .route("/submit", post(api::shares::submit_share))
        
        // Payout endpoints
        .route("/payouts", get(api::payouts::list_payouts))
        .route("/payouts/:id", get(api::payouts::get_payout))
        
        // Health and metrics
        .route("/health", get(health_check))
        .route("/metrics", get(metrics::prometheus_metrics));

    let app = Router::new()
        .nest("/api/v1", api_routes)
        .route("/ws", get(websocket_handler))
        .route("/", get(|| async { "Nockchain Mining Pool v1.0.0" }))
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
                .layer(CompressionLayer::new())
        )
        .with_state(state);

    Ok(app)
}

async fn start_background_tasks(
    pool: Arc<MiningPool>,
    database: Arc<Database>,
    metrics: Arc<Metrics>,
) -> Result<()> {
    // Start share processor
    let share_processor = pool.share_processor.clone();
    tokio::spawn(async move {
        if let Err(e) = share_processor.start().await {
            error!("Share processor error: {}", e);
        }
    });

    // Start payout engine
    let payout_engine = pool.payout_engine.clone();
    tokio::spawn(async move {
        if let Err(e) = payout_engine.start().await {
            error!("Payout engine error: {}", e);
        }
    });

    // Start difficulty adjuster
    let difficulty_adjuster = pool.difficulty_adjuster.clone();
    tokio::spawn(async move {
        if let Err(e) = difficulty_adjuster.start().await {
            error!("Difficulty adjuster error: {}", e);
        }
    });

    // Start metrics collector
    let metrics_collector = metrics.clone();
    tokio::spawn(async move {
        if let Err(e) = metrics_collector.start_collection().await {
            error!("Metrics collector error: {}", e);
        }
    });

    // Start database maintenance
    let db_maintenance = database.clone();
    tokio::spawn(async move {
        if let Err(e) = db_maintenance.start_maintenance().await {
            error!("Database maintenance error: {}", e);
        }
    });

    info!("🔄 Background tasks started");
    Ok(())
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| websocket::handle_websocket(socket, state))
}

async fn health_check(State(state): State<AppState>) -> Result<String, StatusCode> {
    // Check database health
    if let Err(_) = state.database.health_check().await {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    // Check mining pool health
    if !state.pool.is_healthy().await {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    Ok("OK".to_string())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            warn!("Received Ctrl+C, initiating graceful shutdown");
        },
        _ = terminate => {
            warn!("Received SIGTERM, initiating graceful shutdown");
        },
    }
}