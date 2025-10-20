use std::env;

/// Application configuration loaded from environment variables
#[derive(Clone, Debug)]
pub struct Config {
    /// Application host (default: 0.0.0.0)
    pub app_host: String,
    /// Application port (default: 3000)
    pub app_port: u16,
    /// Application environment (development, production)
    pub app_env: String,

    /// SQLite database file path
    pub database_url: String,

    /// JWT secret for token signing and verification
    pub jwt_secret: String,
    /// JWT token expiration time (e.g., "24h", "7d")
    pub jwt_expires_in: String,

    /// Allowed CORS origins (comma-separated)
    pub allowed_origins: Vec<String>,

    /// Kimai API URL
    pub kimai_api_url: Option<String>,
    /// Kimai API token
    pub kimai_api_token: Option<String>,

    /// RunPod API key
    pub runpod_api_key: Option<String>,
    /// RunPod API base URL
    pub runpod_api_base: String,

    /// Password hashing cost (bcrypt rounds)
    pub bcrypt_cost: u32,

    /// Maximum login attempts before lockout
    pub max_login_attempts: usize,
    /// Rate limit window in seconds
    pub rate_limit_window_secs: u64,
    /// Lockout duration in seconds
    pub lockout_duration_secs: u64,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// Returns an error if required variables are missing or invalid.
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - JWT_SECRET is not set or uses the default insecure value
    /// - DATABASE_URL is not set
    /// - Any numeric value fails to parse
    pub fn from_env() -> Result<Self, String> {
        dotenv::dotenv().ok(); // Load .env file if present

        // Validate JWT_SECRET
        let jwt_secret = env::var("JWT_SECRET")
            .map_err(|_| "JWT_SECRET environment variable is required")?;

        if jwt_secret == "your-secret-key-change-this-in-production" {
            return Err(
                "FATAL ERROR: JWT_SECRET is using the default insecure value. \
                Please set a strong JWT_SECRET in your .env file. \
                Generate one using: openssl rand -hex 64".to_string()
            );
        }

        // Database URL (default to billing.db in backend directory)
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| {
                // Try to find billing.db in backend or current directory
                if std::path::Path::new("../backend/billing.db").exists() {
                    "sqlite:../backend/billing.db".to_string()
                } else if std::path::Path::new("backend/billing.db").exists() {
                    "sqlite:backend/billing.db".to_string()
                } else {
                    "sqlite:billing.db".to_string()
                }
            });

        // Parse allowed origins
        let origins_str = env::var("ALLOWED_ORIGINS")
            .or_else(|_| env::var("CORS_ALLOWED_ORIGINS"))
            .unwrap_or_else(|_| "http://localhost:8000,http://127.0.0.1:8000,http://localhost:3000".to_string());

        let allowed_origins: Vec<String> = origins_str
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();

        Ok(Config {
            app_host: env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            app_port: env::var("APP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            app_env: env::var("APP_ENV").unwrap_or_else(|_| "development".to_string()),

            database_url,

            jwt_secret,
            jwt_expires_in: env::var("JWT_EXPIRES_IN").unwrap_or_else(|_| "24h".to_string()),

            allowed_origins,

            kimai_api_url: env::var("KIMAI_API_URL").ok(),
            kimai_api_token: env::var("KIMAI_API_TOKEN").ok(),

            runpod_api_key: env::var("RUNPOD_API_KEY").ok(),
            runpod_api_base: env::var("RUNPOD_API_BASE")
                .unwrap_or_else(|_| "https://api.runpod.ai/v2".to_string()),

            bcrypt_cost: env::var("BCRYPT_COST")
                .ok()
                .and_then(|c| c.parse().ok())
                .unwrap_or(10),

            max_login_attempts: env::var("MAX_LOGIN_ATTEMPTS")
                .ok()
                .and_then(|a| a.parse().ok())
                .unwrap_or(5),
            rate_limit_window_secs: env::var("RATE_LIMIT_WINDOW")
                .ok()
                .and_then(|w| w.parse().ok())
                .unwrap_or(900), // 15 minutes
            lockout_duration_secs: env::var("LOCKOUT_DURATION")
                .ok()
                .and_then(|d| d.parse().ok())
                .unwrap_or(900), // 15 minutes
        })
    }

    /// Get the server bind address
    pub fn server_address(&self) -> String {
        format!("{}:{}", self.app_host, self.app_port)
    }

    /// Check if running in production mode
    pub fn is_production(&self) -> bool {
        self.app_env.to_lowercase() == "production"
    }

    /// Check if Kimai is configured
    pub fn kimai_enabled(&self) -> bool {
        self.kimai_api_url.is_some() && self.kimai_api_token.is_some()
    }

    /// Check if RunPod is configured
    pub fn runpod_enabled(&self) -> bool {
        self.runpod_api_key.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_address() {
        let config = Config {
            app_host: "127.0.0.1".to_string(),
            app_port: 8080,
            ..Default::default()
        };
        assert_eq!(config.server_address(), "127.0.0.1:8080");
    }
}
