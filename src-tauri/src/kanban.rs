use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Ticket {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub ticket_type: String,
    pub cycle_id: Option<String>,
    pub assignee_id: Option<String>,
    pub reporter_id: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTicketPayload {
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub ticket_type: String,
    pub cycle_id: Option<String>,
    pub assignee_id: Option<String>,
    pub reporter_id: Option<String>,
}

#[tauri::command]
pub async fn fetch_kanban_board(pool: State<'_, SqlitePool>) -> Result<Vec<Ticket>, String> {
    sqlx::query_as::<_, Ticket>("SELECT * FROM tickets")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_ticket(
    payload: CreateTicketPayload,
    pool: State<'_, SqlitePool>,
) -> Result<Ticket, String> {
    let next_id: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(CAST(SUBSTR(id, 6) AS INTEGER)), 0) + 1 FROM tickets"
    )
    .fetch_one(&*pool)
    .await
    .unwrap_or(1);

    let new_id = format!("SOMA-{}", next_id);

    sqlx::query(
        r#"
        INSERT INTO tickets (
            id, title, description, status, priority, ticket_type, cycle_id, assignee_id, reporter_id
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        "#)
        .bind(&new_id)
        .bind(&payload.title)
        .bind(&payload.description)
        .bind(&payload.status)
        .bind(&payload.priority)
        .bind(&payload.ticket_type)
        .bind(&payload.cycle_id)
        .bind(&payload.assignee_id)
        .bind(&payload.reporter_id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_as::<_, Ticket>("SELECT * FROM tickets WHERE id = ?")
        .bind(&new_id)
        .fetch_one(&*pool)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_ticket_status(
    id: String,
    new_status: String,
    pool: State<'_, SqlitePool>,
) -> Result<(), String> {
    sqlx::query("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(new_status)
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn test_valid_ticket_insertion() {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO tickets (
                id, title, description, status, priority, ticket_type, cycle_id, assignee_id, reporter_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            "#,
        )
        .bind("SOMA-TEST-1")
        .bind("Test Ticket")
        .bind("A description")
        .bind("Open")
        .bind("High")
        .bind("Bug")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .execute(&pool)
        .await;

        assert!(result.is_ok(), "Valid ticket insertion should succeed");
    }

    #[tokio::test]
    async fn test_invalid_ticket_insertion_fails_constraints() {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        let result = sqlx::query(
            r#"
            INSERT INTO tickets (
                id, title, description, status, priority, ticket_type, cycle_id, assignee_id, reporter_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            "#,
        )
        .bind("SOMA-TEST-2")
        .bind("Invalid Ticket")
        .bind("Should fail due to invalid status")
        .bind("InvalidStatus") // This should trigger CHECK constraint failure
        .bind("High")
        .bind("Bug")
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .bind::<Option<String>>(None)
        .execute(&pool)
        .await;

        assert!(result.is_err(), "Insertion with invalid status must fail");
    }
}
