//! RunPod API client implementation
//!
//! Provides async functions to interact with RunPod serverless endpoints.
//! Mirrors the functionality of the Node.js runpod-client.js.

use crate::config::Config;
use crate::error::{Result, RunPodError};
use crate::models::{
    AsyncExecuteResponse, CancelJobResponse, JobStatusResponse, RunPodApiRequest,
    RunPodApiResponse, SyncExecuteResponse,
};
use reqwest::{Client, StatusCode};
use serde_json::Value;
use std::time::Duration;
use tracing::{debug, error, info, warn};

/// RunPod API client
#[derive(Clone)]
pub struct RunPodClient {
    client: Client,
    api_key: String,
    api_base: String,
}

impl RunPodClient {
    /// Create a new RunPod client from configuration
    ///
    /// # Arguments
    /// * `config` - Application configuration
    ///
    /// # Returns
    /// * `Result<RunPodClient>` - New client instance or error
    pub fn new(config: &Config) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .map_err(|e| RunPodError::InternalError(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            api_key: config.runpod_api_key.clone(),
            api_base: config.runpod_api_base.clone(),
        })
    }

    /// Execute a RunPod serverless endpoint
    ///
    /// Supports both synchronous and asynchronous execution.
    ///
    /// # Arguments
    /// * `endpoint_id` - The RunPod endpoint ID
    /// * `input` - Input data for the endpoint
    /// * `sync` - If true, wait for result. If false, return job ID
    /// * `timeout` - Request timeout in milliseconds
    ///
    /// # Returns
    /// * `Ok(Value)` - Job result (sync) or job info (async)
    /// * `Err(RunPodError)` - If request fails
    ///
    /// # Examples
    /// ```no_run
    /// use serde_json::json;
    ///
    /// // Synchronous execution
    /// let result = client.execute_endpoint(
    ///     "my-endpoint-id",
    ///     json!({"prompt": "Hello"}),
    ///     true,
    ///     30000
    /// ).await?;
    ///
    /// // Asynchronous execution
    /// let job = client.execute_endpoint(
    ///     "my-endpoint-id",
    ///     json!({"prompt": "Hello"}),
    ///     false,
    ///     30000
    /// ).await?;
    /// ```
    pub async fn execute_endpoint(
        &self,
        endpoint_id: &str,
        input: Value,
        sync: bool,
        timeout: u64,
    ) -> Result<Value> {
        if endpoint_id.is_empty() {
            return Err(RunPodError::ValidationError("endpoint_id is required".to_string()));
        }

        let endpoint_suffix = if sync { "runsync" } else { "run" };
        let url = format!("{}/{}/{}", self.api_base, endpoint_id, endpoint_suffix);

        info!("[RunPod] → POST {} (sync={})", url, sync);

        let request_body = RunPodApiRequest { input };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .timeout(Duration::from_millis(timeout))
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();
        info!("[RunPod] ← {} POST {}", status, url);

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("[RunPod] Error response: {}", error_text);

            let error_message = serde_json::from_str::<Value>(&error_text)
                .ok()
                .and_then(|v| v.get("error").or(v.get("message")).and_then(|e| e.as_str()).map(String::from))
                .unwrap_or(error_text);

            return Err(RunPodError::ApiError {
                status: status.as_u16(),
                message: error_message,
            });
        }

        let api_response: RunPodApiResponse = response.json().await?;

        if sync {
            // Synchronous execution returns result immediately
            Ok(serde_json::to_value(SyncExecuteResponse {
                id: api_response.id.unwrap_or_default(),
                status: api_response.status.unwrap_or_else(|| "COMPLETED".to_string()),
                output: api_response.output,
                execution_time: api_response.execution_time,
                delay_time: api_response.delay_time,
            })?)
        } else {
            // Asynchronous execution returns job ID
            Ok(serde_json::to_value(AsyncExecuteResponse {
                id: api_response.id.unwrap_or_default(),
                status: api_response.status.unwrap_or_else(|| "IN_QUEUE".to_string()),
            })?)
        }
    }

    /// Get the status of an asynchronous job
    ///
    /// # Arguments
    /// * `endpoint_id` - The RunPod endpoint ID
    /// * `job_id` - The job ID returned from async execution
    ///
    /// # Returns
    /// * `Ok(JobStatusResponse)` - Job status and result (if completed)
    /// * `Err(RunPodError)` - If request fails
    ///
    /// # Examples
    /// ```no_run
    /// let status = client.get_job_status("my-endpoint-id", "job-123").await?;
    /// if status.status == "COMPLETED" {
    ///     println!("Output: {:?}", status.output);
    /// }
    /// ```
    pub async fn get_job_status(
        &self,
        endpoint_id: &str,
        job_id: &str,
    ) -> Result<JobStatusResponse> {
        if endpoint_id.is_empty() {
            return Err(RunPodError::ValidationError("endpoint_id is required".to_string()));
        }

        if job_id.is_empty() {
            return Err(RunPodError::ValidationError("job_id is required".to_string()));
        }

        let url = format!("{}/{}/status/{}", self.api_base, endpoint_id, job_id);

        debug!("[RunPod] → GET {}", url);

        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/json")
            .send()
            .await?;

        let status = response.status();
        debug!("[RunPod] ← {} GET {}", status, url);

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("[RunPod] Error response: {}", error_text);

            let error_message = serde_json::from_str::<Value>(&error_text)
                .ok()
                .and_then(|v| v.get("error").or(v.get("message")).and_then(|e| e.as_str()).map(String::from))
                .unwrap_or(error_text);

            return Err(RunPodError::ApiError {
                status: status.as_u16(),
                message: error_message,
            });
        }

        let api_response: RunPodApiResponse = response.json().await?;

        Ok(JobStatusResponse {
            id: api_response.id.unwrap_or_default(),
            status: api_response.status.unwrap_or_else(|| "UNKNOWN".to_string()),
            output: api_response.output,
            execution_time: api_response.execution_time,
            delay_time: api_response.delay_time,
            error: api_response.error,
        })
    }

    /// Cancel a running job
    ///
    /// # Arguments
    /// * `endpoint_id` - The RunPod endpoint ID
    /// * `job_id` - The job ID to cancel
    ///
    /// # Returns
    /// * `Ok(CancelJobResponse)` - Cancellation result
    /// * `Err(RunPodError)` - If request fails
    ///
    /// # Examples
    /// ```no_run
    /// let result = client.cancel_job("my-endpoint-id", "job-123").await?;
    /// println!("Job cancelled: {}", result.status);
    /// ```
    pub async fn cancel_job(
        &self,
        endpoint_id: &str,
        job_id: &str,
    ) -> Result<CancelJobResponse> {
        if endpoint_id.is_empty() {
            return Err(RunPodError::ValidationError("endpoint_id is required".to_string()));
        }

        if job_id.is_empty() {
            return Err(RunPodError::ValidationError("job_id is required".to_string()));
        }

        let url = format!("{}/{}/cancel/{}", self.api_base, endpoint_id, job_id);

        info!("[RunPod] → POST {} (cancel)", url);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/json")
            .send()
            .await?;

        let status = response.status();
        info!("[RunPod] ← {} POST {}", status, url);

        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("[RunPod] Error response: {}", error_text);

            let error_message = serde_json::from_str::<Value>(&error_text)
                .ok()
                .and_then(|v| v.get("error").or(v.get("message")).and_then(|e| e.as_str()).map(String::from))
                .unwrap_or(error_text);

            return Err(RunPodError::ApiError {
                status: status.as_u16(),
                message: error_message,
            });
        }

        let api_response: RunPodApiResponse = response.json().await?;

        Ok(CancelJobResponse {
            id: api_response.id.unwrap_or_default(),
            status: api_response.status.unwrap_or_else(|| "CANCELLED".to_string()),
        })
    }

    /// Poll a job until it completes or times out
    ///
    /// Useful for async jobs where you want to wait for the result.
    ///
    /// # Arguments
    /// * `endpoint_id` - The RunPod endpoint ID
    /// * `job_id` - The job ID to poll
    /// * `max_wait_time` - Maximum time to wait in milliseconds
    /// * `poll_interval` - Time between checks in milliseconds
    ///
    /// # Returns
    /// * `Ok(JobStatusResponse)` - Final job result
    /// * `Err(RunPodError)` - If job fails or times out
    ///
    /// # Examples
    /// ```no_run
    /// let result = client.poll_job_until_complete(
    ///     "my-endpoint-id",
    ///     "job-123",
    ///     300000, // 5 minutes
    ///     2000    // 2 seconds
    /// ).await?;
    /// println!("Output: {:?}", result.output);
    /// ```
    pub async fn poll_job_until_complete(
        &self,
        endpoint_id: &str,
        job_id: &str,
        max_wait_time: u64,
        poll_interval: u64,
    ) -> Result<JobStatusResponse> {
        let start_time = std::time::Instant::now();

        loop {
            let elapsed = start_time.elapsed().as_millis() as u64;

            if elapsed > max_wait_time {
                warn!("[RunPod] Job {} polling timeout after {}ms", job_id, max_wait_time);
                return Err(RunPodError::TimeoutError(max_wait_time));
            }

            let status_response = self.get_job_status(endpoint_id, job_id).await?;

            info!("[RunPod] Job {} status: {}", job_id, status_response.status);

            match status_response.status.as_str() {
                "COMPLETED" => {
                    info!("[RunPod] Job {} completed successfully", job_id);
                    return Ok(status_response);
                }
                "FAILED" => {
                    error!("[RunPod] Job {} failed: {:?}", job_id, status_response.error);
                    return Err(RunPodError::ApiError {
                        status: 500,
                        message: format!(
                            "Job failed: {}",
                            status_response.error.unwrap_or_else(|| "Unknown error".to_string())
                        ),
                    });
                }
                "CANCELLED" => {
                    warn!("[RunPod] Job {} was cancelled", job_id);
                    return Err(RunPodError::ApiError {
                        status: 499,
                        message: "Job was cancelled".to_string(),
                    });
                }
                _ => {
                    // Job still in progress, wait before next poll
                    debug!("[RunPod] Job {} still running, waiting {}ms...", job_id, poll_interval);
                    tokio::time::sleep(Duration::from_millis(poll_interval)).await;
                }
            }
        }
    }

    /// Health check for RunPod API connectivity
    ///
    /// Tests if the API key is valid and API is reachable.
    ///
    /// # Returns
    /// * `Ok(true)` - API is accessible
    /// * `Ok(false)` - API is not accessible
    /// * `Err(RunPodError)` - If check fails
    ///
    /// # Examples
    /// ```no_run
    /// let healthy = client.health_check().await?;
    /// if healthy {
    ///     println!("RunPod API is accessible");
    /// }
    /// ```
    pub async fn health_check(&self) -> Result<bool> {
        // Try to make a simple request to verify connectivity
        // Note: This will fail with 404 but confirms API is reachable
        let url = format!("{}/health", self.api_base);

        debug!("[RunPod] Health check: GET {}", url);

        match self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/json")
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) => {
                let status = response.status();
                // If we get a 404, it means the API is reachable (endpoint doesn't exist, but that's expected)
                if status == StatusCode::NOT_FOUND {
                    info!("[RunPod] Health check passed (API reachable)");
                    Ok(true)
                } else if status.is_success() {
                    info!("[RunPod] Health check passed");
                    Ok(true)
                } else {
                    warn!("[RunPod] Health check returned status: {}", status);
                    Ok(false)
                }
            }
            Err(e) => {
                error!("[RunPod] Health check failed: {}", e);
                Ok(false)
            }
        }
    }
}
