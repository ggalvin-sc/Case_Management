pub mod jwt;
pub mod middleware;

use crate::error::{AppError, AppResult};
use bcrypt::{hash, verify, DEFAULT_COST};

/// Hash a password using bcrypt
///
/// # Arguments
///
/// * `password` - The plain text password to hash
/// * `cost` - The bcrypt cost factor (higher = more secure but slower)
///
/// # Errors
///
/// Returns an error if bcrypt hashing fails
pub fn hash_password(password: &str, cost: Option<u32>) -> AppResult<String> {
    hash(password, cost.unwrap_or(DEFAULT_COST))
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))
}

/// Verify a password against a hash
///
/// # Arguments
///
/// * `password` - The plain text password to verify
/// * `hash` - The bcrypt hash to compare against
///
/// # Errors
///
/// Returns an error if verification fails or hash is invalid
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    verify(password, hash)
        .map_err(|e| AppError::Authentication(format!("Password verification failed: {}", e)))
}

/// Validate password complexity
///
/// Ensures password meets minimum security requirements:
/// - At least 8 characters
/// - Contains uppercase letter
/// - Contains lowercase letter
/// - Contains number
/// - Contains special character
pub fn validate_password_strength(password: &str) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    if password.len() < 8 {
        errors.push("Password must be at least 8 characters long".to_string());
    }

    if !password.chars().any(|c| c.is_lowercase()) {
        errors.push("Password must contain at least one lowercase letter".to_string());
    }

    if !password.chars().any(|c| c.is_uppercase()) {
        errors.push("Password must contain at least one uppercase letter".to_string());
    }

    if !password.chars().any(|c| c.is_numeric()) {
        errors.push("Password must contain at least one number".to_string());
    }

    if !password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;':\",.<>?/".contains(c)) {
        errors.push("Password must contain at least one special character".to_string());
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
