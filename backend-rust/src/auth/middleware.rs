use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use axum::extract::State;
use std::sync::Arc;

use crate::{
    auth::jwt::{verify_token, Claims},
    config::Config,
    db::models::User,
    error::{AppError, AppResult},
};
use sqlx::SqlitePool;

/// Authentication middleware
///
/// Extracts and validates JWT token from Authorization header,
/// fetches the user from database, and adds user to request extensions.
///
/// # Errors
///
/// Returns 401 Unauthorized if:
/// - Authorization header is missing
/// - Token is invalid or expired
/// - User not found in database
pub async fn auth_middleware(
    State((pool, config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| AppError::Authentication("Missing Authorization header".to_string()))?;

    // Extract token from "Bearer <token>"
    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| {
            AppError::Authentication(
                "Invalid Authorization header format. Expected: Bearer <token>".to_string(),
            )
        })?;

    // Verify JWT token
    let claims = verify_token(token, &config.jwt_secret)?;

    // Fetch user from database
    let user = fetch_user_by_id(&pool, claims.id).await?;

    // Add user to request extensions
    request.extensions_mut().insert(user);
    request.extensions_mut().insert(claims);

    // Continue to next middleware/handler
    Ok(next.run(request).await)
}

/// Fetch user from database by ID
async fn fetch_user_by_id(pool: &SqlitePool, user_id: i64) -> AppResult<User> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password, first_name, last_name, role, hourly_rate, kimai_user_id
         FROM users
         WHERE id = ?"
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => AppError::Authentication("User not found".to_string()),
        _ => AppError::Database(e),
    })?;

    Ok(user)
}

/// Extract authenticated user from request extensions
///
/// Use this in route handlers to get the authenticated user:
///
/// ```rust
/// use axum::Extension;
/// use crate::db::models::User;
///
/// async fn my_handler(Extension(user): Extension<User>) {
///     println!("User {} is authenticated", user.email);
/// }
/// ```
pub type AuthUser = axum::Extension<User>;

/// Extract JWT claims from request extensions
pub type AuthClaims = axum::Extension<Claims>;
