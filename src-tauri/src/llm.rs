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
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub text: String,
    #[serde(rename = "isDone")]
    pub is_done: bool,
}

#[tauri::command]
pub async fn test_llm_connection(
    client: State<'_, Client>,
    url: String,
    payload: LlmPayload,
) -> Result<String, String> {
    let actual_url = url.replace("localhost", "127.0.0.1");
    let mut request_builder = client.post(&actual_url);

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

    let outgoing_json = if actual_url.contains("/api/chat") || is_remote || payload.provider.to_lowercase() == "openai" {
        let mut json = serde_json::json!({
            "model": payload.model,
            "messages": [{"role": "user", "content": payload.prompt}],
        });
        if !is_remote && payload.provider.to_lowercase() != "openai" {
            json.as_object_mut().unwrap().insert("keep_alive".to_string(), serde_json::json!(0));
        }
        json
    } else {
        serde_json::json!({
            "model": payload.model,
            "prompt": payload.prompt,
            "stream": false,
            "keep_alive": 0
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
    println!(">>> RUNNING STREAM COMMAND: {:?}", payload);
    let actual_url = url.replace("localhost", "127.0.0.1");
    let mut request_builder = client.post(&actual_url);

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

    let outgoing_json = if actual_url.contains("/api/chat") || is_remote || payload.provider.to_lowercase() == "openai" {
        let mut json = serde_json::json!({
            "model": payload.model,
            "messages": [{"role": "user", "content": payload.prompt}],
            "stream": true
        });
        if !is_remote && payload.provider.to_lowercase() != "openai" {
            json.as_object_mut().unwrap().insert("keep_alive".to_string(), serde_json::json!(0));
        }
        json
    } else {
        serde_json::json!({
            "model": payload.model,
            "prompt": payload.prompt,
            "stream": true,
            "keep_alive": 0
        })
    };

    let response = match request_builder.json(&outgoing_json).send().await.and_then(|res| res.error_for_status()) {
        Ok(res) => {
            println!(">>> CONNECTION ESTABLISHED! HTTP Status: {}", res.status());
            res
        },
        Err(e) => {
            eprintln!("Reqwest error: {:?}", e);
            let error_msg = format!("Failed to send request: {}", e);
            let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
                session_id: payload.session_id.clone(),
                text: error_msg,
                is_done: true,
            });
            return Ok(());
        }
    };

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        match chunk_result {
            Ok(bytes) => {
                let chunk_text = String::from_utf8_lossy(&bytes).to_string();
                buffer.push_str(&chunk_text);
                
                let mut lines: Vec<&str> = buffer.split('\n').collect();
                
                let incomplete = if !buffer.ends_with('\n') {
                    lines.pop().unwrap_or("").to_string()
                } else {
                    String::new()
                };

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

                    match serde_json::from_str::<serde_json::Value>(line) {
                        Ok(json) => {
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
                                print!("{}", content);
                                let _ = std::io::Write::flush(&mut std::io::stdout());
                                let _ = app_handle.emit("llm-stream-chunk", StreamChunk {
                                    session_id: payload.session_id.clone(),
                                    text: content,
                                    is_done: false,
                                });
                            }
                        },
                        Err(e) => {
                            eprintln!("Failed to parse chunk: {}. Error: {}", line, e);
                        }
                    }
                }
                
                buffer = incomplete;
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
