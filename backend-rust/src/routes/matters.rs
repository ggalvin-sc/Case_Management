// Matter route handlers - full implementations
use axum::{extract::{Path, State}, Extension, Json};
use serde_json::{json, Value};
use sqlx::{SqlitePool, Row};
use std::sync::Arc;
use chrono::Utc;

use crate::{config::Config, db::models::{User, Matter, CreateMatterRequest, TimeEntry, Expense, Invoice}, error::AppResult};

pub async fn list_matters(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<Matter>>> {
    let matters = sqlx::query_as::<_, Matter>("SELECT * FROM matters")
        .fetch_all(pool.as_ref())
        .await?;
    Ok(Json(matters))
}

pub async fn get_matter(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Matter>> {
    let matter = sqlx::query_as::<_, Matter>("SELECT * FROM matters WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;
    Ok(Json(matter))
}

/// Create a new matter with rate hierarchy: matter rate > client rate > system default ($350)
pub async fn create_matter(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(req): Json<CreateMatterRequest>,
) -> AppResult<Json<Matter>> {
    // Get client to determine default rate
    let client = sqlx::query_scalar::<_, Option<f64>>("SELECT default_hourly_rate FROM clients WHERE id = ?")
        .bind(req.client_id)
        .fetch_one(pool.as_ref())
        .await?;

    // Rate hierarchy: matter rate > client rate > system default
    let hourly_rate = req.hourly_rate
        .or(client)
        .unwrap_or(350.0);

    let matter_number = req.matter_number
        .unwrap_or_else(|| format!("M-{}", Utc::now().timestamp()));

    let open_date = req.open_date
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    let billing_type = req.billing_type.unwrap_or_else(|| "hourly".to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO matters (
            matter_number, client_id, name, description, status, attorney_id, attorney_hourly_rate,
            billing_type, hourly_rate, trial_contingency_percentage, appeal_contingency_percentage,
            open_date, matter_type, practice_area, priority, court_name, case_number,
            opposing_party, opposing_counsel, statute_of_limitations_date, trial_date, appeal_date,
            retainer_amount, estimated_hours, notes
        ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&matter_number)
    .bind(req.client_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.attorney_id)
    .bind(req.attorney_hourly_rate)
    .bind(&billing_type)
    .bind(hourly_rate)
    .bind(req.trial_contingency_percentage)
    .bind(req.appeal_contingency_percentage)
    .bind(&open_date)
    .bind(&req.matter_type)
    .bind(&req.practice_area)
    .bind(&req.priority)
    .bind(&req.court_name)
    .bind(&req.case_number)
    .bind(&req.opposing_party)
    .bind(&req.opposing_counsel)
    .bind(&req.statute_of_limitations_date)
    .bind(&req.trial_date)
    .bind(&req.appeal_date)
    .bind(req.retainer_amount)
    .bind(req.estimated_hours)
    .bind(&req.notes)
    .execute(pool.as_ref())
    .await?;

    let matter = sqlx::query_as::<_, Matter>("SELECT * FROM matters WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(matter))
}

/// Update matter fields
pub async fn update_matter(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
    Json(data): Json<Value>,
) -> AppResult<Json<Matter>> {
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    let allowed_fields = vec![
        "name", "description", "status", "attorney_id", "attorney_hourly_rate",
        "billing_type", "hourly_rate", "trial_contingency_percentage", "appeal_contingency_percentage",
        "matter_type", "practice_area", "priority", "court_name", "case_number",
        "opposing_party", "opposing_counsel", "statute_of_limitations_date",
        "trial_date", "appeal_date", "retainer_amount", "estimated_hours", "notes", "close_date"
    ];

    for field in allowed_fields {
        if let Some(value) = data.get(field) {
            updates.push(format!("{} = ?", field));
            values.push(value.to_string().trim_matches('"').to_string());
        }
    }

    if !updates.is_empty() {
        let sql = format!("UPDATE matters SET {} WHERE id = ?", updates.join(", "));
        let mut query = sqlx::query(&sql);

        for value in values {
            query = query.bind(value);
        }
        query = query.bind(id);

        query.execute(pool.as_ref()).await?;
    }

    let matter = sqlx::query_as::<_, Matter>(
        r#"
        SELECT m.* FROM matters m
        WHERE m.id = ?
        "#
    )
    .bind(id)
    .fetch_one(pool.as_ref())
    .await?;

    Ok(Json(matter))
}

/// Get financial summary for a matter
pub async fn get_summary(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    let time_entries = sqlx::query_as::<_, TimeEntry>(
        "SELECT * FROM time_entries WHERE matter_id = ?"
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let expenses = sqlx::query_as::<_, Expense>(
        "SELECT * FROM expenses WHERE matter_id = ?"
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let unbilled_time: f64 = time_entries.iter()
        .filter(|t| t.billed == 0)
        .map(|t| t.amount.unwrap_or(0.0))
        .sum();

    let unbilled_expenses: f64 = expenses.iter()
        .filter(|e| e.billed == 0)
        .map(|e| e.billed_amount.unwrap_or(0.0))
        .sum();

    Ok(Json(json!({
        "total_billed": 0.0,
        "unbilled_time": unbilled_time,
        "unbilled_expenses": unbilled_expenses,
        "outstanding": 0.0
    })))
}

/// Get time entries for a matter
pub async fn get_time_entries(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Vec<Value>>> {
    let entries = sqlx::query(
        r#"
        SELECT t.*, u.first_name || ' ' || u.last_name as user_name, m.name as matter_name
        FROM time_entries t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN matters m ON t.matter_id = m.id
        WHERE t.matter_id = ?
        ORDER BY t.entry_date DESC
        "#
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let result: Vec<Value> = entries.iter().map(|e| {
        json!({
            "id": e.try_get::<i64, _>("id").ok(),
            "matter_id": e.try_get::<i64, _>("matter_id").ok(),
            "user_id": e.try_get::<i64, _>("user_id").ok(),
            "entry_date": e.try_get::<String, _>("entry_date").ok(),
            "duration_minutes": e.try_get::<i64, _>("duration_minutes").ok(),
            "description": e.try_get::<String, _>("description").ok(),
            "hourly_rate": e.try_get::<f64, _>("hourly_rate").ok(),
            "amount": e.try_get::<f64, _>("amount").ok(),
            "billable": e.try_get::<i64, _>("billable").ok(),
            "billed": e.try_get::<i64, _>("billed").ok(),
            "invoice_id": e.try_get::<Option<i64>, _>("invoice_id").ok().flatten(),
            "user_name": e.try_get::<Option<String>, _>("user_name").ok().flatten(),
            "matter_name": e.try_get::<Option<String>, _>("matter_name").ok().flatten()
        })
    }).collect();

    Ok(Json(result))
}

/// Get expenses for a matter
pub async fn get_expenses(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Vec<Expense>>> {
    let expenses = sqlx::query_as::<_, Expense>(
        "SELECT * FROM expenses WHERE matter_id = ?"
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    Ok(Json(expenses))
}

/// Get invoices for a matter
pub async fn get_invoices(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Vec<Invoice>>> {
    let invoices = sqlx::query_as::<_, Invoice>(
        "SELECT * FROM invoices WHERE matter_id = ?"
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    Ok(Json(invoices))
}

/// Get unbilled items for a matter
pub async fn get_unbilled(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    let time_entries = sqlx::query(
        r#"
        SELECT t.*, u.first_name || ' ' || u.last_name as user_name
        FROM time_entries t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.matter_id = ? AND t.billed = 0 AND t.invoice_id IS NULL
        ORDER BY t.entry_date DESC
        "#
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let expenses = sqlx::query_as::<_, Expense>(
        "SELECT * FROM expenses WHERE matter_id = ? AND billed = 0 AND invoice_id IS NULL ORDER BY expense_date DESC"
    )
    .bind(id)
    .fetch_all(pool.as_ref())
    .await?;

    let time_entries_json: Vec<Value> = time_entries.iter().map(|e| {
        json!({
            "id": e.try_get::<i64, _>("id").ok(),
            "matter_id": e.try_get::<i64, _>("matter_id").ok(),
            "user_id": e.try_get::<i64, _>("user_id").ok(),
            "entry_date": e.try_get::<String, _>("entry_date").ok(),
            "duration_minutes": e.try_get::<i64, _>("duration_minutes").ok(),
            "description": e.try_get::<String, _>("description").ok(),
            "hourly_rate": e.try_get::<f64, _>("hourly_rate").ok(),
            "amount": e.try_get::<f64, _>("amount").ok(),
            "billable": e.try_get::<i64, _>("billable").ok(),
            "billed": e.try_get::<i64, _>("billed").ok(),
            "user_name": e.try_get::<Option<String>, _>("user_name").ok().flatten()
        })
    }).collect();

    Ok(Json(json!({
        "time_entries": time_entries_json,
        "expenses": expenses
    })))
}
