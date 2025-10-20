// Client route handlers
use axum::{extract::{Path, State}, Extension, Json};
use serde_json::Value;
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::{User, CreateClientRequest, Client}, error::AppResult};

/// GET /api/v1/clients
pub async fn list_clients(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<Client>>> {
    let clients = sqlx::query_as::<_, Client>("SELECT * FROM clients")
        .fetch_all(pool.as_ref())
        .await?;

    Ok(Json(clients))
}

/// GET /api/v1/clients/:id
pub async fn get_client(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Path(id): Path<i64>,
) -> AppResult<Json<Client>> {
    let client = sqlx::query_as::<_, Client>("SELECT * FROM clients WHERE id = ?")
        .bind(id)
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(client))
}

/// POST /api/v1/clients
pub async fn create_client(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(req): Json<CreateClientRequest>,
) -> AppResult<Json<Client>> {
    // TODO: Implement client creation logic from Node.js
    let result = sqlx::query(
        "INSERT INTO clients (name, client_number, email, phone, address, address_line2, city, state, zip_code, country, default_hourly_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&req.name)
    .bind(req.client_number.or_else(|| Some(format!("CL-{}", chrono::Utc::now().timestamp()))))
    .bind(req.email)
    .bind(req.phone)
    .bind(req.address)
    .bind(req.address_line2)
    .bind(req.city)
    .bind(req.state)
    .bind(req.zip_code)
    .bind(req.country.or(Some("USA".to_string())))
    .bind(req.default_hourly_rate.or(Some(350.0)))
    .execute(pool.as_ref())
    .await?;

    let client = sqlx::query_as::<_, Client>("SELECT * FROM clients WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(client))
}
