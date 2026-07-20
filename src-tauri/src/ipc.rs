use crate::pty::PtyManager;
use std::sync::Mutex;
use tauri::{State, Emitter};

#[derive(Clone, serde::Serialize)]
struct UrlChangedPayload {
    id: String,
    url: String,
}

/// The PermissionGate acts as a middleware for all commands sent to the PTY.
/// 
/// In Phase 1, it acts as a simple pass-through.
/// In future phases (Project Nikkei), it will route AI command injections based on the
/// workspace's security level:
/// - Paranoia: Every injected keystroke requires explicit user approval.
/// - Vigilant: Read-only commands pass; write/destructive commands require approval.
/// - YOLO: Full autonomous AI injection without user intervention.
pub struct PermissionGate;

impl PermissionGate {
    pub fn validate_and_route(_data: &str) -> Result<(), String> {
        // Future: Check security level and prompt user if necessary.
        // For Phase 1: Always allow.
        Ok(())
    }
}

#[tauri::command]
pub fn write_to_pty(data: String, pty: State<'_, Mutex<PtyManager>>) -> Result<(), String> {
    PermissionGate::validate_and_route(&data)?;
    let pty_manager = pty.lock().unwrap();
    pty_manager.write(data)
}

#[tauri::command]
pub fn inject_command(command: String, pty: State<'_, Mutex<PtyManager>>) -> Result<(), String> {
    PermissionGate::validate_and_route(&command)?;
    let pty_manager = pty.lock().unwrap();
    pty_manager.write(format!("{}\n", command))
}

#[tauri::command]
pub fn resize_pty(rows: u16, cols: u16, pty: State<'_, Mutex<PtyManager>>) -> Result<(), String> {
    let pty_manager = pty.lock().unwrap();
    pty_manager.resize(rows, cols)
}

#[tauri::command]
pub fn spawn_pty(
    app_handle: tauri::AppHandle,
    pty: State<'_, Mutex<PtyManager>>,
) -> Result<(), String> {
    let pty_manager = pty.lock().unwrap();
    pty_manager.spawn(app_handle)
}

#[tauri::command]
pub fn create_webview(window: tauri::Window, id: String, url: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    use tauri::Manager;
    
    // Close existing if any
    if let Some(existing) = window.get_webview(&id) {
        let _ = existing.close();
    }
    
    let url_parsed = url.parse().map_err(|e| format!("Invalid URL: {}", e))?;
    let builder = tauri::WebviewBuilder::new(&id, tauri::WebviewUrl::External(url_parsed))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .devtools(true)
        .initialization_script(&r#"
            window.__SOMATERM_SILENCE_STRIKES__ = 0;
            window.__SOMATERM_LAST_STATE__ = null;
            
            window.__SOMATERM_CHECK_MEDIA__ = function() {
                if (window.__SOMATERM_SILENCE_STRIKES__ >= 150) {
                    window.location.replace('about:blank?hibernate=true');
                }
            };
            
            // Continuous audio state emitter using iframe navigation
            setInterval(() => {
                const isMediaSessionPlaying = navigator.mediaSession && navigator.mediaSession.playbackState === 'playing';
                const hasActiveTags = Array.from(document.querySelectorAll('audio, video')).some(media => !media.paused && !media.muted);
                const isPlaying = isMediaSessionPlaying || hasActiveTags;
                
                if (isPlaying) {
                    window.__SOMATERM_SILENCE_STRIKES__ = 0;
                } else {
                    window.__SOMATERM_SILENCE_STRIKES__ += 1;
                }
                
                if (isPlaying !== window.__SOMATERM_LAST_STATE__) {
                    window.__SOMATERM_LAST_STATE__ = isPlaying;
                    let iframe = document.getElementById('soma-telemetry');
                    if (!iframe) {
                        iframe = document.createElement('iframe');
                        iframe.id = 'soma-telemetry';
                        iframe.style.display = 'none';
                        document.body.appendChild(iframe);
                    }
                    iframe.src = `about:blank?heartbeat=true&playing=${isPlaying}&url=${encodeURIComponent(window.location.href)}&t=${Date.now()}`;
                }
            }, 2000);
        "#.replace("__TAB_ID__", &id))
        .on_page_load(|webview, payload| {
            let url_str = payload.url().to_string();
            if url_str != "about:blank" && !url_str.starts_with("about:blank?") {
                let id = webview.label().to_string();
                let _ = webview.app_handle().emit("webview-url-changed", UrlChangedPayload {
                    id: id.clone(),
                    url: url_str,
                });
            }
        });
        
    let id_clone = id.clone();
    let app_handle = window.app_handle().clone();
    let builder = builder.on_navigation(move |url| {
        let url_str = url.to_string();
        
        if url_str.starts_with("about:blank?hibernate=true") {
            if let Some(webview) = app_handle.get_webview(&id_clone) {
                let _ = webview.close();
            }
            let _ = app_handle.emit("webview-hibernated", id_clone.clone());
            return false;
        }

        if url_str.starts_with("about:blank?heartbeat=true") {
            let playing = url_str.contains("&playing=true");
            let mut extracted_url = String::new();
            if let Some(start) = url_str.find("&url=") {
                let rest = &url_str[start + 5..];
                if let Some(end) = rest.find("&t=") {
                    if let Ok(decoded) = urlencoding::decode(&rest[..end]) {
                        extracted_url = decoded.into_owned();
                    }
                }
            }
            
            #[derive(Clone, serde::Serialize)]
            struct HeartbeatPayload {
                id: String,
                playing: bool,
                url: String,
            }
            
            let _ = app_handle.emit("webview_media_heartbeat", HeartbeatPayload {
                id: id_clone.clone(),
                playing,
                url: extracted_url,
            });
            
            return false;
        }

        if url_str != "about:blank" && !url_str.starts_with("about:blank?") {
            let _ = app_handle.emit("webview-url-changed", UrlChangedPayload {
                id: id_clone.clone(),
                url: url_str,
            });
        }
        true
    });
    
    window.add_child(
        builder,
        tauri::LogicalPosition::new(x, y),
        tauri::LogicalSize::new(width, height)
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn update_webview(window: tauri::Window, id: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.set_bounds(tauri::Rect {
            position: tauri::LogicalPosition::new(x, y).into(),
            size: tauri::LogicalSize::new(width, height).into(),
        });
        let _ = webview.show();
    }
    Ok(())
}

#[tauri::command]
pub fn destroy_webview(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.close();
    }
    Ok(())
}

#[tauri::command]
pub fn hide_webview(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn webview_back(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.eval("window.history.back()");
    }
    Ok(())
}

#[tauri::command]
pub fn webview_forward(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.eval("window.history.forward()");
    }
    Ok(())
}

#[tauri::command]
pub fn webview_reload(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.eval("window.location.reload()");
    }
    Ok(())
}

#[tauri::command]
pub fn webview_open_devtools(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        webview.open_devtools();
    }
    Ok(())
}

#[tauri::command]
pub fn try_hibernate_webview(window: tauri::Window, id: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(webview) = window.get_webview(&id) {
        let _ = webview.eval("if (window.__SOMATERM_CHECK_MEDIA__) window.__SOMATERM_CHECK_MEDIA__()");
    }
    Ok(())
}

#[tauri::command]
pub fn write_debug_log(session_id: String, log_line: String) -> Result<(), String> {
    use std::io::Write;
    let _ = std::fs::create_dir_all("../debug");
    if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(format!("../debug/session_{}.log", session_id)) {
        let _ = writeln!(file, "{}", log_line);
    }
    Ok(())
}

