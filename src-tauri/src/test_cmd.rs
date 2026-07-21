#[tauri::command]
pub fn media_heartbeat(webview: tauri::Webview, playing: bool, url: String) {}
