use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{
    auth::{hash_password, jwt::generate_token, verify_password, validate_password_strength},
    config::Config,
    db::models::{ChangePasswordRequest, LoginRequest, LoginResponse, User, UserResponse},
    error::{AppError, AppResult},
};

/// POST /api/v1/auth/login
///
/// Authenticate user and return JWT token
pub async fn login(
    State((pool, config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    // Validate input
    if req.email.is_empty() || req.password.is_empty() {
        return Err(AppError::Validation(
            "Email and password are required".to_string(),
        ));
    }

    // Validate email format
    if !req.email.contains('@') {
        return Err(AppError::Validation("Invalid email format".to_string()));
    }

    // TODO: Implement rate limiting
    // For now, we'll skip rate limiting but it should be added

    // Fetch user from database
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, password, first_name, last_name, role, hourly_rate, kimai_user_id
         FROM users
         WHERE email = ?"
    )
    .bind(&req.email)
    .fetch_optional(pool.as_ref())
    .await?
    .ok_or_else(|| AppError::Authentication("Invalid credentials".to_string()))?;

    // Verify password
    let password_valid = verify_password(&req.password, &user.password)?;

    if !password_valid {
        return Err(AppError::Authentication("Invalid credentials".to_string()));
    }

    // Generate JWT token
    let token = generate_token(
        user.id,
        &user.email,
        user.role.as_deref().unwrap_or("user"),
        &config.jwt_secret,
        &config.jwt_expires_in,
    )?;

    // Return token and user info
    Ok(Json(LoginResponse {
        token,
        user: UserResponse {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
        },
    }))
}

/// GET /api/v1/auth/me
///
/// Get current authenticated user
pub async fn get_current_user(Extension(user): Extension<User>) -> AppResult<Json<Value>> {
    Ok(Json(json!({
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "hourly_rate": user.hourly_rate,
    })))
}

/// POST /api/v1/auth/change-password
///
/// Change user password
pub async fn change_password(
    State((pool, config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(user): Extension<User>,
    Json(req): Json<ChangePasswordRequest>,
) -> AppResult<Json<Value>> {
    // Validate input
    if req.current_password.is_empty() || req.new_password.is_empty() {
        return Err(AppError::Validation(
            "Current password and new password are required".to_string(),
        ));
    }

    // Validate new password strength
    if let Err(errors) = validate_password_strength(&req.new_password) {
        return Err(AppError::Validation(format!(
            "Password does not meet complexity requirements: {}",
            errors.join(", ")
        )));
    }

    // Verify current password
    let password_valid = verify_password(&req.current_password, &user.password)?;

    if !password_valid {
        return Err(AppError::Authentication(
            "Current password is incorrect".to_string(),
        ));
    }

    // Hash new password
    let new_password_hash = hash_password(&req.new_password, Some(config.bcrypt_cost))?;

    // Update password in database
    sqlx::query("UPDATE users SET password = ? WHERE id = ?")
        .bind(&new_password_hash)
        .bind(user.id)
        .execute(pool.as_ref())
        .await?;

    Ok(Json(json!({
        "message": "Password changed successfully"
    })))
}
