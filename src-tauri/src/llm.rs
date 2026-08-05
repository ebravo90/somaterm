use serde::{Deserialize, Serialize};
use reqwest::Client;
use tauri::{Emitter, State};
use keyring::Entry;
use futures_util::StreamExt;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmPayload {
    pub session_id: String,
    pub provider: String,
    pub agent_id: Option<String>,
    pub model: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunk {
    pub session_id: String,
    pub text: String,
    pub is_done: bool,
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

    let outgoing_json = if is_remote || payload.provider.to_lowercase() == "openai" {
        serde_json::json!({
            "model": payload.model,
            "messages": [{"role": "user", "content": payload.prompt}],
        })
    } else {
        serde_json::json!({
            "model": payload.model,
            "prompt": payload.prompt,
            "stream": false
        })
    };

    let response = request_builder
        .json(&outgoing_json)
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

#[tauri::command]
pub async fn stream_llm_response(
    app_handle: tauri::AppHandle,
    client: State<'_, Client>,
    url: String,
    payload: LlmPayload,
) -> Result<(), String> {
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

    let outgoing_json = if is_remote || payload.provider.to_lowercase() == "openai" {
        serde_json::json!({
            "model": payload.model,
            "messages": [{"role": "user", "content": payload.prompt}],
            "stream": true
        })
    } else {
        serde_json::json!({
            "model": payload.model,
            "prompt": payload.prompt,
            "stream": true
        })
    };

    let response = match request_builder.json(&outgoing_json).send().await {
        Ok(res) => res,
        Err(e) => {
            let error_msg = format!("Failed to send request: {}", e);
            let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
                session_id: payload.session_id.clone(),
                text: error_msg,
                is_done: true,
            });
            return Ok(());
        }
    };

    if !response.status().is_success() {
        let error_msg = format!("Server returned error status: {}", response.status());
        let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
            session_id: payload.session_id.clone(),
            text: error_msg,
            is_done: true,
        });
        return Ok(());
    }

    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes).to_string();
                
                let lines: Vec<&str> = text.split('\n').collect();
                for mut line in lines {
                    line = line.trim();
                    if line.is_empty() {
                        continue;
                    }
                    if line.starts_with("data: ") {
                        line = &line["data: ".len()..];
                    }
                    if line == "[DONE]" {
                        continue;
                    }

                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                        let mut content = String::new();
                        // Ollama /api/generate format
                        if let Some(r) = json.get("response").and_then(|v| v.as_str()) {
                            content = r.to_string();
                        }
                        // Ollama /api/chat format
                        else if let Some(msg) = json.get("message") {
                            if let Some(c) = msg.get("content").and_then(|v| v.as_str()) {
                                content = c.to_string();
                            }
                        }
                        // OpenAI format
                        else if let Some(choices) = json.get("choices").and_then(|v| v.as_array()) {
                            if let Some(first) = choices.get(0) {
                                if let Some(delta) = first.get("delta") {
                                    if let Some(c) = delta.get("content").and_then(|v| v.as_str()) {
                                        content = c.to_string();
                                    }
                                }
                            }
                        }

                        if !content.is_empty() {
                            let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
                                session_id: payload.session_id.clone(),
                                text: content,
                                is_done: false,
                            });
                        }
                    }
                }
            }
            Err(e) => {
                println!("Error reading stream chunk: {}", e);
            }
        }
    }

    let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
        session_id: payload.session_id,
        text: String::new(),
        is_done: true,
    });

    Ok(())
}
