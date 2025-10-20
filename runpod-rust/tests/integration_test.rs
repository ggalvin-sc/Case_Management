//! Integration tests for RunPod Rust service
//!
//! Note: These tests require a valid RUNPOD_API_KEY in the environment.
//! Some tests may be skipped if credentials are not available.

use runpod_rust::config::Config;
use runpod_rust::runpod::RunPodClient;

#[test]
fn test_config_validation() {
    // Test that config requires API key
    std::env::remove_var("RUNPOD_API_KEY");
    assert!(Config::from_env().is_err());
}

#[test]
fn test_config_defaults() {
    // Set minimum required config
    std::env::set_var("RUNPOD_API_KEY", "test_key");

    let config = Config::from_env().expect("Config should load with API key");

    // Check defaults
    assert_eq!(config.runpod_api_base, "https://api.runpod.ai/v2");
    assert_eq!(config.host, "127.0.0.1");
    assert_eq!(config.port, 3001);

    // Cleanup
    std::env::remove_var("RUNPOD_API_KEY");
}

#[test]
fn test_server_address_format() {
    std::env::set_var("RUNPOD_API_KEY", "test_key");
    std::env::set_var("HOST", "0.0.0.0");
    std::env::set_var("PORT", "8080");

    let config = Config::from_env().expect("Config should load");
    assert_eq!(config.server_address(), "0.0.0.0:8080");

    // Cleanup
    std::env::remove_var("RUNPOD_API_KEY");
    std::env::remove_var("HOST");
    std::env::remove_var("PORT");
}

#[tokio::test]
async fn test_client_creation() {
    std::env::set_var("RUNPOD_API_KEY", "test_key");

    let config = Config::from_env().expect("Config should load");
    let client = RunPodClient::new(&config);

    assert!(client.is_ok(), "Client creation should succeed");

    std::env::remove_var("RUNPOD_API_KEY");
}

#[tokio::test]
async fn test_validation_errors() {
    std::env::set_var("RUNPOD_API_KEY", "test_key");

    let config = Config::from_env().expect("Config should load");
    let client = RunPodClient::new(&config).expect("Client should be created");

    // Test empty endpoint_id validation
    let result = client.execute_endpoint(
        "",
        serde_json::json!({}),
        false,
        30000,
    ).await;

    assert!(result.is_err(), "Empty endpoint_id should fail");

    // Test empty job_id validation
    let result = client.get_job_status("endpoint-id", "").await;
    assert!(result.is_err(), "Empty job_id should fail");

    std::env::remove_var("RUNPOD_API_KEY");
}

// Note: The following tests require a valid RunPod API key and endpoint.
// They will be skipped if the environment is not properly configured.

#[tokio::test]
#[ignore] // Run with: cargo test -- --ignored
async fn test_api_health_check_with_real_key() {
    // This test requires a real API key
    let config = Config::from_env().expect("Config should load from environment");
    let client = RunPodClient::new(&config).expect("Client should be created");

    let result = client.health_check().await;
    assert!(result.is_ok(), "Health check should succeed");
}

#[tokio::test]
#[ignore] // Run with: cargo test -- --ignored
async fn test_execute_endpoint_async() {
    // This test requires:
    // 1. RUNPOD_API_KEY in environment
    // 2. RUNPOD_TEST_ENDPOINT_ID in environment

    let endpoint_id = std::env::var("RUNPOD_TEST_ENDPOINT_ID")
        .expect("RUNPOD_TEST_ENDPOINT_ID must be set for integration tests");

    let config = Config::from_env().expect("Config should load");
    let client = RunPodClient::new(&config).expect("Client should be created");

    let result = client.execute_endpoint(
        &endpoint_id,
        serde_json::json!({"test": "data"}),
        false, // async
        30000,
    ).await;

    assert!(result.is_ok(), "Async execution should succeed");

    // Extract job ID from response
    let response = result.unwrap();
    let job_id = response.get("id")
        .and_then(|v| v.as_str())
        .expect("Response should contain job ID");

    assert!(!job_id.is_empty(), "Job ID should not be empty");
}
