//! Rust Backend for Case Management System
//!
//! A production-ready backend service built with Axum, SQLx, and JWT authentication.
//! Replaces the Node.js backend with improved performance and type safety.
//!
//! # Features
//!
//! - JWT-based authentication with bcrypt password hashing
//! - SQLite database with type-safe queries via SQLx
//! - Rate limiting for login attempts
//! - CORS configuration
//! - Comprehensive error handling
//! - Static file serving for frontend
//! - RunPod and Kimai API integration
//!
//! # Usage
//!
//! ```bash
//! # Development
//! cargo run
//!
//! # Production (optimized)
//! cargo run --release
//! ```

mod auth;
mod config;
mod db;
mod error;
mod routes;

use std::sync::Arc;

use axum::{
    http::{header, HeaderValue, Method, StatusCode},
    response::IntoResponse,
    routing::{get, post, patch, delete},
    Json, Router,
};
use serde_json::json;
use sqlx::SqlitePool;
use tower_http::{
    cors::CorsLayer,
    services::ServeDir,
    trace::TraceLayer,
};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::{
    config::Config,
    db::create_pool,
    error::AppError,
};

#[tokio::main]
async fn main() {
    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,backend_rust=debug,sqlx=warn,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting Rust backend...");

    // Load configuration
    let config = match Config::from_env() {
        Ok(cfg) => {
            info!("Configuration loaded successfully");
            info!("Environment: {}", cfg.app_env);
            info!("Database: {}", cfg.database_url);
            info!("Server: {}", cfg.server_address());
            info!("CORS Origins: {:?}", cfg.allowed_origins);
            cfg
        }
        Err(e) => {
            error!("Failed to load configuration: {}", e);
            std::process::exit(1);
        }
    };

    // Create database connection pool
    let pool = match create_pool(&config.database_url).await {
        Ok(pool) => {
            info!("Database connection pool created");
            pool
        }
        Err(e) => {
            error!("Failed to create database pool: {}", e);
            std::process::exit(1);
        }
    };

    // Test database connection
    if let Err(e) = db::test_connection(&pool).await {
        error!("Database connection test failed: {}", e);
        std::process::exit(1);
    }

    // Build application router
    let app = build_router(pool, config.clone()).await;

    // Start server
    let addr = config.server_address();
    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => listener,
        Err(e) => {
            error!("Failed to bind to {}: {}", addr, e);
            std::process::exit(1);
        }
    };

    info!("");
    info!("╔══════════════════════════════════════════════════════════════════╗");
    info!("║  Case Management System - Rust Backend v{}                  ║", env!("CARGO_PKG_VERSION"));
    info!("╠══════════════════════════════════════════════════════════════════╣");
    info!("║  Server:    http://{}                                      ║", addr);
    info!("║  Database:  {}                  ║", config.database_url);
    info!("║  Kimai:     {}                                         ║", if config.kimai_enabled() { "Enabled " } else { "Disabled" });
    info!("║  RunPod:    {}                                         ║", if config.runpod_enabled() { "Enabled " } else { "Disabled" });
    info!("╠══════════════════════════════════════════════════════════════════╣");
    info!("║  API Endpoints:                                                  ║");
    info!("║    POST   /api/v1/auth/login         - User login               ║");
    info!("║    GET    /api/v1/auth/me            - Get current user         ║");
    info!("║    GET    /api/v1/dashboard/stats    - Dashboard statistics     ║");
    info!("║    GET    /api/v1/clients            - List clients             ║");
    info!("║    GET    /api/v1/matters            - List matters             ║");
    info!("║    GET    /api/v1/invoices           - List invoices            ║");
    info!("║    GET    /health                    - Health check             ║");
    info!("╚══════════════════════════════════════════════════════════════════╝");
    info!("");

    if let Err(e) = axum::serve(listener, app).await {
        error!("Server error: {}", e);
        std::process::exit(1);
    }
}

/// Build the Axum router with all routes and middleware
async fn build_router(pool: SqlitePool, config: Config) -> Router {
    let pool = Arc::new(pool);
    let config = Arc::new(config);

    // Parse CORS origins
    let cors_origins: Vec<HeaderValue> = config
        .allowed_origins
        .iter()
        .filter_map(|origin| origin.parse().ok())
        .collect();

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_origin(cors_origins)
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE, Method::OPTIONS])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, header::ACCEPT])
        .allow_credentials(true);

    // API routes (with authentication)
    let api_routes = Router::new()
        // Authentication routes (no auth required)
        .route("/auth/login", post(routes::auth::login))
        // Protected routes (auth required)
        .route("/auth/me", get(routes::auth::get_current_user))
        .route("/auth/change-password", post(routes::auth::change_password))
        .route("/dashboard/stats", get(routes::dashboard::get_stats))
        .route("/dashboard/activity", get(routes::dashboard::get_activity))
        .route("/clients", get(routes::clients::list_clients).post(routes::clients::create_client))
        .route("/clients/:id", get(routes::clients::get_client))
        .route("/matters", get(routes::matters::list_matters).post(routes::matters::create_matter))
        .route("/matters/:id", get(routes::matters::get_matter).patch(routes::matters::update_matter))
        .route("/matters/:id/summary", get(routes::matters::get_summary))
        .route("/matters/:id/time-entries", get(routes::matters::get_time_entries))
        .route("/matters/:id/expenses", get(routes::matters::get_expenses))
        .route("/matters/:id/invoices", get(routes::matters::get_invoices))
        .route("/matters/:id/unbilled", get(routes::matters::get_unbilled))
        .route("/users", get(routes::users::list_users))
        .route("/time-entries", get(routes::time_entries::list).post(routes::time_entries::create))
        .route("/time-entries/:id", patch(routes::time_entries::update))
        .route("/expenses", get(routes::expenses::list).post(routes::expenses::create))
        .route("/invoices", get(routes::invoices::list).post(routes::invoices::create))
        .route("/invoices/:id", get(routes::invoices::get).patch(routes::invoices::update).delete(routes::invoices::delete))
        .route("/invoices/:id/finalize", post(routes::invoices::finalize))
        .route("/invoices/:id/send", post(routes::invoices::send))
        .route("/invoices/:id/payment", post(routes::invoices::record_payment))
        .route("/invoices/:id/status", patch(routes::invoices::update_status))
        .route("/firm-settings", get(routes::firm_settings::get).patch(routes::firm_settings::update))
        .route("/sync/kimai/timesheets", post(routes::sync::sync_kimai))
        .with_state((pool.clone(), config.clone()));

    // Root router with all routes
    Router::new()
        .route("/health", get(health_check))
        .nest("/api/v1", api_routes)
        // Serve static files from frontend directory
        .nest_service("/", ServeDir::new("../frontend"))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .fallback(not_found)
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "backend-rust",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

/// 404 handler
async fn not_found() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": "Not Found",
            "message": "The requested resource was not found"
        })),
    )
}
