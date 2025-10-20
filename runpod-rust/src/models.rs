//! Data models for RunPod API requests and responses
//!
//! Defines all request/response structures with serde serialization.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ==================== Request Models ====================

/// Request body for executing a RunPod endpoint
#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteRequest {
    /// The endpoint ID to execute
    pub endpoint_id: String,

    /// Input data for the endpoint
    pub input: serde_json::Value,

    /// If true, wait for result (sync). If false, return job ID (async)
    #[serde(default)]
    pub sync: bool,

    /// Request timeout in milliseconds
    #[serde(default = "default_timeout")]
    pub timeout: u64,
}

fn default_timeout() -> u64 {
    30000 // 30 seconds
}

/// Request body for polling a job until complete
#[derive(Debug, Serialize, Deserialize)]
pub struct PollRequest {
    /// Maximum time to wait in milliseconds
    #[serde(default = "default_max_wait_time")]
    pub max_wait_time: u64,

    /// Time between checks in milliseconds
    #[serde(default = "default_poll_interval")]
    pub poll_interval: u64,
}

fn default_max_wait_time() -> u64 {
    300000 // 5 minutes
}

fn default_poll_interval() -> u64 {
    2000 // 2 seconds
}

// ==================== Response Models ====================

/// Response from executing an endpoint (sync mode)
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncExecuteResponse {
    /// Job ID
    pub id: String,

    /// Job status
    pub status: String,

    /// Job output (if completed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<serde_json::Value>,

    /// Execution time in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time: Option<f64>,

    /// Delay time in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delay_time: Option<f64>,
}

/// Response from executing an endpoint (async mode)
#[derive(Debug, Serialize, Deserialize)]
pub struct AsyncExecuteResponse {
    /// Job ID
    pub id: String,

    /// Job status (usually "IN_QUEUE")
    pub status: String,
}

/// Response from getting job status
#[derive(Debug, Serialize, Deserialize)]
pub struct JobStatusResponse {
    /// Job ID
    pub id: String,

    /// Job status (IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
    pub status: String,

    /// Job output (if completed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<serde_json::Value>,

    /// Execution time in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time: Option<f64>,

    /// Delay time in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delay_time: Option<f64>,

    /// Error message (if failed)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Response from canceling a job
#[derive(Debug, Serialize, Deserialize)]
pub struct CancelJobResponse {
    /// Job ID
    pub id: String,

    /// Job status (usually "CANCELLED")
    pub status: String,
}

/// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    /// Service health status
    pub healthy: bool,

    /// Service version
    pub version: String,

    /// Timestamp
    pub timestamp: String,

    /// Additional details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

/// RunPod API health check response
#[derive(Debug, Serialize)]
pub struct ApiHealthResponse {
    /// API health status
    pub healthy: bool,

    /// Error message if unhealthy
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ==================== Internal RunPod API Models ====================

/// Internal: RunPod API response wrapper
#[derive(Debug, Deserialize)]
pub struct RunPodApiResponse {
    pub id: Option<String>,
    pub status: Option<String>,
    pub output: Option<serde_json::Value>,
    #[serde(rename = "executionTime")]
    pub execution_time: Option<f64>,
    #[serde(rename = "delayTime")]
    pub delay_time: Option<f64>,
    pub error: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// Internal: Request body for RunPod API
#[derive(Debug, Serialize)]
pub struct RunPodApiRequest {
    pub input: serde_json::Value,
}

impl Default for PollRequest {
    fn default() -> Self {
        Self {
            max_wait_time: default_max_wait_time(),
            poll_interval: default_poll_interval(),
        }
    }
}
