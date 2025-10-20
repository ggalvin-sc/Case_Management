//! Configuration module for RunPod Rust service
//!
//! Loads configuration from environment variables using dotenv.
//! Provides validated configuration struct for the application.

use std::env;
use anyhow::{Context, Result};

/// Application configuration loaded from environment variables
#[derive(Debug, Clone)]
pub struct Config {
    /// RunPod API key (required)
    pub runpod_api_key: String,

    /// RunPod API base URL
    pub runpod_api_base: String,

    /// Default endpoint ID (optional)
    pub default_endpoint_id: Option<String>,

    /// Server host address
    pub host: String,

    /// Server port
    pub port: u16,
}

impl Config {
    /// Load configuration from environment variables
    ///
    /// # Returns
    /// * `Ok(Config)` - Successfully loaded configuration
    /// * `Err(anyhow::Error)` - Missing or invalid configuration
    ///
    /// # Examples
    /// ```no_run
    /// use runpod_rust::config::Config;
    ///
    /// let config = Config::from_env().expect("Failed to load config");
    /// println!("API Key: {}", config.runpod_api_key);
    /// ```
    pub fn from_env() -> Result<Self> {
        // Load .env file if it exists (ignore errors if not found)
        let _ = dotenv::dotenv();

        let runpod_api_key = env::var("RUNPOD_API_KEY")
            .context("RUNPOD_API_KEY must be set in environment or .env file")?;

        if runpod_api_key.is_empty() {
            anyhow::bail!("RUNPOD_API_KEY cannot be empty");
        }

        let runpod_api_base = env::var("RUNPOD_API_BASE")
            .unwrap_or_else(|_| "https://api.runpod.ai/v2".to_string());

        let default_endpoint_id = env::var("RUNPOD_DEFAULT_ENDPOINT_ID")
            .ok()
            .filter(|s| !s.is_empty());

        let host = env::var("HOST")
            .unwrap_or_else(|_| "127.0.0.1".to_string());

        let port = env::var("PORT")
            .unwrap_or_else(|_| "3001".to_string())
            .parse::<u16>()
            .context("PORT must be a valid u16")?;

        Ok(Config {
            runpod_api_key,
            runpod_api_base,
            default_endpoint_id,
            host,
            port,
        })
    }

    /// Get the full server address (host:port)
    pub fn server_address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_address() {
        let config = Config {
            runpod_api_key: "test_key".to_string(),
            runpod_api_base: "https://api.runpod.ai/v2".to_string(),
            default_endpoint_id: None,
            host: "127.0.0.1".to_string(),
            port: 3001,
        };

        assert_eq!(config.server_address(), "127.0.0.1:3001");
    }
}
