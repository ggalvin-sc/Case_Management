//! Error handling for RunPod Rust service
//!
//! Provides custom error types with proper HTTP status code mapping.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use thiserror::Error;

/// Custom error type for RunPod operations
#[derive(Error, Debug)]
pub enum RunPodError {
    /// HTTP request failed
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),

    /// RunPod API returned an error
    #[error("RunPod API error ({status}): {message}")]
    ApiError { status: u16, message: String },

    /// Invalid input or parameters
    #[error("Invalid input: {0}")]
    ValidationError(String),

    /// Job polling timeout
    #[error("Job polling timeout after {0}ms")]
    TimeoutError(u64),

    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(#[from] anyhow::Error),

    /// JSON serialization/deserialization error
    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    /// Generic internal error
    #[error("Internal error: {0}")]
    InternalError(String),
}

/// Error response body for API responses
#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<String>,
}

impl IntoResponse for RunPodError {
    /// Convert error to HTTP response with appropriate status code
    fn into_response(self) -> Response {
        let (status, error_message, details) = match &self {
            RunPodError::HttpError(e) => (
                StatusCode::BAD_GATEWAY,
                "Failed to communicate with RunPod API".to_string(),
                Some(e.to_string()),
            ),
            RunPodError::ApiError { status, message } => {
                let status_code = StatusCode::from_u16(*status)
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
                (status_code, message.clone(), None)
            }
            RunPodError::ValidationError(msg) => (
                StatusCode::BAD_REQUEST,
                "Validation error".to_string(),
                Some(msg.clone()),
            ),
            RunPodError::TimeoutError(ms) => (
                StatusCode::REQUEST_TIMEOUT,
                format!("Job polling timeout after {}ms", ms),
                None,
            ),
            RunPodError::ConfigError(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Configuration error".to_string(),
                Some(e.to_string()),
            ),
            RunPodError::JsonError(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "JSON processing error".to_string(),
                Some(e.to_string()),
            ),
            RunPodError::InternalError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
                Some(msg.clone()),
            ),
        };

        let body = ErrorResponse {
            error: error_message,
            details,
        };

        (status, Json(body)).into_response()
    }
}

/// Result type alias for RunPod operations
pub type Result<T> = std::result::Result<T, RunPodError>;
