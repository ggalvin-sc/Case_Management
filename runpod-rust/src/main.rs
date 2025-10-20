//! RunPod Rust Service
//!
//! A high-performance Rust-based HTTP service for interacting with RunPod serverless API.
//! Provides RESTful endpoints for executing jobs, checking status, canceling, and polling.
//!
//! # Usage
//!
//! 1. Set environment variables (or create .env file):
//!    ```bash
//!    RUNPOD_API_KEY=your_api_key_here
//!    PORT=3001
//!    ```
//!
//! 2. Run the service:
//!    ```bash
//!    cargo run --release
//!    ```
//!
//! 3. Access the API:
//!    - Health check: GET http://localhost:3001/health
//!    - Execute: POST http://localhost:3001/execute
//!    - Status: GET http://localhost:3001/status/:endpoint_id/:job_id
//!    - Cancel: POST http://localhost:3001/cancel/:endpoint_id/:job_id
//!    - Poll: POST http://localhost:3001/poll/:endpoint_id/:job_id
//!    - API Health: GET http://localhost:3001/api-health

mod config;
mod error;
mod models;
mod routes;
mod runpod;

use crate::config::Config;
use crate::routes::{build_router, AppState};
use crate::runpod::RunPodClient;
use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE},
    HeaderValue, Method,
};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,runpod_rust=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = match Config::from_env() {
        Ok(cfg) => {
            info!("Configuration loaded successfully");
            info!("RunPod API Base: {}", cfg.runpod_api_base);
            info!("Server Address: {}", cfg.server_address());
            cfg
        }
        Err(e) => {
            error!("Failed to load configuration: {}", e);
            error!("Please ensure RUNPOD_API_KEY is set in .env file or environment");
            std::process::exit(1);
        }
    };

    // Create RunPod client
    let runpod_client = match RunPodClient::new(&config) {
        Ok(client) => {
            info!("RunPod client initialized");
            client
        }
        Err(e) => {
            error!("Failed to create RunPod client: {}", e);
            std::process::exit(1);
        }
    };

    // Test RunPod API connectivity
    info!("Testing RunPod API connectivity...");
    match runpod_client.health_check().await {
        Ok(true) => info!("RunPod API is accessible"),
        Ok(false) => warn!("RunPod API health check returned false"),
        Err(e) => warn!("RunPod API health check failed: {}", e),
    }

    // Create application state
    let app_state = AppState {
        runpod_client,
        config: config.clone(),
    };

    // Build router with routes
    let app = build_router(app_state)
        .layer(
            CorsLayer::new()
                .allow_origin("http://localhost:8000".parse::<HeaderValue>().unwrap())
                .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
                .allow_origin("http://127.0.0.1:8000".parse::<HeaderValue>().unwrap())
                .allow_origin("http://127.0.0.1:3000".parse::<HeaderValue>().unwrap())
                .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
                .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE])
                .allow_credentials(true),
        )
        .layer(TraceLayer::new_for_http());

    // Start server
    let listener = match tokio::net::TcpListener::bind(&config.server_address()).await {
        Ok(listener) => listener,
        Err(e) => {
            error!("Failed to bind to {}: {}", config.server_address(), e);
            std::process::exit(1);
        }
    };

    info!("==========================================");
    info!("RunPod Rust Service v{}", env!("CARGO_PKG_VERSION"));
    info!("==========================================");
    info!("Server listening on http://{}", config.server_address());
    info!("");
    info!("API Endpoints:");
    info!("  GET  /health                          - Service health check");
    info!("  POST /execute                         - Execute endpoint");
    info!("  GET  /status/:endpoint_id/:job_id     - Get job status");
    info!("  POST /cancel/:endpoint_id/:job_id     - Cancel job");
    info!("  POST /poll/:endpoint_id/:job_id       - Poll until complete");
    info!("  GET  /api-health                      - RunPod API health");
    info!("==========================================");

    if let Err(e) = axum::serve(listener, app).await {
        error!("Server error: {}", e);
        std::process::exit(1);
    }
}
