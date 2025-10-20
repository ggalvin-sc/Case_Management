//! HTTP route handlers for the RunPod Rust service
//!
//! Defines all API endpoints and request handlers.

use crate::config::Config;
use crate::error::Result;
use crate::models::{
    ApiHealthResponse, ExecuteRequest, HealthResponse, PollRequest,
};
use crate::runpod::RunPodClient;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use std::sync::Arc;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub runpod_client: RunPodClient,
    pub config: Config,
}

/// Build the router with all routes
pub fn build_router(state: AppState) -> Router {
    Router::new()
        // Health check
        .route("/health", get(health_check))
        // RunPod operations
        .route("/execute", post(execute_endpoint))
        .route("/status/:endpoint_id/:job_id", get(get_job_status))
        .route("/cancel/:endpoint_id/:job_id", post(cancel_job))
        .route("/poll/:endpoint_id/:job_id", post(poll_job))
        .route("/api-health", get(api_health_check))
        .with_state(Arc::new(state))
}

/// GET /health - Service health check
///
/// Returns the health status of the service itself.
///
/// # Response
/// ```json
/// {
///   "healthy": true,
///   "version": "0.1.0",
///   "timestamp": "2025-10-07T10:00:00Z"
/// }
/// ```
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        healthy: true,
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        details: None,
    })
}

/// POST /execute - Execute a RunPod endpoint
///
/// Supports both synchronous and asynchronous execution.
///
/// # Request Body
/// ```json
/// {
///   "endpoint_id": "your-endpoint-id",
///   "input": {"prompt": "Hello world"},
///   "sync": true,
///   "timeout": 30000
/// }
/// ```
///
/// # Response (sync=true)
/// ```json
/// {
///   "id": "job-123",
///   "status": "COMPLETED",
///   "output": {"result": "..."},
///   "execution_time": 1234.5,
///   "delay_time": 10.2
/// }
/// ```
///
/// # Response (sync=false)
/// ```json
/// {
///   "id": "job-123",
///   "status": "IN_QUEUE"
/// }
/// ```
async fn execute_endpoint(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExecuteRequest>,
) -> Result<Json<serde_json::Value>> {
    let result = state
        .runpod_client
        .execute_endpoint(&req.endpoint_id, req.input, req.sync, req.timeout)
        .await?;

    Ok(Json(result))
}

/// GET /status/:endpoint_id/:job_id - Get job status
///
/// Returns the current status of a job.
///
/// # Path Parameters
/// * `endpoint_id` - The RunPod endpoint ID
/// * `job_id` - The job ID to check
///
/// # Response
/// ```json
/// {
///   "id": "job-123",
///   "status": "COMPLETED",
///   "output": {"result": "..."},
///   "execution_time": 1234.5,
///   "delay_time": 10.2
/// }
/// ```
async fn get_job_status(
    State(state): State<Arc<AppState>>,
    Path((endpoint_id, job_id)): Path<(String, String)>,
) -> Result<Json<crate::models::JobStatusResponse>> {
    let status = state
        .runpod_client
        .get_job_status(&endpoint_id, &job_id)
        .await?;

    Ok(Json(status))
}

/// POST /cancel/:endpoint_id/:job_id - Cancel a running job
///
/// Cancels a job that is currently running or in the queue.
///
/// # Path Parameters
/// * `endpoint_id` - The RunPod endpoint ID
/// * `job_id` - The job ID to cancel
///
/// # Response
/// ```json
/// {
///   "id": "job-123",
///   "status": "CANCELLED"
/// }
/// ```
async fn cancel_job(
    State(state): State<Arc<AppState>>,
    Path((endpoint_id, job_id)): Path<(String, String)>,
) -> Result<Json<crate::models::CancelJobResponse>> {
    let result = state
        .runpod_client
        .cancel_job(&endpoint_id, &job_id)
        .await?;

    Ok(Json(result))
}

/// POST /poll/:endpoint_id/:job_id - Poll job until complete
///
/// Polls a job status until it completes or times out.
///
/// # Path Parameters
/// * `endpoint_id` - The RunPod endpoint ID
/// * `job_id` - The job ID to poll
///
/// # Request Body (optional)
/// ```json
/// {
///   "max_wait_time": 300000,
///   "poll_interval": 2000
/// }
/// ```
///
/// # Response
/// ```json
/// {
///   "id": "job-123",
///   "status": "COMPLETED",
///   "output": {"result": "..."},
///   "execution_time": 1234.5,
///   "delay_time": 10.2
/// }
/// ```
async fn poll_job(
    State(state): State<Arc<AppState>>,
    Path((endpoint_id, job_id)): Path<(String, String)>,
    Json(req): Json<Option<PollRequest>>,
) -> Result<Json<crate::models::JobStatusResponse>> {
    let poll_req = req.unwrap_or_default();

    let result = state
        .runpod_client
        .poll_job_until_complete(
            &endpoint_id,
            &job_id,
            poll_req.max_wait_time,
            poll_req.poll_interval,
        )
        .await?;

    Ok(Json(result))
}

/// GET /api-health - RunPod API health check
///
/// Tests connectivity to the RunPod API.
///
/// # Response
/// ```json
/// {
///   "healthy": true
/// }
/// ```
async fn api_health_check(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiHealthResponse>> {
    match state.runpod_client.health_check().await {
        Ok(healthy) => Ok(Json(ApiHealthResponse {
            healthy,
            error: None,
        })),
        Err(e) => Ok(Json(ApiHealthResponse {
            healthy: false,
            error: Some(e.to_string()),
        })),
    }
}
