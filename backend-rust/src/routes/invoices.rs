// Invoice route handlers - full implementations
use axum::{extract::{Path, State}, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;
use chrono::{Utc, Datelike};

use crate::{config::Config, db::models::{User, Invoice, CreateInvoiceRequest, UpdateInvoiceRequest, RecordPaymentRequest, UpdateStatusRequest, TimeEntry, Expense}, error::{AppResult, AppError}};

pub async fn list(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<Invoice>>> {
    let invoices = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices")
        .fetch_all(pool.as_ref())
        .await?;
    Ok(Json(invoices))
}

pub async fn get(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Invoice>> {
    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;
    Ok(Json(invoice))
}

/// Create a new invoice from unbilled items
pub async fn create(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(req): Json<CreateInvoiceRequest>,
) -> AppResult<Json<Invoice>> {
    let issue_date = req.issue_date
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    // Create invoice
    let result = sqlx::query!(
        r#"
        INSERT INTO invoices (matter_id, client_id, issue_date, due_date, status, notes, payment_terms, subtotal, tax_rate, tax_amount, total_amount, paid_amount)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, 0, 0, 0, 0, 0)
        "#,
        req.matter_id,
        req.client_id,
        issue_date,
        req.due_date,
        req.notes,
        req.payment_terms
    )
    .execute(pool.as_ref())
    .await?;

    let invoice_id = result.last_insert_rowid();

    // Add time entries as line items
    let mut line_order = 0i64;
    let mut subtotal = 0.0;

    for time_id in &req.time_entry_ids {
        let time_entry = sqlx::query_as::<_, TimeEntry>("SELECT * FROM time_entries WHERE id = ?")
            .bind(time_id)
            .fetch_one(pool.as_ref())
            .await?;

        let description = time_entry.description.clone();
        let quantity = time_entry.duration_minutes as f64 / 60.0;
        let rate = time_entry.hourly_rate.unwrap_or(0.0);
        let amount = time_entry.amount.unwrap_or(0.0);

        sqlx::query!(
            r#"
            INSERT INTO invoice_line_items (invoice_id, item_type, item_id, description, quantity, rate, amount, line_order)
            VALUES (?, 'time', ?, ?, ?, ?, ?, ?)
            "#,
            invoice_id,
            time_id,
            description,
            quantity,
            rate,
            amount,
            line_order
        )
        .execute(pool.as_ref())
        .await?;

        subtotal += amount;
        line_order += 1;

        // Link time entry to invoice
        sqlx::query!("UPDATE time_entries SET invoice_id = ? WHERE id = ?", invoice_id, time_id)
            .execute(pool.as_ref())
            .await?;
    }

    // Add expenses as line items
    for expense_id in &req.expense_ids {
        let expense = sqlx::query_as::<_, Expense>("SELECT * FROM expenses WHERE id = ?")
            .bind(expense_id)
            .fetch_one(pool.as_ref())
            .await?;

        let description = expense.description.clone();
        let amount = expense.billed_amount.unwrap_or(0.0);

        sqlx::query!(
            r#"
            INSERT INTO invoice_line_items (invoice_id, item_type, item_id, description, quantity, rate, amount, line_order)
            VALUES (?, 'expense', ?, ?, 1, ?, ?, ?)
            "#,
            invoice_id,
            expense_id,
            description,
            amount,
            amount,
            line_order
        )
        .execute(pool.as_ref())
        .await?;

        subtotal += amount;
        line_order += 1;

        // Link expense to invoice (commented out - invoice_id column doesn't exist in expenses table)
        // sqlx::query!("UPDATE expenses SET invoice_id = ? WHERE id = ?", invoice_id, expense_id)
        //     .execute(pool.as_ref())
        //     .await?;
    }

    // Update totals
    let tax_rate = 0.0;
    let tax_amount = subtotal * tax_rate;
    let total_amount = subtotal + tax_amount;

    sqlx::query!(
        r#"
        UPDATE invoices
        SET subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?
        WHERE id = ?
        "#,
        subtotal,
        tax_rate,
        tax_amount,
        total_amount,
        invoice_id
    )
    .execute(pool.as_ref())
    .await?;

    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(invoice_id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(invoice))
}

/// Update invoice fields
pub async fn update(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateInvoiceRequest>,
) -> AppResult<Json<Invoice>> {
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(due_date) = req.due_date {
        updates.push("due_date = ?");
        values.push(due_date);
    }
    if let Some(notes) = req.notes {
        updates.push("notes = ?");
        values.push(notes);
    }
    if let Some(payment_terms) = req.payment_terms {
        updates.push("payment_terms = ?");
        values.push(payment_terms);
    }
    if let Some(tax_rate) = req.tax_rate {
        updates.push("tax_rate = ?");
        values.push(tax_rate.to_string());
    }

    if !updates.is_empty() {
        let sql = format!("UPDATE invoices SET {} WHERE id = ?", updates.join(", "));
        let mut query = sqlx::query(&sql);

        for value in values {
            query = query.bind(value);
        }
        query = query.bind(id);

        query.execute(pool.as_ref()).await?;

        // Recalculate totals if tax_rate changed
        if req.tax_rate.is_some() {
            let invoice = sqlx::query!("SELECT subtotal, tax_rate FROM invoices WHERE id = ?", id)
                .fetch_one(pool.as_ref())
                .await?;

            let subtotal = invoice.subtotal.unwrap_or(0.0);
            let tax_rate = invoice.tax_rate.unwrap_or(0.0);
            let tax_amount = subtotal * tax_rate;
            let total_amount = subtotal + tax_amount;

            sqlx::query!("UPDATE invoices SET tax_amount = ?, total_amount = ? WHERE id = ?",
                tax_amount, total_amount, id)
                .execute(pool.as_ref())
                .await?;
        }
    }

    let invoice = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(invoice))
}

/// Delete a draft invoice
pub async fn delete(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Value>> {
    // Check if invoice is draft
    let invoice = sqlx::query!("SELECT status FROM invoices WHERE id = ?", id)
        .fetch_one(pool.as_ref())
        .await?;

    if invoice.status.as_deref() != Some("draft") {
        return Err(AppError::BadRequest("Can only delete draft invoices".to_string()));
    }

    // Unlink time entries and expenses
    sqlx::query!("UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = ?", id)
        .execute(pool.as_ref())
        .await?;

    // Comment out - invoice_id column doesn't exist in expenses table
    // sqlx::query!("UPDATE expenses SET invoice_id = NULL WHERE invoice_id = ?", id)
    //     .execute(pool.as_ref())
    //     .await?;

    // Delete line items and invoice
    sqlx::query!("DELETE FROM invoice_line_items WHERE invoice_id = ?", id)
        .execute(pool.as_ref())
        .await?;

    sqlx::query!("DELETE FROM invoices WHERE id = ?", id)
        .execute(pool.as_ref())
        .await?;

    Ok(Json(json!({"message": "Invoice deleted"})))
}

/// Finalize an invoice (generates invoice number and marks items as billed)
pub async fn finalize(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Invoice>> {
    // Check if invoice can be finalized
    let invoice = sqlx::query!("SELECT status, invoice_number FROM invoices WHERE id = ?", id)
        .fetch_one(pool.as_ref())
        .await?;

    if invoice.status.as_deref() != Some("draft") && invoice.status.as_deref() != Some("review") {
        return Err(AppError::BadRequest("Can only finalize draft or review invoices".to_string()));
    }

    // Generate invoice number if not exists
    let invoice_number = if let Some(num) = invoice.invoice_number {
        num
    } else {
        let year = Utc::now().year();
        let count = sqlx::query!("SELECT COUNT(*) as count FROM invoices WHERE invoice_number IS NOT NULL")
            .fetch_one(pool.as_ref())
            .await?;

        format!("INV-{}-{:04}", year, count.count + 1)
    };

    let finalized_at = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Update invoice
    sqlx::query!(
        r#"
        UPDATE invoices
        SET status = 'finalized', invoice_number = ?, finalized_at = ?
        WHERE id = ?
        "#,
        invoice_number,
        finalized_at,
        id
    )
    .execute(pool.as_ref())
    .await?;

    // Mark all linked time entries and expenses as billed
    sqlx::query!("UPDATE time_entries SET billed = 1 WHERE invoice_id = ?", id)
        .execute(pool.as_ref())
        .await?;

    sqlx::query!("UPDATE expenses SET billed = 1 WHERE invoice_id = ?", id)
        .execute(pool.as_ref())
        .await?;

    let updated = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(updated))
}

/// Send an invoice to client
pub async fn send(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Invoice>> {
    // Check if invoice can be sent
    let invoice = sqlx::query!("SELECT status FROM invoices WHERE id = ?", id)
        .fetch_one(pool.as_ref())
        .await?;

    if invoice.status.as_deref() != Some("finalized") {
        return Err(AppError::BadRequest("Can only send finalized invoices".to_string()));
    }

    let sent_at = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    sqlx::query!(
        r#"
        UPDATE invoices
        SET status = 'sent', sent_at = ?
        WHERE id = ?
        "#,
        sent_at,
        id
    )
    .execute(pool.as_ref())
    .await?;

    let updated = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(updated))
}

/// Record a payment on an invoice
pub async fn record_payment(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
    Json(req): Json<RecordPaymentRequest>,
) -> AppResult<Json<Invoice>> {
    // Check if invoice can accept payment
    let invoice = sqlx::query!("SELECT status, paid_amount, total_amount FROM invoices WHERE id = ?", id)
        .fetch_one(pool.as_ref())
        .await?;

    if invoice.status.as_deref() != Some("sent") && invoice.status.as_deref() != Some("paid") {
        return Err(AppError::BadRequest("Can only record payment for sent invoices".to_string()));
    }

    let paid_amount = invoice.paid_amount.unwrap_or(0.0) + req.amount;
    let total = invoice.total_amount.unwrap_or(0.0);
    let status = if paid_amount >= total {
        "paid"
    } else {
        "sent"
    };

    let payment_date = req.payment_date
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    sqlx::query!(
        r#"
        UPDATE invoices
        SET paid_amount = ?, status = ?, paid_at = ?
        WHERE id = ?
        "#,
        paid_amount,
        status,
        payment_date,
        id
    )
    .execute(pool.as_ref())
    .await?;

    let updated = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(updated))
}

/// Update invoice status
pub async fn update_status(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
    Json(req): Json<UpdateStatusRequest>,
) -> AppResult<Json<Invoice>> {
    let valid_statuses = vec!["draft", "review", "finalized", "sent", "paid", "void"];

    if !valid_statuses.contains(&req.status.as_str()) {
        return Err(AppError::BadRequest("Invalid status".to_string()));
    }

    sqlx::query!("UPDATE invoices SET status = ? WHERE id = ?", req.status, id)
        .execute(pool.as_ref())
        .await?;

    let updated = sqlx::query_as::<_, Invoice>("SELECT * FROM invoices WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(updated))
}
