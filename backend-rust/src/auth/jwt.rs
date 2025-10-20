use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{AppError, AppResult};

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: i64,
    pub email: String,
    pub role: String,
    pub exp: u64, // Expiration time (Unix timestamp)
    pub iat: u64, // Issued at (Unix timestamp)
}

/// Generate a JWT token for a user
///
/// # Arguments
///
/// * `user_id` - The user's ID
/// * `email` - The user's email
/// * `role` - The user's role
/// * `secret` - The JWT secret key
/// * `expires_in` - Token expiration time (e.g., "24h", "7d")
///
/// # Returns
///
/// Returns a signed JWT token string
///
/// # Errors
///
/// Returns an error if token generation fails
pub fn generate_token(
    user_id: i64,
    email: &str,
    role: &str,
    secret: &str,
    expires_in: &str,
) -> AppResult<String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Internal(format!("System time error: {}", e)))?
        .as_secs();

    // Parse expiration time (simplified - supports hours and days)
    let expiration_secs = parse_duration(expires_in)?;
    let exp = now + expiration_secs;

    let claims = Claims {
        id: user_id,
        email: email.to_string(),
        role: role.to_string(),
        exp,
        iat: now,
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Token generation failed: {}", e)))?;

    Ok(token)
}

/// Verify and decode a JWT token
///
/// # Arguments
///
/// * `token` - The JWT token to verify
/// * `secret` - The JWT secret key
///
/// # Returns
///
/// Returns the decoded claims if token is valid
///
/// # Errors
///
/// Returns an error if:
/// - Token is invalid
/// - Token is expired
/// - Token signature is invalid
pub fn verify_token(token: &str, secret: &str) -> AppResult<Claims> {
    let validation = Validation::new(Algorithm::HS256);

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|e| AppError::Authentication(format!("Invalid token: {}", e)))?;

    Ok(token_data.claims)
}

/// Parse duration string (e.g., "24h", "7d") to seconds
///
/// Supported formats:
/// - "Xh" - hours (e.g., "24h" = 86400 seconds)
/// - "Xd" - days (e.g., "7d" = 604800 seconds)
/// - "Xm" - minutes (e.g., "30m" = 1800 seconds)
///
/// # Errors
///
/// Returns an error if the format is invalid
fn parse_duration(duration_str: &str) -> AppResult<u64> {
    let duration_str = duration_str.trim();

    if duration_str.ends_with('h') {
        let hours: u64 = duration_str[..duration_str.len() - 1]
            .parse()
            .map_err(|_| AppError::Internal(format!("Invalid duration: {}", duration_str)))?;
        Ok(hours * 3600)
    } else if duration_str.ends_with('d') {
        let days: u64 = duration_str[..duration_str.len() - 1]
            .parse()
            .map_err(|_| AppError::Internal(format!("Invalid duration: {}", duration_str)))?;
        Ok(days * 86400)
    } else if duration_str.ends_with('m') {
        let minutes: u64 = duration_str[..duration_str.len() - 1]
            .parse()
            .map_err(|_| AppError::Internal(format!("Invalid duration: {}", duration_str)))?;
        Ok(minutes * 60)
    } else {
        Err(AppError::Internal(format!(
            "Invalid duration format: {}. Use Xh, Xd, or Xm",
            duration_str
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_duration() {
        assert_eq!(parse_duration("24h").unwrap(), 86400);
        assert_eq!(parse_duration("7d").unwrap(), 604800);
        assert_eq!(parse_duration("30m").unwrap(), 1800);
        assert!(parse_duration("invalid").is_err());
    }

    #[test]
    fn test_generate_and_verify_token() {
        let secret = "test-secret-key-12345";
        let token = generate_token(1, "test@example.com", "admin", secret, "1h").unwrap();
        let claims = verify_token(&token, secret).unwrap();

        assert_eq!(claims.id, 1);
        assert_eq!(claims.email, "test@example.com");
        assert_eq!(claims.role, "admin");
    }

    #[test]
    fn test_verify_invalid_token() {
        let secret = "test-secret-key";
        let result = verify_token("invalid.token.here", secret);
        assert!(result.is_err());
    }
}
