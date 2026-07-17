use crate::pty::PtyManager;
use std::sync::Mutex;
use tauri::State;

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
