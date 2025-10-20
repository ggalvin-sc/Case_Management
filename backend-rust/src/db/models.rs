use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// User model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub email: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub hourly_rate: Option<f64>,
    pub kimai_user_id: Option<i64>,
}

/// Client model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Client {
    pub id: i64,
    pub name: String,
    pub client_number: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub default_hourly_rate: Option<f64>,
    pub kimai_customer_id: Option<i64>,
}

/// Matter model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Matter {
    pub id: i64,
    pub matter_number: Option<String>,
    pub client_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub attorney_id: Option<i64>,
    pub billing_type: Option<String>,
    pub hourly_rate: Option<f64>,
    pub open_date: Option<String>,
    pub close_date: Option<String>,
    pub matter_type: Option<String>,
    pub court_name: Option<String>,
    pub case_number: Option<String>,
    pub opposing_party: Option<String>,
    pub opposing_counsel: Option<String>,
    pub statute_of_limitations_date: Option<String>,
    pub priority: Option<String>,
    pub practice_area: Option<String>,
    pub conflict_check_date: Option<String>,
    pub retainer_amount: Option<f64>,
    pub estimated_hours: Option<f64>,
    pub notes: Option<String>,
    pub contingency_percentage: Option<f64>,
    pub trial_contingency_percentage: Option<f64>,
    pub appeal_contingency_percentage: Option<f64>,
    pub attorney_hourly_rate: Option<f64>,
    pub trial_date: Option<String>,
    pub appeal_date: Option<String>,
    pub kimai_project_id: Option<i64>,
}

/// Time entry model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TimeEntry {
    pub id: i64,
    pub matter_id: i64,
    pub user_id: i64,
    pub entry_date: String,
    pub duration_minutes: i64,
    pub description: String,
    pub hourly_rate: Option<f64>,
    pub amount: Option<f64>,
    pub billable: i64,
    pub billed: i64,
    pub invoice_id: Option<i64>,
    pub kimai_timesheet_id: Option<i64>,
}

/// Expense model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Expense {
    pub id: i64,
    pub matter_id: i64,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub vendor: Option<String>,
    pub amount: f64,
    pub markup_percentage: Option<f64>,
    pub billed_amount: Option<f64>,
    pub billable: i64,
    pub billed: i64,
    pub invoice_id: Option<i64>,
}

/// Invoice model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Invoice {
    pub id: i64,
    pub invoice_number: Option<String>,
    pub matter_id: i64,
    pub client_id: i64,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub status: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
    pub notes: Option<String>,
    pub payment_terms: Option<String>,
    pub created_at: Option<String>,
    pub finalized_at: Option<String>,
    pub sent_at: Option<String>,
    pub paid_at: Option<String>,
    pub paid_amount: f64,
}

/// Invoice line item model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InvoiceLineItem {
    pub id: i64,
    pub invoice_id: i64,
    pub item_type: String,
    pub item_id: Option<i64>,
    pub description: String,
    pub quantity: f64,
    pub rate: f64,
    pub amount: f64,
    pub line_order: i64,
}

/// Firm settings model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FirmSettings {
    pub id: i64,
    pub firm_name: Option<String>,
    pub address: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub tax_id: Option<String>,
    pub logo_url: Option<String>,
    pub default_invoice_template: Option<String>,
    pub default_payment_terms: Option<String>,
    pub invoice_footer: Option<String>,
}

// DTO (Data Transfer Object) types for API requests/responses

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: i64,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateClientRequest {
    pub name: String,
    pub client_number: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub address_line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub default_hourly_rate: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMatterRequest {
    pub client_id: i64,
    pub matter_number: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub attorney_id: Option<i64>,
    pub attorney_hourly_rate: Option<f64>,
    pub billing_type: Option<String>,
    pub hourly_rate: Option<f64>,
    pub trial_contingency_percentage: Option<f64>,
    pub appeal_contingency_percentage: Option<f64>,
    pub open_date: Option<String>,
    pub matter_type: Option<String>,
    pub practice_area: Option<String>,
    pub priority: Option<String>,
    pub court_name: Option<String>,
    pub case_number: Option<String>,
    pub opposing_party: Option<String>,
    pub opposing_counsel: Option<String>,
    pub statute_of_limitations_date: Option<String>,
    pub trial_date: Option<String>,
    pub appeal_date: Option<String>,
    pub retainer_amount: Option<f64>,
    pub estimated_hours: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeEntryRequest {
    pub matter_id: i64,
    pub entry_date: String,
    pub duration_minutes: i64,
    pub description: String,
    pub hourly_rate: Option<f64>,
    pub billable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateExpenseRequest {
    pub matter_id: i64,
    pub expense_date: String,
    pub category: String,
    pub description: String,
    pub vendor: Option<String>,
    pub amount: f64,
    pub markup_percentage: Option<f64>,
    pub billed_amount: f64,
    pub billable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub matter_id: i64,
    pub client_id: i64,
    pub time_entry_ids: Vec<i64>,
    pub expense_ids: Vec<i64>,
    pub issue_date: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub payment_terms: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceRequest {
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub payment_terms: Option<String>,
    pub tax_rate: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct RecordPaymentRequest {
    pub amount: f64,
    pub payment_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}
