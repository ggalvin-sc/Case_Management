// Time entry route handlers - full implementations
use axum::{extract::{Path, State}, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::{User, TimeEntry, CreateTimeEntryRequest}, error::AppResult};

pub async fn list(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<TimeEntry>>> {
    let entries = sqlx::query_as::<_, TimeEntry>("SELECT * FROM time_entries LIMIT 100")
        .fetch_all(pool.as_ref())
        .await?;
    Ok(Json(entries))
}

/// Create a new time entry
pub async fn create(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(req): Json<CreateTimeEntryRequest>,
) -> AppResult<Json<TimeEntry>> {
    let hourly_rate = req.hourly_rate.unwrap_or(0.0);
    let amount = (req.duration_minutes as f64 / 60.0) * hourly_rate;
    let billable = if req.billable.unwrap_or(true) { 1 } else { 0 };

    let result = sqlx::query!(
        r#"
        INSERT INTO time_entries (matter_id, user_id, entry_date, duration_minutes, description, hourly_rate, amount, billable, billed)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, 0)
        "#,
        req.matter_id,
        req.entry_date,
        req.duration_minutes,
        req.description,
        hourly_rate,
        amount,
        billable
    )
    .execute(pool.as_ref())
    .await?;

    let entry = sqlx::query_as::<_, TimeEntry>("SELECT * FROM time_entries WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(entry))
}

/// Update time entry (typically for marking as billed)
pub async fn update(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
    Json(data): Json<Value>,
) -> AppResult<Json<TimeEntry>> {
    let mut updates = Vec::new();

    if let Some(billed) = data.get("billed") {
        let billed_val = if billed.as_bool().unwrap_or(false) { 1 } else { 0 };
        updates.push(("billed", billed_val.to_string()));
    }

    if let Some(invoice_id) = data.get("invoice_id") {
        let invoice_id_str = invoice_id.to_string();
        updates.push(("invoice_id", invoice_id_str));
    }

    if !updates.is_empty() {
        let set_clause: Vec<String> = updates.iter()
            .map(|(field, _)| format!("{} = ?", field))
            .collect();

        let sql = format!("UPDATE time_entries SET {} WHERE id = ?", set_clause.join(", "));
        let mut query = sqlx::query(&sql);

        for (_, value) in &updates {
            query = query.bind(value);
        }
        query = query.bind(id);

        query.execute(pool.as_ref()).await?;
    }

    let entry = sqlx::query_as::<_, TimeEntry>("SELECT * FROM time_entries WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(entry))
}
