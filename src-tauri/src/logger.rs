use serde::Serialize;
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Serialize)]
pub struct LogPayload {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
}

pub fn log_debug_event(app_handle: &AppHandle, level: &str, source: &str, message: &str) {
    let now = SystemTime::now();
    let timestamp_ms = if let Ok(duration) = now.duration_since(UNIX_EPOCH) {
        duration.as_millis().to_string()
    } else {
        "0".to_string()
    };

    // Write to file
    if let Ok(log_dir) = app_handle.path().app_log_dir() {
        let _ = std::fs::create_dir_all(&log_dir);
        let log_file = log_dir.join("debug.log");
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_file) {
            let log_line = format!("[{}] [{}] [{}] {}\n", timestamp_ms, level, source, message);
            let _ = file.write_all(log_line.as_bytes());
        }
    }

    // Emit to frontend
    let payload = LogPayload {
        timestamp: timestamp_ms,
        level: level.to_string(),
        source: source.to_string(),
        message: message.to_string(),
    };
    let _ = app_handle.emit("new-log", payload);
}
