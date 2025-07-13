// NOCK Analytics Dashboard
// Advanced analytics platform for NOCK blockchain with proof power trends and comprehensive metrics

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{Html, Json},
    routing::{get, post},
    Router,
};
use tower_http::{cors::CorsLayer, services::ServeDir};
use std::sync::Arc;
use tokio::sync::RwLock;
use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use std::collections::HashMap;

mod analytics;
mod metrics;
mod dashboard;
mod data_collector;
mod ml_analytics;
mod visualization;
mod api;

use analytics::*;
use metrics::*;
use dashboard::*;
use data_collector::*;
use ml_analytics::*;
use visualization::*;
use api::*;

/// Main application state for the analytics dashboard
#[derive(Debug)]
pub struct AppState {
    pub analytics_engine: Arc<RwLock<AnalyticsEngine>>,
    pub metrics_collector: Arc<RwLock<MetricsCollector>>,
    pub dashboard_manager: Arc<RwLock<DashboardManager>>,
    pub data_collector: Arc<RwLock<DataCollector>>,
    pub ml_analytics: Arc<RwLock<MLAnalytics>>,
    pub visualization_engine: Arc<RwLock<VisualizationEngine>>,
    pub real_time_monitor: Arc<RwLock<RealTimeMonitor>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardRequest {
    pub time_range: String,
    pub metrics: Vec<String>,
    pub granularity: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyticsResponse {
    pub proof_power_trends: ProofPowerTrends,
    pub eon_analytics: EonAnalytics,
    pub mining_analytics: MiningAnalytics,
    pub network_health: NetworkHealth,
    pub performance_metrics: PerformanceMetrics,
    pub predictions: PredictionResults,
}

impl AppState {
    pub async fn new() -> Self {
        Self {
            analytics_engine: Arc::new(RwLock::new(AnalyticsEngine::new().await)),
            metrics_collector: Arc::new(RwLock::new(MetricsCollector::new().await)),
            dashboard_manager: Arc::new(RwLock::new(DashboardManager::new().await)),
            data_collector: Arc::new(RwLock::new(DataCollector::new().await)),
            ml_analytics: Arc::new(RwLock::new(MLAnalytics::new().await)),
            visualization_engine: Arc::new(RwLock::new(VisualizationEngine::new().await)),
            real_time_monitor: Arc::new(RwLock::new(RealTimeMonitor::new().await)),
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    info!("Starting NOCK Analytics Dashboard");

    // Initialize application state
    let app_state = AppState::new().await;

    // Start background data collection
    start_background_services(app_state.clone()).await;

    // Create router
    let app = Router::new()
        .route("/", get(dashboard_home))
        .route("/api/analytics", get(get_analytics))
        .route("/api/proof-power", get(get_proof_power_trends))
        .route("/api/eon-analytics", get(get_eon_analytics))
        .route("/api/mining-analytics", get(get_mining_analytics))
        .route("/api/network-health", get(get_network_health))
        .route("/api/predictions", get(get_predictions))
        .route("/api/real-time", get(get_real_time_data))
        .route("/api/custom-query", post(custom_analytics_query))
        .route("/api/export", post(export_analytics_data))
        .nest_service("/static", ServeDir::new("static"))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    info!("NOCK Analytics Dashboard listening on http://0.0.0.0:3001");
    
    axum::serve(listener, app).await?;

    Ok(())
}

async fn start_background_services(app_state: AppState) {
    info!("Starting background analytics services");

    // Start data collection
    tokio::spawn({
        let app_state = app_state.clone();
        async move {
            loop {
                if let Ok(mut collector) = app_state.data_collector.write().await {
                    if let Err(e) = collector.collect_blockchain_data().await {
                        error!("Data collection error: {}", e);
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            }
        }
    });

    // Start real-time monitoring
    tokio::spawn({
        let app_state = app_state.clone();
        async move {
            loop {
                if let Ok(mut monitor) = app_state.real_time_monitor.write().await {
                    if let Err(e) = monitor.update_real_time_metrics().await {
                        error!("Real-time monitoring error: {}", e);
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
            }
        }
    });

    // Start ML analytics processing
    tokio::spawn({
        let app_state = app_state.clone();
        async move {
            loop {
                if let Ok(mut ml_analytics) = app_state.ml_analytics.write().await {
                    if let Err(e) = ml_analytics.process_analytics_batch().await {
                        error!("ML analytics error: {}", e);
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(300)).await; // Every 5 minutes
            }
        }
    });

    // Start metrics aggregation
    tokio::spawn({
        let app_state = app_state.clone();
        async move {
            loop {
                if let Ok(mut collector) = app_state.metrics_collector.write().await {
                    if let Err(e) = collector.aggregate_metrics().await {
                        error!("Metrics aggregation error: {}", e);
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_secs(120)).await; // Every 2 minutes
            }
        }
    });
}

// Dashboard route handlers
async fn dashboard_home() -> Html<&'static str> {
    Html(include_str!("../templates/dashboard.html"))
}

async fn get_analytics(
    State(app_state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<AnalyticsResponse>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.generate_comprehensive_analytics(&params).await {
        Ok(analytics) => Ok(Json(analytics)),
        Err(e) => {
            error!("Analytics generation error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_proof_power_trends(
    State(app_state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<ProofPowerTrends>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.analyze_proof_power_trends(&params).await {
        Ok(trends) => Ok(Json(trends)),
        Err(e) => {
            error!("Proof power trends error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_eon_analytics(
    State(app_state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<EonAnalytics>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.analyze_eon_patterns(&params).await {
        Ok(analytics) => Ok(Json(analytics)),
        Err(e) => {
            error!("Eon analytics error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_mining_analytics(
    State(app_state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<MiningAnalytics>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.analyze_mining_performance(&params).await {
        Ok(analytics) => Ok(Json(analytics)),
        Err(e) => {
            error!("Mining analytics error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_network_health(
    State(app_state): State<AppState>,
) -> Result<Json<NetworkHealth>, StatusCode> {
    let metrics_collector = app_state.metrics_collector.read().await;
    
    match metrics_collector.get_network_health_metrics().await {
        Ok(health) => Ok(Json(health)),
        Err(e) => {
            error!("Network health error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_predictions(
    State(app_state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<PredictionResults>, StatusCode> {
    let ml_analytics = app_state.ml_analytics.read().await;
    
    match ml_analytics.generate_predictions(&params).await {
        Ok(predictions) => Ok(Json(predictions)),
        Err(e) => {
            error!("Predictions error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_real_time_data(
    State(app_state): State<AppState>,
) -> Result<Json<RealTimeData>, StatusCode> {
    let real_time_monitor = app_state.real_time_monitor.read().await;
    
    match real_time_monitor.get_current_data().await {
        Ok(data) => Ok(Json(data)),
        Err(e) => {
            error!("Real-time data error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn custom_analytics_query(
    State(app_state): State<AppState>,
    Json(query): Json<CustomAnalyticsQuery>,
) -> Result<Json<CustomAnalyticsResult>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.execute_custom_query(query).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => {
            error!("Custom query error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn export_analytics_data(
    State(app_state): State<AppState>,
    Json(export_request): Json<ExportRequest>,
) -> Result<Json<ExportResult>, StatusCode> {
    let analytics_engine = app_state.analytics_engine.read().await;
    
    match analytics_engine.export_analytics_data(export_request).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => {
            error!("Export error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Data types for API responses
#[derive(Debug, Serialize, Deserialize)]
pub struct ProofPowerTrends {
    pub software_mining_percentage: f64,
    pub hardware_mining_percentage: f64,
    pub average_proof_power: f64,
    pub proof_power_distribution: Vec<ProofPowerDataPoint>,
    pub efficiency_trends: EfficiencyTrends,
    pub optimization_opportunities: Vec<OptimizationOpportunity>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProofPowerDataPoint {
    pub timestamp: DateTime<Utc>,
    pub proof_power: f64,
    pub hashrate: f64,
    pub efficiency_score: f64,
    pub miner_count: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EfficiencyTrends {
    pub software_efficiency_trend: f64,
    pub hardware_efficiency_trend: f64,
    pub overall_network_efficiency: f64,
    pub efficiency_improvement_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationOpportunity {
    pub opportunity_type: String,
    pub potential_improvement: f64,
    pub implementation_difficulty: f64,
    pub estimated_impact: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EonAnalytics {
    pub current_eon: u64,
    pub eon_duration_analysis: EonDurationAnalysis,
    pub transition_patterns: Vec<TransitionPattern>,
    pub reward_curve_analysis: RewardCurveAnalysis,
    pub difficulty_progression: DifficultyProgression,
    pub mining_participation_trends: MiningParticipationTrends,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EonDurationAnalysis {
    pub average_duration: Duration,
    pub duration_variance: f64,
    pub trend_analysis: String,
    pub prediction_accuracy: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransitionPattern {
    pub pattern_name: String,
    pub frequency: f64,
    pub predictability_score: f64,
    pub market_impact: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RewardCurveAnalysis {
    pub steepness_factor: f64,
    pub early_miner_advantage: f64,
    pub curve_efficiency: f64,
    pub halvening_impact: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DifficultyProgression {
    pub current_difficulty: f64,
    pub adjustment_frequency: f64,
    pub volatility_score: f64,
    pub predictability_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MiningParticipationTrends {
    pub active_miners: u64,
    pub participation_growth_rate: f64,
    pub decentralization_score: f64,
    pub geographic_distribution: HashMap<String, f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MiningAnalytics {
    pub hashrate_distribution: HashrateDistribution,
    pub mining_profitability: MiningProfitabilityAnalysis,
    pub pool_analytics: PoolAnalytics,
    pub hardware_software_ratio: HardwareSoftwareRatio,
    pub energy_efficiency: EnergyEfficiencyMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HashrateDistribution {
    pub total_hashrate: f64,
    pub top_10_concentration: f64,
    pub nakamoto_coefficient: f64,
    pub distribution_trend: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MiningProfitabilityAnalysis {
    pub average_profitability: f64,
    pub profitability_variance: f64,
    pub break_even_difficulty: f64,
    pub roi_distribution: Vec<ROIDataPoint>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ROIDataPoint {
    pub timestamp: DateTime<Utc>,
    pub roi_percentage: f64,
    pub mining_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PoolAnalytics {
    pub pool_count: u64,
    pub pool_concentration: f64,
    pub average_pool_size: f64,
    pub pool_efficiency_scores: HashMap<String, f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HardwareSoftwareRatio {
    pub hardware_percentage: f64,
    pub software_percentage: f64,
    pub efficiency_comparison: f64,
    pub trend_direction: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnergyEfficiencyMetrics {
    pub average_power_consumption: f64,
    pub efficiency_per_hash: f64,
    pub renewable_energy_percentage: f64,
    pub carbon_footprint_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkHealth {
    pub node_count: u64,
    pub network_latency: f64,
    pub transaction_throughput: f64,
    pub block_propagation_time: f64,
    pub consensus_health_score: f64,
    pub security_metrics: SecurityMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SecurityMetrics {
    pub attack_resistance_score: f64,
    pub decentralization_index: f64,
    pub consensus_participation: f64,
    pub network_resilience: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub transaction_speed: f64,
    pub block_time_variance: f64,
    pub network_efficiency: f64,
    pub scalability_metrics: ScalabilityMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScalabilityMetrics {
    pub transactions_per_second: f64,
    pub block_size_efficiency: f64,
    pub storage_efficiency: f64,
    pub bandwidth_utilization: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PredictionResults {
    pub difficulty_predictions: Vec<DifficultyPrediction>,
    pub eon_transition_predictions: Vec<EonTransitionPrediction>,
    pub mining_profitability_predictions: Vec<ProfitabilityPrediction>,
    pub network_growth_predictions: NetworkGrowthPredictions,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DifficultyPrediction {
    pub timestamp: DateTime<Utc>,
    pub predicted_difficulty: f64,
    pub confidence_interval: (f64, f64),
    pub prediction_horizon: Duration,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EonTransitionPrediction {
    pub predicted_block: u64,
    pub confidence: f64,
    pub estimated_time: DateTime<Utc>,
    pub expected_impact: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitabilityPrediction {
    pub timestamp: DateTime<Utc>,
    pub predicted_profitability: f64,
    pub mining_type: String,
    pub confidence_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkGrowthPredictions {
    pub hashrate_growth: f64,
    pub node_growth: f64,
    pub adoption_rate: f64,
    pub market_cap_projection: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RealTimeData {
    pub current_block: u64,
    pub current_difficulty: f64,
    pub current_hashrate: f64,
    pub active_miners: u64,
    pub transaction_pool_size: u64,
    pub network_status: String,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomAnalyticsQuery {
    pub query_type: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub time_range: TimeRange,
    pub aggregation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomAnalyticsResult {
    pub query_id: String,
    pub result_data: serde_json::Value,
    pub metadata: QueryMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryMetadata {
    pub execution_time: Duration,
    pub data_points: u64,
    pub accuracy_score: f64,
    pub cache_hit: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub export_format: String,
    pub data_types: Vec<String>,
    pub time_range: TimeRange,
    pub include_predictions: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub export_id: String,
    pub download_url: String,
    pub file_size: u64,
    pub expires_at: DateTime<Utc>,
}