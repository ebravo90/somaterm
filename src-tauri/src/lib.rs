pub mod logger;
mod ipc;
mod pty;

use std::sync::Mutex;
use tauri::{Manager, Emitter};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("somaterm", move |app, request| {
            let uri = request.uri().to_string();
            if uri.starts_with("somaterm://heartbeat") {
                let mut id = String::new();
                let mut playing = false;
                let mut url = String::new();
                
                if let Ok(parsed_url) = tauri::Url::parse(&uri) {
                    for (k, v) in parsed_url.query_pairs() {
                        if k == "id" { id = v.to_string(); }
                        if k == "playing" { playing = v == "true"; }
                        if k == "url" { url = v.to_string(); }
                    }
                }
                
                #[derive(Clone, serde::Serialize)]
                struct HeartbeatPayload {
                    id: String,
                    playing: bool,
                    url: String,
                }
                
                let _ = app.app_handle().emit("webview_media_heartbeat", HeartbeatPayload {
                    id: id.clone(),
                    playing,
                    url: url.clone(),
                });
                
                crate::logger::log_debug_event(
                    app.app_handle(),
                    "MEDIA",
                    "WebManager",
                    &format!("Heartbeat from tab {}: playing={}, url={}", id, playing, url)
                );
            }
            
            tauri::http::Response::builder()
                .status(200)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap()
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.manage(Mutex::new(pty::PtyManager::new()));
            
            let handle = app.handle();
            let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, Some("cmdOrControl+q"))?;
            let settings_i = MenuItem::with_id(handle, "settings", "Settings...", true, Some("cmdOrControl+,"))?;
            
            let app_submenu = Submenu::with_items(handle, "Somaterm", true, &[
                &settings_i,
                &PredefinedMenuItem::separator(handle)?,
                &quit_i,
            ])?;
            
            let menu = Menu::with_items(handle, &[&app_submenu])?;
            app.set_menu(menu)?;
            
            app.on_menu_event(move |app_handle, event| {
                if event.id() == "settings" {
                    let _ = app_handle.emit("toggle-settings", ());
                } else if event.id() == "quit" {
                    app_handle.exit(0);
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::spawn_pty,
            ipc::write_to_pty,
            ipc::resize_pty,
            ipc::inject_command,
            ipc::create_webview,
            ipc::update_webview,
            ipc::destroy_webview,
            ipc::hide_webview,
            ipc::webview_back,
            ipc::webview_forward,
            ipc::webview_reload,
            ipc::webview_open_devtools,
            ipc::try_hibernate_webview,
            ipc::write_debug_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
