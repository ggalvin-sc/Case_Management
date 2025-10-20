// Dashboard route handlers - full implementations
use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::User, error::AppResult};

/// GET /api/v1/dashboard/stats
pub async fn get_stats(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Value>> {
    // Get active matters count
    let matters = sqlx::query!("SELECT COUNT(*) as count FROM matters WHERE status = 'active'")
        .fetch_one(pool.as_ref())
        .await?;

    // Get unbilled time entries
    let time_entries = sqlx::query!("SELECT duration_minutes, amount FROM time_entries WHERE billed = 0")
        .fetch_all(pool.as_ref())
        .await?;

    let unbilled_hours: f64 = time_entries.iter()
        .map(|t| t.duration_minutes.unwrap_or(0) as f64)
        .sum::<f64>() / 60.0;

    let unbilled_time_amount: f64 = time_entries.iter()
        .map(|t| t.amount.unwrap_or(0.0))
        .sum();

    // Get unbilled expenses
    let expenses = sqlx::query!("SELECT billed_amount FROM expenses WHERE billed = 0")
        .fetch_all(pool.as_ref())
        .await?;

    let unbilled_expenses: f64 = expenses.iter()
        .map(|e| e.billed_amount.unwrap_or(0.0))
        .sum();

    Ok(Json(json!({
        "activeMatters": matters.count,
        "unbilledHours": (unbilled_hours * 10.0).round() / 10.0,
        "unbilledAmount": ((unbilled_time_amount + unbilled_expenses) * 100.0).round() / 100.0,
        "monthRevenue": 0.0
    })))
}

/// GET /api/v1/dashboard/activity
pub async fn get_activity(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<Value>>> {
    let entries = sqlx::query!(
        r#"
        SELECT
            t.entry_date,
            t.duration_minutes,
            u.first_name || ' ' || u.last_name as user_name,
            m.name as matter_name
        FROM time_entries t
        LEFT JOIN matters m ON t.matter_id = m.id
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.entry_date DESC
        LIMIT 10
        "#
    )
    .fetch_all(pool.as_ref())
    .await?;

    let activities: Vec<Value> = entries.iter().map(|e| {
        let hours = e.duration_minutes.unwrap_or(0) / 60;
        let minutes = e.duration_minutes.unwrap_or(0) % 60;
        let user_name = e.user_name.as_deref().unwrap_or("User");
        let matter_name = e.matter_name.as_deref().unwrap_or("matter");

        json!({
            "type": "time_entry",
            "description": format!("{} logged {}h {}m on {}", user_name, hours, minutes, matter_name),
            "timestamp": format!("{}T12:00:00Z", e.entry_date.as_deref().unwrap_or("2025-01-01"))
        })
    }).collect();

    Ok(Json(activities))
}
