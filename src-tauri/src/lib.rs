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
            ipc::resize_pty
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
