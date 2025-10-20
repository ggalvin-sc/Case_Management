//! Case Management System - Rust Backend Library
//!
//! This library provides the core functionality for the case management system backend.

pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod routes;

pub use config::Config;
pub use error::{AppError, AppResult};
