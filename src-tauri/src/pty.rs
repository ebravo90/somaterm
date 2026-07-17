use portable_pty::{CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

pub struct PtyManager {
    master: Arc<Mutex<Option<Box<dyn MasterPty + Send>>>>,
    writer: Arc<Mutex<Option<Box<dyn Write + Send>>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            master: Arc::new(Mutex::new(None)),
            writer: Arc::new(Mutex::new(None)),
        }
    }

    pub fn spawn(&self, app_handle: AppHandle) -> Result<(), String> {
        if self.master.lock().unwrap().is_some() {
            return Ok(());
        }

        let pty_system = NativePtySystem::default();

        let pty_pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let cmd = CommandBuilder::new(Self::default_shell());

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

        // Store master and writer
        *self.master.lock().unwrap() = Some(pty_pair.master);
        *self.writer.lock().unwrap() = Some(writer);

        // Background thread to read from PTY and emit to frontend
        std::thread::spawn(move || {
            let mut buf = [0; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(n) if n > 0 => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_handle.emit("pty-read", data);
                    }
                    Ok(_) => break, // EOF
                    Err(_) => break, // Error or closed
                }
            }
        });

        Ok(())
    }

    pub fn write(&self, data: String) -> Result<(), String> {
        if let Some(writer) = self.writer.lock().unwrap().as_mut() {
            writer
                .write_all(data.as_bytes())
                .map_err(|e| e.to_string())?;
            writer.flush().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        if let Some(master) = self.master.lock().unwrap().as_ref() {
            master
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

    #[cfg(windows)]
    fn default_shell() -> String {
        std::env::var("COMSPEC").unwrap_or_else(|_| "pwsh.exe".to_string())
    }

    #[cfg(unix)]
    fn default_shell() -> String {
        std::env::var("SHELL").unwrap_or_else(|_| "bash".to_string())
    }
}
