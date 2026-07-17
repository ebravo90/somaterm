mod ipc;
mod pty;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.manage(Mutex::new(pty::PtyManager::new()));
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
            ipc::webview_open_devtools
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
