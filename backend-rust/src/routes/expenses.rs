// Expense route handlers - full implementations
use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::{User, Expense, CreateExpenseRequest}, error::AppResult};

pub async fn list(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<Expense>>> {
    let expenses = sqlx::query_as::<_, Expense>("SELECT * FROM expenses")
        .fetch_all(pool.as_ref())
        .await?;
    Ok(Json(expenses))
}

/// Create a new expense
pub async fn create(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(req): Json<CreateExpenseRequest>,
) -> AppResult<Json<Expense>> {
    let markup_percentage = req.markup_percentage.unwrap_or(0.0);
    let billable = if req.billable.unwrap_or(true) { 1 } else { 0 };

    let result = sqlx::query!(
        r#"
        INSERT INTO expenses (matter_id, expense_date, category, description, vendor, amount, markup_percentage, billed_amount, billable, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        "#,
        req.matter_id,
        req.expense_date,
        req.category,
        req.description,
        req.vendor,
        req.amount,
        markup_percentage,
        req.billed_amount,
        billable
    )
    .execute(pool.as_ref())
    .await?;

    let expense = sqlx::query_as::<_, Expense>("SELECT * FROM expenses WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(expense))
}
