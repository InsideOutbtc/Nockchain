// NOCK Mobile Application
// Eon-aware mobile app with advanced NOCK blockchain features

use tauri::{
    CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayEvent,
    SystemTrayMenu, SystemTrayMenuItem, Window,
};
use log::{info, warn, error};
use std::sync::Arc;
use tokio::sync::Mutex;

mod core;
mod wallet;
mod mining;
mod eon;
mod notifications;
mod security;
mod ui;

use core::*;
use wallet::*;
use mining::*;
use eon::*;
use notifications::*;
use security::*;

/// Main application state
#[derive(Debug)]
pub struct AppState {
    pub nock_client: Arc<Mutex<NockClient>>,
    pub wallet_manager: Arc<Mutex<WalletManager>>,
    pub eon_monitor: Arc<Mutex<EonMonitor>>,
    pub mining_monitor: Arc<Mutex<MiningMonitor>>,
    pub notification_service: Arc<Mutex<NotificationService>>,
    pub security_manager: Arc<Mutex<SecurityManager>>,
}

impl AppState {
    pub async fn new() -> Self {
        Self {
            nock_client: Arc::new(Mutex::new(NockClient::new().await)),
            wallet_manager: Arc::new(Mutex::new(WalletManager::new().await)),
            eon_monitor: Arc::new(Mutex::new(EonMonitor::new().await)),
            mining_monitor: Arc::new(Mutex::new(MiningMonitor::new().await)),
            notification_service: Arc::new(Mutex::new(NotificationService::new().await)),
            security_manager: Arc::new(Mutex::new(SecurityManager::new().await)),
        }
    }
}

fn main() {
    env_logger::init();
    info!("Starting NOCK Mobile Application");

    let menu = create_app_menu();
    let tray = create_system_tray();

    tauri::Builder::default()
        .menu(menu)
        .system_tray(tray)
        .on_system_tray_event(handle_system_tray_event)
        .setup(|app| {
            let app_handle = app.handle();
            
            // Initialize application state
            tauri::async_runtime::spawn(async move {
                let state = AppState::new().await;
                app_handle.manage(state);
                
                // Start background services
                start_background_services(app_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Wallet commands
            create_wallet,
            import_wallet,
            get_wallet_balance,
            send_transaction,
            get_transaction_history,
            
            // Eon commands
            get_current_eon,
            get_eon_transition_prediction,
            monitor_eon_changes,
            
            // Mining commands
            start_mobile_mining,
            stop_mobile_mining,
            get_mining_status,
            optimize_mining_settings,
            
            // Notification commands
            setup_push_notifications,
            configure_alerts,
            
            // Security commands
            setup_biometric_auth,
            encrypt_data,
            decrypt_data,
            
            // General commands
            get_network_status,
            get_app_status,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running NOCK Mobile Application");
}

fn create_app_menu() -> Menu {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let about = CustomMenuItem::new("about".to_string(), "About NOCK");
    let settings = CustomMenuItem::new("settings".to_string(), "Settings");
    
    let submenu = Submenu::new("NOCK", Menu::new()
        .add_item(about)
        .add_native_item(MenuItem::Separator)
        .add_item(settings)
        .add_native_item(MenuItem::Separator)
        .add_item(quit));
    
    Menu::new().add_submenu(submenu)
}

fn create_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let show = CustomMenuItem::new("show".to_string(), "Show");
    let mining_status = CustomMenuItem::new("mining".to_string(), "Mining Status");
    let eon_status = CustomMenuItem::new("eon".to_string(), "Current Eon");
    
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(eon_status)
        .add_item(mining_status)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    SystemTray::new().with_menu(tray_menu)
}

fn handle_system_tray_event(app: &tauri::AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
        }
        SystemTrayEvent::MenuItemClick { id, .. } => {
            match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "show" => {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.set_focus().unwrap();
                }
                "mining" => {
                    // Show mining status notification
                    show_mining_status_notification(app);
                }
                "eon" => {
                    // Show eon status notification
                    show_eon_status_notification(app);
                }
                _ => {}
            }
        }
        _ => {}
    }
}

async fn start_background_services(app_handle: tauri::AppHandle) {
    info!("Starting background services");
    
    // Start eon monitoring
    tokio::spawn(async move {
        let app_handle_clone = app_handle.clone();
        monitor_eon_transitions(app_handle_clone).await;
    });
    
    // Start mining optimization
    tokio::spawn(async move {
        let app_handle_clone = app_handle.clone();
        optimize_mobile_mining(app_handle_clone).await;
    });
    
    // Start notification service
    tokio::spawn(async move {
        let app_handle_clone = app_handle.clone();
        run_notification_service(app_handle_clone).await;
    });
}

async fn monitor_eon_transitions(app_handle: tauri::AppHandle) {
    info!("Starting eon transition monitoring");
    
    loop {
        if let Ok(state) = app_handle.try_state::<AppState>() {
            let mut eon_monitor = state.eon_monitor.lock().await;
            
            if let Ok(transition_prediction) = eon_monitor.check_transition_prediction().await {
                if transition_prediction.confidence > 0.8 {
                    // Send notification about upcoming eon transition
                    let mut notification_service = state.notification_service.lock().await;
                    notification_service.send_eon_transition_alert(transition_prediction).await;
                }
            }
        }
        
        tokio::time::sleep(tokio::time::Duration::from_secs(300)).await; // Check every 5 minutes
    }
}

async fn optimize_mobile_mining(app_handle: tauri::AppHandle) {
    info!("Starting mobile mining optimization");
    
    loop {
        if let Ok(state) = app_handle.try_state::<AppState>() {
            let mut mining_monitor = state.mining_monitor.lock().await;
            
            // Optimize mining settings based on device capabilities and eon status
            mining_monitor.optimize_for_mobile_device().await;
            
            // Check mining profitability
            if let Ok(profitability) = mining_monitor.calculate_mobile_profitability().await {
                if profitability.is_profitable && !mining_monitor.is_mining() {
                    mining_monitor.start_optimized_mining().await;
                } else if !profitability.is_profitable && mining_monitor.is_mining() {
                    mining_monitor.stop_mining().await;
                }
            }
        }
        
        tokio::time::sleep(tokio::time::Duration::from_secs(600)).await; // Check every 10 minutes
    }
}

async fn run_notification_service(app_handle: tauri::AppHandle) {
    info!("Starting notification service");
    
    loop {
        if let Ok(state) = app_handle.try_state::<AppState>() {
            let mut notification_service = state.notification_service.lock().await;
            
            // Process pending notifications
            notification_service.process_pending_notifications().await;
            
            // Check for important events
            notification_service.check_for_important_events().await;
        }
        
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await; // Check every minute
    }
}

fn show_mining_status_notification(app: &tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        if let Ok(state) = app.try_state::<AppState>() {
            let mining_monitor = state.mining_monitor.lock().await;
            let status = mining_monitor.get_status().await;
            
            // Show system notification with mining status
            let notification_text = format!(
                "Mining: {} | Hashrate: {:.2} H/s | Profit: {:.4} NOCK/hr",
                if status.is_active { "Active" } else { "Inactive" },
                status.hashrate,
                status.estimated_profit_per_hour
            );
            
            // This would use the platform's notification system
            info!("Mining Status: {}", notification_text);
        }
    });
}

fn show_eon_status_notification(app: &tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        if let Ok(state) = app.try_state::<AppState>() {
            let eon_monitor = state.eon_monitor.lock().await;
            let status = eon_monitor.get_current_status().await;
            
            let notification_text = format!(
                "Current Eon: {} | Block: {} | Next Transition: ~{} blocks",
                status.current_eon,
                status.current_block,
                status.blocks_until_transition
            );
            
            info!("Eon Status: {}", notification_text);
        }
    });
}

// Tauri command handlers
#[tauri::command]
async fn create_wallet(app_handle: tauri::AppHandle, password: String) -> Result<WalletInfo, String> {
    let state = app_handle.state::<AppState>();
    let mut wallet_manager = state.wallet_manager.lock().await;
    
    wallet_manager.create_new_wallet(password)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn import_wallet(app_handle: tauri::AppHandle, mnemonic: String, password: String) -> Result<WalletInfo, String> {
    let state = app_handle.state::<AppState>();
    let mut wallet_manager = state.wallet_manager.lock().await;
    
    wallet_manager.import_wallet_from_mnemonic(mnemonic, password)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_wallet_balance(app_handle: tauri::AppHandle) -> Result<WalletBalance, String> {
    let state = app_handle.state::<AppState>();
    let wallet_manager = state.wallet_manager.lock().await;
    
    wallet_manager.get_balance()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn send_transaction(
    app_handle: tauri::AppHandle,
    to_address: String,
    amount: f64,
    password: String
) -> Result<TransactionResult, String> {
    let state = app_handle.state::<AppState>();
    let mut wallet_manager = state.wallet_manager.lock().await;
    
    wallet_manager.send_transaction(to_address, amount, password)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_transaction_history(app_handle: tauri::AppHandle) -> Result<Vec<TransactionHistory>, String> {
    let state = app_handle.state::<AppState>();
    let wallet_manager = state.wallet_manager.lock().await;
    
    wallet_manager.get_transaction_history()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_current_eon(app_handle: tauri::AppHandle) -> Result<EonStatus, String> {
    let state = app_handle.state::<AppState>();
    let eon_monitor = state.eon_monitor.lock().await;
    
    eon_monitor.get_current_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_eon_transition_prediction(app_handle: tauri::AppHandle) -> Result<EonTransitionPrediction, String> {
    let state = app_handle.state::<AppState>();
    let eon_monitor = state.eon_monitor.lock().await;
    
    eon_monitor.get_transition_prediction()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn monitor_eon_changes(app_handle: tauri::AppHandle, enable: bool) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    let mut eon_monitor = state.eon_monitor.lock().await;
    
    if enable {
        eon_monitor.start_monitoring().await
    } else {
        eon_monitor.stop_monitoring().await
    }
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_mobile_mining(app_handle: tauri::AppHandle) -> Result<MiningStatus, String> {
    let state = app_handle.state::<AppState>();
    let mut mining_monitor = state.mining_monitor.lock().await;
    
    mining_monitor.start_optimized_mining()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_mobile_mining(app_handle: tauri::AppHandle) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    let mut mining_monitor = state.mining_monitor.lock().await;
    
    mining_monitor.stop_mining()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_mining_status(app_handle: tauri::AppHandle) -> Result<MiningStatus, String> {
    let state = app_handle.state::<AppState>();
    let mining_monitor = state.mining_monitor.lock().await;
    
    mining_monitor.get_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn optimize_mining_settings(app_handle: tauri::AppHandle) -> Result<MiningOptimization, String> {
    let state = app_handle.state::<AppState>();
    let mut mining_monitor = state.mining_monitor.lock().await;
    
    mining_monitor.optimize_for_mobile_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn setup_push_notifications(app_handle: tauri::AppHandle, token: String) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    let mut notification_service = state.notification_service.lock().await;
    
    notification_service.setup_push_notifications(token)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn configure_alerts(app_handle: tauri::AppHandle, config: AlertConfig) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    let mut notification_service = state.notification_service.lock().await;
    
    notification_service.configure_alerts(config)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn setup_biometric_auth(app_handle: tauri::AppHandle) -> Result<BiometricSetup, String> {
    let state = app_handle.state::<AppState>();
    let mut security_manager = state.security_manager.lock().await;
    
    security_manager.setup_biometric_authentication()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn encrypt_data(app_handle: tauri::AppHandle, data: String) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let security_manager = state.security_manager.lock().await;
    
    security_manager.encrypt_sensitive_data(data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn decrypt_data(app_handle: tauri::AppHandle, encrypted_data: String) -> Result<String, String> {
    let state = app_handle.state::<AppState>();
    let security_manager = state.security_manager.lock().await;
    
    security_manager.decrypt_sensitive_data(encrypted_data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_network_status(app_handle: tauri::AppHandle) -> Result<NetworkStatus, String> {
    let state = app_handle.state::<AppState>();
    let nock_client = state.nock_client.lock().await;
    
    nock_client.get_network_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_app_status(app_handle: tauri::AppHandle) -> Result<AppStatus, String> {
    let state = app_handle.state::<AppState>();
    
    Ok(AppStatus {
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
        wallet_connected: state.wallet_manager.lock().await.is_connected().await,
        mining_active: state.mining_monitor.lock().await.is_mining(),
        eon_monitoring: state.eon_monitor.lock().await.is_monitoring().await,
    })
}