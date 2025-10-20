// User route handlers
use axum::{extract::State, Extension, Json};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::User, error::AppResult};

pub async fn list_users(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Vec<User>>> {
    let users = sqlx::query_as::<_, User>(
        "SELECT id, email, password, first_name, last_name, role, hourly_rate, kimai_user_id FROM users"
    )
    .fetch_all(pool.as_ref())
    .await?;

    Ok(Json(users))
}
