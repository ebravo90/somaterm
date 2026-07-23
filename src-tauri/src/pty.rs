use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(&self, app_handle: AppHandle, id: String, rows: u16, cols: u16) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if sessions.contains_key(&id) {
            return Ok(());
        }

        let pty_system = NativePtySystem::default();

        let pty_pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new(Self::default_shell());
        cmd.env("TERM", "xterm-256color");

        // Spawn the shell process
        let _child = pty_pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| e.to_string())?;

        // Extract writer and reader
        let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;
        let mut reader = pty_pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;

        sessions.insert(
            id.clone(),
            PtySession {
                master: pty_pair.master,
                writer,
            },
        );

        let id_clone = id.clone();
        // Background thread to read from PTY and emit to frontend
        std::thread::spawn(move || {
            let mut buf = [0; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_handle.emit(&format!("pty-read-{}", id_clone), data);
                    }
                    Ok(_) => break,  // EOF
                    Err(_) => break, // Error or closed
                }
            }
        });

        Ok(())
    }

    pub fn write(&self, id: &str, data: String) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get_mut(id) {
            session
                .writer
                .write_all(data.as_bytes())
                .map_err(|e| e.to_string())?;
            session.writer.flush().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn resize(&self, id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn close(&self, id: &str) -> Result<(), String> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(id); // Dropping PtySession will close the master and writer
        Ok(())
    }

    #[cfg(windows)]
    fn default_shell() -> String {
        std::env::var("COMSPEC").unwrap_or_else(|_| "pwsh.exe".to_string())
    }

    #[cfg(unix)]
    fn default_shell() -> String {
        std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
    }
}
