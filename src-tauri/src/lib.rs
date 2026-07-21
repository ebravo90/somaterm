pub mod logger;
mod ipc;
mod pty;

use std::sync::Mutex;
use tauri::{Manager, Emitter};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu, SubmenuBuilder};

pub fn build_menu(app_handle: &tauri::AppHandle, active_terminals: &[ipc::TerminalInfo]) -> tauri::Result<Menu<tauri::Wry>> {
    let handle = app_handle;
    let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, Some("cmdOrControl+q"))?;
    let settings_i = MenuItem::with_id(handle, "menu-settings", "Settings...", true, Some("cmdOrControl+,"))?;
    
    let app_submenu = Submenu::with_items(handle, "Somaterm", true, &[
        &settings_i,
        &PredefinedMenuItem::separator(handle)?,
        &quit_i,
    ])?;
    
    // Shell Menu
    let new_term_i = MenuItem::with_id(handle, "menu-new-terminal", "New Terminal", true, Some("cmdOrControl+t"))?;
    let close_term_i = MenuItem::with_id(handle, "menu-close-terminal", "Close Terminal", true, Some("cmdOrControl+w"))?;
    let clear_buffer_i = MenuItem::with_id(handle, "menu-clear-buffer", "Clear Buffer", true, Some("cmdOrControl+k"))?;
    
    let mut shell_menu_builder = SubmenuBuilder::new(handle, "Shell")
        .item(&new_term_i)
        .item(&close_term_i)
        .separator()
        .item(&clear_buffer_i);

    if !active_terminals.is_empty() {
        shell_menu_builder = shell_menu_builder.separator();
        let mut active_terms_builder = SubmenuBuilder::new(handle, "Active Terminals");
        for (i, term) in active_terminals.iter().enumerate() {
            let shortcut = if i < 9 { Some(format!("cmdOrControl+{}", i + 1)) } else { None };
            let item = MenuItem::with_id(
                handle,
                format!("menu-focus-terminal:{}", term.id),
                &term.name,
                true,
                shortcut.as_deref()
            )?;
            active_terms_builder = active_terms_builder.item(&item);
        }
        shell_menu_builder = shell_menu_builder.item(&active_terms_builder.build()?);
    }
    let shell_submenu = shell_menu_builder.build()?;

    // Edit Menu (Native macOS bindings)
    let edit_submenu = Submenu::with_items(handle, "Edit", true, &[
        &PredefinedMenuItem::undo(handle, None)?,
        &PredefinedMenuItem::redo(handle, None)?,
        &PredefinedMenuItem::separator(handle)?,
        &PredefinedMenuItem::cut(handle, None)?,
        &PredefinedMenuItem::copy(handle, None)?,
        &PredefinedMenuItem::paste(handle, None)?,
        &PredefinedMenuItem::select_all(handle, None)?,
    ])?;

    // Browser Menu
    let toggle_web_i = MenuItem::with_id(handle, "menu-toggle-web", "Toggle Web Manager", true, Some("cmdOrControl+b"))?;
    let nav_url_i = MenuItem::with_id(handle, "menu-navigate-url", "Navigate to URL", true, Some("cmdOrControl+l"))?;
    let browser_submenu = Submenu::with_items(handle, "Browser", true, &[
        &toggle_web_i,
        &nav_url_i,
    ])?;

    // Agent Menu
    let toggle_agent_i = MenuItem::with_id(handle, "menu-toggle-agent", "Toggle Agent Panel", true, Some("cmdOrControl+j"))?;
    let clear_context_i = MenuItem::with_id(handle, "menu-clear-context", "Clear Context", true, Some("cmdOrControl+shift+c"))?;
    let agent_submenu = Submenu::with_items(handle, "Agent", true, &[
        &toggle_agent_i,
        &clear_context_i,
    ])?;

    // Help Menu
    let docs_i = MenuItem::with_id(handle, "menu-docs", "Somaterm Documentation", true, None::<&str>)?;
    let help_submenu = Submenu::with_items(handle, "Help", true, &[
        &docs_i,
    ])?;
    
    Menu::with_items(handle, &[&app_submenu, &shell_submenu, &edit_submenu, &browser_submenu, &agent_submenu, &help_submenu])
}

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
            
            let handle = app.handle();
            let menu = build_menu(handle, &[])?;
            app.set_menu(menu)?;
            
            app.on_menu_event(move |app_handle, event| {
                if event.id() == "quit" {
                    app_handle.exit(0);
                } else {
                    let event_id_str = event.id().as_ref();
                    if event_id_str.starts_with("menu-focus-terminal:") {
                        let term_id = event_id_str.replace("menu-focus-terminal:", "");
                        let _ = app_handle.emit("menu-focus-terminal", term_id);
                    } else {
                        let _ = app_handle.emit(event_id_str, ());
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::update_active_terminals_menu,
            ipc::spawn_pty,
            ipc::write_to_pty,
            ipc::resize_pty,
            ipc::close_pty,
            ipc::inject_command,
            ipc::create_webview,
            ipc::resize_webview,
            ipc::destroy_webview,
            ipc::hide_webview,
            ipc::webview_back,
            ipc::webview_forward,
            ipc::webview_reload,
            ipc::webview_navigate,
            ipc::webview_open_devtools,
            ipc::try_hibernate_webview,
            ipc::write_debug_log,
            ipc::open_logs_folder,
            ipc::load_agents,
            ipc::save_agents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
