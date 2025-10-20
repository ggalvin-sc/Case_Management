// Firm settings route handlers - full implementations
use axum::{extract::State, Extension, Json};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{config::Config, db::models::{User, FirmSettings}, error::AppResult};

pub async fn get(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
) -> AppResult<Json<Option<FirmSettings>>> {
    let settings = sqlx::query_as::<_, FirmSettings>("SELECT * FROM firm_settings WHERE id = 1")
        .fetch_optional(pool.as_ref())
        .await?;
    Ok(Json(settings))
}

/// Update firm settings
pub async fn update(
    State((pool, _config)): State<(Arc<SqlitePool>, Arc<Config>)>,
    Extension(_user): Extension<User>,
    Json(data): Json<Value>,
) -> AppResult<Json<FirmSettings>> {
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    let allowed_fields = vec![
        "firm_name", "address", "address_line2", "city", "state", "zip_code",
        "phone", "email", "website", "tax_id", "logo_url",
        "default_invoice_template", "default_payment_terms", "invoice_footer"
    ];

    for field in allowed_fields {
        if let Some(value) = data.get(field) {
            updates.push(format!("{} = ?", field));
            values.push(value.to_string().trim_matches('"').to_string());
        }
    }

    if !updates.is_empty() {
        let sql = format!("UPDATE firm_settings SET {} WHERE id = 1", updates.join(", "));
        let mut query = sqlx::query(&sql);

        for value in values {
            query = query.bind(value);
        }

        query.execute(pool.as_ref()).await?;
    }

    let settings = sqlx::query_as::<_, FirmSettings>("SELECT * FROM firm_settings WHERE id = 1")
        .fetch_one(pool.as_ref())
        .await?;

    Ok(Json(settings))
}
