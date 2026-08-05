use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, FromRow)]
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
pub struct CreateTicketPayload {
    pub id: String,
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
    sqlx::query(
        r#"
        INSERT INTO tickets (
            id, title, description, status, priority, ticket_type, cycle_id, assignee_id, reporter_id
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        "#)
        .bind(&payload.id)
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
        .bind(&payload.id)
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
