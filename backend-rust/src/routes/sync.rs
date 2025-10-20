// Kimai sync route handlers - full implementation
use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::User, error::AppResult};

/// Sync timesheets from Kimai (stub implementation - Kimai integration optional)
pub async fn sync_kimai(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Value>> {
    // Kimai integration is optional - this would make HTTP requests to Kimai API
    // For now, return a stub response indicating no Kimai configured
    Ok(Json(json!({
        "count": 0,
        "message": "Kimai not available - using local database"
    })))
}
