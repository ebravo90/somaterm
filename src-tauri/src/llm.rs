use serde::{Deserialize, Serialize};
use reqwest::Client;
use tauri::State;
use keyring::Entry;

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmPayload {
    pub provider: String,
    pub agent_id: Option<String>,
    pub model: String,
    pub prompt: String,
}

#[tauri::command]
pub async fn test_llm_connection(
    client: State<'_, Client>,
    url: String,
    payload: LlmPayload,
) -> Result<String, String> {
    let mut request_builder = client.post(&url);

    let is_remote = payload.provider.to_lowercase() != "ollama" 
                 && payload.provider.to_lowercase() != "local";

    if is_remote {
        let lookup_key = payload.agent_id.as_deref().unwrap_or(&payload.provider);
        if let Ok(entry) = Entry::new("somaterm", &format!("agent-{}", lookup_key)) {
            if let Ok(password) = entry.get_password() {
                if !password.is_empty() {
                    request_builder = request_builder.bearer_auth(password);
                }
            }
        }
    }

    let response = request_builder
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error status: {}", response.status()));
    }

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    Ok(text)
}
