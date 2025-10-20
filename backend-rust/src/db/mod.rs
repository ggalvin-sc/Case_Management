pub mod models;

use sqlx::{sqlite::SqlitePool, SqlitePool as Pool};
use crate::error::AppResult;

/// Initialize SQLite connection pool
///
/// Creates a connection pool with sensible defaults for SQLite.
/// The database file must already exist.
///
/// # Errors
///
/// Returns an error if:
/// - Database file doesn't exist
/// - Connection fails
/// - Pool cannot be created
pub async fn create_pool(database_url: &str) -> AppResult<Pool> {
    tracing::info!("Connecting to database: {}", database_url);

    let pool = SqlitePool::connect(database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            e
        })?;

    tracing::info!("Database connection pool created successfully");

    Ok(pool)
}

/// Test database connectivity
pub async fn test_connection(pool: &Pool) -> AppResult<()> {
    sqlx::query("SELECT 1")
        .fetch_one(pool)
        .await?;

    tracing::info!("Database connection test successful");
    Ok(())
}
